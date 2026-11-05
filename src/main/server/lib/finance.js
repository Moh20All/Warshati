// Single source of truth for money figures (daily close + monthly report).
//
// Cash-basis rules:
//   - Revenue is recognised when a sale/invoice is created. Repair revenue comes from the
//     invoice created on delivery, never from ticket edits.
//   - Cash in  = money paid at the sale (minus any deposit already counted earlier)
//              + repair deposits received + customer debt payments
//   - Cash out = expenses + payments to suppliers + payments to repairmen
//   - netCash  = cashSales + totalDebtCollected - totalExpenses
//
// Profit rules (what the shop actually earned, independent of when cash moves):
//   - cogs       = cost of the items/parts on today's sales (unitCost x quantity)
//   - netProfit  = revenue - cogs - running costs
//   - Buying stock (SUPPLIER_RESTOCK expenses, supplier payments) is NOT a cost until the item is sold
//
// Refunds: the original sale stays on its own day; on the refund day revenue, cash
// (money handed back) and cost of goods (items back in stock) are reversed.

const num = (v) => parseFloat(v || 0)

// Local-time [start, end) of the day containing `date`
export function dayRange(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

// Local-time [start, end) of a month given "YYYY-MM"
export function monthRange(month) {
  const [y, m] = month.split('-').map(Number)
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) }
}

// Fetch every money movement in [start, end) once
export async function loadMovements(db, start, end) {
  const range = { gte: start, lt: end }
  const [sales, deposits, debtPayments, expenses, supplierPayments, refunds, repairmanPayments] = await Promise.all([
    db.sale.findMany({ where: { createdAt: range }, include: { items: true } }),
    db.repairDeposit.findMany({ where: { paidAt: range } }),
    db.debtPayment.findMany({ where: { paidAt: range } }),
    db.expense.findMany({ where: { expenseDate: range } }),
    db.supplierDebtPayment.findMany({ where: { paidAt: range } }),
    db.refund.findMany({ where: { createdAt: range } }),
    db.repairmanPayment.findMany({ where: { paidAt: range } })
  ])
  return { sales, deposits, debtPayments, expenses, supplierPayments, refunds, repairmanPayments }
}

// Totals for the movements that fall in [start, end) (defaults to everything loaded)
export function summarize(movements, start = null, end = null) {
  const inRange = (d) => (!start || d >= start) && (!end || d < end)
  const sales = movements.sales.filter(s => inRange(s.createdAt))
  const deposits = movements.deposits.filter(d => inRange(d.paidAt))
  const debtPayments = movements.debtPayments.filter(p => inRange(p.paidAt))
  const expenses = movements.expenses.filter(e => inRange(e.expenseDate))
  const supplierPayments = movements.supplierPayments.filter(p => inRange(p.paidAt))
  const refunds = movements.refunds.filter(r => inRange(r.createdAt))
  const refundsPaid = refunds.reduce((s, r) => s + num(r.amount), 0)

  const totalRevenue = sales.reduce((s, x) => s + num(x.total), 0) - refunds.reduce((s, r) => s + num(r.revenue), 0)
  // Still owed by customers from these sales
  const totalCreditSales = sales.reduce((s, x) => s + Math.max(0, num(x.total) - num(x.amountPaid)), 0)
  const salesCash = sales.reduce((s, x) => s + num(x.amountPaid) - num(x.depositApplied), 0)
  const depositsCollected = deposits.reduce((s, d) => s + num(d.amount), 0)
  const cashSales = salesCash + depositsCollected - refundsPaid
  const totalDebtCollected = debtPayments.reduce((s, p) => s + num(p.amount), 0)
  const operatingExpenses = expenses.reduce((s, e) => s + num(e.amount), 0)
  const supplierPaid = supplierPayments.reduce((s, p) => s + num(p.amount), 0)
  // Paying a repairman is cash out; his share was already a cost of the repair on delivery (cogs)
  const repairmenPaid = (movements.repairmanPayments || []).filter(p => inRange(p.paidAt)).reduce((s, p) => s + num(p.amount), 0)
  const totalExpenses = operatingExpenses + supplierPaid + repairmenPaid
  const netCash = cashSales + totalDebtCollected - totalExpenses

  // Profit
  const saleCost = (x) => x.items.reduce((t, i) => t + num(i.unitCost) * i.quantity, 0)
  const cogs = sales.reduce((s, x) => s + saleCost(x), 0) - refunds.reduce((s, r) => s + num(r.cost), 0)
  const runningCosts = expenses.filter(e => e.category !== 'SUPPLIER_RESTOCK').reduce((s, e) => s + num(e.amount), 0)
  const grossProfit = totalRevenue - cogs
  const netProfit = grossProfit - runningCosts

  // Repair vs. product split (for information)
  const repairSales = sales.filter(x => x.repairTicketId)
  const ticketRevenue = repairSales.reduce((s, x) => s + num(x.total), 0)
  const ticketCogs = repairSales.reduce((s, x) => s + saleCost(x), 0)

  return {
    totalRevenue, totalCreditSales, cashSales, salesCount: sales.length,
    depositsCollected, refundsPaid, refundsCount: refunds.length, totalDebtCollected,
    operatingExpenses, supplierPaid, repairmenPaid, totalExpenses, netCash,
    cogs, grossProfit, runningCosts, netProfit,
    ticketRevenue, ticketCogs, netTicketProfit: ticketRevenue - ticketCogs
  }
}
