// Excel (.xlsx) export: the renderer sends the rows it is showing, the main process asks
// where to save and writes a real spreadsheet (no CSV separator/encoding issues in FR/AR Excel).
import { app, dialog } from 'electron'
import path from 'path'
import ExcelJS from 'exceljs'
import log from 'electron-log'

const FORMATS = {
  money: '#,##0.00',
  number: '#,##0',
  date: 'yyyy-mm-dd',
  datetime: 'yyyy-mm-dd hh:mm'
}

/** Builds the workbook. columns: [{ header, key, type?: 'text'|'money'|'number'|'date'|'datetime', width? }] */
export async function buildWorkbook({ sheetName, columns, rows, rtl }) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Rakam'
  wb.created = new Date()
  const ws = wb.addWorksheet(String(sheetName || 'Sheet').slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 1, rightToLeft: !!rtl }]
  })
  ws.columns = columns.map(c => ({
    header: c.header,
    key: c.key,
    width: c.width || Math.max(12, String(c.header).length + 4),
    style: FORMATS[c.type] ? { numFmt: FORMATS[c.type] } : {}
  }))
  for (const row of rows) {
    const values = {}
    for (const c of columns) {
      const v = row[c.key]
      if (v === null || v === undefined || v === '') values[c.key] = null
      else if (c.type === 'money' || c.type === 'number') values[c.key] = Number(v)
      else if (c.type === 'date' || c.type === 'datetime') values[c.key] = new Date(v)
      else values[c.key] = String(v)
    }
    ws.addRow(values)
  }
  ws.getRow(1).font = { bold: true }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  return wb
}

/** IPC handler: asks where to save, writes the file. */
export async function exportXlsx(win, payload) {
  try {
    const { fileName, columns, rows } = payload || {}
    if (!Array.isArray(columns) || !columns.length || !Array.isArray(rows)) {
      return { success: false, error: 'Nothing to export' }
    }
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export to Excel',
      defaultPath: path.join(app.getPath('documents'), `${fileName || 'rakam-export'}.xlsx`),
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    if (canceled || !filePath) return { success: false, canceled: true }

    const wb = await buildWorkbook(payload)
    await wb.xlsx.writeFile(filePath)
    log.info(`[EXPORT] ${rows.length} rows written to ${filePath}`)
    return { success: true, path: filePath, count: rows.length }
  } catch (err) {
    log.error('[EXPORT] Failed:', err)
    return { success: false, error: err.message }
  }
}
