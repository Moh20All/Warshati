import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CalendarCheck, DollarSign, TrendingUp, CreditCard, Receipt, AlertTriangle, Printer, Package } from 'lucide-react'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import { usePrint } from '../../lib/usePrint'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'
import ExportButton from '../../components/ExportButton'

export default function DailyClosePage() {
  const cur = useCurrency()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast()
  const print = usePrint()
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: preview } = useQuery({
    queryKey: ['daily-close-preview'],
    queryFn: () => api.get('/daily-close/preview').then(r => r.data)
  })

  const { data: history, isLoading } = useQuery({
    queryKey: ['daily-closes'],
    queryFn: () => api.get('/daily-close').then(r => r.data.closes)
  })

  const closeMutation = useMutation({
    mutationFn: () => api.post('/daily-close'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-closes'] })
      queryClient.invalidateQueries({ queryKey: ['daily-close-preview'] })
      setShowConfirm(false)
      toast.success(t('finance.daily_close.success'))
    },
    onError: (err) => toast.error(err.response?.data?.error || t('finance.daily_close.err_failed'))
  })

  // Get store info for branding
  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then(r => r.data.store)
  })

  const printDailyReport = () => {
    if (!preview) return
    const dir = i18n.dir()
    const storeName = store?.name || 'Warshati — ورشتي'
    
    const html = `
      <div dir="${dir}" style="padding: 20px; color: #000;">
        <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h1 style="margin:0; font-size:24px;">${storeName}</h1>
          <h2 style="margin:5px 0 0 0; font-size:18px; color: #000;">DAILY X-REPORT / تقرير Daily Close</h2>
          <p style="margin:5px 0 0 0; font-size:14px;">Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>

        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
          ${stats.map(s => `
            <div style="border: 1px solid #000; padding: 15px; border-radius: 8px;">
              <div style="font-size: 12px; color: #000; margin-bottom: 5px; text-transform: uppercase;">${s.label}</div>
              <div style="font-size: 20px; font-weight: bold;">${s.value}</div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 50px;">
          <div style="display:flex; justify-content:space-between; border-top: 1px solid #000; padding-top: 10px;">
            <div style="text-align:center; width: 45%;">
              <p style="margin-bottom: 40px;">Manager Signature</p>
              <div style="border-bottom: 1px solid #000; width: 100%;"></div>
            </div>
            <div style="text-align:center; width: 45%;">
              <p style="margin-bottom: 40px;">Cashier Signature</p>
              <div style="border-bottom: 1px solid #000; width: 100%;"></div>
            </div>
          </div>
        </div>
      </div>
    `
    print.print(html, 'report')
  }

  const stats = [
    { label: t('finance.daily_close.stat_revenue'), value: `${(preview?.totalRevenue || 0).toLocaleString()} ${cur}`, icon: TrendingUp, color: 'text-success' },
    { label: t('finance.daily_close.stat_cash_sales'), value: `${(preview?.cashSales || 0).toLocaleString()} ${cur}`, icon: DollarSign, color: 'text-info' },
    { label: t('finance.daily_close.stat_credit_sales'), value: `${(preview?.totalCreditSales || 0).toLocaleString()} ${cur}`, icon: CreditCard, color: 'text-warning' },
    { label: t('finance.daily_close.stat_debt_collected'), value: `${(preview?.totalDebtCollected || 0).toLocaleString()} ${cur}`, icon: Receipt, color: 'text-primary' },
    { label: t('finance.daily_close.stat_expenses'), value: `${(preview?.totalExpenses || 0).toLocaleString()} ${cur}`, icon: AlertTriangle, color: 'text-destructive' },
    { label: t('finance.daily_close.stat_net_cash'), value: `${(preview?.netCash || 0).toLocaleString()} ${cur}`, icon: DollarSign, color: preview?.netCash >= 0 ? 'text-success' : 'text-destructive' },
    // Owner only (the server leaves these out for staff): what the day really earned
    // = revenue - cost of the parts/items sold - running expenses (stock purchases are not counted twice)
    ...(preview?.netProfit !== undefined ? [
      { label: t('finance.daily_close.stat_cogs'), value: `${(preview.cogs || 0).toLocaleString()} ${cur}`, icon: Package, color: 'text-muted-foreground' },
      { label: t('finance.daily_close.stat_profit'), value: `${(preview.netProfit || 0).toLocaleString()} ${cur}`, icon: TrendingUp, color: preview.netProfit >= 0 ? 'text-primary' : 'text-destructive', key: true }
    ] : [])
  ]

  const historyColumns = [
    { key: 'date', label: t('finance.daily_close.col_date'), render: (v) => new Date(v).toLocaleDateString() },
    { key: 'totalRevenue', label: t('finance.daily_close.col_revenue'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'totalExpenses', label: t('finance.daily_close.col_expenses'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'totalDebtCollected', label: t('finance.daily_close.col_debt'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'netCash', label: t('finance.daily_close.col_net'), render: (v) => <span className={`font-medium ${Number(v) >= 0 ? 'text-success' : 'text-destructive'}`}>{Number(v).toLocaleString()} {cur}</span> },
    { key: 'openTickets', label: t('finance.daily_close.col_tickets'), render: (v) => v },
    { key: 'lowStockCount', label: t('finance.daily_close.col_low_stock'), render: (v) => v > 0 ? <Badge color="warning">{v}</Badge> : '0' }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('finance.daily_close.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('finance.daily_close.subtitle')}</p></div>
        <div className="flex gap-2">
          {preview && (
            <Button variant="outline" onClick={printDailyReport}><Printer className="h-4 w-4" /> {t('common.print', 'Print Report')}</Button>
          )}
          {!preview?.alreadyClosed ? (
            <Button onClick={() => setShowConfirm(true)}><CalendarCheck className="h-4 w-4" /> {t('finance.daily_close.btn_close')}</Button>
          ) : (
            <Badge color="success" className="py-2.5 px-4">{t('finance.daily_close.already_closed')}</Badge>
          )}
        </div>
      </div>

      {/* Today's Preview */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 ${stats.length > 6 ? 'lg:grid-cols-4' : 'lg:grid-cols-6'}`}>
        {stats.map(s => (
          <div key={s.label} className={`border rounded-md bg-card p-3 ${s.key ? 'border-input' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            </div>
            <p className={`text-lg font-bold ${s.key ? s.color : 'text-foreground'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground">{t('finance.daily_close.history_title')}</h3>
        <ExportButton fileName="warshati-daily-closes" sheetName={t('finance.daily_close.title')} rows={history || []} columns={[
          { header: t('finance.daily_close.col_date'), key: 'date', type: 'date' },
          { header: `${t('finance.daily_close.col_revenue')} (${cur})`, key: 'totalRevenue', type: 'money', width: 16 },
          { header: `${t('finance.daily_close.stat_credit_sales')} (${cur})`, key: 'totalCreditSales', type: 'money', width: 16 },
          { header: `${t('finance.daily_close.col_debt')} (${cur})`, key: 'totalDebtCollected', type: 'money', width: 16 },
          { header: `${t('finance.daily_close.col_expenses')} (${cur})`, key: 'totalExpenses', type: 'money', width: 16 },
          { header: `${t('finance.daily_close.col_net')} (${cur})`, key: 'netCash', type: 'money', width: 16 },
          { header: t('finance.daily_close.col_tickets'), key: 'openTickets', type: 'number' },
          { header: t('finance.daily_close.col_low_stock'), key: 'lowStockCount', type: 'number' }
        ]} />
      </div>
      {isLoading ? <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={historyColumns} data={history || []} emptyTitle={t('finance.daily_close.empty_title')} emptyDescription={t('finance.daily_close.empty_desc')} />}

      <ConfirmModal open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={() => closeMutation.mutate()}
        title={t('finance.daily_close.modal_title')} message={t('finance.daily_close.modal_msg')} confirmText={t('finance.daily_close.btn_confirm')} loading={closeMutation.isPending} />
    </div>
  )
}
