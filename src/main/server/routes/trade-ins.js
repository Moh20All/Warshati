import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/trade-ins
router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    const where = {}
    if (status) where.status = status
    const tradeIns = await prisma.tradeIn.findMany({
      where,
      include: { customer: true, inventoryItem: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ tradeIns })
  } catch (err) {
    console.error('List trade-ins error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/trade-ins — appraise a device
router.post('/', async (req, res) => {
  try {
    const { customerId, customerName, brand, model, imei, storage, color, condition, conditionNotes, appraisedValue } = req.body
    if (!brand || !model || appraisedValue === undefined) {
      return res.status(400).json({ error: 'Brand, model, and appraised value are required' })
    }

    // Resolve or create customer
    let resolvedCustomerId = customerId
    if (!resolvedCustomerId && customerName) {
      const customer = await prisma.customer.create({ data: { name: customerName } })
      resolvedCustomerId = customer.id
    }
    if (!resolvedCustomerId) {
      return res.status(400).json({ error: 'Customer is required' })
    }

    const tradeIn = await prisma.tradeIn.create({
      data: {
        customerId: resolvedCustomerId,
        brand, model,
        imei: imei || null, storage: storage || null, color: color || null,
        condition: condition || null, conditionNotes: conditionNotes || null,
        appraisedValue: parseFloat(appraisedValue)
      },
      include: { customer: true }
    })
    res.status(201).json({ tradeIn })
  } catch (err) {
    console.error('Create trade-in error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/trade-ins/:id/accept — accept and convert to inventory
router.post('/:id/accept', async (req, res) => {
  try {
    const tradeIn = await prisma.tradeIn.findUnique({ where: { id: req.params.id } })
    if (!tradeIn) return res.status(404).json({ error: 'Trade-in not found' })
    if (tradeIn.status !== 'APPRAISED') return res.status(400).json({ error: 'Can only accept appraised trade-ins' })

    // Create inventory item from trade-in
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        type: 'PHONE_USED',
        name: `${tradeIn.brand} ${tradeIn.model} (Trade-In)`,
        brand: tradeIn.brand, model: tradeIn.model,
        imei: tradeIn.imei, color: tradeIn.color, storage: tradeIn.storage,
        quantity: 1,
        buyPrice: tradeIn.appraisedValue,
        sellPrice: parseFloat(tradeIn.appraisedValue) * 1.3, // 30% margin default
        lowStockAt: 0
      }
    })

    const updated = await prisma.tradeIn.update({
      where: { id: tradeIn.id },
      data: { status: 'ACCEPTED', inventoryItemId: inventoryItem.id },
      include: { customer: true, inventoryItem: true }
    })

    res.json({ tradeIn: updated })
  } catch (err) {
    console.error('Accept trade-in error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/trade-ins/:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    const updated = await prisma.tradeIn.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
      include: { customer: true }
    })
    res.json({ tradeIn: updated })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
