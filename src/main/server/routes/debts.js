import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/debts — list all open debts
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query
    const where = {}
    if (status) where.status = status
    if (search) {
      where.customer = {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } }
        ]
      }
    }
    const debts = await prisma.debtEntry.findMany({
      where,
      include: { customer: true, sale: true, repairTicket: true, payments: { orderBy: { paidAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ debts })
  } catch (err) {
    console.error('List debts error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/debts/customer/:customerId
router.get('/customer/:customerId', async (req, res) => {
  try {
    const debts = await prisma.debtEntry.findMany({
      where: { customerId: req.params.customerId },
      include: { sale: true, repairTicket: true, payments: { orderBy: { paidAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ debts })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/debts/:id/payment — record a payment
router.post('/:id/payment', async (req, res) => {
  try {
    const { amount, notes } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' })

    const debt = await prisma.debtEntry.findUnique({ where: { id: req.params.id } })
    if (!debt) return res.status(404).json({ error: 'Debt entry not found' })

    const newPaidAmount = parseFloat(debt.paidAmount) + parseFloat(amount)
    const newRemaining = parseFloat(debt.totalAmount) - newPaidAmount
    const newStatus = newRemaining <= 0 ? 'SETTLED' : 'PARTIAL'

    // Create payment record
    await prisma.debtPayment.create({
      data: {
        debtEntryId: debt.id,
        amount: parseFloat(amount),
        notes: notes || null,
        collectedById: req.user.id
      }
    })

    // Update debt entry
    const updated = await prisma.debtEntry.update({
      where: { id: debt.id },
      data: {
        paidAmount: newPaidAmount,
        remaining: Math.max(0, newRemaining),
        status: newStatus
      },
      include: { customer: true, payments: true }
    })

    res.json({ debt: updated })
  } catch (err) {
    console.error('Record payment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
