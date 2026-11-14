// GET /api/dashboard — everything the first screen shows, in one small answer.
// (It used to download every ticket, sale and debt of the shop: megabytes after a year.)
import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { dayRange } from '../lib/finance.js'
import { can, ownRepairsOnly, MY_REPAIRS } from '../lib/permissions.js'

const router = Router()
router.use(requireAuth)

const ACTIVE = ['DIAGNOSING', 'WAITING_PARTS', 'IN_REPAIR']
const ticketShape = { id: true, ticketNumber: true, status: true, priority: true, receivedAt: true, finalCost: true, deviceBrand: true, deviceModel: true, customer: { select: { name: true } } }
const saleShape = { id: true, saleNumber: true, total: true, paymentMethod: true, status: true, repairTicketId: true, createdAt: true, customer: { select: { name: true } }, _count: { select: { items: true } } }
const sale = (s) => ({ ...s, itemsCount: s._count.items, _count: undefined })

// Each part is there only for an account that may see it (null otherwise): a repairman gets his own repairs
router.get('/', async (req, res) => {
  try {
    const { start, end } = dayRange()
    const see = { tickets: can(req.user, 'repairs', MY_REPAIRS), sales: can(req.user, 'sales'), debts: can(req.user, 'debts'), stock: can(req.user, 'inventory', 'inventory_edit') }
    const own = ownRepairsOnly(req.user) ? { repairmanId: req.user.repairmanId } : {}
    const none = Promise.resolve(null)
    const [active, ready, urgent, recentTickets, activeTickets, todaySales, recentSales, openDebts, stock] = await Promise.all([
      !see.tickets ? none : prisma.repairTicket.count({ where: { ...own, status: { in: ACTIVE } } }),
      !see.tickets ? none : prisma.repairTicket.count({ where: { ...own, status: 'DONE' } }),
      !see.tickets ? none : prisma.repairTicket.count({ where: { ...own, status: { in: ACTIVE }, priority: 'URGENT' } }),
      !see.tickets ? none : prisma.repairTicket.findMany({ where: own, select: ticketShape, orderBy: { receivedAt: 'desc' }, take: 5 }),
      !see.tickets ? none : prisma.repairTicket.findMany({ where: { ...own, status: { in: ACTIVE } }, select: ticketShape, orderBy: { receivedAt: 'desc' }, take: 10 }),
      !see.sales ? none : prisma.sale.findMany({ where: { createdAt: { gte: start, lt: end } }, select: saleShape, orderBy: { createdAt: 'desc' } }),
      !see.sales ? none : prisma.sale.findMany({ select: saleShape, orderBy: { createdAt: 'desc' }, take: 5 }),
      !see.debts ? none : prisma.debtEntry.findMany({ where: { status: { not: 'SETTLED' } }, select: { remaining: true } }),
      !see.stock ? none : prisma.inventoryItem.findMany({ where: { isActive: true }, select: { quantity: true, lowStockAt: true } })
    ])
    res.json({
      tickets: see.tickets ? { active, ready, urgent } : null,
      recentTickets, activeTickets,
      todaySales: todaySales?.map(sale) ?? null, recentSales: recentSales?.map(sale) ?? null,
      debts: openDebts ? { open: openDebts.length, total: openDebts.reduce((s, d) => s + parseFloat(d.remaining), 0) } : null,
      lowStock: stock ? stock.filter(i => i.quantity <= i.lowStockAt).length : null
    })
  } catch (err) {
    logger.error('Dashboard error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
