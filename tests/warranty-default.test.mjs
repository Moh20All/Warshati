// Repair warranty: new shops start at 5 days; a new ticket takes the shop's setting unless a value is typed;
// a warranty claim's new ticket follows the shop's setting too.
import { prepareEnv, startServer, setupOwner, createChecker } from './helpers/setup.mjs'

prepareEnv()
const { check, finish } = createChecker()

try {
  const { call } = await startServer()
  const { o } = await setupOwner(call)

  check('new shop: default warranty is 5 days', (await o('GET', '/store')).data.store.warrantyDays, 5)
  const cust = (await o('POST', '/customers', { name: 'Karim', phone: '0555123456' })).data.customer
  const newTicket = async (extra = {}) => (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Samsung', deviceModel: 'A54', issueDesc: 'Écran cassé, Ne charge pas', ...extra })).data.ticket

  check('ticket without a warranty: the shop default', (await newTicket()).warrantyDays, 5)
  check('typed warranty is kept', (await newTicket({ warrantyDays: 90 })).warrantyDays, 90)
  check('0 days (no warranty) is kept', (await newTicket({ warrantyDays: 0 })).warrantyDays, 0)
  check('several phrases are saved as typed', (await newTicket()).issueDesc, 'Écran cassé, Ne charge pas')

  await o('PUT', '/store', { warrantyDays: 14 })
  check('after changing the setting: new tickets follow it', (await newTicket()).warrantyDays, 14)

  // Warranty claim → new ticket
  const done = await newTicket({ warrantyDays: 30 })
  await o('POST', `/tickets/${done.id}/transition`, { status: 'DONE', finalCost: 5000 })
  await o('POST', `/tickets/${done.id}/transition`, { status: 'DELIVERED', paymentMethod: 'CASH' })
  const claim = (await o('POST', '/warranty', { originalTicketId: done.id, issueDesc: 'Écran noir' })).data.claim
  check('claim within warranty', claim?.isWithinWarranty, true)
  const again = (await o('POST', `/warranty/${claim.id}/new-ticket`)).data.ticket
  check('claim ticket: the shop default warranty', again?.warrantyDays, 14)

  finish()
} catch (e) {
  finish(e)
}
