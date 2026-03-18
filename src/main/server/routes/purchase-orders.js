import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Generate PO number: PO-YYYY-NNNN
async function generatePONumber() {
  const year = new Date().getFullYear()
  const prefix = `PO-${year}-`
  const last = await prisma.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' }
  })
  const num = last ? parseInt(last.poNumber.split('-').pop()) + 1 : 1
  return `${prefix}${String(num).padStart(4, '0')}`
}

// GET /api/purchase-orders
router.get('/', async (req, res) => {
  try {
    const { search } = req.query
    const where = {}
    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { supplier: { name: { contains: search } } }
      ]
    }
    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, lines: { include: { inventoryItem: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ orders })
  } catch (err) {
    console.error('List POs error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/purchase-orders
router.post('/', async (req, res) => {
  try {
    const { supplierId, lines, paymentMethod, notes } = req.body
    if (!supplierId || !lines || lines.length === 0) {
      return res.status(400).json({ error: 'Supplier and at least one item are required' })
    }

    const poNumber = await generatePONumber()
    const total = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber, supplierId, createdById: req.user.id,
        total, status: paymentMethod === 'CASH' ? 'PAID' : 'UNPAID',
        notes: notes || null,
        lines: {
          create: lines.map(l => ({
            inventoryItemId: l.inventoryItemId,
            quantity: l.quantity,
            unitCost: l.unitCost,
            subtotal: l.quantity * l.unitCost
          }))
        }
      },
      include: { supplier: true, lines: { include: { inventoryItem: true } } }
    })

    // Increment inventory quantities
    for (const line of lines) {
      await prisma.inventoryItem.update({
        where: { id: line.inventoryItemId },
        data: { quantity: { increment: line.quantity }, buyPrice: line.unitCost }
      })
    }

    // Create supplier debt if credit
    if (paymentMethod === 'CREDIT') {
      await prisma.supplierDebt.create({
        data: {
          supplierId, purchaseOrderId: po.id,
          totalAmount: total, paidAmount: 0, remaining: total, status: 'OPEN'
        }
      })
    }

    res.status(201).json({ order: po })
  } catch (err) {
    console.error('Create PO error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
