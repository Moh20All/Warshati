import { Router } from 'express'
import prisma from '../lib/prisma.js'
import bcrypt from 'bcryptjs'
import { requireAuth, requirePerm } from '../middleware/auth.js'
import { can, cleanPermissions, grantedTo, MY_REPAIRS, PERMISSION_GROUPS } from '../lib/permissions.js'
import logger from '../lib/logger.js'
import { audit } from '../lib/activity.js'

const router = Router()
router.use(requireAuth)
// Names (to give a repair to someone) for anyone working on repairs; the rest needs the Repairmen permission
const manage = requirePerm('repairmen')

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

/** His login as the Repairmen page shows it (null: he has none) */
const accountOf = (u) => (u ? { email: u.email, isActive: u.isActive, permissions: grantedTo(u) } : null)

class AccountError extends Error {}

/**
 * The repairman's login, saved with him: { email, password, enabled, permissions }.
 * It is an ordinary account tied to him (User.repairmanId): he signs in like anyone, sees the repairs
 * given to him, plus whatever the owner ticked. Only an owner gives or changes a login.
 */
async function saveAccount(tx, req, repairman) {
  const sent = req.body.account
  const existing = await tx.user.findUnique({ where: { repairmanId: repairman.id } })
  // His name follows him, and a repairman switched off cannot sign in any more
  const follow = { name: repairman.name, ...(repairman.isActive ? {} : { isActive: false }) }
  if (!sent || req.user.role !== 'OWNER') {
    if (existing) await tx.user.update({ where: { id: existing.id }, data: follow })
    return
  }
  const email = String(sent.email || '').trim()
  const password = String(sent.password || '')
  // Not sent (e.g. only switching the login off): what was ticked stays
  const permissions = sent.permissions === undefined ? undefined : JSON.stringify(cleanPermissions(sent.permissions) ?? [])
  if (!existing) {
    if (!email && !password) return // no login asked for
    if (!email || !password) throw new AccountError('Email and password are required for the login')
    if (await tx.user.findUnique({ where: { email } })) throw new AccountError('Email already in use')
    await tx.user.create({
      data: { name: repairman.name, email, passwordHash: await bcrypt.hash(password, 10), role: 'STAFF', repairmanId: repairman.id, permissions, isActive: repairman.isActive && sent.enabled !== false }
    })
    return
  }
  if (email && email !== existing.email && await tx.user.findUnique({ where: { email } })) throw new AccountError('Email already in use')
  await tx.user.update({
    where: { id: existing.id },
    data: {
      ...follow, permissions,
      ...(email ? { email } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      ...(repairman.isActive && sent.enabled !== undefined ? { isActive: !!sent.enabled } : {})
    }
  })
}

/** Create or update, with his login, in one go */
async function save(req, id) {
  const data = fields(req.body)
  return prisma.$transaction(async (tx) => {
    const repairman = id ? await tx.repairman.update({ where: { id }, data }) : await tx.repairman.create({ data })
    await saveAccount(tx, req, repairman)
    return repairman
  })
}

// GET /api/repairmen — names only (to give a ticket to someone); with the Repairmen permission also pay,
// balance and each one's login
router.get('/', requirePerm('repairs', MY_REPAIRS, 'repairmen'), async (req, res) => {
  try {
    const list = await prisma.repairman.findMany({ orderBy: { name: 'asc' }, include: { account: true } })
    if (!can(req.user, 'repairmen')) return res.json({ repairmen: list.filter(r => r.isActive).map(r => ({ id: r.id, name: r.name, isActive: true })) })
    const repairmen = await Promise.all(list.map(async r => ({ ...r, account: accountOf(r.account), ...(await balance(prisma, r.id)) })))
    res.json({ repairmen, permissionGroups: PERMISSION_GROUPS }) // the groups draw the tick boxes of a login
  } catch (err) {
    logger.error('List repairmen error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/repairmen/:id — his page: repairs with his share, payments, balance
router.get('/:id', manage, async (req, res) => {
  try {
    const repairman = await prisma.repairman.findUnique({
      where: { id: req.params.id },
      include: {
        tickets: { where: { status: { not: 'CANCELLED' } }, orderBy: { receivedAt: 'desc' }, include: { customer: { select: { name: true } } } },
        payments: { orderBy: { paidAt: 'desc' } },
        account: true
      }
    })
    if (!repairman) return res.status(404).json({ error: 'Repairman not found' })
    repairman.account = accountOf(repairman.account)
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

router.post('/', manage, async (req, res) => {
  try {
    if (!fields(req.body).name) return res.status(400).json({ error: 'Name is required' })
    res.status(201).json({ repairman: await save(req) })
  } catch (err) {
    if (err instanceof AccountError) return res.status(400).json({ error: err.message })
    logger.error('Create repairman error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', manage, async (req, res) => {
  try {
    if (fields(req.body).name === '') return res.status(400).json({ error: 'Name is required' })
    res.json({ repairman: await save(req, req.params.id) })
  } catch (err) {
    if (err instanceof AccountError) return res.status(400).json({ error: err.message })
    logger.error('Update repairman error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/repairmen/:id/payments — the owner paid him (cash out of the drawer today)
router.post('/:id/payments', manage, async (req, res) => {
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
router.post('/:id/payments/:paymentId/cancel', manage, async (req, res) => {
  try {
    const payments = await prisma.repairmanPayment.findMany({ where: { repairmanId: req.params.id } })
    const payment = payments.find(p => p.id === req.params.paymentId)
    if (!payment) return res.status(404).json({ error: 'Payment not found' })
    if (payment.reversalOf || num(payment.amount) < 0) return res.status(400).json({ error: 'A cancelling entry cannot be cancelled' })
    if (payments.some(p => p.reversalOf === payment.id)) return res.status(400).json({ error: 'This payment is already cancelled' })
    await prisma.repairmanPayment.create({
      data: { repairmanId: payment.repairmanId, amount: -num(payment.amount), reversalOf: payment.id, notes: `Cancelled: ${req.body?.reason || 'wrong payment'}` }
    })
    const who = await prisma.repairman.findUnique({ where: { id: payment.repairmanId }, select: { name: true } })
    audit(req, 'payment_cancel', who?.name, { kind: 'repairman', amount: num(payment.amount), reason: req.body?.reason || '' })
    res.json(await balance(prisma, payment.repairmanId))
  } catch (err) {
    logger.error('Cancel repairman payment error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
