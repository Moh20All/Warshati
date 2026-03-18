import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// POST /api/daily-close — generate today's snapshot
router.post('/', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Check if already closed
    const existing = await prisma.dailyClose.findFirst({
      where: { date: { gte: today, lt: tomorrow } }
    })
    if (existing) return res.status(400).json({ error: 'Today is already closed', close: existing })

    // Exclude ticket-linked sales (those are counted as ticket profit)
    const todaySales = await prisma.sale.findMany({
      where: { createdAt: { gte: today, lt: tomorrow }, repairTicketId: null },
      include: { items: true }
    })
    const totalRevenue = todaySales.reduce((s, sale) => s + parseFloat(sale.total), 0)
    const totalCreditSales = todaySales.filter(s => s.status === 'CREDIT').reduce((s, sale) => s + parseFloat(sale.total), 0)
    
    // Calculate COGS (Cost of Goods Sold)
    let totalCogs = 0
    todaySales.forEach(sale => {
      sale.items.forEach(item => { totalCogs += parseFloat(item.unitCost || 0) * item.quantity })
    })

    const todayPayments = await prisma.debtPayment.findMany({
      where: { paidAt: { gte: today, lt: tomorrow } }
    })
    const totalDebtCollected = todayPayments.reduce((s, p) => s + parseFloat(p.amount), 0)

    const todayExpenses = await prisma.expense.findMany({
      where: { expenseDate: { gte: today, lt: tomorrow } }
    })
    const totalExpenses = todayExpenses.reduce((s, e) => s + parseFloat(e.amount), 0)

    // Add Ticket Profit (Finished or Delivered today)
    const todayTickets = await prisma.repairTicket.findMany({
      where: { 
        status: { in: ['DONE', 'DELIVERED'] }, 
        updatedAt: { gte: today, lt: tomorrow } 
      }
    })
    const ticketRevenue = todayTickets.reduce((s, t) => s + parseFloat(t.finalCost || 0), 0)
    const ticketCogs = todayTickets.reduce((s, t) => s + parseFloat(t.partsCost || 0), 0)
    const netTicketProfit = ticketRevenue - ticketCogs

    // Net Profit = Cash collected from sales - COGS + Ticket Profit + Debt Collected - Expenses
    const cashSales = totalRevenue - totalCreditSales
    const netCash = cashSales - totalCogs + netTicketProfit + totalDebtCollected - totalExpenses

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
        totalRevenue, totalCreditSales, totalDebtCollected,
        totalExpenses, netCash,
        openTickets, doneNotDelivered, newWarrantyClaims: todayClaims,
        lowStockCount, notes: req.body.notes || null
      }
    })

    res.status(201).json({ close })
  } catch (err) {
    console.error('Daily close error:', err)
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
router.get('/preview', async (_req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Exclude ticket-linked sales (those are counted as ticket profit)
    const todaySales = await prisma.sale.findMany({ 
      where: { createdAt: { gte: today, lt: tomorrow }, repairTicketId: null },
      include: { items: true }
    })
    const totalRevenue = todaySales.reduce((s, sale) => s + parseFloat(sale.total), 0)
    const totalCreditSales = todaySales.filter(s => s.status === 'CREDIT').reduce((s, sale) => s + parseFloat(sale.total), 0)
    const cashSales = totalRevenue - totalCreditSales
    const salesCount = todaySales.length

    let totalCogs = 0
    todaySales.forEach(sale => {
      sale.items.forEach(item => { totalCogs += parseFloat(item.unitCost || 0) * item.quantity })
    })

    // Add Ticket Profit (Finished or Delivered today)
    const todayTickets = await prisma.repairTicket.findMany({
      where: { 
        status: { in: ['DONE', 'DELIVERED'] },
        updatedAt: { gte: today, lt: tomorrow } 
      }
    })
    const ticketRevenue = todayTickets.reduce((s, t) => s + parseFloat(t.finalCost || 0), 0)
    const ticketCogs = todayTickets.reduce((s, t) => s + parseFloat(t.partsCost || 0), 0)
    const netTicketProfit = ticketRevenue - ticketCogs

    const todayPayments = await prisma.debtPayment.findMany({ where: { paidAt: { gte: today, lt: tomorrow } } })
    const totalDebtCollected = todayPayments.reduce((s, p) => s + parseFloat(p.amount), 0)

    const todayExpenses = await prisma.expense.findMany({ where: { expenseDate: { gte: today, lt: tomorrow } } })
    const totalExpenses = todayExpenses.reduce((s, e) => s + parseFloat(e.amount), 0)

    // Net Profit = (Cash Sales - COGS) + Ticket Profit + Debt Collected - Expenses
    const netCash = cashSales - totalCogs + netTicketProfit + totalDebtCollected - totalExpenses

    const existing = await prisma.dailyClose.findFirst({ where: { date: { gte: today, lt: tomorrow } } })

    res.json({
      totalRevenue, totalCreditSales, cashSales, salesCount,
      ticketRevenue, ticketCogs, netTicketProfit,
      totalDebtCollected, totalExpenses, netCash,
      alreadyClosed: !!existing
    })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
