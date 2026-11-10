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
      topItems,
      insights: await insights(startOfMonth, endOfMonth)
    })
  } catch (err) {
    logger.error('Monthly report error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

const num = (v) => parseFloat(v || 0)
const SLOW_DAYS = 90

// Where the money is: repairs by brand / problem / repairman, products by type, stock that does not move
async function insights(start, end) {
  const range = { gte: start, lt: end }

  // Repairs invoiced this month (the invoice is created on delivery; a refunded one is left out)
  const repairs = await prisma.repairTicket.findMany({
    where: { sale: { createdAt: range, status: { not: 'REFUNDED' } } },
    include: { sale: { select: { total: true, items: { select: { unitCost: true, quantity: true } } } }, repairman: { select: { name: true } } }
  })
  const cost = (t) => t.sale.items.reduce((s, i) => s + num(i.unitCost) * i.quantity, 0) // parts + repairman share
  const grouped = (keyOf, nameOf) => {
    const m = {}
    for (const t of repairs) {
      const k = keyOf(t)
      if (!k) continue
      const g = m[k] || (m[k] = { name: nameOf(t), count: 0, revenue: 0, cost: 0 })
      g.count++
      g.revenue += num(t.sale.total)
      g.cost += cost(t)
    }
    return Object.values(m).map(g => ({ ...g, profit: g.revenue - g.cost })).sort((a, b) => b.profit - a.profit)
  }
  // The first problem written on the ticket ("Écran cassé, ne charge pas" → "Écran cassé")
  const firstIssue = (t) => t.issueDesc.split(/[,،;\n]/)[0].trim()
  const byBrand = grouped(t => t.deviceBrand.trim().toLowerCase(), t => t.deviceBrand.trim()).slice(0, 10)
  const byIssue = grouped(t => firstIssue(t).toLowerCase(), firstIssue).slice(0, 10)
  const byRepairman = grouped(t => t.repairmanId, t => t.repairman?.name || '').map(g => {
    const share = repairs.filter(t => t.repairmanId && t.repairman?.name === g.name).reduce((s, t) => s + num(t.repairmanPay), 0)
    return { name: g.name, count: g.count, revenue: g.revenue, share, shop: g.profit }
  })

  // Products sold at the till, by type
  const soldItems = await prisma.saleItem.findMany({
    where: { sale: { createdAt: range, status: { not: 'REFUNDED' }, repairTicketId: null } },
    include: { inventoryItem: { select: { type: true } } }
  })
  const byType = {}
  for (const i of soldItems) {
    const k = i.inventoryItem?.type || 'OTHER'
    const g = byType[k] || (byType[k] = { type: k, quantity: 0, revenue: 0, cost: 0 })
    g.quantity += i.quantity
    g.revenue += num(i.subtotal)
    g.cost += num(i.unitCost) * i.quantity
  }
  const products = Object.values(byType).map(g => ({ ...g, profit: g.revenue - g.cost })).sort((a, b) => b.profit - a.profit)

  // Slow stock (as of today): in stock for 90+ days and nothing sold in that time — money sleeping on the shelf
  const since = new Date()
  since.setDate(since.getDate() - SLOW_DAYS)
  const recent = await prisma.saleItem.findMany({ where: { sale: { createdAt: { gte: since } }, inventoryItemId: { not: null } }, select: { inventoryItemId: true }, distinct: ['inventoryItemId'] })
  const soldIds = new Set(recent.map(r => r.inventoryItemId))
  const stock = await prisma.inventoryItem.findMany({ where: { isActive: true, quantity: { gt: 0 }, createdAt: { lt: since } }, select: { id: true, name: true, quantity: true, buyPrice: true } })
  const slow = stock.filter(i => !soldIds.has(i.id)).map(i => ({ id: i.id, name: i.name, quantity: i.quantity, value: i.quantity * num(i.buyPrice) })).sort((a, b) => b.value - a.value)
  const slowStock = { days: SLOW_DAYS, count: slow.length, total: slow.reduce((s, i) => s + i.value, 0), items: slow.slice(0, 15) }

  return { byBrand, byIssue, byRepairman, products, slowStock }
}

export default router
