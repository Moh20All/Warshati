// Editing expenses (and its effect on the daily figures) + the Excel export file itself.
import path from 'path'
import { prepareEnv, startServer, setupOwner, createChecker, importProject, projectRequire } from './helpers/setup.mjs'

const dir = prepareEnv()
const { call, close } = await startServer()
const { buildWorkbook } = await importProject('src/main/export.js')
const ExcelJS = projectRequire('exceljs')
const { check, finish } = createChecker()

try {
  const { o } = await setupOwner(call)

  // ── Editing an expense ──
  const exp = (await o('POST', '/expenses', { category: 'RENT', description: 'Rent', amount: 250 })).data.expense
  check('expense counted', (await o('GET', '/daily-close/preview')).data.totalExpenses, 250)
  let r = await o('PUT', `/expenses/${exp.id}`, { amount: 300, description: 'Rent (corrected)', paidTo: 'Landlord' })
  check('edit saved', r.status, 200)
  check('new amount', r.data.expense.amount, 300)
  check('new description', r.data.expense.description, 'Rent (corrected)')
  check('daily figures follow the edit', (await o('GET', '/daily-close/preview')).data.totalExpenses, 300)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  await o('PUT', `/expenses/${exp.id}`, { expenseDate: yesterday })
  check('moving it to yesterday removes it from today', (await o('GET', '/daily-close/preview')).data.totalExpenses, 0)
  check('zero amount refused', (await o('PUT', `/expenses/${exp.id}`, { amount: 0 })).status, 400)
  check('empty description refused', (await o('PUT', `/expenses/${exp.id}`, { description: '  ' })).status, 400)
  check('unknown expense -> 404', (await o('PUT', '/expenses/nope', { amount: 5 })).status, 404)

  // ── Excel export ──
  const columns = [
    { header: 'Date', key: 'date', type: 'date' },
    { header: 'Client / العميل', key: 'name' },
    { header: 'Total (DZD)', key: 'total', type: 'money' },
    { header: 'Qty', key: 'qty', type: 'number' }
  ]
  const rows = [
    { date: '2026-10-19T10:00:00.000Z', name: 'محمد علي', total: '1500.5', qty: 2 },
    { date: '2026-10-18T09:00:00.000Z', name: 'Élodie', total: 300, qty: null }
  ]
  const wb = await buildWorkbook({ sheetName: 'Ventes', columns, rows, rtl: true })
  const file = path.join(dir, 'test.xlsx')
  await wb.xlsx.writeFile(file)

  const back = new ExcelJS.Workbook()
  await back.xlsx.readFile(file)
  const ws = back.getWorksheet('Ventes')
  check('sheet name', !!ws, true)
  check('header row', ws.getRow(1).values.slice(1).join('|'), 'Date|Client / العميل|Total (DZD)|Qty')
  check('Arabic text kept', ws.getCell('B2').value, 'محمد علي')
  check('accented text kept', ws.getCell('B3').value, 'Élodie')
  check('money is a real number', ws.getCell('C2').value, 1500.5)
  check('money format', ws.getCell('C2').numFmt, '#,##0.00')
  check('date is a real date', ws.getCell('A2').value instanceof Date, true)
  check('empty stays empty', ws.getCell('D3').value, null)
  check('right-to-left sheet', ws.views[0]?.rightToLeft, true)
  check('header bold', ws.getRow(1).font?.bold, true)
  finish()
} catch (e) {
  finish(e)
} finally {
  close()
}
