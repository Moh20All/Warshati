import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import api from '../lib/api'
import { useCurrency } from '../lib/currency'
import { code128Svg } from '../lib/barcode'
import { useToast } from './ui/Toast'
import Modal from './ui/Modal'
import Button from './ui/Button'

// Common label-roll sizes (width × height, mm)
const SIZES = ['30x20', '40x25', '40x30', '50x25', '50x30', '58x40']

const read = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/** One label: shop, name, barcode + its digits, price. Sizes in mm so it prints the same on every printer. */
export function labelHtml(item, { size, shop, showShop, showPrice, cur }) {
  const [w, h] = size.split('x').map(Number)
  const barH = Math.max(5, h - 2.4 - (showShop ? 3 : 0) - 6.2 - 2.8 - (showPrice ? 4.6 : 0))
  return `<div class="lbl" style="width:${w}mm;height:${h}mm">`
    + (showShop ? `<div class="shop">${esc(shop)}</div>` : '')
    + `<div class="name" dir="auto">${esc(item.name)}</div>`
    + code128Svg(item.barcode, { width: `${w - 4}mm`, height: `${barH}mm` })
    + `<div class="code p-mono">${esc(item.barcode)}</div>`
    + (showPrice ? `<div class="price">${Number(item.sellPrice).toLocaleString()} ${esc(cur)}</div>` : '')
    + '</div>'
}

export const LABEL_CSS = `<style>
  .lbl { box-sizing: border-box; padding: 1.2mm 2mm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; overflow: hidden; break-after: page; page-break-after: always; background: #fff; color: #000; }
  .lbl:last-child { break-after: auto; page-break-after: auto; }
  .lbl .shop { font-size: 6.5pt; font-weight: 700; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lbl .name { font-size: 7.5pt; line-height: 1.15; text-align: center; max-height: 6.2mm; overflow: hidden; }
  .lbl .code { font-size: 6.5pt; letter-spacing: 0.5px; }
  .lbl .price { font-size: 10.5pt; font-weight: 700; }
</style>`

