// GET /api/dashboard — everything the first screen shows, in one small answer.
// (It used to download every ticket, sale and debt of the shop: megabytes after a year.)
import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { dayRange } from '../lib/finance.js'

const router = Router()
router.use(requireAuth)

const ACTIVE = ['DIAGNOSING', 'WAITING_PARTS', 'IN_REPAIR']
const ticketShape = { id: true, ticketNumber: true, status: true, priority: true, receivedAt: true, finalCost: true, deviceBrand: true, deviceModel: true, customer: { select: { name: true } } }
const saleShape = { id: true, saleNumber: true, total: true, paymentMethod: true, status: true, repairTicketId: true, createdAt: true, customer: { select: { name: true } }, _count: { select: { items: true } } }
const sale = (s) => ({ ...s, itemsCount: s._count.items, _count: undefined })

router.get('/', async (_req, res) => {
  try {
    const { start, end } = dayRange()
    const [active, ready, urgent, recentTickets, activeTickets, todaySales, recentSales, openDebts, stock] = await Promise.all([
      prisma.repairTicket.count({ where: { status: { in: ACTIVE } } }),
      prisma.repairTicket.count({ where: { status: 'DONE' } }),
      prisma.repairTicket.count({ where: { status: { in: ACTIVE }, priority: 'URGENT' } }),
      prisma.repairTicket.findMany({ select: ticketShape, orderBy: { receivedAt: 'desc' }, take: 5 }),
      prisma.repairTicket.findMany({ where: { status: { in: ACTIVE } }, select: ticketShape, orderBy: { receivedAt: 'desc' }, take: 10 }),
      prisma.sale.findMany({ where: { createdAt: { gte: start, lt: end } }, select: saleShape, orderBy: { createdAt: 'desc' } }),
      prisma.sale.findMany({ select: saleShape, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.debtEntry.findMany({ where: { status: { not: 'SETTLED' } }, select: { remaining: true } }),
      prisma.inventoryItem.findMany({ where: { isActive: true }, select: { quantity: true, lowStockAt: true } })
    ])
    res.json({
      tickets: { active, ready, urgent },
      recentTickets, activeTickets,
      todaySales: todaySales.map(sale), recentSales: recentSales.map(sale),
      debts: { open: openDebts.length, total: openDebts.reduce((s, d) => s + parseFloat(d.remaining), 0) },
      lowStock: stock.filter(i => i.quantity <= i.lowStockAt).length
    })
  } catch (err) {
    logger.error('Dashboard error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
