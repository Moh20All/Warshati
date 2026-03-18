import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

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

    const newPaidAmount = parseFloat(debt.paidAmount) + parseFloat(amount)
    const newRemaining = parseFloat(debt.totalAmount) - newPaidAmount
    const newStatus = newRemaining <= 0 ? 'SETTLED' : 'PARTIAL'

    await prisma.supplierDebtPayment.create({
      data: { supplierDebtId: debt.id, amount: parseFloat(amount), notes: notes || null }
    })

    // Update PO status too
    if (newStatus === 'SETTLED') {
      await prisma.purchaseOrder.update({ where: { id: debt.purchaseOrderId }, data: { status: 'PAID' } })
    } else if (newStatus === 'PARTIAL') {
      await prisma.purchaseOrder.update({ where: { id: debt.purchaseOrderId }, data: { status: 'PARTIAL' } })
    }

    const updated = await prisma.supplierDebt.update({
      where: { id: debt.id },
      data: { paidAmount: newPaidAmount, remaining: Math.max(0, newRemaining), status: newStatus },
      include: { supplier: true, payments: true }
    })
    res.json({ debt: updated })
  } catch (err) {
    console.error('Supplier payment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