/** Print barcode labels for inventory items; `items` = [{ ...item, copies }] */
export default function LabelsModal({ open, onClose, items }) {
  const { t } = useTranslation()
  const cur = useCurrency()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [rows, setRows] = useState([])
  const [size, setSize] = useState(() => read('warshati_label_size', '40x30'))
  const [printer, setPrinter] = useState(() => read('warshati_label_printer', ''))
  const [showShop, setShowShop] = useState(() => read('warshati_label_shop', '1') === '1')
  const [showPrice, setShowPrice] = useState(() => read('warshati_label_price', '1') === '1')
  const [printers, setPrinters] = useState([])
  const [busy, setBusy] = useState(false)

  const { data: store } = useQuery({ queryKey: ['store'], queryFn: () => api.get('/store').then((r) => r.data.store), enabled: open })

  useEffect(() => {
    if (!open) return
    setRows(items.map((i) => ({ ...i, copies: i.copies ?? 1 })))
    window.api.getPrinters().then(setPrinters).catch(() => setPrinters([]))
  }, [open, items])

  useEffect(() => { write('warshati_label_size', size) }, [size])
  useEffect(() => { write('warshati_label_printer', printer) }, [printer])
  useEffect(() => { write('warshati_label_shop', showShop ? '1' : '0') }, [showShop])
  useEffect(() => { write('warshati_label_price', showPrice ? '1' : '0') }, [showPrice])

  const opts = { size, shop: store?.name || 'Warshati', showShop, showPrice, cur }
  const total = rows.reduce((n, r) => n + (Number(r.copies) || 0), 0)
  const sample = rows.find((r) => r.copies > 0) || rows[0]
  const preview = useMemo(
    () => sample && LABEL_CSS + labelHtml({ ...sample, barcode: sample.barcode || '200000000000' }, opts),
    [sample, size, showShop, showPrice, store, cur]
  )

  const setCopies = (id, copies) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, copies } : r)))
  const setAll = (fn) => setRows((rs) => rs.map((r) => ({ ...r, copies: fn(r) })))

  const print = async () => {
    const chosen = rows.filter((r) => Number(r.copies) > 0)
    if (!chosen.length) return
    setBusy(true)
    try {
      // Items without a barcode get one first (saved, so the scanner finds them at the till)
      const missing = chosen.filter((r) => !r.barcode).map((r) => r.id)
      let assigned = {}
      if (missing.length) {
        assigned = (await api.post('/inventory/assign-barcodes', { ids: missing })).data.assigned
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
      }
      const labels = chosen.flatMap((r) => {
        const item = { ...r, barcode: r.barcode || assigned[r.id] }
        return item.barcode ? Array(Math.min(500, Number(r.copies))).fill(labelHtml(item, opts)) : []
      })
      const result = await window.api.printReceipt({ html: LABEL_CSS + labels.join(''), printerName: printer || undefined, width: `label:${size}` })
      if (result?.success) {
        toast.success(t('labels.printed', '{{count}} labels sent to the printer', { count: labels.length }))
        onClose()
      } else if (result?.error && result.error !== 'cancelled') {
        toast.error(t('labels.print_failed', 'Printing failed: {{error}}', { error: result.error }))
      }
    } catch (err) {
      toast.error(err.response?.data?.error || t('labels.print_failed', 'Printing failed: {{error}}', { error: err.message }))
    } finally {
      setBusy(false)
    }
  }

  const [w, h] = size.split('x').map(Number)
  const select = 'h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <Modal open={open} onClose={onClose} title={t('labels.title', 'Print barcode labels')} size="lg"
      footer={<>
        <Button variant="outline" onClick={onClose}>{t('inventory.modal.cancel')}</Button>
        <Button variant="flux" onClick={print} loading={busy} disabled={!total}><Printer className="h-4 w-4" /> {t('labels.print', 'Print {{count}} labels', { count: total })}</Button>
      </>}
    >
      <div className="grid grid-cols-[1fr_auto] gap-6">
        <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">{t('labels.size', 'Label size (mm)')}</span>
              <select value={size} onChange={(e) => setSize(e.target.value)} className={select}>
                {SIZES.map((s) => <option key={s} value={s}>{s.replace('x', ' × ')}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">{t('labels.printer', 'Label printer')}</span>
              <select value={printer} onChange={(e) => setPrinter(e.target.value)} className={select}>
                <option value="">{t('labels.ask_printer', 'Ask each time')}</option>
                {printers.map((p) => <option key={p.name} value={p.name}>{p.displayName || p.name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex gap-5 text-sm">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showShop} onChange={(e) => setShowShop(e.target.checked)} className="rounded border-input" /> {t('labels.show_shop', 'Shop name')}</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="rounded border-input" /> {t('labels.show_price', 'Price')}</label>
          </div>

          <div className="border border-border rounded-sm">
            <div className="flex items-center gap-3 px-3 py-2 border-b border-border text-xs text-muted-foreground">
              <span className="flex-1">{t('labels.copies_for', 'Labels per item')}</span>
              <button onClick={() => setAll(() => 1)} className="hover:text-foreground cursor-pointer">{t('labels.one_each', '1 each')}</button>
              <button onClick={() => setAll((r) => Math.max(0, r.quantity))} className="hover:text-foreground cursor-pointer">{t('labels.as_stock', '= stock')}</button>
              <button onClick={() => setAll(() => 0)} className="hover:text-foreground cursor-pointer">{t('labels.none', 'None')}</button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-border">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">{r.barcode || t('labels.new_barcode', 'new barcode')}</p>
                  </div>
                  <input type="number" min="0" max="500" value={r.copies} onChange={(e) => setCopies(r.id, Math.max(0, Math.min(500, parseInt(e.target.value) || 0)))}
                    className="h-8 w-16 rounded-sm border border-input bg-card px-2 text-sm text-center tabular-nums" />
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('labels.hint', 'Items without a barcode get one automatically; the till scanner will find them.')}</p>
        </div>

        {/* Real size on screen is close to print size: mm units */}
        <div className="w-[64mm]">
          <p className="text-xs text-muted-foreground mb-2">{t('labels.preview', 'Preview')}</p>
          <div className="rounded-sm border border-border bg-white shadow-sm" style={{ width: `${w}mm`, height: `${h}mm`, fontFamily: '"IBM Plex Sans", "IBM Plex Sans Arabic", sans-serif' }}
            dangerouslySetInnerHTML={{ __html: preview || '' }} />
        </div>
      </div>
    </Modal>
  )
}
