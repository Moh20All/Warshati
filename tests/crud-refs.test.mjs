// Edit/delete suppliers and tickets; every stock item gets a ref (typed or REF-xxxx) and is found by it.
import { prepareEnv, startServer, setupOwner, createChecker } from './helpers/setup.mjs'

prepareEnv()
const { check, finish } = createChecker()

try {
  const { call } = await startServer()
  const { o } = await setupOwner(call)
  await o('POST', '/users', { name: 'Staff', email: 's@t.local', password: 'pw123456', role: 'STAFF' })
  const staffToken = (await call(null, 'POST', '/auth/login', { email: 's@t.local', password: 'pw123456' })).data.token
  const s = (method, url, body) => call(staffToken, method, url, body)

  // ── Inventory refs ──
  const item = (body) => o('POST', '/inventory', { type: 'ACCESSORY', buyPrice: 100, sellPrice: 200, recordExpense: false, ...body })
  const a = (await item({ name: 'Câble' })).data.item
  const b = (await item({ name: 'Coque' })).data.item
  const c = (await item({ name: 'Verre', sku: 'VT-11' })).data.item
  check('no ref typed: automatic', a.sku, 'REF-0001')
  check('the next one follows', b.sku, 'REF-0002')
  check('a typed ref is kept', c.sku, 'VT-11')
  check('found by its ref', (await o('GET', '/inventory?search=REF-0002')).data.items.map(i => i.id).join(), b.id)
  check('scanned/typed ref finds it like a barcode', (await o('GET', '/inventory/barcode/VT-11')).data.item?.id, c.id)
  check('ref emptied on edit: a new automatic one', (await o('PUT', `/inventory/${c.id}`, { sku: '' })).data.item.sku, 'REF-0003')
  check('a ref is unique', (await item({ name: 'X', sku: 'REF-0001' })).status, 400)

  // ── Suppliers ──
  const sup = (await o('POST', '/suppliers', { name: 'Fournisseur A' })).data.supplier
  const edited = (await o('PUT', `/suppliers/${sup.id}`, { name: 'Fournisseur B', phone: '0550 11 22 33' })).data.supplier
  check('supplier edited', `${edited.name}|${edited.phone}`, 'Fournisseur B|0550 11 22 33')
  check('a supplier needs a name', (await o('PUT', `/suppliers/${sup.id}`, { name: ' ' })).status, 400)
  check('staff cannot delete a supplier', (await s('DELETE', `/suppliers/${sup.id}`)).status, 403)
  check('a supplier with no history is deleted', (await o('DELETE', `/suppliers/${sup.id}`)).data.archived, undefined)
  check('really gone', (await o('GET', `/suppliers/${sup.id}`)).status, 404)

  const owed = (await o('POST', '/suppliers', { name: 'Grossiste' })).data.supplier
  await o('POST', '/supplier-debts/opening', { supplierId: owed.id, amount: 5000 })
  check('not deleted while the store owes him', (await o('DELETE', `/suppliers/${owed.id}`)).data.error, 'OWED')
  const debt = (await o('GET', '/supplier-debts')).data.debts.find(d => d.supplierId === owed.id)
  await o('POST', `/supplier-debts/${debt.id}/payment`, { amount: 5000 })
  check('paid off, with history: only hidden', (await o('DELETE', `/suppliers/${owed.id}`)).data.archived, true)
  check('hidden from the list', (await o('GET', '/suppliers')).data.suppliers.some(x => x.id === owed.id), false)
  check('his history is still there', (await o('GET', `/suppliers/${owed.id}`)).data.supplier.supplierDebts.length, 1)

  // ── Tickets ──
  const newTicket = (extra = {}) => o('POST', '/tickets', { customerName: 'Client', customerPhone: '0661', deviceBrand: 'Samsung', deviceModel: 'A54', issueDesc: 'Écran', ...extra }).then(r => r.data.ticket)
  const t1 = await newTicket()
  const up = (await o('PUT', `/tickets/${t1.id}`, { deviceBrand: 'Xiaomi', deviceModel: 'Redmi 12', issueDesc: 'Batterie', imei: '3512', color: 'Noir', devicePassword: '1234', warrantyDays: 10, customerName: 'Client Corrigé', customerPhone: '0662' })).data.ticket
  check('every ticket field can be corrected', [up.deviceBrand, up.deviceModel, up.issueDesc, up.imei, up.color, up.devicePassword, up.warrantyDays, up.customer.name, up.customer.phone].join('|'),
    'Xiaomi|Redmi 12|Batterie|3512|Noir|1234|10|Client Corrigé|0662')
  check('the device cannot be emptied', (await o('PUT', `/tickets/${t1.id}`, { deviceModel: '' })).status, 400)

  const part = (await item({ name: 'Écran A54', type: 'PART', quantity: 3 })).data.item
  await o('POST', `/tickets/${t1.id}/parts`, { inventoryItemId: part.id, quantity: 2 })
  check('staff cannot delete a ticket', (await s('DELETE', `/tickets/${t1.id}`)).status, 403)
  check('ticket deleted', (await o('DELETE', `/tickets/${t1.id}`)).data.success, true)
  check('its parts are back in stock', (await o('GET', `/inventory/${part.id}`)).data.item.quantity, 3)
  check('ticket gone', (await o('GET', `/tickets/${t1.id}`)).status, 404)

  const withDeposit = await newTicket({ deposit: 1000 })
  check('a ticket with a deposit is not deleted', (await o('DELETE', `/tickets/${withDeposit.id}`)).data.error, 'LOCKED')
  const invoiced = await newTicket()
  await o('POST', `/tickets/${invoiced.id}/transition`, { status: 'DONE', finalCost: 3000 })
  await o('POST', `/tickets/${invoiced.id}/transition`, { status: 'DELIVERED', paymentMethod: 'CASH' })
  check('an invoiced ticket is not deleted', (await o('DELETE', `/tickets/${invoiced.id}`)).data.error, 'LOCKED')

  finish()
} catch (e) {
  finish(e)
}
