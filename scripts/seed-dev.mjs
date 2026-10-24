// Development only: clears the shop data in prisma/warshati.db and fills it with a shop that has
// been running for about a month, using the app's real API (so stock, numbers, debts and the
// daily figures stay consistent), then back-dates the records across the last 30 days.
//
// Keeps: store settings, user accounts, the license, the device catalog.
// Clears: customers, stock, check-ins, tickets, sales, refunds, debts, suppliers, orders,
//         expenses, trade-ins, warranty claims, daily closes.
//
// Run with the app CLOSED:   npm run seed:dev
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

// App code comes from this project; the database is the dev one of the folder it runs in
// (prisma.js uses <working folder>/prisma/warshati.db in development)
const root = fileURLToPath(new URL('..', import.meta.url))
const dbFile = path.join(process.cwd(), 'prisma', 'warshati.db')
if (!fs.existsSync(dbFile)) { console.error('No prisma/warshati.db here. Run this from the project folder.'); process.exit(1) }

// Electron stub settings (tests/helpers/electron-stub.mjs): a throwaway userData folder for logs / JWT secret
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'warshati-seed-'))
fs.mkdirSync(path.join(scratch, 'userData'))
process.env.WARSHATI_TEST_DIR = scratch
process.env.WARSHATI_PACKAGED = '0'
process.env.WARSHATI_APP_PATH = root
process.resourcesPath = scratch

const load = (p) => import(pathToFileURL(path.join(root, p)).href)
const { default: prisma } = await load('src/main/server/lib/prisma.js')
const { default: app } = await load('src/main/server/index.js')
const { SESSION_KEY } = await load('src/main/server/lib/session-key.js')
const { signToken } = await load('src/main/server/lib/jwt.js')
const { dayRange, loadMovements, summarize } = await load('src/main/server/lib/finance.js')
const { syncCatalog } = await load('src/main/server/lib/catalog.js')
await syncCatalog(prisma) // makes sure the bundled device catalog is loaded (phones are picked from it)

// ── Deterministic random, so every run builds the same shop ───────────────────────
let seed = 20261024
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const chance = (p) => rnd() < p
const r500 = (n) => Math.max(500, Math.round(n / 500) * 500)
const r100 = (n) => Math.max(100, Math.round(n / 100) * 100)

const DAY = 86400000
function at(daysAgo, hourFrom = 9, hourTo = 19) {
  const d = new Date(Date.now() - daysAgo * DAY)
  d.setHours(int(hourFrom, hourTo), int(0, 59), int(0, 59), 0)
  return d > new Date() ? new Date(Date.now() - int(1, 30) * 60000) : d
}

function imei() {
  const d = [3, 5, ...Array.from({ length: 12 }, () => int(0, 9))]
  const sum = d.reduce((s, n, i) => { let v = i % 2 ? n * 2 : n; if (v > 9) v -= 9; return s + v }, 0)
  return d.join('') + ((10 - (sum % 10)) % 10)
}

// ── 1. Backup ──────────────────────────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)
const backup = path.join(process.cwd(), 'prisma', `warshati-before-seed-${stamp}.db`)
fs.copyFileSync(dbFile, backup)
console.log(`Backup: ${path.relative(process.cwd(), backup)}`)

const owner = await prisma.user.findFirst({ where: { role: 'OWNER', isActive: true }, orderBy: { createdAt: 'asc' } })
if (!owner) { console.error('No owner account yet: open the app once and finish the setup wizard first.'); process.exit(1) }
const staff = await prisma.user.findFirst({ where: { role: 'STAFF', isActive: true } })

// ── 2. Clear shop data (children first) ───────────────────────────────────────────
for (const model of ['warrantyClaim', 'repairPart', 'repairDeposit', 'refund', 'saleItem', 'debtPayment', 'debtEntry', 'sale',
  'tradeIn', 'repairTicket', 'checkIn', 'supplierDebtPayment', 'supplierDebt', 'purchaseOrderItem', 'purchaseOrder',
  'expense', 'supplier', 'inventoryItem', 'dailyClose', 'customer']) {
  const { count } = await prisma[model].deleteMany({})
  if (count) console.log(`  cleared ${count} ${model}`)
}

