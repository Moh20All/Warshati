// API key, login lock-out, parts from stock, automatic backups and licensing (against a fake Supabase).
import fs from 'fs'
import path from 'path'
import { prepareEnv, startServer, setupOwner, createChecker, importProject, projectRequire } from './helpers/setup.mjs'

prepareEnv()
process.env.VITE_SUPABASE_URL = 'https://fake.supabase.test'
process.env.VITE_SUPABASE_ANON_KEY = 'anon'

// ── Fake Supabase: the `license` Edge Function and the licenses table ──
const realFetch = globalThis.fetch
globalThis.__realFetch = realFetch
const sb = { functionDeployed: false, down: false, rec: null, calls: [] }
globalThis.fetch = async (url, opts = {}) => {
  if (!String(url).startsWith('https://fake.supabase.test')) return realFetch(url, opts)
  sb.calls.push(`${opts.method || 'GET'} ${new URL(url).pathname}`)
  if (sb.down) throw new Error('getaddrinfo ENOTFOUND')
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status })
  const u = new URL(url)
  if (u.pathname === '/functions/v1/license') {
    if (!sb.functionDeployed) return reply({ code: 'NOT_FOUND' }, 404)
    const { action, machineId } = JSON.parse(opts.body)
    const r = sb.rec
    if (!r) return reply({ status: 'not_found' })
    if (!r.is_active) return reply({ status: 'revoked' })
    if (r.machine_id) return reply({ status: r.machine_id === machineId ? 'valid' : 'other_device' })
    if (action === 'validate') return reply({ status: 'other_device' })
    r.machine_id = machineId
    return reply({ status: 'valid' })
  }
  if (u.pathname === '/rest/v1/licenses' && (opts.method || 'GET') === 'GET') return reply(sb.rec ? [sb.rec] : [])
  if (u.pathname === '/rest/v1/licenses' && opts.method === 'PATCH') {
    if (sb.rec && !sb.rec.machine_id) { sb.rec.machine_id = JSON.parse(opts.body).machine_id; return reply([sb.rec]) }
    return reply([])
  }
  return reply({}, 500)
}

const { call, close } = await startServer()
const { checkLicense, activateLicense, OFFLINE_GRACE_DAYS } = await importProject('src/main/license.js')
const { runAutoBackup, autoBackupDir } = await importProject('src/main/server/lib/backup.js')
const { default: prisma } = await importProject('src/main/server/lib/prisma.js')
const { machineIdSync } = projectRequire('node-machine-id')
const { PrismaClient } = projectRequire('@prisma/client')
const { check, finish } = createChecker()

