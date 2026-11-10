// Import from the owner's own Excel/CSV files: inventory (phones too), customers, suppliers.
// 1. POST /read   { fileName, data (base64) } → the file's columns, its rows, and a guessed match per field
// 2. POST /:kind  { rows: [{ field: text }], itemType } → each row added on its own; refused rows come back with the reason
// The owner matches the columns himself in the app, so any file layout works.
import { Router } from 'express'
import ExcelJS from 'exceljs'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { nextItemRef, nextNumber } from '../lib/numbering.js'
import { audit } from '../lib/activity.js'

const router = Router()
router.use(requireAuth)
router.use(requireRole('OWNER'))

const MAX_ROWS = 20000

// Fields per kind, with header words (fr/en/ar) used to pre-select a column. `num`: read as an amount.
export const FIELDS = {
  inventory: [
    { key: 'name', required: true, words: ['nom', 'name', 'designation', 'désignation', 'article', 'produit', 'product', 'libelle', 'libellé', 'اسم', 'الاسم', 'المنتج', 'السلعة'] },
    { key: 'sku', words: ['ref', 'réf', 'reference', 'référence', 'sku', 'code', 'المرجع', 'مرجع', 'الرمز'] },
    { key: 'barcode', words: ['barcode', 'code barre', 'code-barre', 'codebarre', 'ean', 'upc', 'باركود', 'الباركود'] },
    { key: 'imei', words: ['imei'] },
    { key: 'brand', words: ['marque', 'brand', 'الماركة', 'العلامة'] },
    { key: 'model', words: ['modele', 'modèle', 'model', 'الموديل', 'الطراز'] },
    { key: 'color', words: ['couleur', 'color', 'colour', 'اللون'] },
    { key: 'storage', words: ['stockage', 'storage', 'capacite', 'capacité', 'memoire', 'mémoire', 'الذاكرة', 'السعة'] },
    { key: 'quantity', num: true, words: ['quantite', 'quantité', 'qte', 'qté', 'qty', 'quantity', 'stock', 'الكمية'] },
    { key: 'buyPrice', num: true, words: ['prix achat', "prix d'achat", 'achat', 'cout', 'coût', 'buy', 'cost', 'purchase', 'سعر الشراء', 'الشراء'] },
    { key: 'sellPrice', num: true, words: ['prix vente', 'prix de vente', 'vente', 'prix', 'sell', 'price', 'سعر البيع', 'البيع', 'السعر'] },
    { key: 'lowStockAt', num: true, words: ['alerte', 'stock min', 'minimum', 'low stock', 'الحد الأدنى'] },
    { key: 'warrantyDays', num: true, words: ['garantie', 'warranty', 'الضمان'] }
  ],
  customers: [
    { key: 'name', required: true, words: ['nom', 'name', 'client', 'customer', 'اسم', 'الاسم', 'الزبون', 'العميل'] },
    { key: 'phone', words: ['tel', 'tél', 'telephone', 'téléphone', 'phone', 'mobile', 'portable', 'هاتف', 'الهاتف', 'رقم'] },
    { key: 'email', words: ['email', 'e-mail', 'mail', 'البريد'] },
    { key: 'notes', words: ['notes', 'note', 'remarque', 'ملاحظات', 'ملاحظة'] },
    { key: 'debt', num: true, words: ['dette', 'credit', 'crédit', 'debt', 'reste', 'الدين', 'دين', 'الكريدي'] }
  ],
  suppliers: [
    { key: 'name', required: true, words: ['nom', 'name', 'fournisseur', 'supplier', 'اسم', 'الاسم', 'المورد', 'الممون'] },
    { key: 'phone', words: ['tel', 'tél', 'telephone', 'téléphone', 'phone', 'mobile', 'هاتف', 'الهاتف', 'رقم'] },
    { key: 'address', words: ['adresse', 'address', 'ville', 'العنوان'] },
    { key: 'notes', words: ['notes', 'note', 'remarque', 'ملاحظات'] },
    { key: 'debt', num: true, words: ['dette', 'credit', 'crédit', 'debt', 'reste', 'الدين', 'دين'] }
  ]
}
const ITEM_TYPES = ['PART', 'ACCESSORY', 'PHONE_NEW', 'PHONE_USED']

