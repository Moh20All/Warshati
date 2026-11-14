// Activity log: sensitive actions are recorded with who did them. Monthly insights: repairs by brand /
// problem / repairman, products by type, slow stock.
import { prepareEnv, startServer, setupOwner, createChecker } from './helpers/setup.mjs'

prepareEnv()
const { check, finish } = createChecker()
const wait = (ms) => new Promise(r => setTimeout(r, ms))

try {
  const { call } = await startServer()
  const { o } = await setupOwner(call)
  await o('POST', '/users', { name: 'Staff', email: 's@t.local', password: 'pw123456', role: 'STAFF' })
  const staffToken = (await call(null, 'POST', '/auth/login', { email: 's@t.local', password: 'pw123456' })).data.token
  const s = (method, url, body) => call(staffToken, method, url, body)
  await o('PUT', '/store', { featRepairmen: true })

  // ── Things that get logged ──
  const item = (await o('POST', '/inventory', { type: 'PART', name: 'Écran A54', quantity: 5, buyPrice: 4000, sellPrice: 7000, recordExpense: false })).data.item
  await o('PUT', `/inventory/${item.id}`, { sellPrice: 7500, quantity: 4 })
  await o('PUT', `/inventory/${item.id}`, { name: 'Écran Samsung A54' }) // not a price: not logged
  const acc = (await o('POST', '/inventory', { type: 'ACCESSORY', name: 'Coque', quantity: 10, buyPrice: 100, sellPrice: 300, recordExpense: false })).data.item
  const sale = (await s('POST', '/sales', { items: [{ inventoryItemId: acc.id, description: 'Coque', quantity: 2, unitCost: 100, unitPrice: 300 }], discount: 100, paymentMethod: 'CASH', amountPaid: 500 })).data.sale
  await s('POST', '/sales', { items: [{ inventoryItemId: acc.id, description: 'Coque', quantity: 1, unitCost: 100, unitPrice: 300 }], paymentMethod: 'CASH' }) // no discount: not logged
  await o('POST', `/sales/${sale.id}/refund`, { reason: 'Client changed his mind' })
  const cust = (await o('POST', '/customers', { name: 'Karim', phone: '0661' })).data.customer
  const debt = (await o('POST', '/debts', { customerId: cust.id, amount: 5000 })).data.debt
  const paid = (await o('POST', `/debts/${debt.id}/payment`, { amount: 2000 })).data.debt
  await o('POST', `/debts/${debt.id}/payments/${paid.payments[0].id}/cancel`, { reason: 'typo' })
  const ali = (await o('POST', '/repairmen', { name: 'Ali', payType: 'FIXED', payValue: 1000 })).data.repairman
  const t1 = (await s('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Samsung', deviceModel: 'A54', issueDesc: 'Écran cassé, ne charge pas', finalCost: 9000, repairmanId: ali.id })).data.ticket
  await o('PUT', `/tickets/${t1.id}`, { finalCost: 9500 })
  const t2 = (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Samsung', deviceModel: 'A14', issueDesc: 'Batterie' })).data.ticket
  await o('POST', `/tickets/${t2.id}/transition`, { status: 'CANCELLED' })
  const t3 = (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Oppo', deviceModel: 'A57', issueDesc: 'x' })).data.ticket
  await o('DELETE', `/tickets/${t3.id}`)
  const exp = (await o('POST', '/expenses', { category: 'RENT', description: 'Loyer', amount: 20000 })).data.expense
  await o('DELETE', `/expenses/${exp.id}`)
  const sup = (await o('POST', '/suppliers', { name: 'Grossiste' })).data.supplier
  await o('DELETE', `/suppliers/${sup.id}`)
  await wait(300) // the log is written after the answer is sent

  check('staff cannot read the log', (await s('GET', '/activity')).status, 403)
  const log = (await o('GET', '/activity')).data
  const actions = log.entries.map(e => e.action).sort().join()
  // Every change is there once: the detailed line (price, cancel, delete…) replaces the plain one
  check('everything done in the shop is recorded once',
    actions, 'customer_create,debt_create,debt_payment,expense_create,expense_delete,inventory_create,inventory_create,inventory_price,inventory_quantity,inventory_update,login,payment_cancel,repairman_create,sale_create,sale_discount,sale_refund,settings_update,supplier_create,supplier_delete,ticket_cancel,ticket_create,ticket_create,ticket_create,ticket_delete,ticket_price,user_create')
  const by = (a) => log.entries.find(e => e.action === a)
  const first = (a) => log.entries.filter(e => e.action === a).at(-1) // the list is newest first
  check('a new ticket: who, number and device', `${first('ticket_create').userName}|${first('ticket_create').label}|${first('ticket_create').details.device}`, `Staff|${t1.ticketNumber}|Samsung A54`)
  check('a plain sale: number and total', `${by('sale_create').label.startsWith('INV-')}|${by('sale_create').details.total}`, 'true|300')
  check('a payment on a debt: whose and how much', `${by('debt_payment').label}|${by('debt_payment').details.amount}`, 'Karim|2000')
  check('signing in', `${by('login').userName}|${by('login').label}`, 'Staff|Staff')
  check('the "who" filter lists every account', log.users.map(u => u.name).sort().join(), 'Owner,Staff')
  check('price change keeps old → new', JSON.stringify(by('inventory_price').details), '{"sell":[7000,7500]}')
  check('stock typed by hand keeps old → new', JSON.stringify(by('inventory_quantity').details), '{"quantity":[5,4]}')
  check('the discount says who gave it', `${by('sale_discount').userName}|${by('sale_discount').details.discount}`, 'Staff|100')
  check('refund with its reason', `${by('sale_refund').label}|${by('sale_refund').details.reason}`, `${sale.saleNumber}|Client changed his mind`)
  check('cancelled payment: whose and how much', `${by('payment_cancel').label}|${by('payment_cancel').details.kind}|${by('payment_cancel').details.amount}`, 'Karim|customer|2000')
  check('repair price change on the ticket', `${by('ticket_price').label}|${by('ticket_price').details.price}`, `${t1.ticketNumber}|9000,9500`)
  check('deleted ticket: number and device', `${by('ticket_delete').label}|${by('ticket_delete').details.device}`, `${t3.ticketNumber}|Oppo A57`)
  check('deleted expense with its amount', `${by('expense_delete').label}|${by('expense_delete').details.amount}`, 'Loyer|20000')
  check('filter by action', (await o('GET', '/activity?action=ticket_cancel')).data.entries.length, 1)
  check('filter by user', (await o('GET', `/activity?userId=${by('sale_discount').userId}`)).data.entries.every(e => e.userName === 'Staff'), true)
  check('total counts everything', log.total, 26)

  // ── Insights ──
  await o('POST', `/tickets/${t1.id}/transition`, { status: 'DONE', finalCost: 9500, partsCost: 4000 })
  await o('POST', `/tickets/${t1.id}/transition`, { status: 'DELIVERED', paymentMethod: 'CASH' })
  const t4 = (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'samsung', deviceModel: 'S21', issueDesc: 'écran cassé', finalCost: 12000 })).data.ticket
  await o('POST', `/tickets/${t4.id}/transition`, { status: 'DONE', finalCost: 12000, partsCost: 7000 })
  await o('POST', `/tickets/${t4.id}/transition`, { status: 'DELIVERED', paymentMethod: 'CASH' })
  const month = new Date().toISOString().slice(0, 7)
  const { insights } = (await o('GET', `/reports/monthly?month=${month}`)).data
  const samsung = insights.byBrand.find(b => b.name.toLowerCase() === 'samsung')
  check('one line per brand, whatever the casing', insights.byBrand.length, 1)
  check('brand: repairs, revenue and profit (price − parts − share)', `${samsung.count}|${samsung.revenue}|${samsung.profit}`, '2|21500|9500')
  check('problem = first one written on the ticket', insights.byIssue.map(x => `${x.name}:${x.count}`).join(), 'Écran cassé:2')
  const aliLine = insights.byRepairman.find(r => r.name === 'Ali')
  check('repairman: his share and what the shop keeps', `${aliLine.count}|${aliLine.revenue}|${aliLine.share}|${aliLine.shop}`, '1|9500|1000|4500')
  const accLine = insights.products.find(p => p.type === 'ACCESSORY')
  check('products by type leave refunded sales out', `${accLine.quantity}|${accLine.revenue}|${accLine.profit}`, '1|300|200')
  check('slow stock: nothing is 90 days old in a fresh shop', insights.slowStock.count, 0)

  finish()
} catch (e) {
  finish(e)
}
