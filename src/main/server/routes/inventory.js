import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/inventory — list with filters
router.get('/', async (req, res) => {
  try {
    const { search, type, lowStock } = req.query
    const where = { isActive: true }
    if (type) where.type = type
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
        { imei: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } }
      ]
    }
    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    })

    // If lowStock filter, only return items at or below threshold
    const result = lowStock === 'true'
      ? items.filter(i => i.quantity <= i.lowStockAt)
      : items

    res.json({ items: result })
  } catch (err) {
    console.error('List inventory error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/inventory/low-stock-count
router.get('/low-stock-count', async (_req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { id: true, quantity: true, lowStockAt: true }
    })
    const count = items.filter(i => i.quantity <= i.lowStockAt).length
    res.json({ count })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/inventory/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json({ item })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/inventory/barcode/:code — barcode lookup for POS
router.get('/barcode/:code', async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findFirst({
      where: {
        OR: [
          { barcode: req.params.code },
          { sku: req.params.code }
        ],
        isActive: true
      }
    })
    res.json({ item: item || null })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/inventory
router.post('/', async (req, res) => {
  try {
    const { type, name, sku, barcode, imei, brand, model, color, storage, quantity, buyPrice, sellPrice, lowStockAt } = req.body
    if (!type || !name || buyPrice === undefined || sellPrice === undefined) {
      return res.status(400).json({ error: 'Type, name, buyPrice, and sellPrice are required' })
    }
    // IMEI items must have quantity = 1
    const qty = (type === 'PHONE_NEW' || type === 'PHONE_USED') && imei ? 1 : (quantity || 0)

    const item = await prisma.inventoryItem.create({
      data: {
        type, name,
        sku: sku || null, barcode: barcode || null, imei: imei || null,
        brand: brand || null, model: model || null, color: color || null, storage: storage || null,
        quantity: qty, buyPrice, sellPrice, lowStockAt: lowStockAt || 3
      }
    })

    // Check low stock
    const isLowStock = item.quantity <= item.lowStockAt
    res.status(201).json({ item, isLowStock })
  } catch (err) {
    console.error('Create inventory error:', err)
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Duplicate SKU, barcode, or IMEI' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/inventory/:id
router.put('/:id', async (req, res) => {
  try {
    const { type, name, sku, barcode, imei, brand, model, color, storage, quantity, buyPrice, sellPrice, lowStockAt, isActive } = req.body
    const data = {}
    if (type !== undefined) data.type = type
    if (name !== undefined) data.name = name
    if (sku !== undefined) data.sku = sku || null
    if (barcode !== undefined) data.barcode = barcode || null
    if (imei !== undefined) data.imei = imei || null
    if (brand !== undefined) data.brand = brand || null
    if (model !== undefined) data.model = model || null
    if (color !== undefined) data.color = color || null
    if (storage !== undefined) data.storage = storage || null
    if (quantity !== undefined) data.quantity = quantity
    if (buyPrice !== undefined) data.buyPrice = buyPrice
    if (sellPrice !== undefined) data.sellPrice = sellPrice
    if (lowStockAt !== undefined) data.lowStockAt = lowStockAt
    if (isActive !== undefined) data.isActive = isActive

    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data
    })
    const isLowStock = item.quantity <= item.lowStockAt
    res.json({ item, isLowStock })
  } catch (err) {
    console.error('Update inventory error:', err)
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Duplicate SKU, barcode, or IMEI' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/inventory/:id — soft deactivate
router.delete('/:id', async (req, res) => {
  try {
    await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: { isActive: false }
    })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
