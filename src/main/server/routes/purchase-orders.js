import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { nextOrderNumber } from '../lib/numbering.js'

const router = Router()
router.use(requireAuth)
router.use(requireRole('OWNER'))

// Generate PO number: PO-YYYY-NNNN (pass the transaction client when inside one)
async function generatePONumber(db = prisma) {
  return nextOrderNumber(db)
}

// GET /api/purchase-orders
router.get('/', async (req, res) => {
  try {
    const { search } = req.query
    const where = {}
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { supplier: { name: { contains: search } } }
      ]
    }
    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, items: { include: { inventoryItem: true } } },
      orderBy: { orderedAt: 'desc' }
    })
    res.json({ orders })
  } catch (err) {
    logger.error('List POs error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/purchase-orders — body: { supplierId, lines: [{ inventoryItemId, quantity, unitCost }], paymentMethod: 'CASH' | 'CREDIT', notes }
router.post('/', async (req, res) => {
  try {
    const { supplierId, lines, paymentMethod, notes } = req.body
    if (!supplierId || !lines || lines.length === 0) {
      return res.status(400).json({ error: 'Supplier and at least one item are required' })
    }
    for (const l of lines) {
      if (!l.inventoryItemId || !Number.isInteger(l.quantity) || l.quantity <= 0 || !(parseFloat(l.unitCost) >= 0)) {
        return res.status(400).json({ error: 'Each line needs an item, a positive quantity and a unit cost' })
      }
    }

    const total = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)
    const isCash = paymentMethod === 'CASH'

    // Order, stock increase and debt/expense are saved together or not at all
    const po = await prisma.$transaction(async (tx) => {
      const orderNumber = await generatePONumber(tx)
      const created = await tx.purchaseOrder.create({
        data: {
          orderNumber, supplierId,
          totalAmount: total,
          paidAmount: isCash ? total : 0,
          paymentStatus: isCash ? 'PAID' : 'UNPAID',
          notes: notes || null,
          receivedAt: new Date(),
          items: {
            create: lines.map(l => ({
              inventoryItemId: l.inventoryItemId,
              quantity: l.quantity,
              unitCost: l.unitCost,
              subtotal: l.quantity * l.unitCost
            }))
          }
        },
        include: { supplier: true, items: { include: { inventoryItem: true } } }
      })

      // Increment inventory quantities
      for (const line of lines) {
        await tx.inventoryItem.update({
          where: { id: line.inventoryItemId },
          data: { quantity: { increment: line.quantity }, buyPrice: line.unitCost }
        })
      }

      // Create supplier debt if not paid in cash, OR create Expense if cash
      if (!isCash) {
        await tx.supplierDebt.create({
          data: {
            supplierId, purchaseOrderId: created.id,
            totalAmount: total, paidAmount: 0, remaining: total, status: 'OPEN'
          }
        })
      } else if (total > 0) {
        await tx.expense.create({
          data: {
            category: 'SUPPLIER_RESTOCK',
            description: `Purchase Order: ${orderNumber}`,
            amount: total,
            supplierId,
            createdById: req.user.id
          }
        })
      }

      return created
    })

    res.status(201).json({ order: po })
  } catch (err) {
    logger.error('Create PO error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
