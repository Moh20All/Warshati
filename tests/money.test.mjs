// Daily close, monthly report and profit figures for a full day of business.
// Every expected number below was worked out by hand.
import { prepareEnv, startServer, setupOwner, createChecker } from './helpers/setup.mjs'

prepareEnv()
const { call, close } = await startServer()
const { check, finish } = createChecker()

try {
  const { o } = await setupOwner(call)

  // Stock: 5 x buy 100 -> expense 500
  let r = await o('POST', '/inventory', { type: 'ACCESSORY', name: 'Charger', buyPrice: 100, sellPrice: 200, quantity: 5 })
  const item = r.data.item
  const cust = (await o('POST', '/customers', { name: 'Ali', phone: '0550000000' })).data.customer
  const line = { inventoryItemId: item.id, name: 'Charger', unitPrice: 200, unitCost: 100, quantity: 1 }

  await o('POST', '/sales', { items: [line], paymentMethod: 'CASH', amountPaid: 200 })                     // cash 200
  await o('POST', '/sales', { customerId: cust.id, items: [line], paymentMethod: 'SPLIT', amountPaid: 50 })  // cash 50, owed 150
  await o('POST', '/sales', { customerId: cust.id, items: [line], paymentMethod: 'CREDIT', amountPaid: 200 }) // owed 200

  const saleDebts = (await o('GET', `/debts/customer/${cust.id}`)).data.debts
  await o('POST', `/debts/${saleDebts.find(d => Number(d.remaining) === 200).id}/payment`, { amount: 100 }) // collected 100

  // Ticket 1: deposit 1000, raised to 1500, finished, edited, delivered on CREDIT
  const t1 = (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Apple', deviceModel: 'iPhone 12', issueDesc: 'Screen', deposit: 1000 })).data.ticket
  await o('PUT', `/tickets/${t1.id}`, { deposit: 1500 })
  await o('POST', `/tickets/${t1.id}/transition`, { status: 'DONE', finalCost: 3000, partsCost: 800 })
  await o('PUT', `/tickets/${t1.id}`, { diagnosis: 'edited after done' })
  r = await o('POST', `/tickets/${t1.id}/transition`, { status: 'DELIVERED', paymentMethod: 'CREDIT' })
  check('ticket 1 delivered', r.status, 200)
  check('deposit change after invoice refused', (await o('PUT', `/tickets/${t1.id}`, { deposit: 0 })).status, 400)
  check('ticket 1 debt = 3000 - 1500 deposit', (await o('GET', `/tickets/${t1.id}`)).data.ticket.debtEntry?.remaining, 1500)

  // Ticket 2: deposit 500, delivered CASH for 2000 -> 1500 collected at delivery
  const t2 = (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Samsung', deviceModel: 'A52', issueDesc: 'Battery', deposit: 500 })).data.ticket
  await o('POST', `/tickets/${t2.id}/transition`, { status: 'DONE', finalCost: 2000, partsCost: 300 })
  await o('POST', `/tickets/${t2.id}/transition`, { status: 'DELIVERED', paymentMethod: 'CASH' })

  // Trade-ins: cash payout 1000 (expense), store credit 800 (no expense)
  await o('POST', '/trade-ins', { customerName: 'Sami', brand: 'Xiaomi', model: 'Note 10', appraisedValue: 1000, payoutMethod: 'CASH' })
  await o('POST', '/trade-ins', { customerName: 'Nadia', brand: 'Oppo', model: 'A5', appraisedValue: 800, payoutMethod: 'STORE_CREDIT' })

  // Supplier: PO on credit 300, pay 120
  const sup = (await o('POST', '/suppliers', { name: 'Parts Co' })).data.supplier
  await o('POST', '/purchase-orders', { supplierId: sup.id, lines: [{ inventoryItemId: item.id, quantity: 3, unitCost: 100 }], paymentMethod: 'CREDIT' })
  const sDebt = (await o('GET', `/suppliers/${sup.id}`)).data.supplier.supplierDebts[0]
  await o('POST', `/supplier-debts/${sDebt.id}/payment`, { amount: 120 })

  await o('POST', '/expenses', { category: 'RENT', description: 'Rent', amount: 250 })

  // Stock already owned (first setup): 10 x 50 must NOT become an expense
  check('existing stock created', (await o('POST', '/inventory', { type: 'PART', name: 'Old screens', buyPrice: 50, sellPrice: 90, quantity: 10, recordExpense: false })).status, 201)

  //  revenue       200+200+200+3000+2000                               = 5600
  //  credit owed   150+200+1500                                        = 1850
  //  cash in       sales 200+50+0+0+1500 + deposits 1500+500           = 3750
  //  cash out      stock 500 + trade-in 1000 + rent 250 + supplier 120 = 1870
  //  net cash      3750 + debt 100 - 1870                              = 1980
  //  profit        cogs 3x100 + 800 + 300 = 1400 ; 5600 - 1400 - rent 250 = 3950
  const p = (await o('GET', '/daily-close/preview')).data
  check('revenue', p.totalRevenue, 5600)
  check('credit sales (still owed)', p.totalCreditSales, 1850)
  check('cash sales incl. deposits', p.cashSales, 3750)
  check('deposits collected', p.depositsCollected, 2000)
  check('debt collected', p.totalDebtCollected, 100)
  check('supplier payments', p.supplierPaid, 120)
  check('total expenses', p.totalExpenses, 1870)
  check('net cash', p.netCash, 1980)
  check('repair revenue (delivered only)', p.ticketRevenue, 5000)
  check('cost of goods sold', p.cogs, 1400)
  check('gross profit', p.grossProfit, 4200)
  check('net profit (stock buying excluded)', p.netProfit, 3950)

  check('daily close saved net cash', (await o('POST', '/daily-close', {})).data.close?.netCash, 1980)

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const m = (await o('GET', `/reports/monthly?month=${month}`)).data
  check('monthly net cash = daily', m.summary.netCash, 1980)
  check('monthly revenue = daily', m.summary.totalRevenue, 5600)
  check('monthly net profit = daily', m.summary.netProfit, 3950)
  check('monthly breakdown has today', m.summary.dailyData.find(d => new Date(d.date).getDate() === now.getDate())?.net, 1980)
  finish()
} catch (e) {
  finish(e)
} finally {
  close()
}
