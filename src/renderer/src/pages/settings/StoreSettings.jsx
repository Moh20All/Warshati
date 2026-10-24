import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Store, Save, Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function StoreSettings() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast()
  // Printer settings (stored in localStorage)
  const [printers, setPrinters] = useState([])
  const [selectedPrinter, setSelectedPrinter] = useState(localStorage.getItem('warshati_printer') || '')
  const [receiptWidth, setReceiptWidth] = useState(localStorage.getItem('warshati_receipt_width') || '80mm')
  const [ticketWidth, setTicketWidth] = useState(localStorage.getItem('warshati_ticket_width') || '80mm')
  const [reportWidth, setReportWidth] = useState(localStorage.getItem('warshati_report_width') || 'A4')
  const [showDialog, setShowDialog] = useState(localStorage.getItem('warshati_show_print_dialog') === 'true')
  const [testingPrint, setTestingPrint] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', currency: 'DZD', warrantyDays: 30 })

  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then(r => r.data.store)
  })

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name || '', phone: store.phone || '',
        address: store.address || '', currency: store.currency || 'DZD',
        warrantyDays: store.warrantyDays || 30
      })
    }
  }, [store])

  // Load available printers
  useEffect(() => {
    window.api.getPrinters().then(list => {
      setPrinters(list || [])
    }).catch(() => {})
  }, [])

  const saveMutation = useMutation({
    mutationFn: (d) => api.put('/store', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] })
      toast.success(t('settings.saved_success'))
    },
    onError: (err) => toast.error(err.response?.data?.error || t('settings.save_failed'))
  })

  const handleSave = () => {
    // Persist printer settings to localStorage
    localStorage.setItem('warshati_printer', selectedPrinter)
    localStorage.setItem('warshati_receipt_width', receiptWidth)
    localStorage.setItem('warshati_ticket_width', ticketWidth)
    localStorage.setItem('warshati_report_width', reportWidth)
    localStorage.setItem('warshati_show_print_dialog', showDialog)
    saveMutation.mutate({
      ...form,
      warrantyDays: parseInt(form.warrantyDays)
    })
  }

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value)
  }

  const handleTestPrint = async () => {
    if (!selectedPrinter) return
    setTestingPrint(true)
    try {
      const storeName = form.name || 'Warshati — ورشتي'
      const storeAddress = form.address || ''
      const storePhone = form.phone || ''

      const html = `
        <div style="font-family:'Courier New', monospace; box-sizing: border-box; width: 100%; text-align:center;">
          <div style="display:inline-block; width:40px; height:40px; background:#000; color:#fff; line-height:40px; border-radius:50%; font-weight:bold; font-size:24px; margin-bottom:5px;">R</div>
          <h2 style="margin:0; font-size:16px; text-transform: uppercase;">${storeName}</h2>
          ${storeAddress ? `<p style="margin:2px 0; font-size:10px;">📍 ${storeAddress}</p>` : ''}
          ${storePhone ? `<p style="margin:2px 0; font-size:10px;">📞 ${storePhone}</p>` : ''}
          <div style="border-top:2px solid #000; margin:10px 0;"></div>
          <p style="margin:0; font-size:11px;">Test Print / تجربة الطباعة</p>
          <div style="border-top:1px dashed #000; margin:8px 0;"></div>
          <div style="text-align:left; font-size:11px;">
            <p style="margin:2px 0;">Printer: ${selectedPrinter}</p>
            <p style="margin:2px 0;">Receipt Width (Test): ${receiptWidth}</p>
            <p style="margin:2px 0;">Date: ${new Date().toLocaleString()}</p>
          </div>
          <div style="border-top:1px dashed #000; margin:8px 0;"></div>
          <p style="margin:0; font-size:11px;">✓ Working correctly! / يعمل بنجاح</p>
        </div>
      `
      const result = await window.api.printReceipt({ html, printerName: selectedPrinter, width: receiptWidth })
      if (result.success) toast.success(t('settings.printer_test_success'))
      else toast.error(t('settings.printer_test_fail', { error: result.error || 'Unknown error' }))
    } catch (err) {
      toast.error(t('settings.printer_test_fail', { error: err.message }))
    } finally {
      setTestingPrint(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('settings.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        </div>
        <Button onClick={handleSave} loading={saveMutation.isPending}><Save className="h-4 w-4" /> {t('settings.save')}</Button>
      </div>

      <div className="border border-border rounded-md bg-card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary text-primary-foreground font-bold text-lg">R</div>
          <div><p className="font-semibold text-foreground">Warshati — ورشتي</p><p className="text-xs text-muted-foreground">Phone Repair & Store Management</p></div>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('settings.language')}</label>
            <select value={i18n.language.split('-')[0]} onChange={handleLanguageChange} className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="en">{t('settings.english')}</option>
              <option value="fr">{t('settings.french')}</option>
              <option value="ar">{t('settings.arabic')}</option>
            </select>
          </div>
        </div>

        <Input label={t('settings.store_name')} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <Input label={t('settings.phone')} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        <Input label={t('settings.address')} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('settings.currency')}</label>
            <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="DZD">DZD (Algerian Dinar)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="SAR">SAR (Saudi Riyal)</option>
              <option value="MAD">MAD (Moroccan Dirham)</option>
              <option value="TND">TND (Tunisian Dinar)</option>
            </select>
          </div>
          <Input label={t('settings.warranty_days')} type="number" value={form.warrantyDays} onChange={e => setForm({...form, warrantyDays: e.target.value})} />
        </div>

        {/* Printer Settings */}
        <div className="pt-4 border-t border-border space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Printer className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">{t('settings.printer')}</h3>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium text-foreground">{t('settings.printer_select')}</label>
              <select 
                value={selectedPrinter} 
                onChange={e => setSelectedPrinter(e.target.value)} 
                className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('settings.printer_none')}</option>
                {printers.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t('settings.receipt_width', 'Receipt Paper Size')}</label>
              <select value={receiptWidth} onChange={e => setReceiptWidth(e.target.value)} className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="58mm">58mm</option><option value="80mm">80mm</option><option value="A4">A4</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t('settings.ticket_width', 'Ticket Paper Size')}</label>
              <select value={ticketWidth} onChange={e => setTicketWidth(e.target.value)} className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="58mm">58mm</option><option value="80mm">80mm</option><option value="A4">A4</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t('settings.report_width', 'Report Paper Size')}</label>
              <select value={reportWidth} onChange={e => setReportWidth(e.target.value)} className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" disabled>
                <option value="A4">A4</option>
              </select>
            </div>
          </div>

          {selectedPrinter && (
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="showDialog" 
                  checked={showDialog} 
                  onChange={e => setShowDialog(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-input bg-background focus:ring-2 focus:ring-primary"
                />
                <label htmlFor="showDialog" className="text-sm font-medium text-foreground cursor-pointer">
                  {t('settings.printer_show_dialog', 'Always show system print dialog (Manual)')}
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleTestPrint} loading={testingPrint}>
                  <Printer className="h-4 w-4" /> {t('settings.printer_test')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
