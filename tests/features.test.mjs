// v1.8 features: store switches, supplier balance on the list, opening cash, repairmen paid per repair.
import { prepareEnv, startServer, setupOwner, createChecker } from './helpers/setup.mjs'

prepareEnv()
const { check, finish } = createChecker()

try {
  const { call } = await startServer()
  const { o } = await setupOwner(call)
  await o('POST', '/users', { name: 'Staff', email: 's@t.local', password: 'pw123456', role: 'STAFF' })
  const staffToken = (await call(null, 'POST', '/auth/login', { email: 's@t.local', password: 'pw123456' })).data.token
  const s = (method, url, body) => call(staffToken, method, url, body)

  // ── Store switches ──
  let store = (await o('GET', '/store')).data.store
  check('defaults: check-in on, delivery receipt on, quick cash on, drawer float off, repairmen off',
    JSON.stringify([store.featCheckIn, store.featDeliveryReceipt, store.featQuickCash, store.featDrawerFloat, store.featRepairmen]), '[true,true,true,false,false]')
  store = (await o('PUT', '/store', { featDrawerFloat: true, drawerFloat: 6000, featRepairmen: true })).data.store
  check('switches saved', JSON.stringify([store.featDrawerFloat, store.drawerFloat, store.featRepairmen]), '[true,6000,true]')
  check('staff cannot change them', (await s('PUT', '/store', { featRepairmen: false })).status, 403)

  // ── Supplier list shows what the store owes ──
  const sup = (await o('POST', '/suppliers', { name: 'Fournisseur A' })).data.supplier
  await o('POST', '/supplier-debts/opening', { supplierId: sup.id, amount: 15000 })
  const debt = (await o('GET', '/supplier-debts')).data.debts[0]
  await o('POST', `/supplier-debts/${debt.id}/payment`, { amount: 5000 })
  check('owed on the supplier list', (await o('GET', '/suppliers')).data.suppliers.find(x => x.id === sup.id).owed, 10000)

  // ── Repairmen ──
  const ali = (await o('POST', '/repairmen', { name: 'Ali', payType: 'PROFIT_PERCENT', payValue: 40 })).data.repairman
  const sami = (await o('POST', '/repairmen', { name: 'Sami', payType: 'PRICE_PERCENT', payValue: 10 })).data.repairman
  const karim = (await o('POST', '/repairmen', { name: 'Karim', payType: 'FIXED', payValue: 1500 })).data.repairman
  check('staff see names only', Object.keys((await s('GET', '/repairmen')).data.repairmen[0]).sort().join(), 'id,isActive,name')
  check('staff cannot add a repairman', (await s('POST', '/repairmen', { name: 'X' })).status, 403)

  const cust = (await o('POST', '/customers', { name: 'Client' })).data.customer
  const deliver = async (repairmanId, extra = {}, as = o) => {
    const t = (await as('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Samsung', deviceModel: 'A54', issueDesc: 'Écran cassé', repairmanId, ...extra })).data.ticket
    await o('POST', `/tickets/${t.id}/transition`, { status: 'DONE', finalCost: 20000, partsCost: 15000 })
    await o('POST', `/tickets/${t.id}/transition`, { status: 'DELIVERED', paymentMethod: 'CASH' })
    return (await o('GET', `/tickets/${t.id}`)).data.ticket
  }

  // The owner's example: price 20000, parts 15000, repairman 2000 → the store keeps 3000
  const t1 = await deliver(ali.id)
  check('40% of the profit (20000 − 15000) = 2000', Number(t1.repairmanPay), 2000)
  check('repair cost on the invoice = parts + repairman', Number((await o('GET', `/sales/${t1.sale.id}`)).data.sale.items[0].unitCost), 17000)
  check('10% of the price = 2000', Number((await deliver(sami.id)).repairmanPay), 2000)
  check('fixed amount', Number((await deliver(karim.id)).repairmanPay), 1500)
  check('share typed by hand wins over the rule', Number((await deliver(ali.id, { repairmanPay: 2500 })).repairmanPay), 2500)
  check('staff cannot set the share (his rule is used)', Number((await deliver(ali.id, { repairmanPay: 9999 }, s)).repairmanPay), 2000)
  check('staff do not see the share on a ticket', (await s('GET', `/tickets/${t1.id}`)).data.ticket.repairmanPay, undefined)

  let page = (await o('GET', `/repairmen/${ali.id}`)).data.repairman
  check('Ali earned 2000 + 2500 + 2000', page.earned, 6500)
  check('Ali is owed all of it', page.owed, 6500)
  check('his repairs listed with their share', page.tickets.length, 3)

  const before = (await o('GET', '/daily-close/preview')).data
  check('profit counts his share as a cost: 5 repairs × 20000 − parts − shares', before.netProfit, 5 * 20000 - 5 * 15000 - (2000 + 2000 + 1500 + 2500 + 2000))
  check('staff cannot pay a repairman', (await s('POST', `/repairmen/${ali.id}/payments`, { amount: 100 })).status, 403)
  check('a payment must be positive', (await o('POST', `/repairmen/${ali.id}/payments`, { amount: 0 })).status, 400)
  const paid = (await o('POST', `/repairmen/${ali.id}/payments`, { amount: 4000 })).data
  check('balance after paying 4000', paid.owed, 2500)
  const after = (await o('GET', '/daily-close/preview')).data
  check('paying him is cash out today', after.netCash, before.netCash - 4000)
  check('shown in the daily close', after.repairmenPaid, 4000)
  check('paying him does not change the profit again', after.netProfit, before.netProfit)

  // ── Opening cash is saved with the daily close ──
  const close = (await o('POST', '/daily-close', { openingCash: 6000 })).data.close
  check('opening cash saved', Number(close.openingCash), 6000)

  finish()
} catch (e) {
  finish(e)
}
