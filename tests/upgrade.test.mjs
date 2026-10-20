// The startup upgrade (initPrisma in an installed app) brings an old database up to date.
// The "old" database is built from today's template by removing what newer versions added,
// so no real shop data is ever needed in the repository.
import fs from 'fs'
import path from 'path'
import { prepareEnv, createChecker, importProject, projectRequire, templateDb } from './helpers/setup.mjs'

const dir = prepareEnv({ db: false, packaged: true })
const oldDb = path.join(dir, 'userData', 'rakam.db')
fs.copyFileSync(templateDb, oldDb)
const { check, finish } = createChecker()
const { PrismaClient } = projectRequire('@prisma/client')

try {
  // 1) Some data, including a ticket with a deposit, then strip everything added since v1.4
  const old = new PrismaClient({ datasources: { db: { url: `file:${oldDb}` } } })
  await old.store.create({ data: { name: 'Old shop' } })
  const user = await old.user.create({ data: { name: 'O', email: 'o@t.local', passwordHash: 'x', role: 'OWNER' } })
  const cust = await old.customer.create({ data: { name: 'C' } })
  for (const [n, deposit] of [[1, 700], [2, 0]]) {
    await old.repairTicket.create({ data: { ticketNumber: `TKT-2026-000${n}`, customerId: cust.id, createdById: user.id, deviceBrand: 'A', deviceModel: 'B', issueDesc: 'C', deposit } })
  }
  for (const t of ['RepairDeposit', 'Refund', 'RepairPart', 'LocalLicense', 'DeviceCatalog', 'AppMeta']) await old.$executeRawUnsafe(`DROP TABLE "${t}"`)
  for (const [t, c] of [['Sale', 'depositApplied'], ['TradeIn', 'payoutMethod'], ['InventoryItem', 'warrantyDays'], ['SaleItem', 'warrantyDays'], ['DebtPayment', 'reversalOf'], ['SupplierDebtPayment', 'reversalOf']]) {
    await old.$executeRawUnsafe(`ALTER TABLE "${t}" DROP COLUMN "${c}"`)
  }
  await old.$disconnect()

  // 2) Run the real startup upgrade
  const { initPrisma } = await importProject('src/main/server/lib/prisma.js')
  const db = await initPrisma()

  const cols = async (t) => (await db.$queryRawUnsafe(`PRAGMA table_info("${t}")`)).map(c => c.name)
  check('Sale.depositApplied added', (await cols('Sale')).includes('depositApplied'), true)
  check('TradeIn.payoutMethod added', (await cols('TradeIn')).includes('payoutMethod'), true)
  check('InventoryItem.warrantyDays added', (await cols('InventoryItem')).includes('warrantyDays'), true)
  check('SaleItem.warrantyDays added', (await cols('SaleItem')).includes('warrantyDays'), true)
  check('LocalLicense recreated with lastValidatedAt', (await cols('LocalLicense')).includes('lastValidatedAt'), true)
  check('RepairPart table created', (await cols('RepairPart')).length > 0, true)
  check('Refund table created', (await cols('Refund')).length > 0, true)
  check('DeviceCatalog table created', (await cols('DeviceCatalog')).includes('isCustom'), true)
  check('AppMeta table created', (await cols('AppMeta')).length > 0, true)
  check('DebtPayment.reversalOf added', (await cols('DebtPayment')).includes('reversalOf'), true)
  check('SupplierDebtPayment.reversalOf added', (await cols('SupplierDebtPayment')).includes('reversalOf'), true)
  const deposits = await db.repairDeposit.findMany()
  check('deposit backfilled (only the ticket that had one)', deposits.length, 1)
  check('backfilled amount', deposits[0]?.amount, 700)

  // 3) Every model is readable through the upgraded file, and the old data survived
  await db.sale.findMany({ include: { items: true, refund: true } })
  await db.repairTicket.findMany({ include: { deposits: true, parts: true } })
  await db.tradeIn.findMany(); await db.localLicense.findMany()
  check('old data kept', (await db.store.findFirst())?.name, 'Old shop')

  const log = fs.readFileSync(path.join(dir, 'userData', 'rakam-prisma.log'), 'utf8')
  check('upgrade completed without failures', /Migration failed|migration failed/.test(log), false)
  await db.$disconnect()
  finish()
} catch (e) {
  finish(e)
}
