import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { rememberDevice } from '../lib/catalog.js'

const router = Router()
router.use(requireAuth)

// Phones in stock are catalog phones; parts/accessories only when the form says which device they fit
const deviceCategoryFor = (type, given) => (type === 'PHONE_NEW' || type === 'PHONE_USED' ? 'PHONE' : given)

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
    logger.error('List inventory error:', err)
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
router.post('/', requireRole('OWNER'), async (req, res) => {
  try {
    const { type, name, sku, barcode, imei, brand, model, color, storage, quantity, buyPrice, sellPrice, lowStockAt, warrantyDays } = req.body
    // false = stock the shop already owned (e.g. first setup): no cash left the drawer today
    const recordExpense = req.body.recordExpense !== false
    if (!type || !name || buyPrice === undefined || sellPrice === undefined) {
      return res.status(400).json({ error: 'Type, name, buyPrice, and sellPrice are required' })
    }
    const qty = quantity ? parseInt(quantity) : 0

    // Item and its initial-stock expense are saved together or not at all
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({
        data: {
          type, name,
          sku: sku || null, barcode: barcode || null, imei: imei || null,
          brand: brand || null, model: model || null, color: color || null, storage: storage || null,
          quantity: qty, buyPrice, sellPrice, lowStockAt: lowStockAt || 3,
          warrantyDays: warrantyDays || 0
        }
      })

      // If initial quantity > 0, auto-log the purchase expense (Cash-Basis)
      if (recordExpense && qty > 0 && parseFloat(buyPrice) > 0) {
        await tx.expense.create({
          data: {
            category: 'SUPPLIER_RESTOCK',
            description: `Initial Stock: ${qty}x ${name}`,
            amount: parseFloat(buyPrice) * qty,
            createdById: req.user.id
          }
        })
      }

      return created
    })

    await rememberDevice(prisma, { category: deviceCategoryFor(item.type, req.body.deviceCategory), brand: item.brand, model: item.model })

    // Check low stock
    const isLowStock = item.quantity <= item.lowStockAt
    res.status(201).json({ item, isLowStock })
  } catch (err) {
    logger.error('Create inventory error:', err)
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Duplicate SKU, barcode, or IMEI' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/inventory/:id
router.put('/:id', requireRole('OWNER'), async (req, res) => {
  try {
    const { type, name, sku, barcode, imei, brand, model, color, storage, quantity, buyPrice, sellPrice, lowStockAt, warrantyDays, isActive } = req.body
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
    if (warrantyDays !== undefined) data.warrantyDays = warrantyDays
    if (isActive !== undefined) data.isActive = isActive

    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data
    })
    await rememberDevice(prisma, { category: deviceCategoryFor(item.type, req.body.deviceCategory), brand: item.brand, model: item.model })
    const isLowStock = item.quantity <= item.lowStockAt
    res.json({ item, isLowStock })
  } catch (err) {
    logger.error('Update inventory error:', err)
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Duplicate SKU, barcode, or IMEI' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/inventory/:id/restock — Fast restock that auto-logs expense
router.post('/:id/restock', requireRole('OWNER'), async (req, res) => {
  try {
    const { addQuantity, unitCost, updateBuyPrice } = req.body
    if (!addQuantity || addQuantity <= 0) {
      return res.status(400).json({ error: 'Quantity to add must be greater than 0' })
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } })
    if (!item) return res.status(404).json({ error: 'Item not found' })

    const finalUnitCost = unitCost !== undefined ? parseFloat(unitCost) : parseFloat(item.buyPrice)
    
    // Stock increase and its expense are saved together or not at all
    const updatedItem = await prisma.$transaction(async (tx) => {
      // Update inventory quantity (and optionally the global buyPrice)
      const updated = await tx.inventoryItem.update({
        where: { id: req.params.id },
        data: {
          quantity: { increment: parseInt(addQuantity) },
          ...(updateBuyPrice ? { buyPrice: finalUnitCost } : {})
        }
      })

      // Auto-create Supplier Restock Expense (Cash-Basis Accounting)
      if (finalUnitCost > 0) {
        await tx.expense.create({
          data: {
            category: 'SUPPLIER_RESTOCK',
            description: `Restock: ${addQuantity}x ${item.name}`,
            amount: finalUnitCost * parseInt(addQuantity),
            createdById: req.user.id
          }
        })
      }

      return updated
    })

    const isLowStock = updatedItem.quantity <= updatedItem.lowStockAt
    res.json({ item: updatedItem, isLowStock, success: true })
  } catch (err) {
    logger.error('Restock inventory error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/inventory/:id — soft deactivate
router.delete('/:id', requireRole('OWNER'), async (req, res) => {
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
