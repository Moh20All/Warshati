import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Generate sale number: INV-YYYY-NNNN
async function generateSaleNumber() {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  const last = await prisma.sale.findFirst({
    where: { saleNumber: { startsWith: prefix } },
    orderBy: { saleNumber: 'desc' }
  })
  const num = last ? parseInt(last.saleNumber.split('-').pop()) + 1 : 1
  return `${prefix}${String(num).padStart(4, '0')}`
}

// GET /api/sales
router.get('/', async (req, res) => {
  try {
    const { search } = req.query
    const where = {}
    if (search) {
      where.OR = [
        { saleNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } }
      ]
    }
    const sales = await prisma.sale.findMany({
      where,
      include: { customer: true, createdBy: { select: { name: true } }, items: { include: { inventoryItem: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ sales })
  } catch (err) {
    console.error('List sales error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/sales/:id
router.get('/:id', async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: { include: { inventoryItem: true } }, repairTicket: true, debtEntry: true }
    })
    if (!sale) return res.status(404).json({ error: 'Sale not found' })
    res.json({ sale })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/sales — create sale from POS
router.post('/', async (req, res) => {
  try {
    const { customerId, repairTicketId, items, discount, tradeInCredit, paymentMethod, amountPaid, notes } = req.body

    if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required' })

    const saleNumber = await generateSaleNumber()

    // Calculate totals
    let subtotal = 0
    for (const item of items) {
      subtotal += item.unitPrice * item.quantity
    }
    const total = subtotal - (discount || 0) - (tradeInCredit || 0)
    const paid = amountPaid !== undefined ? parseFloat(amountPaid) : total
    const change = Math.max(0, paid - total)

    // Determine status
    let status = 'COMPLETED'
    if (paymentMethod === 'CREDIT') status = 'CREDIT'
    else if (paymentMethod === 'SPLIT' && paid < total) status = 'CREDIT'

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        customerId: customerId || null,
        repairTicketId: repairTicketId || null,
        createdById: req.user.id,
        subtotal, discountAmount: discount || 0, tradeInCredit: tradeInCredit || 0,
        total, amountPaid: Math.min(paid, total), change,
        paymentMethod: paymentMethod || 'CASH', status,
        notes: notes || null,
        items: {
          create: items.map(item => ({
            inventoryItemId: item.inventoryItemId || null,
            description: item.description || item.name,
            quantity: item.quantity,
            unitCost: item.unitCost || 0,
            unitPrice: item.unitPrice,
            subtotal: item.unitPrice * item.quantity
          }))
        }
      },
      include: { customer: true, items: { include: { inventoryItem: true } } }
    })

    // Decrement inventory quantities
    for (const item of items) {
      if (item.inventoryItemId) {
        await prisma.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: { decrement: item.quantity } }
        })
      }
    }

    // Auto-create debt if credit/split
    if (status === 'CREDIT' || (paymentMethod === 'SPLIT' && paid < total)) {
      const debtAmount = total - Math.min(paid, total)
      await prisma.debtEntry.create({
        data: {
          customerId: customerId,
          saleId: sale.id,
          type: 'SALE_CREDIT',
          totalAmount: debtAmount,
          paidAmount: 0,
          remaining: debtAmount,
          status: 'OPEN'
        }
      })
    }

    res.status(201).json({ sale })
  } catch (err) {
    console.error('Create sale error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
