import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import logger from '../lib/logger.js'

const router = Router()
router.use(requireAuth)

export const PAY_TYPES = ['PROFIT_PERCENT', 'PRICE_PERCENT', 'FIXED']
const num = (v) => parseFloat(v || 0)

/** A repairman's share of one repair, from his rule: % of (price − parts), % of the price, or a fixed amount. */
export function repairmanShare(repairman, price, parts) {
  const value = num(repairman?.payValue)
  if (!repairman) return 0
  if (repairman.payType === 'FIXED') return value
  const base = repairman.payType === 'PRICE_PERCENT' ? num(price) : Math.max(0, num(price) - num(parts))
  return Math.round((base * value) / 100)
}

/** What a repairman earned (delivered repairs), was paid, and is still owed. */
async function balance(db, id) {
  const [earned, paid] = await Promise.all([
    db.repairTicket.aggregate({ where: { repairmanId: id, status: 'DELIVERED' }, _sum: { repairmanPay: true } }),
    db.repairmanPayment.aggregate({ where: { repairmanId: id }, _sum: { amount: true } })
  ])
  const e = num(earned._sum.repairmanPay), p = num(paid._sum.amount)
  return { earned: e, paid: p, owed: e - p }
}

const fields = (body) => {
  const data = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.phone !== undefined) data.phone = body.phone || null
  if (body.payType !== undefined) data.payType = PAY_TYPES.includes(body.payType) ? body.payType : 'PROFIT_PERCENT'
  if (body.payValue !== undefined) data.payValue = Math.max(0, num(body.payValue))
  if (body.isActive !== undefined) data.isActive = !!body.isActive
  return data
}

// GET /api/repairmen — staff get names only (to give a ticket to someone), the owner also gets pay and balance
router.get('/', async (req, res) => {
  try {
    const list = await prisma.repairman.findMany({ orderBy: { name: 'asc' } })
    if (req.user.role !== 'OWNER') return res.json({ repairmen: list.filter(r => r.isActive).map(r => ({ id: r.id, name: r.name, isActive: true })) })
    res.json({ repairmen: await Promise.all(list.map(async r => ({ ...r, ...(await balance(prisma, r.id)) }))) })
  } catch (err) {
    logger.error('List repairmen error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/repairmen/:id — his page: repairs with his share, payments, balance
router.get('/:id', requireRole('OWNER'), async (req, res) => {
  try {
    const repairman = await prisma.repairman.findUnique({
      where: { id: req.params.id },
      include: {
        tickets: { where: { status: { not: 'CANCELLED' } }, orderBy: { receivedAt: 'desc' }, include: { customer: { select: { name: true } } } },
        payments: { orderBy: { paidAt: 'desc' } }
      }
    })
    if (!repairman) return res.status(404).json({ error: 'Repairman not found' })
    // Not delivered yet: show the share his rule would give today
    repairman.tickets = repairman.tickets.map(t => ({
      ...t, share: t.repairmanPay != null ? num(t.repairmanPay) : repairmanShare(repairman, t.finalCost, t.partsCost)
    }))
    res.json({ repairman: { ...repairman, ...(await balance(prisma, repairman.id)) } })
  } catch (err) {
    logger.error('Get repairman error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', requireRole('OWNER'), async (req, res) => {
  try {
    const data = fields(req.body)
    if (!data.name) return res.status(400).json({ error: 'Name is required' })
    res.status(201).json({ repairman: await prisma.repairman.create({ data }) })
  } catch (err) {
    logger.error('Create repairman error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', requireRole('OWNER'), async (req, res) => {
  try {
    const data = fields(req.body)
    if (data.name === '') return res.status(400).json({ error: 'Name is required' })
    res.json({ repairman: await prisma.repairman.update({ where: { id: req.params.id }, data }) })
  } catch (err) {
    logger.error('Update repairman error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/repairmen/:id/payments — the owner paid him (cash out of the drawer today)
router.post('/:id/payments', requireRole('OWNER'), async (req, res) => {
  try {
    const amount = num(req.body.amount)
    if (!(amount > 0)) return res.status(400).json({ error: 'Amount must be positive' })
    if (!(await prisma.repairman.findUnique({ where: { id: req.params.id } }))) return res.status(404).json({ error: 'Repairman not found' })
    const payment = await prisma.repairmanPayment.create({ data: { repairmanId: req.params.id, amount, notes: req.body.notes || null } })
    res.status(201).json({ payment, ...(await balance(prisma, req.params.id)) })
  } catch (err) {
    logger.error('Repairman payment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/repairmen/:id/payments/:paymentId/cancel — cancel a wrong payment. A cancelling entry is recorded
// today (the money comes back into today's cash); nothing is deleted.
router.post('/:id/payments/:paymentId/cancel', requireRole('OWNER'), async (req, res) => {
  try {
    const payments = await prisma.repairmanPayment.findMany({ where: { repairmanId: req.params.id } })
    const payment = payments.find(p => p.id === req.params.paymentId)
    if (!payment) return res.status(404).json({ error: 'Payment not found' })
    if (payment.reversalOf || num(payment.amount) < 0) return res.status(400).json({ error: 'A cancelling entry cannot be cancelled' })
    if (payments.some(p => p.reversalOf === payment.id)) return res.status(400).json({ error: 'This payment is already cancelled' })
    await prisma.repairmanPayment.create({
      data: { repairmanId: payment.repairmanId, amount: -num(payment.amount), reversalOf: payment.id, notes: `Cancelled: ${req.body?.reason || 'wrong payment'}` }
    })
    res.json(await balance(prisma, payment.repairmanId))
  } catch (err) {
    logger.error('Cancel repairman payment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