// ── 3. Talk to the real API as the owner ─────────────────────────────────────────
const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}/api`
const token = signToken(owner)
async function api(method, url, body) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-warshati-key': SESSION_KEY, Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => null)
  if (res.status >= 400) throw new Error(`${method} ${url} -> ${res.status} ${JSON.stringify(data)}`)
  return data
}

// ── 4. Customers (50) ─────────────────────────────────────────────────────────────
const FIRST = ['Mohamed', 'Amine', 'Yacine', 'Karim', 'Sofiane', 'Bilal', 'Walid', 'Riad', 'Nassim', 'Hichem', 'Anis', 'Rayan', 'Islam', 'Fares', 'Oussama',
  'Amina', 'Sarah', 'Meriem', 'Lina', 'Yasmine', 'Imane', 'Nour', 'Rania', 'Khadija', 'Fatima', 'Lydia', 'Asma', 'Selma', 'Houda', 'Samira']
const LAST = ['Benali', 'Bouzid', 'Haddad', 'Mansouri', 'Belkacem', 'Saidi', 'Khelifi', 'Rahmani', 'Boudiaf', 'Cherif', 'Meziane', 'Benamar', 'Kaci',
  'Hamidi', 'Zerrouki', 'Brahimi', 'Ouali', 'Amrani', 'Djebbar', 'Ferhat', 'Messaoudi', 'Taleb', 'Larbi', 'Guendouz', 'Chaouch']
const usedPhones = new Set()
const phoneNo = () => { let p; do { p = `0${pick(['5', '6', '7'])}${int(10, 99)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)}` } while (usedPhones.has(p)); usedPhones.add(p); return p }
const customers = []
for (let i = 0; i < 50; i++) {
  const c = (await api('POST', '/customers', { name: `${pick(FIRST)} ${pick(LAST)}`, phone: phoneNo(), notes: chance(0.15) ? pick(['Fidèle client', 'Revendeur', 'Préfère WhatsApp', 'Paie en fin de mois']) : undefined })).customer
  customers.push(c)
}
console.log(`  ${customers.length} customers`)

// ── 5. Phones in stock (50), real catalog models ──────────────────────────────────
const catalog = await prisma.deviceCatalog.findMany({ where: { category: 'PHONE', isCustom: false } })
const brands = ['Samsung', 'Xiaomi', 'Apple', 'Oppo', 'Realme', 'Infinix', 'Tecno', 'Vivo', 'Honor', 'Nokia']
const phonesPool = catalog.filter((d) => brands.includes(d.brand))
const phones = []
const takenModels = new Set()
while (phones.length < 50 && takenModels.size < phonesPool.length) {
  const d = pick(phonesPool)
  if (takenModels.has(d.id)) continue
  takenModels.add(d.id)
  const s = JSON.parse(d.specs || '{}')
  const used = phones.length >= 35
  const storage = s.storage ? (s.storage >= 1024 ? `${s.storage / 1024}TB` : `${s.storage}GB`) : '128GB'
  const newBuy = r500(14000 + (s.ram || 4) * 3200 + (s.storage || 128) * 55 + (s.has5G ? 7000 : 0) + (d.brand === 'Apple' ? 45000 : 0))
  const buyPrice = used ? r500(newBuy * 0.6) : newBuy
  const item = (await api('POST', '/inventory', {
    type: used ? 'PHONE_USED' : 'PHONE_NEW',
    name: `${d.brand} ${d.model}${used ? ' (occasion)' : ''}`,
    deviceCategory: 'PHONE', brand: d.brand, model: d.model, storage,
    color: pick(['Noir', 'Bleu', 'Blanc', 'Vert', 'Gris', 'Violet']),
    imei: used ? imei() : undefined,
    barcode: used ? undefined : String(6000000000000 + int(1, 999999999)),
    quantity: used ? 1 : int(2, 6), buyPrice, sellPrice: r500(buyPrice * (used ? 1.3 : 1.15)),
    lowStockAt: used ? 0 : 1, warrantyDays: used ? 90 : 365, recordExpense: false
  })).item
  phones.push(item)
}
console.log(`  ${phones.length} phones`)

// ── 6. Parts and accessories (50) ─────────────────────────────────────────────────
const PART_MODELS = [['Samsung', 'Galaxy A14'], ['Samsung', 'Galaxy A34'], ['Samsung', 'Galaxy A54'], ['Xiaomi', 'Redmi Note 12'], ['Xiaomi', 'Redmi 12C'],
  ['Apple', 'iPhone 11'], ['Apple', 'iPhone 12'], ['Apple', 'iPhone 13'], ['Oppo', 'A57'], ['Infinix', 'Hot 30']]
const partItems = []
let sku = 100
for (const [brand, model] of PART_MODELS) {
  for (const [kind, buy, sell] of [['Écran', 6500, 11000], ['Batterie', 1800, 3500], ['Connecteur de charge', 700, 1800]]) {
    const iphone = brand === 'Apple'
    const b = r100(buy * (iphone ? 1.9 : 1) * (0.85 + rnd() * 0.4))
    partItems.push((await api('POST', '/inventory', {
      type: 'PART', name: `${kind} ${brand} ${model}`, deviceCategory: 'PHONE', brand, model,
      sku: `P-${sku++}`, quantity: int(2, 10), buyPrice: b, sellPrice: r100(b * (sell / buy)), lowStockAt: 2, warrantyDays: 30, recordExpense: false
    })).item)
  }
}
const ACCESSORIES = [['Chargeur rapide 25W', 900, 2000], ['Chargeur 18W', 600, 1300], ['Câble USB-C 1m', 200, 600], ['Câble Lightning 1m', 350, 900],
  ['Écouteurs filaires', 300, 800], ['Écouteurs Bluetooth', 1800, 3800], ['Powerbank 10000mAh', 2200, 4200], ['Powerbank 20000mAh', 3300, 6000],
  ['Verre trempé universel', 80, 400], ['Verre trempé iPhone 13', 120, 600], ['Coque silicone A54', 250, 1000], ['Coque transparente iPhone 12', 200, 900],
  ['Support voiture', 500, 1500], ['Carte mémoire 64GB', 900, 1800], ['Carte mémoire 128GB', 1500, 2800], ['Adaptateur OTG', 150, 500],
  ['Haut-parleur Bluetooth', 2500, 4800], ['Montre connectée', 3800, 7000], ['Kit nettoyage écran', 150, 500], ['Ring light 26cm', 1700, 3500]]
for (const [name, buy, sell] of ACCESSORIES) {
  partItems.push((await api('POST', '/inventory', {
    type: 'ACCESSORY', name, sku: `A-${sku++}`, barcode: String(6130000000000 + int(1, 99999999)),
    quantity: int(6, 30), buyPrice: buy, sellPrice: sell, lowStockAt: 3, warrantyDays: chance(0.3) ? 30 : 0, recordExpense: false
  })).item)
}
console.log(`  ${partItems.length} parts and accessories`)

// ── 7. Suppliers and purchase orders ──────────────────────────────────────────────
const suppliers = []
for (const [name, phone, address] of [['Phone Pièces Alger', '0550 11 22 33', 'Hamiz, Alger'], ['Mobile Grossiste Oran', '0661 44 55 66', 'Medina Jdida, Oran'],
  ['Access DZ', '0770 77 88 99', 'El Eulma, Sétif'], ['Smart Parts Constantine', '0541 23 45 67', 'Constantine'], ['Import Tech Blida', '0698 12 34 56', 'Blida']]) {
  suppliers.push((await api('POST', '/suppliers', { name, phone, address })).supplier)
}
const pos = []
for (let i = 0; i < 6; i++) {
  const lines = Array.from({ length: int(2, 4) }, () => { const it = pick(partItems); return { inventoryItemId: it.id, quantity: int(2, 6), unitCost: Number(it.buyPrice) } })
    .filter((l, idx, arr) => arr.findIndex((x) => x.inventoryItemId === l.inventoryItemId) === idx)
  const order = (await api('POST', '/purchase-orders', { supplierId: pick(suppliers).id, lines, paymentMethod: i % 3 === 0 ? 'CASH' : 'CREDIT' })).order
  const day = int(3, 28)
  await prisma.purchaseOrder.update({ where: { id: order.id }, data: { orderedAt: at(day), receivedAt: at(day) } })
  await prisma.supplierDebt.updateMany({ where: { purchaseOrderId: order.id }, data: { createdAt: at(day) } })
  await prisma.expense.updateMany({ where: { description: `Purchase Order: ${order.orderNumber}` }, data: { expenseDate: at(day) } })
  pos.push({ order, day })
}
for (const { order, day } of pos.slice(1, 4)) {
  const debt = await prisma.supplierDebt.findFirst({ where: { purchaseOrderId: order.id } })
  if (!debt) continue
  const paid = (await api('POST', `/supplier-debts/${debt.id}/payment`, { amount: r100(Number(debt.totalAmount) * 0.5) })).debt
  await prisma.supplierDebtPayment.updateMany({ where: { supplierDebtId: paid.id }, data: { paidAt: at(Math.max(0, day - int(1, 3))) } })
}
await api('POST', '/supplier-debts/opening', { supplierId: suppliers[0].id, amount: 45000, date: at(29).toISOString().slice(0, 10), notes: 'Ancien cahier' })
console.log(`  ${suppliers.length} suppliers, ${pos.length} purchase orders`)

// ── 8. Repair tickets (50) ────────────────────────────────────────────────────────
const ISSUES = [['Écran cassé', 'Écran'], ['Ne charge plus', 'Connecteur de charge'], ['Batterie se décharge vite', 'Batterie'], ['Écran noir après une chute', 'Écran'],
  ['Ne s\'allume plus', null], ['Problème réseau', null], ['Haut-parleur ne marche pas', null], ['Caméra floue', null], ['Bouton power bloqué', null], ['Tombé dans l\'eau', null]]
const STATUS_PLAN = [...Array(22).fill('DELIVERED'), ...Array(8).fill('DONE'), ...Array(8).fill('IN_REPAIR'), ...Array(5).fill('WAITING_PARTS'), ...Array(5).fill('DIAGNOSING'), ...Array(2).fill('CANCELLED')]
const deliveredTickets = []
for (const status of STATUS_PLAN) {
  const cust = pick(customers)
  const [brand, model] = pick(PART_MODELS)
  const [issue, partKind] = pick(ISSUES)
  const received = status === 'DELIVERED' ? int(3, 29) : status === 'CANCELLED' ? int(5, 25) : int(0, 7)
  const price = r500(partKind === 'Écran' ? int(7000, 16000) * (brand === 'Apple' ? 1.8 : 1) : int(1500, 6000))
  const deposit = chance(0.35) ? r500(price * 0.3) : 0
  const tk = (await api('POST', '/tickets', {
    customerId: cust.id, deviceCategory: 'PHONE', deviceBrand: brand, deviceModel: model, imei: chance(0.7) ? imei() : undefined,
    color: pick(['Noir', 'Bleu', 'Blanc', 'Gris']), issueDesc: issue, deposit, priority: chance(0.15) ? 'URGENT' : chance(0.2) ? 'LOW' : 'NORMAL', warrantyDays: 30
  })).ticket
  // Part from stock when the shop has it
  let usedStockPart = false
  if (partKind && status !== 'DIAGNOSING' && status !== 'CANCELLED') {
    const part = await prisma.inventoryItem.findFirst({ where: { type: 'PART', brand, model, name: { startsWith: partKind }, quantity: { gt: 0 } } })
    if (part) { await api('POST', `/tickets/${tk.id}/parts`, { inventoryItemId: part.id, quantity: 1 }); usedStockPart = true }
  }
  const go = (s, extra = {}) => api('POST', `/tickets/${tk.id}/transition`, { status: s, ...extra })
  if (status === 'WAITING_PARTS') await go('WAITING_PARTS')
  if (['IN_REPAIR', 'DONE', 'DELIVERED'].includes(status)) await go('IN_REPAIR')
  if (['DONE', 'DELIVERED'].includes(status)) await go('DONE', { finalCost: price, ...(usedStockPart ? {} : { partsCost: r100(price * (0.25 + rnd() * 0.25)) }) })
  let deliveredDay = null
  if (status === 'DELIVERED') {
    deliveredDay = Math.max(0, received - int(1, 4))
    await go('DELIVERED', { paymentMethod: chance(0.8) ? 'CASH' : 'CREDIT' })
  }
  if (status === 'CANCELLED') await go('CANCELLED')
  // Back-date
  const recAt = at(received)
  await prisma.repairTicket.update({ where: { id: tk.id }, data: { receivedAt: recAt, ...(deliveredDay !== null ? { deliveredAt: at(deliveredDay) } : {}) } })
  await prisma.repairDeposit.updateMany({ where: { repairTicketId: tk.id }, data: { paidAt: recAt } })
  await prisma.repairPart.updateMany({ where: { repairTicketId: tk.id }, data: { createdAt: recAt } })
  if (deliveredDay !== null) {
    const when = (await prisma.repairTicket.findUnique({ where: { id: tk.id } })).deliveredAt
    await prisma.sale.updateMany({ where: { repairTicketId: tk.id }, data: { createdAt: when } })
    await prisma.debtEntry.updateMany({ where: { repairTicketId: tk.id }, data: { createdAt: when } })
    deliveredTickets.push({ id: tk.id, day: deliveredDay })
  }
}
console.log(`  ${STATUS_PLAN.length} repair tickets`)

// Check-ins waiting at the counter
for (let i = 0; i < 6; i++) {
  const [brand, model] = pick(PART_MODELS)
  const ci = (await api('POST', '/checkins', { customerId: pick(customers).id, deviceCategory: 'PHONE', deviceBrand: brand, deviceModel: model, issueDesc: pick(ISSUES)[0], condition: pick(['Rayures sur l\'écran', 'Coque abîmée', 'Bon état', '']) })).checkin
  await prisma.checkIn.update({ where: { id: ci.id }, data: { createdAt: at(int(0, 2)) } })
}

// Warranty claims on two delivered repairs
for (const t of deliveredTickets.slice(0, 2)) {
  const c = (await api('POST', '/warranty', { originalTicketId: t.id, issueDesc: 'Le même problème est revenu', responsibleNote: 'À vérifier' })).claim
  await prisma.warrantyClaim.update({ where: { id: c.id }, data: { createdAt: at(Math.max(0, t.day - 1)) } })
}

// ── 9. Trade-ins ───────────────────────────────────────────────────────────────────
for (let i = 0; i < 5; i++) {
  const d = pick(phonesPool)
  const t = (await api('POST', '/trade-ins', {
    customerId: pick(customers).id, deviceCategory: 'PHONE', brand: d.brand, model: d.model, imei: imei(), storage: '128GB', color: 'Noir',
    condition: pick(['EXCELLENT', 'GOOD', 'GOOD', 'FAIR', 'POOR']), conditionNotes: 'Batterie 85%', appraisedValue: r500(int(12000, 45000)), payoutMethod: i < 4 ? 'CASH' : 'STORE_CREDIT'
  })).tradeIn
  const day = int(2, 25)
  await prisma.tradeIn.update({ where: { id: t.id }, data: { createdAt: at(day) } })
  await prisma.expense.updateMany({ where: { description: { startsWith: `Trade-in: ${d.brand} ${d.model}` } }, data: { expenseDate: at(day) } })
}

// ── 10. POS sales (50) ────────────────────────────────────────────────────────────
let sales = 0
for (let i = 0; i < 50; i++) {
  const stock = await prisma.inventoryItem.findMany({ where: { isActive: true, quantity: { gt: 0 }, type: { in: chance(0.2) ? ['PHONE_NEW', 'PHONE_USED'] : ['ACCESSORY', 'PART'] } } })
  if (!stock.length) continue
  const lines = []
  for (let k = 0; k < int(1, 3); k++) {
    const it = pick(stock)
    if (lines.some((l) => l.inventoryItemId === it.id)) continue
    lines.push({ inventoryItemId: it.id, name: it.name, description: it.name, unitCost: Number(it.buyPrice), unitPrice: Number(it.sellPrice), quantity: Math.min(it.quantity, it.type.startsWith('PHONE') ? 1 : int(1, 2)), warrantyDays: it.warrantyDays })
  }
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  const discount = chance(0.2) ? Math.min(r100(subtotal * 0.05), 2000) : 0
  const total = subtotal - discount
  const mode = chance(0.75) ? 'CASH' : chance(0.5) ? 'SPLIT' : 'CREDIT'
  const cust = mode === 'CASH' && chance(0.6) ? null : pick(customers)
  const paid = mode === 'CASH' ? (chance(0.4) ? Math.ceil(total / 1000) * 1000 : total) : mode === 'SPLIT' ? r100(total * 0.5) : 0
  const sale = (await api('POST', '/sales', { customerId: cust?.id, items: lines, discount, paymentMethod: mode, amountPaid: paid })).sale
  const when = at(i < 6 ? 0 : int(1, 29))
  await prisma.sale.update({ where: { id: sale.id }, data: { createdAt: when } })
  await prisma.debtEntry.updateMany({ where: { saleId: sale.id }, data: { createdAt: when } })
  sales++
}
console.log(`  ${sales} POS sales`)

// One refund
const toRefund = await prisma.sale.findFirst({ where: { status: 'COMPLETED', repairTicketId: null }, orderBy: { createdAt: 'desc' }, skip: 3 })
if (toRefund) {
  await api('POST', `/sales/${toRefund.id}/refund`, { reason: 'Article défectueux' })
  await prisma.refund.updateMany({ where: { saleId: toRefund.id }, data: { createdAt: new Date(Math.min(Date.now() - 60000, toRefund.createdAt.getTime() + DAY)) } })
}

// ── 11. Debts: old notebook debts and payments ────────────────────────────────────
for (let i = 0; i < 3; i++) {
  await api('POST', '/debts', { customerId: pick(customers).id, amount: r500(int(3000, 15000)), date: at(29).toISOString().slice(0, 10), notes: 'Ancien cahier' })
}
const openDebts = await prisma.debtEntry.findMany({ where: { status: { not: 'SETTLED' } } })
let payments = 0
for (const d of openDebts) {
  if (!chance(0.6)) continue
  const full = chance(0.5)
  const amount = full ? Number(d.remaining) : r100(Number(d.remaining) * 0.5)
  if (amount <= 0 || amount > Number(d.remaining)) continue
  await api('POST', `/debts/${d.id}/payment`, { amount })
  const ageDays = Math.floor((Date.now() - new Date(d.createdAt).getTime()) / DAY)
  const last = await prisma.debtPayment.findFirst({ where: { debtEntryId: d.id }, orderBy: { paidAt: 'desc' } })
  await prisma.debtPayment.update({ where: { id: last.id }, data: { paidAt: at(Math.max(0, ageDays - int(1, Math.max(1, ageDays)))) } })
  payments++
}
console.log(`  ${payments} debt payments`)

// ── 12. Running expenses ──────────────────────────────────────────────────────────
const EXPENSES = [['RENT', 'Loyer du local', 35000, 'Propriétaire', 28], ['UTILITIES', 'Facture électricité', 6200, 'Sonelgaz', 20], ['UTILITIES', 'Internet', 2500, 'Algérie Télécom', 18],
  ['TOOLS_EQUIPMENT', 'Station de soudure', 9500, 'Access DZ', 15], ['TOOLS_EQUIPMENT', 'Tournevis de précision', 2200, 'Access DZ', 9],
  ['PETTY_CASH', 'Café et eau', 800, null, 1], ['PETTY_CASH', 'Transport pièces', 1200, null, 4], ['PETTY_CASH', 'Café et eau', 700, null, 8],
  ['PETTY_CASH', 'Sacs et papier thermique', 1500, null, 12], ['OTHER', 'Publicité Facebook', 3000, 'Meta', 10], ['PETTY_CASH', 'Déjeuner', 600, null, 0], ['OTHER', 'Réparation climatiseur', 4000, null, 22]]
for (const [category, description, amount, paidTo, day] of EXPENSES) {
  await api('POST', '/expenses', { category, description, amount, paidTo: paidTo || undefined, expenseDate: at(day).toISOString() })
}
if (staff) await prisma.expense.updateMany({ where: { category: 'PETTY_CASH' }, data: { createdById: staff.id } })
console.log(`  ${EXPENSES.length} expenses`)

// ── 13. Past daily closes (every day before today that had activity) ─────────────
const lowStockCount = (await prisma.inventoryItem.findMany({ where: { isActive: true }, select: { quantity: true, lowStockAt: true } })).filter((i) => i.quantity <= i.lowStockAt).length
const tickets = await prisma.repairTicket.findMany({ select: { receivedAt: true, deliveredAt: true, status: true } })
let closes = 0
for (let d = 29; d >= 1; d--) {
  const { start, end } = dayRange(new Date(Date.now() - d * DAY))
  const tot = summarize(await loadMovements(prisma, start, end))
  if (!tot.salesCount && !tot.totalExpenses && !tot.totalDebtCollected) continue
  const open = tickets.filter((t) => t.receivedAt < end && t.status !== 'CANCELLED' && (!t.deliveredAt || t.deliveredAt >= end)).length
  await prisma.dailyClose.create({ data: {
    date: start, totalRevenue: tot.totalRevenue, totalCreditSales: tot.totalCreditSales, totalDebtCollected: tot.totalDebtCollected,
    totalExpenses: tot.totalExpenses, netCash: tot.netCash, openTickets: open, doneNotDelivered: 0, newWarrantyClaims: 0, lowStockCount,
    closedAt: new Date(end.getTime() - 3 * 3600000)
  } })
  closes++
}
console.log(`  ${closes} past daily closes (today is left open)`)

const today = summarize(await loadMovements(prisma, dayRange().start, dayRange().end))
server.close()
await prisma.$disconnect()
console.log(`\nDone. Today so far: revenue ${today.totalRevenue}, net cash ${today.netCash}, net profit ${today.netProfit}.`)
console.log(`To undo: close the app and copy ${path.relative(process.cwd(), backup)} over prisma/warshati.db`)
process.exit(0)
