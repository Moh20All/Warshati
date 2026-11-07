import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'
import { repairLabelHtml, REPAIR_LABEL_CSS } from '../lib/repairLabel'
import { SIZES } from './LabelsModal'
import { useToast } from './ui/Toast'
import Modal from './ui/Modal'
import Button from './ui/Button'

const read = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }

/** Print adhesive stickers for a repair ticket (stuck on the phone). Same label printer as the item labels. */
export default function RepairLabelModal({ open, onClose, ticket, store }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [size, setSize] = useState(() => read('warshati_repair_label_size', '40x30'))
  const [custom, setCustom] = useState({ w: '', h: '' })
  const [printer, setPrinter] = useState(() => read('warshati_label_printer', ''))
  const [opts, setOpts] = useState(() => ({ showShop: read('warshati_rl_shop', '1') === '1', showPhone: read('warshati_rl_phone', '1') === '1', showIssue: read('warshati_rl_issue', '1') === '1' }))
  const [copies, setCopies] = useState(1)
  const [printers, setPrinters] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (open) window.api.getPrinters().then(setPrinters).catch(() => setPrinters([])) }, [open])
  useEffect(() => { if (size !== 'custom') write('warshati_repair_label_size', size) }, [size])
  useEffect(() => { write('warshati_label_printer', printer) }, [printer])
  useEffect(() => { write('warshati_rl_shop', opts.showShop ? '1' : '0'); write('warshati_rl_phone', opts.showPhone ? '1' : '0'); write('warshati_rl_issue', opts.showIssue ? '1' : '0') }, [opts])

  // Custom size: 15–120 mm each way
  const cw = parseInt(custom.w), ch = parseInt(custom.h)
  const real = size === 'custom' ? (cw >= 15 && cw <= 120 && ch >= 15 && ch <= 120 ? `${cw}x${ch}` : null) : size
  const [w, h] = (real || '40x30').split('x').map(Number)
  const html = ticket && real ? repairLabelHtml(ticket, { size: real, shop: store?.name || 'Warshati', ...opts }) : ''

  const print = async () => {
    if (!html) return
    setBusy(true)
    try {
      const result = await window.api.printReceipt({ html: REPAIR_LABEL_CSS + Array(Math.max(1, Math.min(20, copies))).fill(html).join(''), printerName: printer || undefined, width: `label:${real}` })
      if (result?.success) { toast.success(t('labels.printed', { count: copies })); onClose() }
      else if (result?.error && result.error !== 'cancelled') toast.error(t('labels.print_failed', { error: result.error }))
    } catch (err) {
      toast.error(t('labels.print_failed', { error: err.message }))
    } finally {
      setBusy(false)
    }
  }

  const select = 'h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
  const check = (key) => (
    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={opts[key]} onChange={(e) => setOpts({ ...opts, [key]: e.target.checked })} className="rounded border-input" /> {t(`repair_label.${key}`)}</label>
  )

  return (
    <Modal open={open} onClose={onClose} title={t('repair_label.title')} size="lg"
      footer={<>
        <Button variant="outline" onClick={onClose}>{t('inventory.modal.cancel')}</Button>
        <Button variant="flux" onClick={print} loading={busy} disabled={!html}><Printer className="h-4 w-4" /> {t('labels.print', { count: copies })}</Button>
      </>}>
      <div className="grid grid-cols-[1fr_auto] gap-6">
        <div className="space-y-4 min-w-0">
          <p className="text-sm text-muted-foreground">{t('repair_label.desc')}</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">{t('labels.size')}</span>
              <select value={size} onChange={(e) => setSize(e.target.value)} className={select}>
                {SIZES.map((s) => <option key={s} value={s}>{s.replace('x', ' × ')}</option>)}
                <option value="custom">{t('repair_label.custom')}</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">{t('labels.printer')}</span>
              <select value={printer} onChange={(e) => setPrinter(e.target.value)} className={select}>
                <option value="">{t('labels.ask_printer')}</option>
                {printers.map((p) => <option key={p.name} value={p.name}>{p.displayName || p.name}</option>)}
              </select>
            </label>
          </div>
          {size === 'custom' && (
            <div className="flex items-center gap-2 text-sm">
              <input type="number" min="15" max="120" value={custom.w} onChange={(e) => setCustom({ ...custom, w: e.target.value })} placeholder="40" className="h-9 w-20 rounded-sm border border-input bg-card px-2" aria-label="width" />
              <span>×</span>
              <input type="number" min="15" max="120" value={custom.h} onChange={(e) => setCustom({ ...custom, h: e.target.value })} placeholder="30" className="h-9 w-20 rounded-sm border border-input bg-card px-2" aria-label="height" />
              <span className="text-muted-foreground">mm</span>
            </div>
          )}
          <div className="flex flex-wrap gap-5 text-sm">{check('showShop')}{check('showPhone')}{check('showIssue')}</div>
          <label className="flex items-center gap-2 text-sm">
            {t('repair_label.copies')}
            <input type="number" min="1" max="20" value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} className="h-8 w-16 rounded-sm border border-input bg-card px-2 text-center" />
          </label>
          <p className="text-xs text-muted-foreground">{t('repair_label.hint')}</p>
        </div>
        {/* Real size on screen is close to print size: mm units */}
        <div className="w-[64mm]">
          <p className="text-xs text-muted-foreground mb-2">{t('labels.preview')}</p>
          <div className="rounded-sm border border-border bg-white shadow-sm" style={{ width: `${w}mm`, height: `${h}mm`, fontFamily: '"IBM Plex Sans", "IBM Plex Sans Arabic", sans-serif' }}
            dangerouslySetInnerHTML={{ __html: html ? REPAIR_LABEL_CSS + html : '' }} />
        </div>
      </div>
    </Modal>
  )
}