// ── Reading the file ──
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\-.:]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Excel cell → plain text (formulas give their result, dates their day) */
function cellText(v) {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if (v.result !== undefined) return cellText(v.result)
    if (v.richText) return v.richText.map(r => r.text).join('')
    if (v.text !== undefined) return cellText(v.text)
    return ''
  }
  return String(v).trim()
}

/** CSV with , or ; (Excel in French saves with ;), quotes allowed */
export function parseCsv(text) {
  text = text.replace(/^﻿/, '')
  const first = text.split(/\r?\n/, 1)[0]
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.includes('\t') && !first.includes(',') ? '\t' : ',')
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) { row.push(cell.trim()); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell.trim()); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row) }
  return rows
}

async function readTable(fileName, buffer) {
  const ext = String(fileName || '').toLowerCase().split('.').pop()
  if (ext === 'csv' || ext === 'txt') return parseCsv(buffer.toString('utf8'))
  if (ext !== 'xlsx') throw new ImportError('FORMAT')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  // The first sheet that has data
  const sheet = wb.worksheets.find(s => s.actualRowCount > 0)
  if (!sheet) return []
  const rows = []
  sheet.eachRow({ includeEmpty: false }, (r) => {
    const cells = []
    for (let c = 1; c <= r.cellCount; c++) cells.push(cellText(r.getCell(c).value))
    rows.push(cells)
  })
  return rows
}

class ImportError extends Error {}

/** Column picked for each field: the header that is one of its words (exact first, then contains) */
export function guessColumns(kind, headers) {
  const h = headers.map(norm)
  const used = new Set()
  const guess = {}
  for (const exact of [true, false]) {
    for (const f of FIELDS[kind]) {
      if (guess[f.key] !== undefined) continue
      const words = f.words.map(norm)
      // second pass: the word inside a longer title ("Prix de vente TTC"), whole words only ("Remarque" is not "marque")
      const i = h.findIndex((x, idx) => x && !used.has(idx) && words.some(w => exact ? x === w : ` ${x} `.includes(` ${w} `)))
      if (i >= 0) { guess[f.key] = i; used.add(i) }
    }
  }
  return guess
}

// POST /api/import/read
router.post('/read', async (req, res) => {
  try {
    const { kind, fileName, data } = req.body
    if (!FIELDS[kind]) return res.status(400).json({ error: 'Unknown import' })
    if (!data) return res.status(400).json({ error: 'No file' })
    const table = (await readTable(fileName, Buffer.from(data, 'base64'))).filter(r => r.some(c => c !== ''))
    if (table.length < 2) return res.status(400).json({ error: 'EMPTY' })
    const width = Math.max(...table.map(r => r.length))
    const headers = Array.from({ length: width }, (_, i) => table[0][i] || `#${i + 1}`)
    const rows = table.slice(1, MAX_ROWS + 1).map(r => Array.from({ length: width }, (_, i) => r[i] ?? ''))
    res.json({ headers, rows, fields: FIELDS[kind].map(({ key, required }) => ({ key, required: !!required })), guess: guessColumns(kind, headers), truncated: table.length - 1 > MAX_ROWS })
  } catch (err) {
    if (err instanceof ImportError) return res.status(400).json({ error: err.message })
    logger.error('Import read error:', err)
    res.status(400).json({ error: 'UNREADABLE' })
  }
})

