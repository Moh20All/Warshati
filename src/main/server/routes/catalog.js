import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { CATEGORIES, getMeta, setMeta } from '../lib/catalog.js'
import { getImageStatus, startImageDownload, deleteImages } from '../lib/catalog-images.js'

const router = Router()
router.use(requireAuth)

const toClient = (d) => ({
  id: d.id, category: d.category, brand: d.brand, model: d.model,
  specs: JSON.parse(d.specs || '{}'), imageFile: d.imageFile, isCustom: d.isCustom
})

// GET /api/catalog?category=PHONE — every device of a category (the picker filters locally)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Unknown category' })
    const devices = await prisma.deviceCatalog.findMany({ where: { category }, orderBy: [{ brand: 'asc' }, { model: 'asc' }] })
    res.json({ devices: devices.map(toClient) })
  } catch (err) {
    logger.error('List catalog error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/catalog/status — catalog size, image download consent and progress
router.get('/status', async (_req, res) => {
  try {
    const counts = Object.fromEntries(await Promise.all(CATEGORIES.map(async c => [c, await prisma.deviceCatalog.count({ where: { category: c } })])))
    res.json({
      version: await getMeta(prisma, 'catalogVersion'),
      counts,
      custom: await prisma.deviceCatalog.count({ where: { isCustom: true } }),
      imagesConsent: await getMeta(prisma, 'imagesConsent'), // null = not asked yet
      images: await getImageStatus(prisma)
    })
  } catch (err) {
    logger.error('Catalog status error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/catalog/images/download — owner agreed: download in the background
router.post('/images/download', requireRole('OWNER'), async (_req, res) => {
  try {
    startImageDownload(prisma).catch(err => logger.error('Image download error:', err))
    await new Promise(r => setTimeout(r, 50)) // let the run register before answering
    res.status(202).json({ images: await getImageStatus(prisma) })
  } catch (err) {
    logger.error('Start image download error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/catalog/images/decline — owner said "later"; the prompt stops appearing
router.post('/images/decline', requireRole('OWNER'), async (_req, res) => {
  await setMeta(prisma, 'imagesConsent', 'declined')
  res.json({ success: true })
})

// DELETE /api/catalog/images — free disk space (the device list stays)
router.delete('/images', requireRole('OWNER'), async (_req, res) => {
  try {
    await deleteImages(prisma)
    res.json({ success: true })
  } catch (err) {
    logger.error('Delete catalog images error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/catalog/:id — remove a device typed by hand (bundled devices cannot be removed)
router.delete('/:id', requireRole('OWNER'), async (req, res) => {
  try {
    const device = await prisma.deviceCatalog.findUnique({ where: { id: req.params.id } })
    if (!device) return res.status(404).json({ error: 'Device not found' })
    if (!device.isCustom) return res.status(400).json({ error: 'Only devices added by hand can be removed' })
    await prisma.deviceCatalog.delete({ where: { id: device.id } })
    res.json({ success: true })
  } catch (err) {
    logger.error('Delete catalog device error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
