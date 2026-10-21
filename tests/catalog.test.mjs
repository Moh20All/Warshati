// Device catalog: bundled list sync, hand-typed devices, catalog updates, image download with consent.
import fs from 'fs'
import path from 'path'
import { prepareEnv, startServer, setupOwner, createChecker, importProject, projectRoot } from './helpers/setup.mjs'

const dir = prepareEnv()
// The app folder points at a temp copy so the test can publish a "new catalog version" later
const appDir = path.join(dir, 'app')
fs.mkdirSync(path.join(appDir, 'assets', 'catalog'), { recursive: true })
const bundled = JSON.parse(fs.readFileSync(path.join(projectRoot, 'assets', 'catalog', 'devices.json'), 'utf8'))
const writeBundle = (b) => fs.writeFileSync(path.join(appDir, 'assets', 'catalog', 'devices.json'), JSON.stringify(b))
writeBundle(bundled)
process.env.WARSHATI_APP_PATH = appDir

// Fake image server: every external image URL returns a tiny PNG (one returns 404)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const realFetch = globalThis.fetch
globalThis.__realFetch = realFetch
let brokenUrl = null
globalThis.fetch = async (url, opts) => {
  if (String(url).startsWith('http://127.0.0.1')) return realFetch(url, opts)
  if (url === brokenUrl) return new Response('nope', { status: 404 })
  return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } })
}

const { call, close } = await startServer()
const { syncCatalog, catalogImagesDir } = await importProject('src/main/server/lib/catalog.js')
const { startImageDownload, getImageStatus } = await importProject('src/main/server/lib/catalog-images.js')
const { default: prisma } = await importProject('src/main/server/lib/prisma.js')
const { check, finish } = createChecker()
const count = (category, extra = {}) => prisma.deviceCatalog.count({ where: { category, ...extra } })
const expected = (c) => bundled.devices.filter(d => d.category === c).length

