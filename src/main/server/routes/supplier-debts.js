import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePerm } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { audit } from '../lib/activity.js'
import { nextNumber } from '../lib/numbering.js'

const router = Router()
router.use(requireAuth)
router.use(requirePerm('suppliers'))

// GET /api/supplier-debts
router.get('/', async (req, res) => {
  try {
    const { status } = req.query
    const where = {}
    if (status) where.status = status
    const debts = await prisma.supplierDebt.findMany({
      where,
      include: { supplier: true, purchaseOrder: true, payments: { orderBy: { paidAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ debts })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/supplier-debts/:id/payment
router.post('/:id/payment', async (req, res) => {
  try {
    const { amount, notes } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' })
    const debt = await prisma.supplierDebt.findUnique({ where: { id: req.params.id } })
    if (!debt) return res.status(404).json({ error: 'Debt not found' })
    if (debt.status === 'SETTLED') return res.status(400).json({ error: 'This debt is already settled' })
    if (parseFloat(amount) > parseFloat(debt.remaining)) {
      return res.status(400).json({ error: `Amount exceeds the remaining balance (${parseFloat(debt.remaining)})` })
    }

    const newPaidAmount = parseFloat(debt.paidAmount) + parseFloat(amount)
    const newRemaining = parseFloat(debt.totalAmount) - newPaidAmount
    const newStatus = newRemaining <= 0 ? 'SETTLED' : 'PARTIAL'

    // Payment, purchase-order status and balance are saved together or not at all
    const [, , updated] = await prisma.$transaction([
      prisma.supplierDebtPayment.create({
        data: { supplierDebtId: debt.id, amount: parseFloat(amount), notes: notes || null }
      }),
      prisma.purchaseOrder.update({
        where: { id: debt.purchaseOrderId },
        data: { paidAmount: newPaidAmount, paymentStatus: newStatus === 'SETTLED' ? 'PAID' : 'PARTIAL' }
      }),
      prisma.supplierDebt.update({
        where: { id: debt.id },
        data: { paidAmount: newPaidAmount, remaining: Math.max(0, newRemaining), status: newStatus },
        include: { supplier: true, payments: true, purchaseOrder: true }
      })
    ])
    res.json({ debt: updated })
  } catch (err) {
    logger.error('Supplier payment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Thrown inside a transaction to roll it back and answer with a 400
class DebtError extends Error {}

// POST /api/supplier-debts/opening — what the shop already owed a supplier before using Warshati.
// Stored as an order with no items (number OB-YYYY-NNNN): no stock change, no expense today.
router.post('/opening', async (req, res) => {
  try {
    const { supplierId, amount, date, notes } = req.body
    const total = parseFloat(amount)
    if (!supplierId) return res.status(400).json({ error: 'Supplier is required' })
    if (!(total > 0)) return res.status(400).json({ error: 'Amount must be positive' })
    const orderedAt = date ? new Date(date) : new Date()
    if (isNaN(orderedAt) || orderedAt > new Date()) return res.status(400).json({ error: 'The date cannot be in the future' })
    if (!(await prisma.supplier.findUnique({ where: { id: supplierId } }))) return res.status(404).json({ error: 'Supplier not found' })

    const debt = await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          orderNumber: await nextNumber(tx, 'PurchaseOrder', 'orderNumber', `OB-${new Date().getFullYear()}-`),
          supplierId, totalAmount: total, paidAmount: 0, paymentStatus: 'UNPAID',
          notes: notes ? `Opening balance — ${notes}` : 'Opening balance', orderedAt
        }
      })
      return tx.supplierDebt.create({
        data: { supplierId, purchaseOrderId: order.id, totalAmount: total, paidAmount: 0, remaining: total, status: 'OPEN', createdAt: orderedAt },
        include: { supplier: true, payments: true, purchaseOrder: true }
      })
    })
    res.status(201).json({ debt })
  } catch (err) {
    logger.error('Create supplier opening balance error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/supplier-debts/:id/payments/:paymentId/cancel — cancel a wrong supplier payment.
// A cancelling entry is recorded today (cash comes back into today's figures); nothing is deleted.
router.post('/:id/payments/:paymentId/cancel', async (req, res) => {
  try {
    const debt = await prisma.$transaction(async (tx) => {
      const entry = await tx.supplierDebt.findUnique({ where: { id: req.params.id }, include: { payments: true } })
      if (!entry) throw new DebtError('Debt not found')
      const payment = entry.payments.find(p => p.id === req.params.paymentId)
      if (!payment) throw new DebtError('Payment not found on this debt')
      if (payment.reversalOf || parseFloat(payment.amount) < 0) throw new DebtError('A cancelling entry cannot be cancelled')
      if (entry.payments.some(p => p.reversalOf === payment.id)) throw new DebtError('This payment is already cancelled')

      const amount = parseFloat(payment.amount)
      const paid = parseFloat(entry.paidAmount) - amount
      const remaining = Math.max(0, parseFloat(entry.totalAmount) - paid)
      const status = remaining <= 0 ? 'SETTLED' : paid > 0 ? 'PARTIAL' : 'OPEN'
      await tx.supplierDebtPayment.create({
        data: { supplierDebtId: entry.id, amount: -amount, reversalOf: payment.id, notes: `Cancelled: ${req.body.reason || 'wrong payment'}` }
      })
      await tx.purchaseOrder.update({
        where: { id: entry.purchaseOrderId },
        data: { paidAmount: paid, paymentStatus: status === 'SETTLED' ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID' }
      })
      return tx.supplierDebt.update({
        where: { id: entry.id },
        data: { paidAmount: paid, remaining, status },
        include: { supplier: true, payments: { orderBy: { paidAt: 'desc' } }, purchaseOrder: true }
      })
    })
    const reversed = debt.payments.find(p => p.reversalOf === req.params.paymentId)
    audit(req, 'payment_cancel', debt.supplier?.name, { kind: 'supplier', amount: Math.abs(Number(reversed?.amount || 0)), reason: req.body.reason || '' })
    res.json({ debt })
  } catch (err) {
    if (err instanceof DebtError) return res.status(400).json({ error: err.message })
    logger.error('Cancel supplier payment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
