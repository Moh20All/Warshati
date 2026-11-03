// Device catalog: the bundled list (assets/catalog/devices.json, shipped in the installer)
// plus devices a shop typed by hand (isCustom). Synced into the DB at startup when its version changes.
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import logger from './logger.js'

export const CATEGORIES = ['PHONE', 'LAPTOP', 'CONSOLE']
export const bundledCatalogFile = () => path.join(app.getAppPath(), 'assets', 'catalog', 'devices.json')
export const catalogImagesDir = () => path.join(app.getPath('userData'), 'catalog-images')

const keyOf = (d) => `${d.category}|${d.brand}|${d.model}`.toLowerCase()

export async function getMeta(db, key) {
  return (await db.appMeta.findUnique({ where: { key } }))?.value ?? null
}
export async function setMeta(db, key, value) {
  await db.appMeta.upsert({ where: { key }, create: { key, value }, update: { value } })
}

/**
 * Loads the bundled catalog into the DB if its version is new.
 * - adds new devices, updates changed ones (keeping an already downloaded image if its URL is unchanged)
 * - removes bundled devices that are no longer in the list
 * - a hand-typed device that the new list now contains becomes a normal catalog entry
 */
export async function syncCatalog(db) {
  const file = bundledCatalogFile()
  if (!fs.existsSync(file)) { logger.warn(`[CATALOG] Bundled catalog not found: ${file}`); return { synced: false } }
  const { version, devices } = JSON.parse(fs.readFileSync(file, 'utf8'))
  if ((await getMeta(db, 'catalogVersion')) === version) return { synced: false, version }

  const existing = new Map((await db.deviceCatalog.findMany()).map(d => [keyOf(d), d]))
  const toCreate = []
  const toUpdate = []
  const bundledKeys = new Set()
  for (const d of devices) {
    const key = keyOf(d)
    bundledKeys.add(key)
    const row = { category: d.category, brand: d.brand, model: d.model, specs: JSON.stringify(d.specs || {}), imageUrl: d.imageUrl || null }
    const current = existing.get(key)
    if (!current) toCreate.push(row)
    else if (current.isCustom || current.specs !== row.specs || current.imageUrl !== row.imageUrl) {
      toUpdate.push({ id: current.id, data: { ...row, isCustom: false, ...(current.imageUrl !== row.imageUrl ? { imageFile: null } : {}) } })
    }
  }
  const toDelete = [...existing.values()].filter(d => !d.isCustom && !bundledKeys.has(keyOf(d))).map(d => d.id)

  await db.$transaction([
    ...(toCreate.length ? [db.deviceCatalog.createMany({ data: toCreate })] : []),
    ...toUpdate.map(u => db.deviceCatalog.update({ where: { id: u.id }, data: u.data })),
    ...(toDelete.length ? [db.deviceCatalog.deleteMany({ where: { id: { in: toDelete } } })] : []),
    db.appMeta.upsert({ where: { key: 'catalogVersion' }, create: { key: 'catalogVersion', value: version }, update: { value: version } })
  ])
  logger.info(`[CATALOG] Synced version ${version}: +${toCreate.length} ~${toUpdate.length} -${toDelete.length}`)
  return { synced: true, version, created: toCreate.length, updated: toUpdate.length, deleted: toDelete.length }
}

export const ACCESSORY_CATEGORIES = ['PACK', 'CASE', 'SCREEN', 'CHARGER', 'CABLE', 'ADAPTER', 'POWER_BANK', 'AUDIO', 'HOLDER', 'WATCH', 'GAMING', 'STORAGE', 'CAMERA', 'OTHER']
export const bundledAccessoriesFile = () => path.join(app.getAppPath(), 'assets', 'catalog', 'accessories.json')

/**
 * Loads the bundled accessory list into the DB if its version is new (same rules as the devices:
 * add new, update changed (a downloaded photo is kept while its link is unchanged), remove dropped ones).
 */
export async function syncAccessories(db) {
  const file = bundledAccessoriesFile()
  if (!fs.existsSync(file)) { logger.warn(`[CATALOG] Bundled accessories not found: ${file}`); return { synced: false } }
  const { version, accessories } = JSON.parse(fs.readFileSync(file, 'utf8'))
  if ((await getMeta(db, 'accessoriesVersion')) === version) return { synced: false, version }

  const existing = new Map((await db.accessoryCatalog.findMany()).map(a => [a.name.toLowerCase(), a]))
  const toCreate = []
  const toUpdate = []
  const bundledKeys = new Set()
  for (const a of accessories) {
    const key = a.name.toLowerCase()
    if (bundledKeys.has(key)) continue
    bundledKeys.add(key)
    const row = { name: a.name, category: a.category, price: a.price ?? null, oldPrice: a.oldPrice ?? null, imageUrl: a.imageUrl || null }
    const current = existing.get(key)
    if (!current) toCreate.push(row)
    else if (Object.keys(row).some(k => current[k] !== row[k])) {
      toUpdate.push({ id: current.id, data: { ...row, ...(current.imageUrl !== row.imageUrl ? { imageFile: null } : {}) } })
    }
  }
  const toDelete = [...existing.values()].filter(a => !bundledKeys.has(a.name.toLowerCase())).map(a => a.id)

  await db.$transaction([
    ...(toCreate.length ? [db.accessoryCatalog.createMany({ data: toCreate })] : []),
    ...toUpdate.map(u => db.accessoryCatalog.update({ where: { id: u.id }, data: u.data })),
    ...(toDelete.length ? [db.accessoryCatalog.deleteMany({ where: { id: { in: toDelete } } })] : []),
    db.appMeta.upsert({ where: { key: 'accessoriesVersion' }, create: { key: 'accessoriesVersion', value: version }, update: { value: version } })
  ])
  logger.info(`[CATALOG] Accessories version ${version}: +${toCreate.length} ~${toUpdate.length} -${toDelete.length}`)
  return { synced: true, version, created: toCreate.length, updated: toUpdate.length, deleted: toDelete.length }
}

/** Remembers a device typed by hand so it shows up in the list next time. Never throws. */
export async function rememberDevice(db, { category, brand, model }) {
  try {
    if (!CATEGORIES.includes(category)) return
    brand = String(brand || '').trim().replace(/\s+/g, ' ')
    model = String(model || '').trim().replace(/\s+/g, ' ')
    if (!brand || !model) return
    // Same device with different capitalisation counts as known (SQLite equality is case-sensitive)
    const all = await db.deviceCatalog.findMany({ where: { category }, select: { brand: true, model: true } })
    if (all.some(d => d.brand.toLowerCase() === brand.toLowerCase() && d.model.toLowerCase() === model.toLowerCase())) return
    await db.deviceCatalog.create({ data: { category, brand, model, isCustom: true } })
  } catch (err) {
    logger.warn(`[CATALOG] Could not remember device: ${err.message}`)
  }
}
