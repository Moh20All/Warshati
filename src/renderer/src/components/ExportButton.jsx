import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from './ui/Button'
import { useToast } from './ui/Toast'

/**
 * Exports the rows a page is showing to an .xlsx file.
 * columns: [{ header, key, type?: 'text'|'money'|'number'|'date'|'datetime', width? }]
 * rows:    plain objects with those keys (already translated/flattened by the page)
 */
export default function ExportButton({ fileName, sheetName, columns, rows }) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (!rows?.length) return toast.warning(t('export.empty'))
    setBusy(true)
    try {
      const stamp = new Date().toISOString().slice(0, 10)
      const result = await window.api.exportXlsx({
        fileName: `${fileName}-${stamp}`, sheetName, columns, rows, rtl: i18n.dir() === 'rtl'
      })
      if (result.success) toast.success(t('export.success', { count: result.count }))
      else if (!result.canceled) toast.error(result.error || t('export.failed'))
    } catch (e) {
      toast.error(t('export.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" onClick={run} loading={busy}>
      <FileSpreadsheet className="h-4 w-4" /> {t('export.button')}
    </Button>
  )
}
