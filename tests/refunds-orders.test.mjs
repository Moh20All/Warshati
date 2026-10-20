// Refunds (stock, debt, money figures) and purchase orders.
import { prepareEnv, startServer, setupOwner, createChecker } from './helpers/setup.mjs'

prepareEnv()
const { call, close } = await startServer()
const { check, finish } = createChecker()

try {
  const { o } = await setupOwner(call)
  await o('POST', '/users', { name: 'Staff', email: 's@t.local', password: 'pw123456', role: 'STAFF' })
  const staff = (await call(null, 'POST', '/auth/login', { email: 's@t.local', password: 'pw123456' })).data.token

  const item = (await o('POST', '/inventory', { type: 'ACCESSORY', name: 'Case', buyPrice: 100, sellPrice: 200, quantity: 5, recordExpense: false })).data.item
  const cust = (await o('POST', '/customers', { name: 'Ali' })).data.customer
  const line = (q) => ({ inventoryItemId: item.id, name: 'Case', unitPrice: 200, unitCost: 100, quantity: q })

  // Sale A: cash 2 x 200 ; Sale B: credit 1 x 200, customer pays 50 later
  const saleA = (await o('POST', '/sales', { items: [line(2)], paymentMethod: 'CASH', amountPaid: 400 })).data.sale
  const saleB = (await o('POST', '/sales', { customerId: cust.id, items: [line(1)], paymentMethod: 'CREDIT' })).data.sale
  const debtB = (await o('GET', `/debts/customer/${cust.id}`)).data.debts[0]
  await o('POST', `/debts/${debtB.id}/payment`, { amount: 50 })
  check('stock after 3 sold', (await o('GET', `/inventory/${item.id}`)).data.item.quantity, 2)

  check('staff cannot refund', (await call(staff, 'POST', `/sales/${saleA.id}/refund`, {})).status, 403)

  let r = await o('POST', `/sales/${saleA.id}/refund`, { reason: 'changed mind' })
  check('refund cash sale', r.status, 200)
  check('cash sale: give back 400', r.data.refundedAmount, 400)
  check('cash sale marked REFUNDED', r.data.sale.status, 'REFUNDED')
  check('refund twice refused', (await o('POST', `/sales/${saleA.id}/refund`, {})).status, 400)

  r = await o('POST', `/sales/${saleB.id}/refund`, {})
  check('credit sale: give back only what was paid (50)', r.data.refundedAmount, 50)
  check('credit sale: debt closed', r.data.sale.debtEntry.status, 'SETTLED')
  check('credit sale: nothing left owed', Number(r.data.sale.debtEntry.remaining), 0)
  check('stock back to 5', (await o('GET', `/inventory/${item.id}`)).data.item.quantity, 5)
  check('payment on refunded debt refused', (await o('POST', `/debts/${debtB.id}/payment`, { amount: 10 })).status, 400)

  const t = (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'A', deviceModel: 'B', issueDesc: 'C' })).data.ticket
  await o('POST', `/tickets/${t.id}/transition`, { status: 'DONE', finalCost: 1000 })
  const delivered = (await o('POST', `/tickets/${t.id}/transition`, { status: 'DELIVERED', paymentMethod: 'CASH' })).data.ticket
  check('repair invoice refund refused', (await o('POST', `/sales/${delivered.sale.id}/refund`, {})).status, 400)

  //  revenue  400 + 200 + 1000(repair) - 400 - 200       = 1000
  //  cash     sales 400 + 0 + 1000 - refunds (400 + 50)   = 950 ; + debt 50 -> net cash 1000
  //  cogs     300 - 300 (returned)                         = 0   -> net profit 1000
  const p = (await o('GET', '/daily-close/preview')).data
  check('revenue after refunds', p.totalRevenue, 1000)
  check('refunds paid', p.refundsPaid, 450)
  check('cash sales after refunds', p.cashSales, 950)
  check('net cash after refunds', p.netCash, 1000)
  check('cogs after refunds', p.cogs, 0)
  check('net profit after refunds', p.netProfit, 1000)

  const sup = (await o('POST', '/suppliers', { name: 'Parts Co' })).data.supplier
  r = await o('POST', '/purchase-orders', { supplierId: sup.id, lines: [{ inventoryItemId: item.id, quantity: 4, unitCost: 90 }], paymentMethod: 'CASH' })
  check('cash purchase order', r.status, 201)
  check('PO stock 5 -> 9', (await o('GET', `/inventory/${item.id}`)).data.item.quantity, 9)
  const p2 = (await o('GET', '/daily-close/preview')).data
  check('cash PO is an expense (360)', p2.totalExpenses, 360)
  check('cash PO does not reduce profit', p2.netProfit, 1000)

  r = await o('POST', '/purchase-orders', { supplierId: sup.id, lines: [{ inventoryItemId: item.id, quantity: 2, unitCost: 100 }], paymentMethod: 'CREDIT' })
  const detail = (await o('GET', `/suppliers/${sup.id}`)).data.supplier
  check('credit PO creates a supplier debt', Number(detail.supplierDebts[0]?.remaining), 200)
  check('overpaying supplier refused', (await o('POST', `/supplier-debts/${detail.supplierDebts[0].id}/payment`, { amount: 500 })).status, 400)
  finish()
} catch (e) {
  finish(e)
} finally {
  close()
}
