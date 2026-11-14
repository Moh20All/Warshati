// Permissions ticked by the owner for each account, and repairmen who sign in and see the repairs given to them.
import { prepareEnv, startServer, setupOwner, createChecker } from './helpers/setup.mjs'

prepareEnv()
const { call, close } = await startServer()
const { check, finish } = createChecker()

try {
  const { o } = await setupOwner(call)
  const login = async (email, password = 'pw123456') => {
    const r = await call(null, 'POST', '/auth/login', { email, password })
    return { status: r.status, user: r.data?.user, as: (m, u, b) => call(r.data?.token, m, u, b) }
  }
  const item = (await o('POST', '/inventory', { type: 'PART', name: 'Écran A54', buyPrice: 4000, sellPrice: 7000, quantity: 5, recordExpense: false })).data.item
  const cust = (await o('POST', '/customers', { name: 'Karim', phone: '0661' })).data.customer
  const sell = { items: [{ inventoryItemId: item.id, name: 'Écran A54', unitPrice: 7000, quantity: 1 }], paymentMethod: 'CASH' }

  // ── The list the apps draw their tick boxes from ──
  const listed = (await o('GET', '/users')).data
  check('the apps get the permission groups', Object.keys(listed.permissionGroups).join(), 'work,manage,sensitive')
  check('… and what a new user starts with', listed.staffDefault.join(), 'repairs,sales,tradeins,inventory,customers,debts,expenses,daily_close')

  // ── A user with one permission ──
  const made = await o('POST', '/users', { name: 'Seller', email: 'seller@t.local', password: 'pw123456', permissions: ['sales', 'fly'] })
  check('unknown permissions are dropped', made.data.user.permissions.join(), 'sales')
  const seller = await login('seller@t.local')
  check('sign-in tells the app what the account may do', seller.user.permissions.join(), 'sales')
  check('seller: sells', (await seller.as('POST', '/sales', sell)).status, 201)
  check('seller: reads stock for the till', (await seller.as('GET', '/inventory')).status, 200)
  check('seller: no tickets', (await seller.as('GET', '/tickets')).status, 403)
  check('seller: no expenses', (await seller.as('GET', '/expenses')).status, 403)
  check('seller: no debts', (await seller.as('GET', '/debts')).status, 403)
  check('seller: no daily close', (await seller.as('GET', '/daily-close/preview')).status, 403)
  check('seller: cannot add stock', (await seller.as('POST', '/inventory', { type: 'PART', name: 'x', buyPrice: 1, sellPrice: 2 })).status, 403)
  check('seller: no suppliers', (await seller.as('GET', '/suppliers')).status, 403)
  const dash = (await seller.as('GET', '/dashboard')).data
  check('seller: dashboard has sales, not tickets or debts', `${dash.todaySales.length}|${dash.tickets}|${dash.debts}`, '1|null|null')

  // ── The owner ticks more: it works at once, same sign-in ──
  await o('PUT', `/users/${made.data.user.id}`, { permissions: ['sales', 'inventory_edit', 'suppliers', 'reports', 'activity', 'refunds', 'corrections', 'expenses'] })
  check('now adds stock', (await seller.as('POST', '/inventory', { type: 'PART', name: 'Batterie', buyPrice: 1, sellPrice: 2 })).status, 201)
  check('now sees suppliers', (await seller.as('GET', '/suppliers')).status, 200)
  check('now sees the monthly report', (await seller.as('GET', '/reports/monthly?month=2026-10')).status, 200)
  check('now reads the activity log', (await seller.as('GET', '/activity')).status, 200)
  const sale = (await seller.as('POST', '/sales', sell)).data.sale
  check('now refunds a sale', (await seller.as('POST', `/sales/${sale.id}/refund`, { reason: 'x' })).status, 200)
  const exp = (await seller.as('POST', '/expenses', { category: 'OTHER', description: 'x', amount: 10 })).data.expense
  check('now deletes an expense', (await seller.as('DELETE', `/expenses/${exp.id}`)).status, 200)
  check('still not the users (owner only)', (await seller.as('GET', '/users')).status, 403)
  check('still not the shop settings (owner only)', (await seller.as('PUT', '/store', { name: 'x' })).status, 403)

  // ── Profit ──
  await o('POST', '/users', { name: 'Cashier', email: 'cash@t.local', password: 'pw123456', permissions: ['daily_close'] })
  const cashier = await login('cash@t.local')
  check('daily close without Profit: no margins', (await cashier.as('GET', '/daily-close/preview')).data.netProfit, undefined)
  await o('POST', '/users', { name: 'Partner', email: 'partner@t.local', password: 'pw123456', permissions: ['daily_close', 'profit'] })
  check('daily close with Profit: margins', (await (await login('partner@t.local')).as('GET', '/daily-close/preview')).data.netProfit !== undefined, true)

  // ── A user nobody set up keeps what staff could always do ──
  await o('POST', '/users', { name: 'Old', email: 'old@t.local', password: 'pw123456' })
  check('no list sent: the defaults', (await login('old@t.local')).user.permissions.join(), listed.staffDefault.join())

  // ── Repairmen ──
  await o('PUT', '/store', { featRepairmen: true })
  const ali = (await o('POST', '/repairmen', { name: 'Ali', payType: 'FIXED', payValue: 1000, account: { email: 'ali@t.local', password: 'pw123456' } })).data.repairman
  check('login needs both email and password', (await o('POST', '/repairmen', { name: 'Bad', account: { email: 'bad@t.local' } })).status, 400)
  check('a taken email is refused', (await o('POST', '/repairmen', { name: 'Twin', account: { email: 'ali@t.local', password: 'pw123456' } })).status, 400)
  check('… and nothing is half-saved', (await o('GET', '/repairmen')).data.repairmen.length, 1)
  const omar = (await o('POST', '/repairmen', { name: 'Omar' })).data.repairman // no login
  const shown = (await o('GET', '/repairmen')).data.repairmen
  check('the owner sees who has a login', shown.map(r => `${r.name}:${r.account?.email || '-'}`).join(), 'Ali:ali@t.local,Omar:-')
  check('repairmen are not in the users list', (await o('GET', '/users')).data.users.some(u => u.email === 'ali@t.local'), false)

  const mine = (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Samsung', deviceModel: 'A54', issueDesc: 'Écran', finalCost: 9000, repairmanId: ali.id })).data.ticket
  const other = (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Oppo', deviceModel: 'A57', issueDesc: 'Batterie', repairmanId: omar.id })).data.ticket
  const free = (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Apple', deviceModel: 'iPhone 11', issueDesc: 'Charge' })).data.ticket

  const r = await login('ali@t.local')
  check('repairman signs in', r.status, 200)
  check('his account: his own repairs, nothing ticked', `${r.user.repairmanId === ali.id}|${r.user.permissions.join()}`, 'true|my_repairs')
  const list = (await r.as('GET', '/tickets')).data
  check('his list: the repair given to him only', `${list.tickets.map(t => t.ticketNumber).join()}|${list.total}`, `${mine.ticketNumber}|1`)
  check('searching does not reveal other tickets', (await r.as('GET', '/tickets?search=Karim')).data.tickets.length, 1)
  check('opens his repair', (await r.as('GET', `/tickets/${mine.id}`)).status, 200)
  check("another repairman's repair does not exist for him", (await r.as('GET', `/tickets/${other.id}`)).status, 404)
  check('nor one given to nobody', (await r.as('PUT', `/tickets/${free.id}`, { diagnosis: 'x' })).status, 404)
  check('writes his diagnosis', (await r.as('PUT', `/tickets/${mine.id}`, { diagnosis: 'Écran HS', deposit: 5000, repairmanId: null, customerName: 'Hacked' })).status, 200)
  const after = (await o('GET', `/tickets/${mine.id}`)).data.ticket
  check('… but not the deposit, the customer or who it belongs to', `${after.diagnosis}|${Number(after.deposit)}|${after.repairmanId === ali.id}|${after.customer.name}`, 'Écran HS|0|true|Karim')
  check('takes a part from stock', (await r.as('POST', `/tickets/${mine.id}/parts`, { inventoryItemId: item.id, quantity: 1 })).status, 201)
  check('not on a repair that is not his', (await r.as('POST', `/tickets/${other.id}/parts`, { inventoryItemId: item.id, quantity: 1 })).status, 404)
  check('starts the repair', (await r.as('POST', `/tickets/${mine.id}/transition`, { status: 'IN_REPAIR' })).status, 200)
  check('marks it done', (await r.as('POST', `/tickets/${mine.id}/transition`, { status: 'DONE' })).status, 200)
  check('handing back (the invoice) stays at the counter', (await r.as('POST', `/tickets/${mine.id}/transition`, { status: 'DELIVERED', paymentMethod: 'CASH' })).status, 403)
  check('cannot cancel', (await r.as('POST', `/tickets/${mine.id}/transition`, { status: 'CANCELLED' })).status, 403)
  check('cannot open a new ticket', (await r.as('POST', '/tickets', { customerId: cust.id, deviceBrand: 'A', deviceModel: 'B', issueDesc: 'C' })).status, 403)
  check('cannot delete', (await r.as('DELETE', `/tickets/${mine.id}`)).status, 403)
  check('no till', (await r.as('POST', '/sales', sell)).status, 403)
  check('no customers list', (await r.as('GET', '/customers')).status, 403)
  const rd = (await r.as('GET', '/dashboard')).data
  check('his dashboard counts his repairs only', `${rd.tickets.ready}|${rd.recentTickets.length}|${rd.todaySales}`, '1|1|null')
  check('sees the names to hand a repair over, not the pay', JSON.stringify((await r.as('GET', '/repairmen')).data.repairmen[0]), JSON.stringify({ id: ali.id, name: 'Ali', isActive: true }))

  // ── The owner ticks things for a repairman too ──
  await o('PUT', `/repairmen/${ali.id}`, { account: { permissions: ['sales'] } })
  check('repairman given the till: sells', (await r.as('POST', '/sales', sell)).status, 201)
  check('… still only his repairs', (await r.as('GET', '/tickets')).data.total, 1)
  await o('PUT', `/repairmen/${ali.id}`, { account: { permissions: ['repairs'] } })
  check('given Repairs: every ticket', (await r.as('GET', '/tickets')).data.total, 3)
  check('… and the till is gone again', (await r.as('POST', '/sales', sell)).status, 403)

  // ── Someone who manages the repairmen cannot hand out logins ──
  await o('POST', '/users', { name: 'Manager', email: 'manager@t.local', password: 'pw123456', permissions: ['repairmen'] })
  const manager = await login('manager@t.local')
  check('manager edits a repairman', (await manager.as('PUT', `/repairmen/${ali.id}`, { payValue: 1500, account: { permissions: ['suppliers', 'refunds'] } })).status, 200)
  check('… but the permissions he sent are ignored', (await o('GET', '/repairmen')).data.repairmen[0].account.permissions.join(), 'repairs')

  // ── Switched off ──
  await o('PUT', `/repairmen/${ali.id}`, { account: { enabled: false } })
  check('login switched off: cannot sign in', (await login('ali@t.local')).status, 401)
  check('… and his open session stops', (await r.as('GET', '/tickets')).status, 401)
  await o('PUT', `/repairmen/${ali.id}`, { account: { enabled: true, password: 'newpass1' } })
  const back = await login('ali@t.local', 'newpass1')
  check('switched on with a new password, what was ticked is kept', `${back.status}|${back.user.permissions.join()}`, '200|repairs,my_repairs')
  await o('PUT', `/repairmen/${ali.id}`, { isActive: false })
  check('repairman switched off: his login too', (await login('ali@t.local', 'newpass1')).status, 401)

  // ── Two faults seen in a shop's log ──
  check('emptied estimate box saves', (await o('PUT', `/tickets/${free.id}`, { estimatedCost: '', finalCost: 5000 })).status, 200)
  check('stock without a sell price is refused, not a crash', (await o('POST', '/inventory', { type: 'ACCESSORY', name: 'HDMI', buyPrice: 600, sellPrice: null, quantity: 12 })).status, 400)
  finish()
} catch (e) {
  finish(e)
} finally {
  close()
}
