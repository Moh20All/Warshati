// Accessory catalog: bundled list sync, listing, photo download (chosen ones or all) with consent,
// list updates keep downloaded photos, and adding stock never takes the catalog price.
import fs from 'fs'
import path from 'path'
import { prepareEnv, startServer, setupOwner, createChecker, importProject, projectRoot } from './helpers/setup.mjs'

const dir = prepareEnv()
const appDir = path.join(dir, 'app')
fs.mkdirSync(path.join(appDir, 'assets', 'catalog'), { recursive: true })
const bundled = JSON.parse(fs.readFileSync(path.join(projectRoot, 'assets', 'catalog', 'accessories.json'), 'utf8'))
const writeBundle = (b) => fs.writeFileSync(path.join(appDir, 'assets', 'catalog', 'accessories.json'), JSON.stringify(b))
writeBundle(bundled)
process.env.WARSHATI_APP_PATH = appDir

// Fake image server: every external URL returns a tiny PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const realFetch = globalThis.fetch
let fetched = 0
globalThis.fetch = async (url, opts) => {
  if (String(url).startsWith('http://127.0.0.1')) return realFetch(url, opts)
  fetched++
  return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } })
}

const { call, close } = await startServer()
const { syncAccessories, catalogImagesDir } = await importProject('src/main/server/lib/catalog.js')
const { startAccessoryImageDownload, getAccessoryImageStatus } = await importProject('src/main/server/lib/catalog-images.js')
const { default: prisma } = await importProject('src/main/server/lib/prisma.js')
const { check, finish } = createChecker()

try {
  check('bundled list is not empty', bundled.accessories.length > 500, true)
  check('every accessory has a name and a category', bundled.accessories.every(a => a.name && a.category), true)
  check('prices are plain numbers (3.400 -> 3400)', bundled.accessories.filter(a => a.price != null).every(a => Number.isInteger(a.price) && a.price >= 100), true)
  check('names are unique', new Set(bundled.accessories.map(a => a.name.toLowerCase())).size, bundled.accessories.length)

  let r = await syncAccessories(prisma)
  check('first sync loads the accessories', r.synced, true)
  check('all loaded', await prisma.accessoryCatalog.count(), bundled.accessories.length)
  check('second start does nothing', (await syncAccessories(prisma)).synced, false)

  const { o } = await setupOwner(call)
  await o('POST', '/users', { name: 'Staff', email: 's@t.local', password: 'pw123456', role: 'STAFF' })
  const staff = (await call(null, 'POST', '/auth/login', { email: 's@t.local', password: 'pw123456' })).data.token

  r = await o('GET', '/catalog/accessories')
  check('API lists the accessories', r.data.accessories.length, bundled.accessories.length)
  const list = r.data.accessories
  const sample = list.find(a => a.price != null)
  check('price comes back with the accessory', typeof sample.price, 'number')
  check('staff can read the list', (await call(staff, 'GET', '/catalog/accessories')).status, 200)

  let s = (await o('GET', '/catalog/accessories/status')).data
  check('photos: not asked yet', s.imagesConsent, null)
  check('no photo before consent', s.images.downloaded, 0)
  check('staff cannot start the download', (await call(staff, 'POST', '/catalog/accessories/images/download', { ids: [sample.id] })).status, 403)
  check('an empty choice is refused', (await o('POST', '/catalog/accessories/images/download', { ids: [] })).status, 400)

  // Only the chosen ones
  const chosen = list.slice(0, 3).map(a => a.id)
  let run = await startAccessoryImageDownload(prisma, chosen)
  check('only the chosen photos downloaded', run.total, 3)
  check('consent recorded', (await o('GET', '/catalog/accessories/status')).data.imagesConsent, 'accepted')
  const one = await prisma.accessoryCatalog.findUnique({ where: { id: chosen[0] } })
  check('photo on disk', fs.existsSync(path.join(catalogImagesDir(), one.imageFile)), true)
  r = await o('GET', `/catalog/accessories/${chosen[0]}/image`)
  check('photo served to the phone app', r.status, 200)
  check('no photo -> 404', (await o('GET', `/catalog/accessories/${list[10].id}/image`)).status, 404)
  check('the others still have none', await prisma.accessoryCatalog.count({ where: { imageFile: { not: null } } }), 3)

  // Then all: the chosen ones are not fetched again
  fetched = 0
  run = await startAccessoryImageDownload(prisma)
  const withUrl = await prisma.accessoryCatalog.count({ where: { imageUrl: { not: null } } })
  check('"all" skips photos already on disk', run.total, withUrl - 3)
  check('every photo on disk', (await getAccessoryImageStatus(prisma)).downloaded, withUrl)
  check('fetched once each', fetched, withUrl - 3)

  // Deleting device images leaves accessory photos alone
  await o('DELETE', '/catalog/images')
  check('device image delete keeps accessory photos', fs.existsSync(path.join(catalogImagesDir(), one.imageFile)), true)

  // New list version: a price change keeps the photo; a dropped accessory is removed; a new one is added
  const [first, dropped, ...rest] = bundled.accessories
  const firstRow = await prisma.accessoryCatalog.findFirst({ where: { name: first.name } })
  writeBundle({ version: 'test-v2', accessories: [{ ...first, price: (first.price || 1000) + 500 }, ...rest, { name: 'Nouvel accessoire test', category: 'OTHER', price: 999, oldPrice: null, imageUrl: null }] })
  r = await syncAccessories(prisma)
  check('new version synced', r.synced, true)
  const after = await prisma.accessoryCatalog.findFirst({ where: { name: first.name } })
  check('price updated', after.price, (first.price || 1000) + 500)
  check('photo kept (same link)', after.imageFile, firstRow.imageFile)
  check('dropped accessory removed', await prisma.accessoryCatalog.count({ where: { name: dropped.name } }), 0)
  check('new accessory added', await prisma.accessoryCatalog.count({ where: { name: 'Nouvel accessoire test' } }), 1)

  // Adding stock: the shop's own prices are saved, never the catalog's
  const item = (await o('POST', '/inventory', { type: 'ACCESSORY', name: sample.name, buyPrice: 700, sellPrice: 1500, quantity: 2, recordExpense: false })).data.item
  check('item keeps the typed sell price', Number(item.sellPrice), 1500)
  check('item keeps the typed buy price', Number(item.buyPrice), 700)

  check('owner deletes the photos', (await o('DELETE', '/catalog/accessories/images')).status, 200)
  check('photos gone, list kept', (await getAccessoryImageStatus(prisma)).downloaded === 0 && await prisma.accessoryCatalog.count() > 0, true)
  check('decline is remembered', (await o('POST', '/catalog/accessories/images/decline')).status === 200 && (await o('GET', '/catalog/accessories/status')).data.imagesConsent, 'declined')
  finish()
} catch (e) {
  finish(e)
} finally {
  close()
}
