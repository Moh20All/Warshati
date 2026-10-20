import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { rememberDevice } from '../lib/catalog.js'

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
    logger.error('List trade-ins error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/trade-ins — appraise a device
router.post('/', async (req, res) => {
  try {
    const { customerId, customerName, brand, model, imei, storage, color, condition, conditionNotes, appraisedValue } = req.body
    // CASH = paid from the drawer (an expense); STORE_CREDIT = deducted at the POS, no cash leaves
    const payoutMethod = req.body.payoutMethod === 'STORE_CREDIT' ? 'STORE_CREDIT' : 'CASH'
    if (!brand || !model || appraisedValue === undefined) {
      return res.status(400).json({ error: 'Brand, model, and appraised value are required' })
    }

    if (!customerId && !customerName) {
      return res.status(400).json({ error: 'Customer is required' })
    }

    // Customer, trade-in, inventory item and expense are saved together or not at all
    const finalTradeIn = await prisma.$transaction(async (tx) => {
      // Resolve or create customer
      let resolvedCustomerId = customerId
      if (!resolvedCustomerId) {
        const customer = await tx.customer.create({ data: { name: customerName } })
        resolvedCustomerId = customer.id
      }

      const tradeIn = await tx.tradeIn.create({
        data: {
          customerId: resolvedCustomerId,
          brand, model,
          imei: imei || null, storage: storage || null, color: color || null,
          condition: condition || null, conditionNotes: conditionNotes || null,
          appraisedValue: parseFloat(appraisedValue),
          payoutMethod,
          status: 'ACCEPTED'
        }
      })

      // Auto-create inventory item
      const inventoryItem = await tx.inventoryItem.create({
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

      // Auto-create Supplier Restock Expense (Cash-Basis Accounting) — only when cash was paid out
      if (payoutMethod === 'CASH' && parseFloat(appraisedValue) > 0) {
        await tx.expense.create({
          data: {
            category: 'SUPPLIER_RESTOCK',
            description: `Trade-in: ${brand} ${model}${imei ? ` (IMEI: ${imei})` : ''}`,
            amount: parseFloat(appraisedValue),
            createdById: req.user.id
          }
        })
      }

      // Link inventory item
      return tx.tradeIn.update({
        where: { id: tradeIn.id },
        data: { inventoryItemId: inventoryItem.id },
        include: { customer: true, inventoryItem: true }
      })
    })

    await rememberDevice(prisma, { category: req.body.deviceCategory || 'PHONE', brand, model })
    res.status(201).json({ tradeIn: finalTradeIn })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'A device with this IMEI is already in inventory' })
    logger.error('Create trade-in error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/trade-ins/:id/accept — accept and convert to inventory
router.post('/:id/accept', async (req, res) => {
  try {
    const tradeIn = await prisma.tradeIn.findUnique({ where: { id: req.params.id } })
    if (!tradeIn) return res.status(404).json({ error: 'Trade-in not found' })
    if (tradeIn.status !== 'APPRAISED') return res.status(400).json({ error: 'Can only accept appraised trade-ins' })

    // Inventory item, status change and expense are saved together or not at all
    const updated = await prisma.$transaction(async (tx) => {
      // Create inventory item from trade-in
      const inventoryItem = await tx.inventoryItem.create({
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

      // Auto-create Supplier Restock Expense (Cash-Basis Accounting) — only when cash was paid out
      if (tradeIn.payoutMethod !== 'STORE_CREDIT' && parseFloat(tradeIn.appraisedValue) > 0) {
        await tx.expense.create({
          data: {
            category: 'SUPPLIER_RESTOCK',
            description: `Trade-in: ${tradeIn.brand} ${tradeIn.model}${tradeIn.imei ? ` (IMEI: ${tradeIn.imei})` : ''}`,
            amount: parseFloat(tradeIn.appraisedValue),
            createdById: req.user.id
          }
        })
      }

      return tx.tradeIn.update({
        where: { id: tradeIn.id },
        data: { status: 'ACCEPTED', inventoryItemId: inventoryItem.id },
        include: { customer: true, inventoryItem: true }
      })
    })

    res.json({ tradeIn: updated })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'A device with this IMEI is already in inventory' })
    logger.error('Accept trade-in error:', err)
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
