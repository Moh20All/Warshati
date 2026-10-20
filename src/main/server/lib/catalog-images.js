// Downloads catalog images (from each device's imageUrl) after the owner agrees.
// Runs in the background; progress is read with getImageStatus(). Already downloaded images are skipped.
import fs from 'fs'
import path from 'path'
import logger from './logger.js'
import { catalogImagesDir, setMeta } from './catalog.js'

const CONCURRENCY = 6
const TIMEOUT_MS = 30000
const MAX_BYTES = 8 * 1024 * 1024
const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' }
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
}

const state = { running: false, total: 0, done: 0, failed: 0, startedAt: null, finishedAt: null }

const safe = (v) => String(v).trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').slice(0, 120) || 'unknown'

async function fetchImage(url) {
  // data:image/...;base64,....
  const data = url.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/is)
  if (data) {
    const ext = EXTENSIONS[data[1].toLowerCase()]
    if (!ext) throw new Error(`Unsupported image type ${data[1]}`)
    return { buffer: Buffer.from(data[2], 'base64'), ext }
  }
  if (!/^https?:\/\//i.test(url)) throw new Error('Unsupported URL')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const buffer = Buffer.from(await res.arrayBuffer())
    if (!buffer.length) throw new Error('Empty file')
    if (buffer.length > MAX_BYTES) throw new Error('Image too large')
    const ext = EXTENSIONS[type] || (/\.(png|webp|gif|avif)$/i.exec(new URL(url).pathname)?.[0].toLowerCase()) || '.jpg'
    return { buffer, ext }
  } finally {
    clearTimeout(timer)
  }
}

async function downloadOne(db, device) {
  const { buffer, ext } = await fetchImage(device.imageUrl)
  const rel = path.join(device.category.toLowerCase(), safe(device.brand), `${safe(device.model)}${ext}`)
  const dest = path.join(catalogImagesDir(), rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buffer)
  await db.deviceCatalog.update({ where: { id: device.id }, data: { imageFile: rel.replace(/\\/g, '/') } })
}

/** Devices that have an image link but no image on disk yet. */
async function pendingDevices(db) {
  const withUrl = await db.deviceCatalog.findMany({ where: { imageUrl: { not: null } } })
  return withUrl.filter(d => !d.imageFile || !fs.existsSync(path.join(catalogImagesDir(), d.imageFile)))
}

export async function getImageStatus(db) {
  const [withUrl, downloaded] = await Promise.all([
    db.deviceCatalog.count({ where: { imageUrl: { not: null } } }),
    db.deviceCatalog.count({ where: { imageFile: { not: null } } })
  ])
  return { ...state, available: withUrl, downloaded }
}

/** Starts downloading in the background (no-op if already running). Resolves when the run finishes. */
export async function startImageDownload(db) {
  if (state.running) return state
  await setMeta(db, 'imagesConsent', 'accepted')
  const jobs = await pendingDevices(db)
  Object.assign(state, { running: true, total: jobs.length, done: 0, failed: 0, startedAt: new Date().toISOString(), finishedAt: null })
  logger.info(`[CATALOG-IMAGES] Downloading ${jobs.length} images`)

  let next = 0
  const worker = async () => {
    while (next < jobs.length) {
      const device = jobs[next++]
      try {
        await downloadOne(db, device)
      } catch (err) {
        state.failed++
        logger.warn(`[CATALOG-IMAGES] ${device.brand} ${device.model}: ${err.message}`)
      }
      state.done++
    }
  }
  const run = Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker))
    .finally(() => {
      state.running = false
      state.finishedAt = new Date().toISOString()
      logger.info(`[CATALOG-IMAGES] Finished: ${state.done - state.failed} saved, ${state.failed} failed`)
    })
  return run.then(() => state)
}

/** Deletes all downloaded images (the catalog itself stays). */
export async function deleteImages(db) {
  fs.rmSync(catalogImagesDir(), { recursive: true, force: true })
  await db.deviceCatalog.updateMany({ data: { imageFile: null } })
}
