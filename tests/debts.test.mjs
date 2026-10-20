// Debts entered by hand (opening balances) and cancelling wrong payments — customers and suppliers.
// Expected figures are worked out by hand in the comments.
import { prepareEnv, startServer, setupOwner, createChecker } from './helpers/setup.mjs'

prepareEnv()
const { call, close } = await startServer()
const { check, finish } = createChecker()

try {
  const { o } = await setupOwner(call)
  await o('POST', '/users', { name: 'Staff', email: 's@t.local', password: 'pw123456', role: 'STAFF' })
  const staff = (await call(null, 'POST', '/auth/login', { email: 's@t.local', password: 'pw123456' })).data.token
  const preview = async () => (await o('GET', '/daily-close/preview')).data

  // ── POS: a customer who cannot pay everything ──
  const shopItem = (await o('POST', '/inventory', { type: 'ACCESSORY', name: 'Charger', buyPrice: 1000, sellPrice: 4000, quantity: 5, recordExpense: false })).data.item
  const line = [{ inventoryItemId: shopItem.id, name: 'Charger', unitPrice: 4000, unitCost: 1000, quantity: 1 }]
  let pos = await o('POST', '/sales', { items: line, paymentMethod: 'CASH', amountPaid: 1500 })
  check('cash paid short is refused (no lost money)', pos.status, 400)
  check('...with a clear message', /Split/.test(pos.data?.error || ''), true)
  check('...and stock untouched', (await o('GET', `/inventory/${shopItem.id}`)).data.item.quantity, 5)
  check('negative payment refused', (await o('POST', '/sales', { items: line, paymentMethod: 'CASH', amountPaid: -5 })).status, 400)
  check('split without a customer refused', (await o('POST', '/sales', { items: line, paymentMethod: 'SPLIT', amountPaid: 1500 })).status, 400)
  const buyer = (await o('POST', '/customers', { name: 'Walid', phone: '0770000000' })).data.customer
  check('POS adds a new customer by phone', !!buyer?.id, true)
  check('same phone twice refused', (await o('POST', '/customers', { name: 'Other', phone: '0770000000' })).status, 400)
  pos = await o('POST', '/sales', { customerId: buyer.id, items: line, paymentMethod: 'SPLIT', amountPaid: 1500 })
  check('split sale: pays 1500 of 4000', pos.status, 201)
  const owedDebt = (await o('GET', `/debts/customer/${buyer.id}`)).data.debts[0]
  check('rest becomes a debt (2500)', Number(owedDebt?.remaining), 2500)
  check('cash now = 1500, owed = 2500', (await preview()).cashSales === 1500 && (await preview()).totalCreditSales === 2500, true)
  check('cash paid in full still works', (await o('POST', '/sales', { items: line, paymentMethod: 'CASH', amountPaid: 5000 })).data.sale?.change, 1000)

  // ── Customer opening balance ──
  const base = await preview() // figures before any opening balance or debt payment
  let r = await o('POST', '/debts', { customerName: 'Karim', customerPhone: '0661000000', amount: 3000, date: '2026-03-01', notes: 'from notebook' })
  check('owner adds an old debt', r.status, 201)
  const debt = r.data.debt
  check('type is opening balance', debt.type, 'OPENING_BALANCE')
  check('keeps the original date', new Date(debt.createdAt).toISOString().slice(0, 10), '2026-03-01')
  check('new customer created', debt.customer.name, 'Karim')
  r = await o('POST', '/debts', { customerName: 'Karim B.', customerPhone: '0661000000', amount: 100 })
  check('same phone reuses the customer', r.data.debt.customerId, debt.customerId)
  const small = r.data.debt

  check('future date refused', (await o('POST', '/debts', { customerId: debt.customerId, amount: 10, date: '2999-01-01' })).status, 400)
  check('zero amount refused', (await o('POST', '/debts', { customerId: debt.customerId, amount: 0 })).status, 400)
  check('unknown customer refused', (await o('POST', '/debts', { customerId: 'nope', amount: 10 })).status, 400)
  check('staff cannot add debts', (await call(staff, 'POST', '/debts', { customerName: 'X', amount: 10 })).status, 403)

  // An old debt is not revenue and not cash today
  let p = await preview()
  check('old debt is not revenue today', p.totalRevenue, base.totalRevenue)
  check('old debt is not cash today', p.netCash, base.netCash)

  // ── Payments and cancelling a wrong one ──
  await o('POST', `/debts/${debt.id}/payment`, { amount: 500 })
  r = await o('POST', `/debts/${debt.id}/payment`, { amount: 2000 }) // the "wrong" one
  check('remaining after 500 + 2000', Number(r.data.debt.remaining), 500)
  const wrong = r.data.debt.payments.find(x => Number(x.amount) === 2000)
  check('debt collected today (500 + 2000)', (await preview()).totalDebtCollected, 2500)

  check('staff cannot cancel payments', (await call(staff, 'POST', `/debts/${debt.id}/payments/${wrong.id}/cancel`, {})).status, 403)
  r = await o('POST', `/debts/${debt.id}/payments/${wrong.id}/cancel`, { reason: 'typed 2000 instead of 200' })
  check('cancel the wrong payment', r.status, 200)
  check('amount owed goes back up (3000 - 500)', Number(r.data.debt.remaining), 2500)
  check('status back to partial', r.data.debt.status, 'PARTIAL')
  const reversal = r.data.debt.payments.find(x => x.reversalOf === wrong.id)
  check('cancelling entry recorded (−2000)', Number(reversal?.amount), -2000)
  check('reason kept', /typed 2000/.test(reversal?.notes || ''), true)
  check('cancelling twice refused', (await o('POST', `/debts/${debt.id}/payments/${wrong.id}/cancel`, {})).status, 400)
  check('cancelling the cancelling entry refused', (await o('POST', `/debts/${debt.id}/payments/${reversal.id}/cancel`, {})).status, 400)
  check('payment from another debt refused', (await o('POST', `/debts/${small.id}/payments/${wrong.id}/cancel`, {})).status, 400)

  //  cash today: 500 + 2000 − 2000 = 500
  p = await preview()
  check('debt collected today after the cancel', p.totalDebtCollected, 500)
  check('net cash today (+500 only)', p.netCash, base.netCash + 500)

  const first = (await o('GET', `/debts/customer/${debt.customerId}`)).data.debts.find(d => d.id === debt.id).payments.find(x => Number(x.amount) === 500)
  r = await o('POST', `/debts/${debt.id}/payments/${first.id}/cancel`, {})
  check('cancel every payment -> open again', r.data.debt.status, 'OPEN')
  check('owes the full 3000 again', Number(r.data.debt.remaining), 3000)
  check('paying again works after a cancel', (await o('POST', `/debts/${debt.id}/payment`, { amount: 3000 })).data.debt.status, 'SETTLED')

  // A refunded sale: its payments were already given back, so they cannot be cancelled
  const item = (await o('POST', '/inventory', { type: 'ACCESSORY', name: 'Case', buyPrice: 100, sellPrice: 200, quantity: 2, recordExpense: false })).data.item
  const sale = (await o('POST', '/sales', { customerId: debt.customerId, items: [{ inventoryItemId: item.id, name: 'Case', unitPrice: 200, quantity: 1 }], paymentMethod: 'CREDIT' })).data.sale
  const saleDebt = (await o('GET', `/debts/customer/${debt.customerId}`)).data.debts.find(d => d.saleId === sale.id)
  const salePay = (await o('POST', `/debts/${saleDebt.id}/payment`, { amount: 50 })).data.debt.payments[0]
  await o('POST', `/sales/${sale.id}/refund`, {})
  check('payment on a refunded sale cannot be cancelled', (await o('POST', `/debts/${saleDebt.id}/payments/${salePay.id}/cancel`, {})).status, 400)

  // ── Supplier opening balance + cancel ──
  const sup = (await o('POST', '/suppliers', { name: 'Parts Co' })).data.supplier
  const stockBefore = (await o('GET', `/inventory/${item.id}`)).data.item.quantity
  const expensesBefore = (await preview()).totalExpenses
  r = await o('POST', '/supplier-debts/opening', { supplierId: sup.id, amount: 10000, date: '2026-02-15', notes: 'old invoice' })
  check('supplier opening balance added', r.status, 201)
  check('numbered as opening balance', /^OB-\d{4}-0001$/.test(r.data.debt.purchaseOrder.orderNumber), true)
  check('no stock change', (await o('GET', `/inventory/${item.id}`)).data.item.quantity, stockBefore)
  check('not an expense today', (await preview()).totalExpenses, expensesBefore)
  check('future date refused (supplier)', (await o('POST', '/supplier-debts/opening', { supplierId: sup.id, amount: 1, date: '2999-01-01' })).status, 400)
  check('staff cannot add supplier debts', (await call(staff, 'POST', '/supplier-debts/opening', { supplierId: sup.id, amount: 1 })).status, 403)

  const sDebt = r.data.debt
  const cashBefore = (await preview()).netCash
  r = await o('POST', `/supplier-debts/${sDebt.id}/payment`, { amount: 4000 })
  const sPay = r.data.debt.payments[0]
  check('paying the supplier reduces cash by 4000', (await preview()).netCash, cashBefore - 4000)
  r = await o('POST', `/supplier-debts/${sDebt.id}/payments/${sPay.id}/cancel`, { reason: 'paid by bank, not cash' })
  check('cancel supplier payment', r.status, 200)
  check('supplier owed 10000 again', Number(r.data.debt.remaining), 10000)
  check('order back to unpaid', r.data.debt.purchaseOrder.paymentStatus, 'UNPAID')
  check('cash back to before the payment', (await preview()).netCash, cashBefore)
  check('supplier cancel twice refused', (await o('POST', `/supplier-debts/${sDebt.id}/payments/${sPay.id}/cancel`, {})).status, 400)

  const detail = (await o('GET', `/suppliers/${sup.id}`)).data.supplier
  check('supplier page shows the opening balance', detail.supplierDebts.length === 1 && detail.purchaseOrders[0].orderNumber.startsWith('OB-'), true)

  // Monthly report agrees with the daily figures
  const now = new Date()
  const m = (await o('GET', `/reports/monthly?month=${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)).data
  check('monthly net cash = daily', m.summary.netCash, (await preview()).netCash)
  finish()
} catch (e) {
  finish(e)
} finally {
  close()
}
