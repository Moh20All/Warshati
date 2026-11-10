// The first screen gets one small answer; long lists stop at the latest 300 unless something is searched.
import { prepareEnv, startServer, setupOwner, createChecker } from './helpers/setup.mjs'

prepareEnv()
const { check, finish } = createChecker()

try {
  const { call } = await startServer()
  const { o } = await setupOwner(call)
  const cust = (await o('POST', '/customers', { name: 'Karim', phone: '0661' })).data.customer
  const item = (await o('POST', '/inventory', { type: 'ACCESSORY', name: 'Coque', quantity: 1000, buyPrice: 100, sellPrice: 300, lowStockAt: 2000, recordExpense: false })).data.item

  // 320 tickets (5 urgent, 3 done), 310 sales (one on credit)
  const prisma = (await import('../src/main/server/lib/prisma.js')).default
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } })
  await prisma.repairTicket.createMany({
    data: Array.from({ length: 320 }, (_, i) => ({ ticketNumber: `T-${i}`, customerId: cust.id, createdById: owner.id, deviceBrand: 'Samsung', deviceModel: 'A54', issueDesc: 'Écran', status: i < 3 ? 'DONE' : i < 200 ? 'DELIVERED' : 'IN_REPAIR', priority: i >= 315 ? 'URGENT' : 'NORMAL', receivedAt: new Date(Date.now() - i * 3600000) }))
  })
  for (let i = 0; i < 2; i++) await o('POST', '/sales', { items: [{ inventoryItemId: item.id, description: 'Coque', quantity: 1, unitCost: 100, unitPrice: 300 }], paymentMethod: 'CASH' })
  await o('POST', '/sales', { customerId: cust.id, items: [{ inventoryItemId: item.id, description: 'Coque', quantity: 2, unitCost: 100, unitPrice: 300 }], paymentMethod: 'CREDIT' })
  await prisma.sale.createMany({
    data: Array.from({ length: 307 }, (_, i) => ({ saleNumber: `S-${i}`, createdById: owner.id, subtotal: 300, total: 300, amountPaid: 300, createdAt: new Date(Date.now() - (i + 1) * 86400000) }))
  })

  // ── Dashboard ──
  const d = (await o('GET', '/dashboard')).data
  check('active / ready / urgent counted on the server', JSON.stringify(d.tickets), JSON.stringify({ active: 120, ready: 3, urgent: 5 }))
  check('only the latest 5 tickets travel', d.recentTickets.length, 5)
  check('latest active tickets for the printed overview', d.activeTickets.length, 10)
  check("today's sales, with their line count", d.todaySales.map(s => s.itemsCount).join(), '1,1,1')
  check('latest 5 sales', d.recentSales.length, 5)
  check('open debts: count and total', `${d.debts.open}|${d.debts.total}`, '1|600')
  check('low stock count', d.lowStock, 1)
  check('the answer stays small', JSON.stringify(d).length < 6000, true)

  // ── Lists ──
  const tk = (await o('GET', '/tickets')).data
  check('tickets: latest 300 of 320', `${tk.tickets.length}|${tk.total}|${tk.limited}`, '300|320|true')
  check('newest first', tk.tickets[0].ticketNumber, 'T-0')
  check('a search looks through everything', (await o('GET', '/tickets?search=T-319')).data.tickets.length, 1)
  check('a status filter counts its own total', (await o('GET', '/tickets?status=DONE')).data.limited, false)
  const sl = (await o('GET', '/sales')).data
  check('sales: latest 300 of 310', `${sl.sales.length}|${sl.total}|${sl.limited}`, '300|310|true')
  check('sale lines carry the item name, not the whole item', Object.keys(sl.sales[0].items[0].inventoryItem).sort().join(), 'id,name,type')
  check('an old invoice is found by number', (await o('GET', '/sales?search=S-306')).data.sales.length, 1)

  finish()
} catch (e) {
  finish(e)
}
