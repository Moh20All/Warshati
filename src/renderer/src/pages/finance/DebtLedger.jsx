import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Search, DollarSign, Plus, History, MessageCircle } from 'lucide-react'
import { usePrint } from '../../lib/usePrint'
import { paymentReceiptHtml } from '../../lib/receipts'
import { sendWhatsApp } from '../../lib/whatsapp'
import { useAuth } from '../../lib/auth'
import Combobox from '../../components/ui/Combobox'
import PaymentHistoryModal from '../../components/PaymentHistoryModal'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import ExportButton from '../../components/ExportButton'

export default function DebtLedger() {
  const cur = useCurrency()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const { isOwner } = useAuth()
  const printer = usePrint()
  const [historyId, setHistoryId] = useState(null)
  const [printPrompt, setPrintPrompt] = useState(null) // { debt, payment } right after a payment

  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then(r => r.data.store)
  })

  const printReceipt = (debt, payment) =>
    printer.print(paymentReceiptHtml({ t, dir: i18n.dir(), store, cur, debt, payment }))

  const remind = async (d) => {
    if (!d.customer?.phone) return toast.warning(t('finance.debts.err_no_phone'))
    const text = t('finance.debts.wa_reminder', { name: d.customer.name, store: store?.name || 'Warshati', amount: `${Number(d.remaining).toLocaleString()} ${cur}` })
    const r = await sendWhatsApp(d.customer.phone, store?.currency, text)
    if (!r.success) toast.error(t('finance.debts.err_invalid_phone'))
  }
  const today = () => new Date().toISOString().slice(0, 10)
  const emptyDebt = () => ({ mode: 'existing', customerId: null, customerName: '', customerPhone: '', amount: '', date: today(), notes: '' })
  const [addOpen, setAddOpen] = useState(false)
  const [debtForm, setDebtForm] = useState(emptyDebt())

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', ''],
    queryFn: () => api.get('/customers').then(r => r.data.customers),
    enabled: addOpen
  })

  const addMutation = useMutation({
    mutationFn: (d) => api.post('/debts', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setAddOpen(false); setDebtForm(emptyDebt())
      toast.success(t('finance.debts.success_add'))
    },
    onError: (err) => toast.error(err.response?.data?.error || t('finance.debts.err_failed'))
  })

  const cancelPayment = async (payment, reason) => {
    try {
      await api.post(`/debts/${historyId}/payments/${payment.id}/cancel`, { reason })
      await queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['daily-close-preview'] })
      toast.success(t('finance.debts.success_cancel'))
    } catch (err) {
      toast.error(err.response?.data?.error || t('finance.debts.err_failed'))
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['debts', search, statusFilter],
    queryFn: () => api.get('/debts', { params: { search: search || undefined, status: statusFilter || undefined } }).then(r => r.data.debts)
  })

  const payMutation = useMutation({
    mutationFn: ({ id, amount }) => api.post(`/debts/${id}/payment`, { amount: parseFloat(amount) }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['daily-close-preview'] })
      // Offer a receipt for the payment just recorded (keep sale/ticket info from the row)
      const debt = { ...paymentModal, ...res.data.debt }
      const payment = [...(debt.payments || [])].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))[0]
      setPaymentModal(null); setPaymentAmount('')
      toast.success(t('finance.debts.success'))
      if (payment) setPrintPrompt({ debt, payment })
    },
    onError: (err) => toast.error(err.response?.data?.error || t('finance.debts.err_failed'))
  })

  const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)

  const columns = [
    { key: 'customer', label: t('finance.debts.col_customer'), render: (v) => <div><p className="font-medium">{v?.name}</p><p className="text-xs text-muted-foreground"><bdi dir="ltr">{v?.phone}</bdi></p></div> },
    { key: 'type', label: t('finance.debts.col_type'), render: (v) => <StatusBadge kind="debtType" value={v} /> },
    { key: 'totalAmount', label: t('finance.debts.col_total'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'paidAmount', label: t('finance.debts.col_paid'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'remaining', label: t('finance.debts.col_remaining'), render: (v) => <span className="font-medium text-destructive">{Number(v).toLocaleString()} {cur}</span> },
    { key: 'status', label: t('finance.debts.col_status'), render: (v) => <StatusBadge kind="debt" value={v} /> },
    {
      key: 'createdAt', label: t('finance.debts.col_age'),
      render: (v, r) => {
        const days = daysSince(v)
        return r.status !== 'SETTLED' && days > 30
          ? <span className="text-destructive font-medium">{t('finance.debts.overdue', { days })}</span>
          : t('finance.debts.days', { days })
      }
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status !== 'SETTLED' && r.customer?.phone && (
            <Button variant="ghost" size="sm" title={t('finance.debts.btn_whatsapp')} onClick={(e) => { e.stopPropagation(); remind(r) }}>
              <MessageCircle className="h-3.5 w-3.5 text-success" />
            </Button>
          )}
          {r.payments?.length > 0 && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setHistoryId(r.id) }}>
              <History className="h-3.5 w-3.5" /> {t('finance.debts.btn_history')}
            </Button>
          )}
          {r.status !== 'SETTLED' && (
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPaymentModal(r); setPaymentAmount('') }}>
              <DollarSign className="h-3.5 w-3.5" /> {t('finance.debts.btn_pay')}
            </Button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div><h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('finance.debts.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('finance.debts.subtitle')}</p></div>
        <div className="flex gap-2">
        {isOwner && <Button onClick={() => { setDebtForm(emptyDebt()); setAddOpen(true) }}><Plus className="h-4 w-4" /> {t('finance.debts.btn_add_debt')}</Button>}
        <ExportButton fileName="warshati-debts" sheetName={t('finance.debts.title')} columns={[
          { header: t('finance.debts.col_customer'), key: 'customer', width: 22 },
          { header: t('customers.columns.phone', 'Phone'), key: 'phone', width: 16 },
          { header: t('finance.debts.col_type'), key: 'type', width: 16 },
          { header: `${t('finance.debts.col_total')} (${cur})`, key: 'total', type: 'money', width: 16 },
          { header: `${t('finance.debts.col_paid')} (${cur})`, key: 'paid', type: 'money', width: 16 },
          { header: `${t('finance.debts.col_remaining')} (${cur})`, key: 'remaining', type: 'money', width: 16 },
          { header: t('finance.debts.col_status'), key: 'status', width: 14 },
          { header: t('sales.invoices.col_date'), key: 'date', type: 'date' }
        ]} rows={(data || []).map(d => ({
          customer: d.customer?.name, phone: d.customer?.phone, type: d.type.replace('_', ' '),
          total: d.totalAmount, paid: d.paidAmount, remaining: d.remaining,
          status: t(`repairs.statuses.${d.status}`, { defaultValue: d.status }), date: d.createdAt
        }))} />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="max-w-sm flex-1"><Input placeholder={t('finance.debts.search_ph')} icon={Search} data-search value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">{t('finance.debts.filter_all')}</option><option value="OPEN">{t('finance.debts.filter_open')}</option><option value="PARTIAL">{t('finance.debts.filter_partial')}</option><option value="SETTLED">{t('finance.debts.filter_settled')}</option>
        </select>
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle={t('finance.debts.empty_title')} emptyDescription={t('finance.debts.empty_desc')} />}

      {/* Record Payment Modal */}
      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title={t('finance.debts.modal_title')}
        footer={<><Button variant="outline" onClick={() => setPaymentModal(null)}>{t('finance.debts.btn_cancel')}</Button><Button onClick={() => payMutation.mutate({ id: paymentModal?.id, amount: paymentAmount })} loading={payMutation.isPending} disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}>{t('finance.debts.btn_record')}</Button></>}
      >
        {paymentModal && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('finance.debts.col_customer')}:</span><span className="font-medium">{paymentModal.customer?.name}</span></div>
              <div className="flex justify-between mt-1"><span className="text-muted-foreground">{t('finance.debts.col_remaining')}:</span><span className="font-medium text-destructive">{Number(paymentModal.remaining).toLocaleString()} {cur}</span></div>
            </div>
            <Input label={t('finance.debts.lbl_amount')} type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={paymentModal.remaining?.toString()} autoFocus />
          </div>
        )}
      </Modal>

      {/* Add an existing debt (opening balance) */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('finance.debts.add_title')}
        footer={<><Button variant="outline" onClick={() => setAddOpen(false)}>{t('finance.debts.btn_cancel')}</Button><Button
          onClick={() => addMutation.mutate({
            ...(debtForm.mode === 'existing' ? { customerId: debtForm.customerId } : { customerName: debtForm.customerName, customerPhone: debtForm.customerPhone }),
            amount: parseFloat(debtForm.amount), date: debtForm.date, notes: debtForm.notes
          })}
          loading={addMutation.isPending}
          disabled={!(parseFloat(debtForm.amount) > 0) || (debtForm.mode === 'existing' ? !debtForm.customerId : !debtForm.customerName.trim())}>{t('finance.debts.btn_add_confirm')}</Button></>}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('finance.debts.add_desc')}</p>
          <div className="inline-flex rounded-md border border-input p-0.5 bg-muted/40">
            {['existing', 'new'].map(m => (
              <button key={m} type="button" onClick={() => setDebtForm({ ...debtForm, mode: m })}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${debtForm.mode === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                {t(m === 'existing' ? 'finance.debts.existing_customer' : 'finance.debts.new_customer')}
              </button>
            ))}
          </div>
          {debtForm.mode === 'existing' ? (
            <Combobox label={t('finance.debts.col_customer')} value={debtForm.customerId} placeholder={t('finance.debts.choose_customer')} emptyText={t('catalog.no_results')}
              options={customers.map(c => ({ value: c.id, label: c.name, sub: c.phone || undefined, keywords: c.phone }))}
              onChange={(id) => setDebtForm({ ...debtForm, customerId: id })} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('finance.debts.lbl_name')} value={debtForm.customerName} onChange={e => setDebtForm({ ...debtForm, customerName: e.target.value })} required />
              <Input label={t('finance.debts.lbl_phone')} value={debtForm.customerPhone} onChange={e => setDebtForm({ ...debtForm, customerPhone: e.target.value })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('finance.debts.lbl_debt_amount')} type="number" min="0" value={debtForm.amount} onChange={e => setDebtForm({ ...debtForm, amount: e.target.value })} required />
            <Input label={t('finance.debts.lbl_date')} type="date" max={today()} value={debtForm.date} onChange={e => setDebtForm({ ...debtForm, date: e.target.value })} />
          </div>
          <Input label={t('finance.debts.lbl_notes')} value={debtForm.notes} onChange={e => setDebtForm({ ...debtForm, notes: e.target.value })} placeholder={t('finance.debts.ph_notes')} />
        </div>
      </Modal>

      {(() => {
        const debt = (data || []).find(d => d.id === historyId)
        return (
          <PaymentHistoryModal open={!!debt} onClose={() => setHistoryId(null)}
            title={t('finance.debts.history_title', { name: debt?.customer?.name || '' })}
            payments={debt?.payments || []}
            canCancel={isOwner && debt?.sale?.status !== 'REFUNDED'}
            onCancel={cancelPayment}
            onPrint={(p) => printReceipt(debt, p)} />
        )
      })()}

      <Modal open={!!printPrompt} onClose={() => setPrintPrompt(null)} title={t('finance.debts.print_prompt_title')}
        footer={<><Button variant="outline" onClick={() => setPrintPrompt(null)}>{t('finance.debts.btn_no')}</Button><Button onClick={() => { printReceipt(printPrompt.debt, printPrompt.payment); setPrintPrompt(null) }}>{t('finance.debts.btn_print')}</Button></>}>
        <p className="text-sm text-muted-foreground">{t('finance.debts.print_prompt_desc')}</p>
      </Modal>
    </div>
  )
}