// ── Saving ──
/** "1 200,50 DA" → 1200.5 ; "1,200" → 1200 ; "" → null */
export function toAmount(v) {
  let s = String(v ?? '').replace(/[^\d.,-]/g, '')
  if (!s) return null
  if (s.includes('.') && s.includes(',')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  else if (s.includes(',')) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

/** Excel drops the leading 0 of numbers: 661234567 → 0661234567 (Algerian mobile/fixed) */
export function toPhone(v) {
  const s = String(v ?? '').trim()
  return /^[5-7]\d{8}$/.test(s) || /^[2-4]\d{7}$/.test(s) ? '0' + s : s
}

const text = (v) => { const s = String(v ?? '').trim(); return s || null }

async function addInventory(r, itemType) {
  const n = (k, d) => Math.max(0, toAmount(r[k]) ?? d)
  await prisma.inventoryItem.create({
    data: {
      type: itemType, name: r.name,
      sku: text(r.sku) || await nextItemRef(prisma), barcode: text(r.barcode), imei: text(r.imei),
      brand: text(r.brand), model: text(r.model), color: text(r.color), storage: text(r.storage),
      quantity: Math.round(n('quantity', itemType.startsWith('PHONE') ? 1 : 0)), buyPrice: n('buyPrice', 0), sellPrice: n('sellPrice', 0),
      lowStockAt: Math.round(n('lowStockAt', 3)), warrantyDays: Math.round(n('warrantyDays', 0))
      // Stock the shop already owned: no expense today
    }
  })
}

async function addCustomer(r) {
  const phone = text(toPhone(r.phone))
  if (phone && await prisma.customer.findFirst({ where: { phone } })) throw new ImportError('EXISTS')
  const debt = toAmount(r.debt)
  await prisma.$transaction(async (tx) => {
    const c = await tx.customer.create({ data: { name: r.name, phone, email: text(r.email), notes: text(r.notes) } })
    // What he already owed: an opening balance, not a sale today
    if (debt > 0) await tx.debtEntry.create({ data: { customerId: c.id, type: 'OPENING_BALANCE', totalAmount: debt, paidAmount: 0, remaining: debt, status: 'OPEN', notes: 'Import' } })
  })
}

async function addSupplier(r) {
  const same = await prisma.supplier.findMany({ where: { isActive: true }, select: { name: true } })
  if (same.some(s => norm(s.name) === norm(r.name))) throw new ImportError('EXISTS')
  const debt = toAmount(r.debt)
  await prisma.$transaction(async (tx) => {
    const s = await tx.supplier.create({ data: { name: r.name, phone: text(toPhone(r.phone)), address: text(r.address), notes: text(r.notes) } })
    // What the shop already owed him: same as "Opening balance" on his page
    if (debt > 0) {
      const order = await tx.purchaseOrder.create({
        data: { orderNumber: await nextNumber(tx, 'PurchaseOrder', 'orderNumber', `OB-${new Date().getFullYear()}-`), supplierId: s.id, totalAmount: debt, paidAmount: 0, paymentStatus: 'UNPAID', notes: 'Opening balance — Import' }
      })
      await tx.supplierDebt.create({ data: { supplierId: s.id, purchaseOrderId: order.id, totalAmount: debt, paidAmount: 0, remaining: debt, status: 'OPEN' } })
    }
  })
}

// POST /api/import/:kind
router.post('/:kind', async (req, res) => {
  const { kind } = req.params
  if (!FIELDS[kind]) return res.status(400).json({ error: 'Unknown import' })
  const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, MAX_ROWS) : []
  const itemType = ITEM_TYPES.includes(req.body.itemType) ? req.body.itemType : 'PART'
  const add = { inventory: (r) => addInventory(r, itemType), customers: addCustomer, suppliers: addSupplier }[kind]
  let created = 0
  const skipped = [] // { line, name, reason }: line = row number in the file (header = 1)
  for (const [i, raw] of rows.entries()) {
    const r = { ...raw, name: String(raw?.name ?? '').trim() }
    const line = Number(raw?._line) || i + 2
    if (!r.name) { skipped.push({ line, name: '', reason: 'NO_NAME' }); continue }
    try {
      await add(r)
      created++
    } catch (err) {
      const reason = err instanceof ImportError ? err.message : err.code === 'P2002' ? 'EXISTS' : 'INVALID'
      if (reason === 'INVALID') logger.error(`Import ${kind} line ${line}:`, err)
      skipped.push({ line, name: r.name, reason })
    }
  }
  audit(req, 'import_run', kind, { created, skipped: skipped.length })
  res.json({ created, skipped })
})

export default router
