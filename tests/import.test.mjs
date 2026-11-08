// Import from the owner's Excel/CSV: columns guessed from fr/ar headers, rows added one by one, refused rows reported.
import { prepareEnv, startServer, setupOwner, createChecker, projectRequire } from './helpers/setup.mjs'

prepareEnv()
const { check, finish } = createChecker()
const ExcelJS = projectRequire('exceljs')

const xlsx = async (rows) => {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Feuil1')
  rows.forEach(r => ws.addRow(r))
  return Buffer.from(await wb.xlsx.writeBuffer()).toString('base64')
}

try {
  const { call } = await startServer()
  const { o } = await setupOwner(call)
  await o('POST', '/users', { name: 'Staff', email: 's@t.local', password: 'pw123456', role: 'STAFF' })
  const staffToken = (await call(null, 'POST', '/auth/login', { email: 's@t.local', password: 'pw123456' })).data.token

  // ── Inventory from an Excel file with Arabic titles ──
  const inv = await xlsx([
    ['الاسم', 'الباركود', 'الكمية', 'سعر الشراء', 'سعر البيع', 'Remarque'],
    ['Câble Type-C', '6901234567890', 10, 150, 300, 'x'],
    ['Coque A54', '', '5', '200,00', '1 200 DA', ''],
    ['', '123', 1, 1, 1, ''],
    ['Doublon', '6901234567890', 1, 1, 1, '']
  ])
  check('staff cannot import', (await call(staffToken, 'POST', '/import/read', { kind: 'inventory', fileName: 'stock.xlsx', data: inv })).status, 403)
  const read = (await o('POST', '/import/read', { kind: 'inventory', fileName: 'stock.xlsx', data: inv })).data
  check('titles read', read.headers.join('|'), 'الاسم|الباركود|الكمية|سعر الشراء|سعر البيع|Remarque')
  check('rows read', read.rows.length, 4)
  check('columns guessed from Arabic titles', JSON.stringify([read.guess.name, read.guess.barcode, read.guess.quantity, read.guess.buyPrice, read.guess.sellPrice]), '[0,1,2,3,4]')
  check('an unknown title is not guessed', Object.values(read.guess).includes(5), false)

  // The app sends the rows as the owner matched them
  const rows = read.rows.map((r, i) => ({ _line: i + 2, name: r[0], barcode: r[1], quantity: r[2], buyPrice: r[3], sellPrice: r[4] }))
  const res = (await o('POST', '/import/inventory', { rows, itemType: 'ACCESSORY' })).data
  check('2 items added', res.created, 2)
  check('refused rows with their line and reason', res.skipped.map(s => `${s.line}:${s.reason}`).join(), '4:NO_NAME,5:EXISTS')
  const items = (await o('GET', '/inventory')).data.items
  const coque = items.find(i => i.name === 'Coque A54')
  check('amounts like "1 200 DA" and "200,00" read', `${Number(coque.buyPrice)}|${Number(coque.sellPrice)}|${coque.quantity}`, '200|1200|5')
  check('type chosen for the file', coque.type, 'ACCESSORY')
  check('automatic ref', coque.sku?.startsWith('REF-'), true)
  check('no expense for imported stock', (await o('GET', '/expenses')).data.expenses?.length ?? 0, 0)

  // ── Customers from a French CSV (; separated, Excel dropped the leading 0) ──
  const csv = Buffer.from('﻿Nom;Téléphone;Dette\r\nKarim;661234567;"3 500"\r\nSamia;0550112233;\r\nKarim bis;0661234567;\r\n').toString('base64')
  const c = (await o('POST', '/import/read', { kind: 'customers', fileName: 'clients.csv', data: csv })).data
  check('CSV with ; read', c.headers.join('|'), 'Nom|Téléphone|Dette')
  check('customer columns guessed', JSON.stringify([c.guess.name, c.guess.phone, c.guess.debt]), '[0,1,2]')
  const cr = (await o('POST', '/import/customers', { rows: c.rows.map((r, i) => ({ _line: i + 2, name: r[0], phone: r[1], debt: r[2] })) })).data
  check('2 customers added, same phone refused', `${cr.created}|${cr.skipped.map(s => s.reason).join()}`, '2|EXISTS')
  const karim = (await o('GET', '/customers')).data.customers.find(x => x.name === 'Karim')
  check('leading 0 put back', karim.phone, '0661234567')
  const debts = (await o('GET', '/debts')).data.debts || []
  check('his debt is an opening balance', debts.filter(d => d.customerId === karim.id).map(d => `${d.type}:${Number(d.remaining)}`).join(), 'OPENING_BALANCE:3500')

  // ── Suppliers ──
  const sup = await xlsx([['Fournisseur', 'Tel', 'Adresse', 'Crédit'], ['Grossiste Alger', '0770000000', 'Alger', 15000], ['grossiste alger', '', '', '']])
  const sr = (await o('POST', '/import/read', { kind: 'suppliers', fileName: 'f.xlsx', data: sup })).data
  const sres = (await o('POST', '/import/suppliers', { rows: sr.rows.map((r, i) => ({ _line: i + 2, name: r[sr.guess.name], phone: r[sr.guess.phone], address: r[sr.guess.address], debt: r[sr.guess.debt] })) })).data
  check('same supplier name refused', `${sres.created}|${sres.skipped.map(s => s.reason).join()}`, '1|EXISTS')
  check('what the shop owed him', (await o('GET', '/suppliers')).data.suppliers.find(s => s.name === 'Grossiste Alger').owed, 15000)

  // ── Bad files ──
  check('old .xls refused with a clear reason', (await o('POST', '/import/read', { kind: 'customers', fileName: 'a.xls', data: 'AAAA' })).data.error, 'FORMAT')
  check('titles only: empty', (await o('POST', '/import/read', { kind: 'customers', fileName: 'a.csv', data: Buffer.from('Nom;Tel\n').toString('base64') })).data.error, 'EMPTY')

  finish()
} catch (e) {
  finish(e)
}
