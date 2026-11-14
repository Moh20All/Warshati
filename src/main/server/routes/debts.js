import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePerm } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { audit } from '../lib/activity.js'

const router = Router()
router.use(requireAuth)

// GET /api/debts — list all open debts
router.get('/', requirePerm('debts'), async (req, res) => {
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
    logger.error('List debts error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/debts/customer/:customerId
router.get('/customer/:customerId', requirePerm('debts', 'customers', 'sales'), async (req, res) => {
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
router.post('/:id/payment', requirePerm('debts'), async (req, res) => {
  try {
    const { amount, notes } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' })

    const debt = await prisma.debtEntry.findUnique({ where: { id: req.params.id } })
    if (!debt) return res.status(404).json({ error: 'Debt entry not found' })
    if (debt.status === 'SETTLED') return res.status(400).json({ error: 'This debt is already settled' })
    if (parseFloat(amount) > parseFloat(debt.remaining)) {
      return res.status(400).json({ error: `Amount exceeds the remaining balance (${parseFloat(debt.remaining)})` })
    }

    const newPaidAmount = parseFloat(debt.paidAmount) + parseFloat(amount)
    const newRemaining = parseFloat(debt.totalAmount) - newPaidAmount
    const newStatus = newRemaining <= 0 ? 'SETTLED' : 'PARTIAL'

    // Payment record and balance update are saved together or not at all
    const [, updated] = await prisma.$transaction([
      prisma.debtPayment.create({
        data: {
          debtEntryId: debt.id,
          amount: parseFloat(amount),
          notes: notes || null
        }
      }),
      prisma.debtEntry.update({
        where: { id: debt.id },
        data: {
          paidAmount: newPaidAmount,
          remaining: Math.max(0, newRemaining),
          status: newStatus
        },
        include: { customer: true, payments: true }
      })
    ])

    res.json({ debt: updated })
  } catch (err) {
    logger.error('Record payment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Thrown inside a transaction to roll it back and answer with a 400
class DebtError extends Error {}

// Amount still owed and status after the payments on a debt changed
function balance(total, paid) {
  const remaining = Math.max(0, total - paid)
  return { paidAmount: paid, remaining, status: remaining <= 0 ? 'SETTLED' : paid > 0 ? 'PARTIAL' : 'OPEN' }
}

// POST /api/debts — owner enters a debt by hand (e.g. from the old paper notebook).
// It is an opening balance: not revenue and not cash today. Payments on it count as cash collected.
router.post('/', requirePerm('corrections'), async (req, res) => {
  try {
    const { customerId, customerName, customerPhone, amount, date, notes } = req.body
    const total = parseFloat(amount)
    if (!(total > 0)) return res.status(400).json({ error: 'Amount must be positive' })
    if (!customerId && !String(customerName || '').trim()) return res.status(400).json({ error: 'Customer is required' })
    const createdAt = date ? new Date(date) : new Date()
    if (isNaN(createdAt) || createdAt > new Date()) return res.status(400).json({ error: 'The date cannot be in the future' })

    const debt = await prisma.$transaction(async (tx) => {
      let id = customerId
      if (id) {
        if (!(await tx.customer.findUnique({ where: { id } }))) throw new DebtError('Customer not found')
      } else {
        // Reuse a customer with the same phone instead of creating a duplicate
        const existing = customerPhone ? await tx.customer.findFirst({ where: { phone: customerPhone } }) : null
        id = existing?.id || (await tx.customer.create({ data: { name: customerName.trim(), phone: customerPhone || null } })).id
      }
      return tx.debtEntry.create({
        data: {
          customerId: id, type: 'OPENING_BALANCE',
          totalAmount: total, paidAmount: 0, remaining: total, status: 'OPEN',
          notes: notes || null, createdAt
        },
        include: { customer: true, payments: true }
      })
    })
    res.status(201).json({ debt })
  } catch (err) {
    if (err instanceof DebtError) return res.status(400).json({ error: err.message })
    logger.error('Create manual debt error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/debts/:id/payments/:paymentId/cancel — owner cancels a wrong payment.
// Nothing is deleted: a cancelling entry is recorded today, so today's cash goes down by that amount.
router.post('/:id/payments/:paymentId/cancel', requirePerm('corrections'), async (req, res) => {
  try {
    const debt = await prisma.$transaction(async (tx) => {
      const entry = await tx.debtEntry.findUnique({ where: { id: req.params.id }, include: { sale: true, payments: true } })
      if (!entry) throw new DebtError('Debt entry not found')
      const payment = entry.payments.find(p => p.id === req.params.paymentId)
      if (!payment) throw new DebtError('Payment not found on this debt')
      if (payment.reversalOf || parseFloat(payment.amount) < 0) throw new DebtError('A cancelling entry cannot be cancelled')
      if (entry.payments.some(p => p.reversalOf === payment.id)) throw new DebtError('This payment is already cancelled')
      if (entry.sale?.status === 'REFUNDED') throw new DebtError('The sale was refunded; this money was already given back')

      const amount = parseFloat(payment.amount)
      await tx.debtPayment.create({
        data: { debtEntryId: entry.id, amount: -amount, reversalOf: payment.id, notes: `Cancelled: ${req.body.reason || 'wrong payment'}` }
      })
      return tx.debtEntry.update({
        where: { id: entry.id },
        data: balance(parseFloat(entry.totalAmount), parseFloat(entry.paidAmount) - amount),
        include: { customer: true, payments: { orderBy: { paidAt: 'desc' } } }
      })
    })
    const reversed = debt.payments.find(p => p.reversalOf === req.params.paymentId)
    audit(req, 'payment_cancel', debt.customer?.name, { kind: 'customer', amount: Math.abs(Number(reversed?.amount || 0)), reason: req.body.reason || '' })
    res.json({ debt })
  } catch (err) {
    if (err instanceof DebtError) return res.status(400).json({ error: err.message })
    logger.error('Cancel debt payment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