try {
  // ── Bundled list is loaded at startup ──
  let r = await syncCatalog(prisma)
  check('first sync loads the catalog', r.synced, true)
  check('phones loaded', await count('PHONE'), expected('PHONE'))
  check('laptops loaded', await count('LAPTOP'), expected('LAPTOP'))
  check('consoles loaded', await count('CONSOLE'), expected('CONSOLE'))
  check('second start does nothing (same version)', (await syncCatalog(prisma)).synced, false)

  const { o } = await setupOwner(call)
  await o('POST', '/users', { name: 'Staff', email: 's@t.local', password: 'pw123456', role: 'STAFF' })
  const staff = (await call(null, 'POST', '/auth/login', { email: 's@t.local', password: 'pw123456' })).data.token

  r = await o('GET', '/catalog?category=PHONE')
  check('API lists phones', r.data.devices.length, expected('PHONE'))
  const iphone = r.data.devices.find(d => d.brand === 'Apple' && d.model === 'iPhone 17 Pro Max')
  check('specs come back as an object (2 TB fixed)', iphone?.specs.storage, 2048)
  const listedPhones = r.data.devices
  const ratings = new Set(['OVERPRICED', 'AVERAGE', 'VALUE_KING', 'PERFORMANCE_BEAST'])
  check('every phone has a value-for-money rating', listedPhones.every(d => ratings.has(d.specs.vfmLabel)), true)
  check('every phone has a value score 0-100', listedPhones.every(d => d.specs.vfmPercentage >= 0 && d.specs.vfmPercentage <= 100), true)
  check('processor brand kept', !!iphone?.specs.processorBrand, true)
  check('unknown category refused', (await o('GET', '/catalog?category=TOASTER')).status, 400)
  check('staff can read the catalog', (await call(staff, 'GET', '/catalog?category=CONSOLE')).status, 200)

  // ── Hand-typed devices are remembered (once) ──
  const cust = (await o('POST', '/customers', { name: 'C' })).data.customer
  await o('POST', '/checkins', { customerId: cust.id, deviceCategory: 'LAPTOP', deviceBrand: 'Framework', deviceModel: 'Laptop 13', issueDesc: 'Keyboard' })
  await o('POST', '/tickets', { customerId: cust.id, deviceCategory: 'LAPTOP', deviceBrand: 'framework', deviceModel: 'laptop 13', issueDesc: 'Again' })
  await o('POST', '/tickets', { customerId: cust.id, deviceCategory: 'PHONE', deviceBrand: 'Apple', deviceModel: 'iPhone 13', issueDesc: 'Known phone' })
  await o('POST', '/trade-ins', { customerName: 'T', brand: 'Fairphone', model: '5', appraisedValue: 100 })
  await o('POST', '/inventory', { type: 'PHONE_USED', name: 'Old Nokia', brand: 'Nokia', model: '3310 (2000)', buyPrice: 1, sellPrice: 2, quantity: 0 })
  await o('POST', '/checkins', { customerId: cust.id, deviceBrand: 'NoCategory', deviceModel: 'X', issueDesc: 'No category sent' })
  check('typed laptop remembered once (case-insensitive)', await count('LAPTOP', { isCustom: true }), 1)
  check('known phone not duplicated', await prisma.deviceCatalog.count({ where: { brand: 'Apple', model: 'iPhone 13' } }), 1)
  check('trade-in device remembered as phone', await count('PHONE', { isCustom: true, brand: 'Fairphone' }), 1)
  check('inventory phone remembered', await count('PHONE', { isCustom: true, brand: 'Nokia' }), 1)
  check('nothing remembered without a category', await prisma.deviceCatalog.count({ where: { brand: 'NoCategory' } }), 0)
  r = await o('GET', '/catalog?category=LAPTOP')
  check('typed laptop appears in the list', r.data.devices.some(d => d.brand === 'Framework' && d.isCustom), true)

  // ── A new catalog version: removes, updates, adopts hand-typed devices, keeps the rest ──
  const removed = bundled.devices.find(d => d.category === 'CONSOLE')
  const next = {
    version: 'test-v2',
    devices: [
      ...bundled.devices.filter(d => d !== removed).map(d => (d.model === 'iPhone 17 Pro Max' ? { ...d, specs: { ...d.specs, battery: 5000 } } : d)),
      { category: 'LAPTOP', brand: 'Framework', model: 'Laptop 13', specs: { type: 'Ultrabook' }, imageUrl: null }
    ]
  }
  writeBundle(next)
  r = await syncCatalog(prisma)
  check('new version synced', r.synced, true)
  check('device dropped from the list is removed', await prisma.deviceCatalog.count({ where: { category: 'CONSOLE', model: removed.model } }), 0)
  const updated = await prisma.deviceCatalog.findFirst({ where: { model: 'iPhone 17 Pro Max' } })
  check('changed specs updated', JSON.parse(updated.specs).battery, 5000)
  const adopted = await prisma.deviceCatalog.findFirst({ where: { category: 'LAPTOP', brand: 'Framework', model: 'Laptop 13' } })
  check('hand-typed device now in the list becomes a catalog device', adopted?.isCustom, false)
  check('other hand-typed devices kept', await count('PHONE', { isCustom: true }), 2)

  // ── Removing hand-typed devices ──
  const fairphone = await prisma.deviceCatalog.findFirst({ where: { brand: 'Fairphone' } })
  check('staff cannot remove devices', (await call(staff, 'DELETE', `/catalog/${fairphone.id}`)).status, 403)
  check('owner removes a hand-typed device', (await o('DELETE', `/catalog/${fairphone.id}`)).status, 200)
  check('bundled devices cannot be removed', (await o('DELETE', `/catalog/${updated.id}`)).status, 400)

  // ── Images: nothing without consent, then download ──
  let s = (await o('GET', '/catalog/status')).data
  check('not asked yet', s.imagesConsent, null)
  check('no images before consent', s.images.downloaded, 0)
  check('staff cannot start the download', (await call(staff, 'POST', '/catalog/images/download')).status, 403)

  const phones = await prisma.deviceCatalog.findMany({ where: { imageUrl: { not: null } } })
  brokenUrl = phones.find(p => p.imageUrl.startsWith('http'))?.imageUrl
  const brokenCount = phones.filter(p => p.imageUrl === brokenUrl).length
  const run = await startImageDownload(prisma)
  s = await getImageStatus(prisma)
  check('consent recorded', (await o('GET', '/catalog/status')).data.imagesConsent, 'accepted')
  check('every image attempted', run.done, phones.length)
  check('broken links reported, not fatal', run.failed, brokenCount)
  check('images saved', s.downloaded, phones.length - brokenCount)
  const sample = await prisma.deviceCatalog.findFirst({ where: { imageFile: { not: null } } })
  check('image file on disk', fs.existsSync(path.join(catalogImagesDir(), sample.imageFile)), true)
  const dataUri = phones.find(p => p.imageUrl.startsWith('data:'))
  if (dataUri) check('base64 images decoded too', !!(await prisma.deviceCatalog.findUnique({ where: { id: dataUri.id } })).imageFile, true)

  brokenUrl = null
  const retry = await startImageDownload(prisma)
  check('retry only fetches the missing ones', retry.total, brokenCount)
  check('all images now on disk', (await getImageStatus(prisma)).downloaded, phones.length)

  check('owner can delete images', (await o('DELETE', '/catalog/images')).status, 200)
  check('images gone, catalog kept', (await getImageStatus(prisma)).downloaded === 0 && await count('PHONE') > 0, true)
  check('decline is remembered', (await o('POST', '/catalog/images/decline')).status === 200 && (await o('GET', '/catalog/status')).data.imagesConsent, 'declined')
  finish()
} catch (e) {
  finish(e)
} finally {
  close()
}
