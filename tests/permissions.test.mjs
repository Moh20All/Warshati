// Owner vs staff: what each role may do, and owner lock-out protection.
import { prepareEnv, startServer, setupOwner, createChecker } from './helpers/setup.mjs'

prepareEnv()
const { call, close } = await startServer()
const { check, finish } = createChecker()

try {
  const { o, user: ownerUser } = await setupOwner(call)
  const ownerId = ownerUser.id

  check('owner cannot demote self', (await o('PUT', `/users/${ownerId}`, { role: 'STAFF' })).status, 400)
  check('owner cannot deactivate self (PUT)', (await o('PUT', `/users/${ownerId}`, { isActive: false })).status, 400)
  check('owner cannot deactivate self (DELETE)', (await o('DELETE', `/users/${ownerId}`)).status, 400)
  check('owner can still rename self', (await o('PUT', `/users/${ownerId}`, { name: 'Boss' })).status, 200)
  check('invalid role refused', (await o('POST', '/users', { name: 'X', email: 'x@t.local', password: 'pw', role: 'ADMIN' })).status, 400)

  const staffUser = (await o('POST', '/users', { name: 'Staff', email: 'staff@t.local', password: 'pw123456', role: 'STAFF' })).data.user
  const second = (await o('POST', '/users', { name: 'Owner2', email: 'o2@t.local', password: 'pw123456', role: 'OWNER' })).data.user
  check('owner can demote another owner', (await o('PUT', `/users/${second.id}`, { role: 'STAFF' })).status, 200)
  check('duplicate email on edit gives 400', (await o('PUT', `/users/${second.id}`, { email: 'staff@t.local' })).status, 400)

  const staff = (await call(null, 'POST', '/auth/login', { email: 'staff@t.local', password: 'pw123456' })).data.token
  const s = (m, u, b) => call(staff, m, u, b)

  const item = (await o('POST', '/inventory', { type: 'ACCESSORY', name: 'Cable', buyPrice: 100, sellPrice: 300, quantity: 5 })).data.item
  const exp = (await o('POST', '/expenses', { category: 'OTHER', description: 'x', amount: 10 })).data.expense
  const cust = (await o('POST', '/customers', { name: 'C' })).data.customer

  // Staff: daily work allowed
  check('staff: list inventory', (await s('GET', '/inventory')).status, 200)
  check('staff: sell at POS', (await s('POST', '/sales', { items: [{ inventoryItemId: item.id, name: 'Cable', unitPrice: 300, quantity: 1 }], paymentMethod: 'CASH' })).status, 201)
  check('staff: add expense', (await s('POST', '/expenses', { category: 'PETTY_CASH', description: 'tea', amount: 50 })).status, 201)
  check('staff: create ticket', (await s('POST', '/tickets', { customerId: cust.id, deviceBrand: 'A', deviceModel: 'B', issueDesc: 'C' })).status, 201)
  check('staff: list debts', (await s('GET', '/debts')).status, 200)
  const prev = await s('GET', '/daily-close/preview')
  check('staff: daily close preview', prev.status, 200)
  check('staff: preview hides profit', prev.data.netProfit === undefined && prev.data.netCash !== undefined, true)
  check('owner: preview shows profit', (await o('GET', '/daily-close/preview')).data.netProfit !== undefined, true)

  // Staff: refused
  check('staff: add inventory', (await s('POST', '/inventory', { type: 'PART', name: 'x', buyPrice: 1, sellPrice: 2 })).status, 403)
  check('staff: edit inventory price', (await s('PUT', `/inventory/${item.id}`, { sellPrice: 1 })).status, 403)
  check('staff: restock', (await s('POST', `/inventory/${item.id}/restock`, { addQuantity: 1 })).status, 403)
  check('staff: deactivate inventory', (await s('DELETE', `/inventory/${item.id}`)).status, 403)
  check('staff: edit expense', (await s('PUT', `/expenses/${exp.id}`, { amount: 1 })).status, 403)
  check('staff: delete expense', (await s('DELETE', `/expenses/${exp.id}`)).status, 403)
  check('staff: delete customer', (await s('DELETE', `/customers/${cust.id}`)).status, 403)
  check('staff: suppliers', (await s('GET', '/suppliers')).status, 403)
  check('staff: purchase orders', (await s('GET', '/purchase-orders')).status, 403)
  check('staff: supplier debts', (await s('GET', '/supplier-debts')).status, 403)
  check('staff: monthly report', (await s('GET', '/reports/monthly?month=2026-10')).status, 403)
  check('staff: users', (await s('GET', '/users')).status, 403)
  check('staff: store settings', (await s('PUT', '/store', { name: 'hacked' })).status, 403)
  check('staff: promote self', (await s('PUT', `/users/${staffUser.id}`, { role: 'OWNER' })).status, 403)
  finish()
} catch (e) {
  finish(e)
} finally {
  close()
}
