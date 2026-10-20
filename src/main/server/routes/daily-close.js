import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { dayRange, loadMovements, summarize } from '../lib/finance.js'

const router = Router()
router.use(requireAuth)

async function todayFigures() {
  const { start, end } = dayRange()
  const totals = summarize(await loadMovements(prisma, start, end))
  return { start, end, totals }
}

// POST /api/daily-close — generate today's snapshot
router.post('/', async (req, res) => {
  try {
    const { start: today, end: tomorrow, totals } = await todayFigures()

    // Check if already closed
    const existing = await prisma.dailyClose.findFirst({
      where: { date: { gte: today, lt: tomorrow } }
    })
    if (existing) return res.status(400).json({ error: 'Today is already closed', close: existing })

    const openTickets = await prisma.repairTicket.count({
      where: { status: { in: ['DIAGNOSING', 'WAITING_PARTS', 'IN_REPAIR'] } }
    })
    const doneNotDelivered = await prisma.repairTicket.count({
      where: { status: 'DONE' }
    })

    const todayClaims = await prisma.warrantyClaim.count({
      where: { createdAt: { gte: today, lt: tomorrow } }
    })

    const allItems = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: { quantity: true, lowStockAt: true }
    })
    const lowStockCount = allItems.filter(i => i.quantity <= i.lowStockAt).length

    const close = await prisma.dailyClose.create({
      data: {
        date: today,
        totalRevenue: totals.totalRevenue,
        totalCreditSales: totals.totalCreditSales,
        totalDebtCollected: totals.totalDebtCollected,
        totalExpenses: totals.totalExpenses,
        netCash: totals.netCash,
        openTickets, doneNotDelivered, newWarrantyClaims: todayClaims,
        lowStockCount, notes: req.body.notes || null
      }
    })

    res.status(201).json({ close })
  } catch (err) {
    logger.error('Daily close error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/daily-close — list all closes
router.get('/', async (_req, res) => {
  try {
    const closes = await prisma.dailyClose.findMany({ orderBy: { date: 'desc' } })
    res.json({ closes })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/daily-close/preview — show today's stats without closing
router.get('/preview', async (req, res) => {
  try {
    const { start: today, end: tomorrow, totals } = await todayFigures()
    const existing = await prisma.dailyClose.findFirst({ where: { date: { gte: today, lt: tomorrow } } })
    // Staff see the drawer figures they need to close the day, not the shop's margins
    if (req.user.role !== 'OWNER') {
      for (const k of ['cogs', 'grossProfit', 'runningCosts', 'netProfit', 'ticketCogs', 'netTicketProfit']) delete totals[k]
    }
    res.json({ ...totals, alreadyClosed: !!existing })
  } catch (err) {
    logger.error('Daily close preview error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
