import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Search, Printer, Undo2 } from 'lucide-react'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import { useAuth } from '../../lib/auth'
import { usePrint } from '../../lib/usePrint'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import ExportButton from '../../components/ExportButton'

// What the customer actually paid on a sale: at the till + later debt payments
const paidBy = (s) => parseFloat(s.amountPaid || 0) + parseFloat(s.debtEntry?.paidAmount || 0)

export default function InvoiceList() {
  const cur = useCurrency()
  const { t, i18n } = useTranslation()
  const { isOwner } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [refundSale, setRefundSale] = useState(null)
  const [refundReason, setRefundReason] = useState('')
  const print = usePrint()

  const refundMutation = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/sales/${id}/refund`, { reason }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['daily-close-preview'] })
      setRefundSale(null); setRefundReason('')
      toast.success(t('sales.invoices.refund_success', { amount: Number(res.data.refundedAmount).toLocaleString() }))
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Refund failed')
  })

  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then(r => r.data.store)
  })

  const { data, isLoading } = useQuery({
    queryKey: ['sales', search],
    queryFn: () => api.get('/sales', { params: { search: search || undefined } }).then(r => r.data.sales)
  })

  const printReceipt = (s) => {
    const dir = i18n.dir()
    
    const storeName = store?.name || 'Warshati — ورشتي'
    const storeAddress = store?.address || ''
    const storePhone = store?.phone || ''

    const html = `<div dir="${dir}" style="font-family:'Courier New', monospace; box-sizing: border-box; width: 100%;">
      <div style="text-align:center; margin-bottom:10px;">
        <div style="display:inline-block; width:40px; height:40px; background:#000; color:#fff; line-height:40px; border-radius:50%; font-weight:bold; font-size:24px; margin-bottom:5px;">R</div>
        <h2 style="margin:0; font-size:16px; text-transform: uppercase;">${storeName}</h2>
        ${storeAddress ? `<p style="margin:2px 0; font-size:10px;">📍 ${storeAddress}</p>` : ''}
        ${storePhone ? `<p style="margin:2px 0; font-size:10px;">📞 ${storePhone}</p>` : ''}
        <div style="border-top:2px solid #000; margin:10px 0;"></div>
        <p style="margin:0; font-size:13px; font-weight:bold;">${t('sales.receipt.title')} / فاتورة</p>
      </div>
      
      <div style="font-size: 11px; margin-bottom: 10px;">
        <div style="display:flex; justify-content:space-between;"><span>${t('sales.receipt.inv')}:</span><strong>${s.saleNumber}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>${t('sales.receipt.date')}:</span><span>${new Date(s.createdAt).toLocaleString()}</span></div>
        ${s.customer ? `<div style="display:flex; justify-content:space-between;"><span>${t('sales.receipt.customer')}:</span><span>${s.customer.name}</span></div>` : ''}
      </div>
      
      <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-family:monospace; font-size:11px;">
        <thead>
          <tr style="border-bottom:1px dashed #000;">
            <th style="text-align:${dir === 'rtl' ? 'right' : 'left'}; width:45%; padding-bottom:5px;">ITEM</th>
            <th style="text-align:center; width:15%; padding-bottom:5px;">QTY</th>
            <th style="text-align:right; width:20%; padding-bottom:5px;">PRICE</th>
            <th style="text-align:right; width:20%; padding-bottom:5px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${s.items.map(i => `
            <tr>
              <td style="padding:4px 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${i.description}</td>
              <td style="text-align:center; padding:4px 0;">${i.quantity}</td>
              <td style="text-align:right; padding:4px 0;">${Number(i.unitPrice).toLocaleString()}</td>
              <td style="text-align:right; padding:4px 0;">${Number(i.subtotal).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
      
      <div style="font-size: 11px;">
        <div style="display:flex; justify-content:space-between; margin:2px 0; font-weight:bold; font-size:14px;"><strong>${t('sales.receipt.total')}:</strong><strong>${Number(s.total).toLocaleString()} ${cur}</strong></div>
        <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>${t('sales.receipt.paid')}:</span><span>${Number(s.amountPaid).toLocaleString()} ${cur}</span></div>
        <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>${t('sales.receipt.method')}:</span><span>${s.paymentMethod}</span></div>
      </div>

      ${s.items.some(i => i.warrantyDays > 0) ? `
        <div style="border-top:2px solid #000; margin:10px 0;"></div>
        <div style="font-size: 11px;">
          <p style="margin:0 0 5px 0; font-weight:bold; text-decoration:underline;">✓ Warranty / الضمان:</p>
          ${s.items.filter(i => i.warrantyDays > 0).map(i => {
            const until = new Date(s.createdAt);
            until.setDate(until.getDate() + i.warrantyDays);
            return `<p style="margin:2px 0;">• ${i.description}: ${i.warrantyDays} days (Until ${until.toLocaleDateString()})</p>`;
          }).join('')}
        </div>
      ` : ''}
      
      <div style="border-top:1px dashed #000; margin:10px 0;"></div>
      <p style="text-align:center; font-size:11px; margin-top:10px;">${t('sales.receipt.footer')}</p>
    </div>`

    // All printing via Electron IPC — no window.open()
    print.print(html)
  }

  const exportRows = (data || []).map(s => ({
    number: s.saleNumber, date: s.createdAt,
    customer: s.customer?.name || t('sales.invoices.walk_in'),
    method: s.paymentMethod,
    status: t(`repairs.statuses.${s.status}`, { defaultValue: s.status }),
    total: s.total, paid: paidBy(s), refunded: s.refund?.createdAt
  }))

  const columns = [
    { key: 'saleNumber', label: t('sales.invoices.col_inv'), render: (v) => <span className="font-mono font-medium text-primary">{v}</span> },
    { key: 'customer', label: t('sales.invoices.col_customer'), render: (v) => v ? <div><p className="font-medium">{v.name}</p><p className="text-xs text-muted-foreground">{v.phone}</p></div> : <span className="text-muted-foreground">{t('sales.invoices.walk_in')}</span> },
    { key: 'total', label: t('sales.invoices.col_total'), render: (v) => <span className="font-medium">{Number(v).toLocaleString()} {cur}</span> },
    { key: 'paymentMethod', label: t('sales.invoices.col_payment'), render: (v) => <StatusBadge kind="method" value={v} /> },
    { key: 'status', label: t('sales.invoices.col_status'), render: (v, r) => (
      <div>
        <StatusBadge kind="sale" value={v} />
        {r.refund && <p className="text-xs text-muted-foreground mt-1">{t('sales.invoices.refunded_on', { date: new Date(r.refund.createdAt).toLocaleDateString() })}</p>}
      </div>
    ) },
    { key: 'createdAt', label: t('sales.invoices.col_date'), render: (v) => new Date(v).toLocaleDateString() },
    { key: 'actions', label: '', className: 'text-right', render: (_, r) => (
      <div className="flex items-center justify-end gap-1">
        {isOwner && r.status !== 'REFUNDED' && !r.repairTicketId && (
          <button onClick={(e) => { e.stopPropagation(); setRefundSale(r); setRefundReason('') }} title={t('sales.invoices.btn_refund')} className="p-1.5 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"><Undo2 className="h-3.5 w-3.5" /></button>
        )}
        <button onClick={(e) => { e.stopPropagation(); printReceipt(r) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"><Printer className="h-3.5 w-3.5" /></button>
      </div>
    )}
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div><h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('sales.invoices.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('sales.invoices.subtitle')}</p></div>
        <ExportButton fileName="warshati-invoices" sheetName={t('sales.invoices.title')} rows={exportRows} columns={[
          { header: t('sales.invoices.col_inv'), key: 'number', width: 18 },
          { header: t('sales.invoices.col_date'), key: 'date', type: 'datetime', width: 18 },
          { header: t('sales.invoices.col_customer'), key: 'customer', width: 22 },
          { header: t('sales.invoices.col_payment'), key: 'method' },
          { header: t('sales.invoices.col_status'), key: 'status', width: 14 },
          { header: `${t('sales.invoices.col_total')} (${cur})`, key: 'total', type: 'money', width: 16 },
          { header: `${t('sales.receipt.paid')} (${cur})`, key: 'paid', type: 'money', width: 16 },
          { header: t('sales.invoices.btn_refund'), key: 'refunded', type: 'datetime', width: 18 }
        ]} />
      </div>
      <div className="mb-4 max-w-sm"><Input placeholder={t('sales.invoices.search_ph')} icon={Search} value={search} onChange={e => setSearch(e.target.value)} /></div>
      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle={t('sales.invoices.empty_title')} emptyDescription={t('sales.invoices.empty_desc')} />}

      <Modal open={!!refundSale} onClose={() => setRefundSale(null)} title={t('sales.invoices.refund_title', { num: refundSale?.saleNumber })}
        footer={<><Button variant="outline" onClick={() => setRefundSale(null)} disabled={refundMutation.isPending}>{t('sales.invoices.refund_cancel')}</Button><Button variant="danger" onClick={() => refundMutation.mutate({ id: refundSale.id, reason: refundReason })} loading={refundMutation.isPending}>{t('sales.invoices.refund_confirm')}</Button></>}>
        {refundSale && (
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-muted rounded-md flex justify-between">
              <span className="text-muted-foreground">{t('sales.invoices.refund_amount')}:</span>
              <span className="font-bold text-destructive">{paidBy(refundSale).toLocaleString()} {cur}</span>
            </div>
            <ul className="list-disc ps-5 text-muted-foreground">
              {refundSale.items.map(i => <li key={i.id}>{i.quantity} × {i.description}</li>)}
            </ul>
            <p className="text-muted-foreground">{t('sales.invoices.refund_stock')}</p>
            {refundSale.debtEntry && refundSale.debtEntry.status !== 'SETTLED' && (
              <p className="text-warning">{t('sales.invoices.refund_debt', { amount: `${Number(refundSale.debtEntry.remaining).toLocaleString()} ${cur}` })}</p>
            )}
            <Input label={t('sales.invoices.refund_reason')} value={refundReason} onChange={e => setRefundReason(e.target.value)} />
          </div>
        )}
      </Modal>
    </div>
  )
}
