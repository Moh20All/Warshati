import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { dayRange, monthRange, loadMovements, summarize } from '../lib/finance.js'

const router = Router()
router.use(requireAuth)
router.use(requireRole('OWNER'))

// GET /api/reports/monthly?month=YYYY-MM
router.get('/monthly', async (req, res) => {
  try {
    const { month } = req.query
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Month is required (YYYY-MM)' })

    // Local-time month boundaries (same as the daily close)
    const { start: startOfMonth, end: endOfMonth } = monthRange(month)

    // 1. Computed live from transactions, so days that were never closed still count
    const movements = await loadMovements(prisma, startOfMonth, endOfMonth)
    const totals = summarize(movements)

    const dailyData = []
    for (let d = new Date(startOfMonth); d < endOfMonth && d <= new Date(); d.setDate(d.getDate() + 1)) {
      const { start, end } = dayRange(d)
      const day = summarize(movements, start, end)
      dailyData.push({ date: new Date(start), revenue: day.totalRevenue, net: day.netCash })
    }
    const hasActivity = dailyData.some(d => d.revenue !== 0 || d.net !== 0)

    const summary = {
      ...totals,
      totalWarrantyClaims: await prisma.warrantyClaim.count({ where: { createdAt: { gte: startOfMonth, lt: endOfMonth } } }),
      dailyData: hasActivity ? dailyData : []
    }

    // 2. Ticket Stats (Received vs Delivered in this month)
    const ticketsReceived = await prisma.repairTicket.count({
      where: { receivedAt: { gte: startOfMonth, lt: endOfMonth } }
    })
    const ticketsDelivered = await prisma.repairTicket.count({
      where: { deliveredAt: { gte: startOfMonth, lt: endOfMonth } }
    })

    // 3. Top Inventory Items Sold
    const itemStats = {}
    movements.sales.forEach(sale => {
      if (sale.status === 'REFUNDED') return
      sale.items.forEach(item => {
        if (!item.inventoryItemId) return
        if (!itemStats[item.inventoryItemId]) {
          itemStats[item.inventoryItemId] = { 
            name: item.description, 
            quantity: 0, 
            revenue: 0 
          }
        }
        itemStats[item.inventoryItemId].quantity += item.quantity
        itemStats[item.inventoryItemId].revenue += parseFloat(item.subtotal)
      })
    })

    const topItems = Object.values(itemStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    res.json({
      month,
      summary,
      stats: {
        ticketsReceived,
        ticketsDelivered
      },
      topItems
    })
  } catch (err) {
    logger.error('Monthly report error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
