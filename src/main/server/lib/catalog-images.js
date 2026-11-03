// Downloads catalog images (from each device's / accessory's imageUrl) after the owner agrees.
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

/** Deletes all downloaded device images (the catalog and the accessory photos stay). */
export async function deleteImages(db) {
  for (const dir of ['phone', 'laptop', 'console']) fs.rmSync(path.join(catalogImagesDir(), dir), { recursive: true, force: true })
  await db.deviceCatalog.updateMany({ data: { imageFile: null } })
}

// ── Accessory photos: all of them, or only the ones the owner chose ──
const ACCESSORY_DIR = 'accessories'
const accessoryState = { running: false, total: 0, done: 0, failed: 0, startedAt: null, finishedAt: null }

export async function getAccessoryImageStatus(db) {
  const [available, downloaded] = await Promise.all([
    db.accessoryCatalog.count({ where: { imageUrl: { not: null } } }),
    db.accessoryCatalog.count({ where: { imageFile: { not: null } } })
  ])
  return { ...accessoryState, available, downloaded }
}

/** ids: only these accessories (null = all). Photos already on disk are skipped. Resolves when the run finishes. */
export async function startAccessoryImageDownload(db, ids = null) {
  if (accessoryState.running) return accessoryState
  await setMeta(db, 'accessoryImagesConsent', 'accepted')
  const where = { imageUrl: { not: null }, ...(Array.isArray(ids) ? { id: { in: ids.map(String) } } : {}) }
  const jobs = (await db.accessoryCatalog.findMany({ where }))
    .filter(a => !a.imageFile || !fs.existsSync(path.join(catalogImagesDir(), a.imageFile)))
  Object.assign(accessoryState, { running: true, total: jobs.length, done: 0, failed: 0, startedAt: new Date().toISOString(), finishedAt: null })
  logger.info(`[CATALOG-IMAGES] Downloading ${jobs.length} accessory photos`)

  let next = 0
  const worker = async () => {
    while (next < jobs.length) {
      const a = jobs[next++]
      try {
        const { buffer, ext } = await fetchImage(a.imageUrl)
        const rel = `${ACCESSORY_DIR}/${a.id}${ext}` // the id: names are long and can look alike
        const dest = path.join(catalogImagesDir(), rel)
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.writeFileSync(dest, buffer)
        await db.accessoryCatalog.update({ where: { id: a.id }, data: { imageFile: rel } })
      } catch (err) {
        accessoryState.failed++
        logger.warn(`[CATALOG-IMAGES] ${a.name}: ${err.message}`)
      }
      accessoryState.done++
    }
  }
  const run = Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker))
    .finally(() => {
      accessoryState.running = false
      accessoryState.finishedAt = new Date().toISOString()
      logger.info(`[CATALOG-IMAGES] Accessories finished: ${accessoryState.done - accessoryState.failed} saved, ${accessoryState.failed} failed`)
    })
  return run.then(() => accessoryState)
}

/** Deletes the downloaded accessory photos (the list stays). */
export async function deleteAccessoryImages(db) {
  fs.rmSync(path.join(catalogImagesDir(), ACCESSORY_DIR), { recursive: true, force: true })
  await db.accessoryCatalog.updateMany({ data: { imageFile: null } })
}