try {
  // ── API key ──
  check('no key -> refused', (await call(null, 'GET', '/store/status', null, null)).status, 403)
  check('wrong key -> refused', (await call(null, 'GET', '/store/status', null, 'nope')).status, 403)
  check('health stays open', (await call(null, 'GET', '/health', null, null)).status, 200)
  check('with key -> ok', (await call(null, 'GET', '/store/status')).status, 200)

  const { o } = await setupOwner(call, 'Owner@T.local')

  // ── Login lock-out ──
  check('login with typed-case email', (await call(null, 'POST', '/auth/login', { email: 'Owner@T.local', password: 'pw123456' })).status, 200)
  for (let i = 0; i < 5; i++) await call(null, 'POST', '/auth/login', { email: 'owner@t.local', password: 'wrong' })
  check('locked after 5 wrong passwords (even with the right one)', (await call(null, 'POST', '/auth/login', { email: 'Owner@T.local', password: 'pw123456' })).status, 429)

  // ── Parts from stock ──
  const part = (await o('POST', '/inventory', { type: 'PART', name: 'Screen A12', buyPrice: 1500, sellPrice: 3000, quantity: 3, recordExpense: false })).data.item
  const cust = (await o('POST', '/customers', { name: 'Ali' })).data.customer
  const ticket = (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Samsung', deviceModel: 'A12', issueDesc: 'Screen' })).data.ticket
  let r = await o('POST', `/tickets/${ticket.id}/parts`, { inventoryItemId: part.id, quantity: 2 })
  check('use 2 parts', r.status, 201)
  check('partsCost = 2 x 1500', r.data.partsCost, 3000)
  check('stock 3 -> 1', (await o('GET', `/inventory/${part.id}`)).data.item.quantity, 1)
  check('cannot use more than in stock', (await o('POST', `/tickets/${ticket.id}/parts`, { inventoryItemId: part.id, quantity: 5 })).status, 400)
  r = await o('DELETE', `/tickets/${ticket.id}/parts/${r.data.parts[0].id}`)
  check('return part -> partsCost 0', r.data.partsCost, 0)
  check('stock back to 3', (await o('GET', `/inventory/${part.id}`)).data.item.quantity, 3)
  await o('POST', `/tickets/${ticket.id}/parts`, { inventoryItemId: part.id, quantity: 1 })
  await o('POST', `/tickets/${ticket.id}/transition`, { status: 'DONE', finalCost: 5000, partsCost: 1500 })
  await o('POST', `/tickets/${ticket.id}/transition`, { status: 'DELIVERED', paymentMethod: 'CASH' })
  check('parts locked after invoice', (await o('POST', `/tickets/${ticket.id}/parts`, { inventoryItemId: part.id, quantity: 1 })).status, 400)
  check('repair profit uses part cost (5000 - 1500)', (await o('GET', '/daily-close/preview')).data.netProfit, 3500)

  // Owner's example: 10 000 repair (9 000 parts) paid cash, 24 000 repair (20 000 parts) on credit then paid
  const repair = async (price, parts, method) => {
    const tk = (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'Samsung', deviceModel: 'A54', issueDesc: 'Screen' })).data.ticket
    await o('POST', `/tickets/${tk.id}/transition`, { status: 'DONE', finalCost: price, partsCost: parts })
    return (await o('POST', `/tickets/${tk.id}/transition`, { status: 'DELIVERED', paymentMethod: method })).data.ticket
  }
  await repair(10000, 9000, 'CASH')
  const credit = await repair(24000, 20000, 'CREDIT')
  const owed = (await o('GET', '/debts')).data.debts.find(d => d.repairTicketId === credit.id)
  await o('POST', `/debts/${owed.id}/payment`, { amount: 24000 })
  const day = (await o('GET', '/daily-close/preview')).data
  check('day: parts cost of the repairs (1500 + 9000 + 20000)', day.cogs, 30500)
  check('day: net profit = revenue - parts (3500 + 1000 + 4000)', day.netProfit, 8500)
  check('day: drawer cash counts the cash repair and the paid debt (5000 + 10000 + 24000)', day.netCash, 39000)

  // ── Automatic backups ──
  await runAutoBackup(); await runAutoBackup()
  const autoFiles = () => fs.readdirSync(autoBackupDir()).filter(f => f.startsWith('warshati-auto-')).sort()
  check('one backup per day', autoFiles().length, 1)
  for (let i = 1; i <= 16; i++) fs.writeFileSync(path.join(autoBackupDir(), `warshati-auto-2020-01-${String(i).padStart(2, '0')}.db`), 'x')
  await runAutoBackup()
  const files = autoFiles()
  check('keeps only 14', files.length, 14)
  check('oldest dropped, today kept', !files.includes('warshati-auto-2020-01-01.db') && files.some(f => !f.startsWith('warshati-auto-2020')), true)
  const copy = new PrismaClient({ datasources: { db: { url: `file:${path.join(autoBackupDir(), files.find(f => !f.startsWith('warshati-auto-2020')))}` } } })
  check('backup is a real DB with the data', await copy.inventoryItem.count(), 1)
  await copy.$disconnect()

  // ── Licensing ──
  check('no local license -> activation screen', (await checkLicense()).valid, false)
  sb.rec = { id: 'L1', key: 'KEY-1', is_active: true, machine_id: null }
  check('activate (function not deployed -> table fallback)', (await activateLicense(' key-1 ')).ok, true)
  check('key bound to this machine', sb.rec.machine_id, machineIdSync())
  check('validate online', (await checkLicense()).valid, true)

  sb.down = true
  check('offline within grace -> works', (await checkLicense()).valid, true)
  const lic = await prisma.localLicense.findFirst()
  await prisma.localLicense.update({ where: { id: lic.id }, data: { lastValidatedAt: new Date(Date.now() - (OFFLINE_GRACE_DAYS + 5) * 86400000) } })
  const expired = await checkLicense()
  check('offline past grace -> blocked', expired.valid, false)
  check('...with a message', /could not verify/i.test(expired.deactivationMessage || ''), true)
  check('...but local license kept', !!(await prisma.localLicense.findFirst()), true)
  sb.down = false
  check('back online -> works again', (await checkLicense()).valid, true)

  sb.functionDeployed = true
  sb.calls.length = 0
  check('validate via Edge Function', (await checkLicense()).valid, true)
  check('...without touching the table', sb.calls.every(c => c.includes('/functions/v1/license')), true)

  sb.rec.machine_id = 'SOMEONE-ELSE'
  check('moved to another PC -> deactivated', (await checkLicense()).valid, false)
  check('...local license removed', await prisma.localLicense.count(), 0)
  check('activate key in use elsewhere refused', (await activateLicense('KEY-1')).code, 'in_use')
  sb.rec.machine_id = null; sb.rec.is_active = false
  check('activate revoked key refused', (await activateLicense('KEY-1')).code, 'revoked')
  sb.down = true
  check('activate while offline -> offline error', (await activateLicense('KEY-1')).code, 'offline')
  finish()
} catch (e) {
  finish(e)
} finally {
  close()
}
