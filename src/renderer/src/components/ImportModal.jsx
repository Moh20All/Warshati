import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FileSpreadsheet, Upload, CheckCircle2 } from 'lucide-react'
import api from '../lib/api'
import { useToast } from './ui/Toast'
import Modal from './ui/Modal'
import Button from './ui/Button'

const ITEM_TYPES = ['PART', 'ACCESSORY', 'PHONE_NEW', 'PHONE_USED']
const select = 'h-9 w-full rounded-sm border border-input bg-popover px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

/** "Import" button + its window (owner pages: Inventory, Customers, Suppliers) */
export function ImportButton({ kind }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><FileSpreadsheet className="h-4 w-4" /> {t('import.btn')}</Button>
    <ImportModal kind={kind} open={open} onClose={() => setOpen(false)} />
  </>
}

/** The owner's Excel/CSV file → kind ('inventory' | 'customers' | 'suppliers'). He matches its columns to our fields. */
export default function ImportModal({ kind, open, onClose }) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [file, setFile] = useState(null)   // { name, headers, rows, fields, truncated }
  const [map, setMap] = useState({})       // field → column index ('' = not imported)
  const [itemType, setItemType] = useState('PART')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const close = () => { setFile(null); setMap({}); setResult(null); onClose() }
  const err = (e) => { const code = e.response?.data?.error; toast.error(t(`import.errors.${code}`, { defaultValue: code || t('import.errors.UNREADABLE') })) }

  const pick = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const reader = new FileReader()
    reader.onload = async () => {
      setBusy(true)
      try {
        const { data } = await api.post('/import/read', { kind, fileName: f.name, data: String(reader.result).split(',')[1] })
        setFile({ name: f.name, ...data })
        setMap(Object.fromEntries(data.fields.map(x => [x.key, data.guess[x.key] ?? ''])))
      } catch (e) { err(e) } finally { setBusy(false) }
    }
    reader.readAsDataURL(f)
  }

  const mapped = file ? file.fields.filter(f => map[f.key] !== '') : []
  const rowsOut = file ? file.rows.map((r, i) => ({ _line: i + 2, ...Object.fromEntries(mapped.map(f => [f.key, r[map[f.key]]])) })) : []
  const missing = file?.fields.find(f => f.required && map[f.key] === '')

  const run = async () => {
    setBusy(true)
    try {
      const { data } = await api.post(`/import/${kind}`, { rows: rowsOut, itemType })
      setResult(data)
      queryClient.invalidateQueries({ queryKey: [kind] })
      if (kind === 'inventory') queryClient.invalidateQueries({ queryKey: ['inventory'] })
    } catch (e) { err(e) } finally { setBusy(false) }
  }

  const footer = result
    ? <Button onClick={close}>{t('import.btn_done')}</Button>
    : <>
        <Button variant="outline" onClick={close}>{t('import.btn_cancel')}</Button>
        {file && <Button onClick={run} loading={busy} disabled={!!missing}><Upload className="h-4 w-4" /> {t('import.btn_import', { count: rowsOut.length })}</Button>}
      </>

  return (
    <Modal open={open} onClose={close} size="xl" title={t(`import.title_${kind}`)} footer={footer}>
      {result ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-base font-semibold text-foreground"><CheckCircle2 className="h-5 w-5 text-success" /> {t('import.done_created', { count: result.created })}</p>
          {result.skipped.length > 0 && <>
            <p className="text-sm text-muted-foreground">{t('import.done_skipped', { count: result.skipped.length })}</p>
            <div className="max-h-64 overflow-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <tbody>
                  {result.skipped.map(s => (
                    <tr key={s.line} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{t('import.line', { line: s.line })}</td>
                      <td className="px-3 py-1.5">{s.name || '—'}</td>
                      <td className="px-3 py-1.5 text-destructive">{t(`import.reasons.${s.reason}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>}
        </div>
      ) : !file ? (
        <label className="flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-border rounded-md cursor-pointer hover:bg-accent/40 transition-colors">
          <FileSpreadsheet className="h-10 w-10 text-primary" />
          <span className="text-sm font-medium text-foreground">{busy ? t('import.reading') : t('import.choose_file')}</span>
          <span className="text-xs text-muted-foreground text-center px-6">{t('import.formats')}</span>
          <input type="file" accept=".xlsx,.csv" className="hidden" onChange={pick} disabled={busy} />
        </label>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{file.name}</span> · {t('import.rows_found', { count: file.rows.length })}{file.truncated ? ` · ${t('import.truncated')}` : ''}</p>
          {kind === 'inventory' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t('import.item_type')}</label>
              <select value={itemType} onChange={e => setItemType(e.target.value)} className={select}>
                {ITEM_TYPES.map(x => <option key={x} value={x}>{t(`inventory.types.${x.toLowerCase()}`)}</option>)}
              </select>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('import.map_hint')}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {file.fields.map(f => (
                <div key={f.key} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 text-sm text-foreground">{t(`import.fields.${f.key}`)}{f.required ? ' *' : ''}</span>
                  <select value={map[f.key]} onChange={e => setMap({ ...map, [f.key]: e.target.value === '' ? '' : Number(e.target.value) })} className={select}>
                    <option value="">{t('import.col_none')}</option>
                    {file.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {missing && <p className="mt-2 text-xs text-destructive">{t('import.need_field', { field: t(`import.fields.${missing.key}`) })}</p>}
          </div>
          {mapped.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t('import.preview')}</p>
              <div className="overflow-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr>{mapped.map(f => <th key={f.key} className="px-3 py-1.5 text-start font-medium whitespace-nowrap">{t(`import.fields.${f.key}`)}</th>)}</tr></thead>
                  <tbody>
                    {rowsOut.slice(0, 5).map(r => (
                      <tr key={r._line} className="border-t border-border">{mapped.map(f => <td key={f.key} className="px-3 py-1.5 whitespace-nowrap">{r[f.key] || '—'}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t(`import.note_${kind}`)}</p>
        </div>
      )}
    </Modal>
  )
}
