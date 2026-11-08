import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Package, CreditCard, DollarSign, Plus, Trash2, History, BookPlus, Pencil } from 'lucide-react'
import PaymentHistoryModal from '../../components/PaymentHistoryModal'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'

export default function SupplierDetail() {
  const cur = useCurrency()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('orders')
  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const emptyLine = { inventoryItemId: '', quantity: '1', unitCost: '' }
  const [showPO, setShowPO] = useState(false)
  const [poLines, setPoLines] = useState([{ ...emptyLine }])
  const [poPayment, setPoPayment] = useState('CREDIT')
  const [poNotes, setPoNotes] = useState('')
  const [historyId, setHistoryId] = useState(null)
  const today = () => new Date().toISOString().slice(0, 10)
  const [opening, setOpening] = useState(null) // { amount, date, notes } while the dialog is open

  const tabs = [
    { key: 'orders', label: t('finance.suppliers.tab_orders'), icon: Package },
    { key: 'debt', label: t('finance.suppliers.tab_debt'), icon: CreditCard }
  ]

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => api.get(`/suppliers/${id}`).then(r => r.data.supplier)
  })

  const payMutation = useMutation({
    mutationFn: ({ debtId, amount }) => api.post(`/supplier-debts/${debtId}/payment`, { amount: parseFloat(amount) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['supplier', id] }); setPaymentModal(null); setPaymentAmount(''); toast.success(t('finance.suppliers.success_payment')) },
    onError: (err) => toast.error(err.response?.data?.error || t('finance.suppliers.err_failed'))
  })

  const { data: items } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory').then(r => r.data.items),
    enabled: showPO
  })

  const openPO = () => { setPoLines([{ ...emptyLine }]); setPoPayment('CREDIT'); setPoNotes(''); setShowPO(true) }
  const setLine = (idx, patch) => setPoLines(poLines.map((l, i) => i === idx ? { ...l, ...patch } : l))
  const pickItem = (idx, itemId) => {
    const item = items?.find(i => i.id === itemId)
    setLine(idx, { inventoryItemId: itemId, unitCost: item ? String(Number(item.buyPrice)) : '' })
  }
  const parsedLines = poLines.map(l => ({ inventoryItemId: l.inventoryItemId, quantity: parseInt(l.quantity), unitCost: parseFloat(l.unitCost) }))
  const linesValid = parsedLines.every(l => l.inventoryItemId && l.quantity > 0 && l.unitCost >= 0)
  const poTotal = parsedLines.reduce((s, l) => s + (l.quantity > 0 && l.unitCost >= 0 ? l.quantity * l.unitCost : 0), 0)

  const poMutation = useMutation({
    mutationFn: (d) => api.post('/purchase-orders', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['supplier', id] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      setShowPO(false)
      toast.success(t('finance.suppliers.po_success', { num: res.data.order.orderNumber }))
    },
    onError: (err) => toast.error(err.response?.data?.error || t('finance.suppliers.err_failed'))
  })

  const openingMutation = useMutation({
    mutationFn: (d) => api.post('/supplier-debts/opening', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier', id] })
      setOpening(null)
      setActiveTab('debt')
      toast.success(t('finance.suppliers.success_opening'))
    },
    onError: (err) => toast.error(err.response?.data?.error || t('finance.suppliers.err_failed'))
  })

  // Edit his contact; delete him (hidden instead when he has history, refused while he is owed money)
  const [edit, setEdit] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const editMutation = useMutation({
    mutationFn: (d) => api.put(`/suppliers/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['supplier', id] }); queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setEdit(null); toast.success(t('finance.suppliers.success_updated')) },
    onError: (err) => toast.error(err.response?.data?.error || t('finance.suppliers.err_failed'))
  })
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/suppliers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); toast.success(t('finance.suppliers.success_deleted')); navigate('/finance/suppliers', { replace: true }) },
    onError: (err) => { setConfirmDelete(false); toast.error(err.response?.data?.error === 'OWED' ? t('finance.suppliers.err_owed') : err.response?.data?.error || t('finance.suppliers.err_failed')) }
  })

  const cancelPayment = async (payment, reason) => {
    try {
      await api.post(`/supplier-debts/${historyId}/payments/${payment.id}/cancel`, { reason })
      await queryClient.invalidateQueries({ queryKey: ['supplier', id] })
      queryClient.invalidateQueries({ queryKey: ['daily-close-preview'] })
      toast.success(t('finance.debts.success_cancel'))
    } catch (err) {
      toast.error(err.response?.data?.error || t('finance.suppliers.err_failed'))
    }
  }

  const submitPO = () => {
    if (!linesValid) return toast.warning(t('finance.suppliers.po_err_lines'))
    poMutation.mutate({ supplierId: id, lines: parsedLines, paymentMethod: poPayment, notes: poNotes || undefined })
  }

  if (isLoading) return <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
  if (!supplier) return <div className="text-center py-12 text-destructive">{t('finance.suppliers.err_not_found')}</div>

  const poColumns = [
    { key: 'orderNumber', label: t('finance.suppliers.col_po_num'), render: (v) => <span className="font-mono font-medium text-primary">{v}{v?.startsWith('OB-') && <StatusBadge kind="po" value="OPENING_BALANCE" className="ms-2 font-sans" />}</span> },
    { key: 'totalAmount', label: t('finance.suppliers.col_total'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'paymentStatus', label: t('finance.suppliers.col_status'), render: (v) => <StatusBadge kind="po" value={v} /> },
    { key: 'items', label: t('finance.suppliers.col_items'), render: (v) => v?.length || 0 },
    { key: 'orderedAt', label: t('finance.suppliers.col_date'), render: (v) => new Date(v).toLocaleDateString() }
  ]

  const debtColumns = [
    { key: 'purchaseOrder', label: t('finance.suppliers.col_po_num'), render: (v) => <span className="font-mono font-medium">{v?.orderNumber || '—'}{v?.orderNumber?.startsWith('OB-') && <StatusBadge kind="po" value="OPENING_BALANCE" className="ms-2 font-sans" />}</span> },
    { key: 'totalAmount', label: t('finance.suppliers.col_total'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'paidAmount', label: t('finance.suppliers.col_paid'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'remaining', label: t('finance.suppliers.col_remaining'), render: (v) => <span className="font-medium text-destructive">{Number(v).toLocaleString()} {cur}</span> },
    { key: 'status', label: t('finance.suppliers.col_status'), render: (v) => <StatusBadge kind="debt" value={v} /> },
    { key: 'actions', label: '', className: 'text-right', render: (_, r) => (
      <div className="flex items-center justify-end gap-1">
        {r.payments?.length > 0 && (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setHistoryId(r.id) }}><History className="h-3.5 w-3.5" /> {t('finance.debts.btn_history')}</Button>
        )}
        {r.status !== 'SETTLED' && (
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPaymentModal(r); setPaymentAmount('') }}><DollarSign className="h-3.5 w-3.5" /> {t('finance.suppliers.btn_pay')}</Button>
        )}
      </div>
    )}
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/finance/suppliers')} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1"><h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground">{supplier.phone || supplier.address ? <>{supplier.phone && <bdi dir="ltr">{supplier.phone}</bdi>}{supplier.phone && supplier.address ? ' · ' : ''}{supplier.address}</> : t('finance.suppliers.no_contact')}</p>
        </div>
        <Button variant="outline" onClick={() => setEdit({ name: supplier.name, phone: supplier.phone || '', address: supplier.address || '', notes: supplier.notes || '' })}><Pencil className="h-4 w-4" /> {t('finance.suppliers.btn_edit')}</Button>
        <Button variant="outline" onClick={() => setConfirmDelete(true)} aria-label={t('finance.suppliers.btn_delete')} title={t('finance.suppliers.btn_delete')}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        <Button variant="outline" onClick={() => setOpening({ amount: '', date: today(), notes: '' })}><BookPlus className="h-4 w-4" /> {t('finance.suppliers.btn_opening')}</Button>
        <Button onClick={openPO}><Plus className="h-4 w-4" /> {t('finance.suppliers.btn_new_po')}</Button>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={t('finance.suppliers.edit_title')}
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>{t('finance.suppliers.btn_cancel')}</Button><Button onClick={() => editMutation.mutate(edit)} loading={editMutation.isPending} disabled={!edit?.name.trim()}>{t('finance.suppliers.btn_save')}</Button></>}>
        {edit && (
          <div className="space-y-4">
            <Input label={t('finance.suppliers.lbl_name')} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} required autoFocus />
            <Input label={t('finance.suppliers.lbl_phone')} dir="ltr" value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} />
            <Input label={t('finance.suppliers.lbl_address')} value={edit.address} onChange={e => setEdit({ ...edit, address: e.target.value })} />
            <Input label={t('finance.suppliers.lbl_notes')} value={edit.notes} onChange={e => setEdit({ ...edit, notes: e.target.value })} />
          </div>
        )}
      </Modal>

      <ConfirmModal open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => deleteMutation.mutate()} loading={deleteMutation.isPending}
        title={t('finance.suppliers.del_title')} message={t('finance.suppliers.del_msg', { name: supplier.name })} confirmText={t('finance.suppliers.btn_delete')} />

      <div className="flex border-b border-border mb-6">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && <Table columns={poColumns} data={supplier.purchaseOrders || []} emptyTitle={t('finance.suppliers.empty_orders')} emptyDescription={t('finance.suppliers.empty_orders_desc')} />}
      {activeTab === 'debt' && <Table columns={debtColumns} data={supplier.supplierDebts || []} emptyTitle={t('finance.suppliers.empty_debt')} emptyDescription={t('finance.suppliers.empty_debt_desc')} />}

      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title={t('finance.suppliers.modal_pay_title')}
        footer={<><Button variant="outline" onClick={() => setPaymentModal(null)}>{t('finance.suppliers.btn_cancel')}</Button><Button onClick={() => payMutation.mutate({ debtId: paymentModal?.id, amount: paymentAmount })} loading={payMutation.isPending} disabled={!paymentAmount}>{t('finance.debts.btn_record')}</Button></>}>
        {paymentModal && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md text-sm"><div className="flex justify-between"><span className="text-muted-foreground">{t('finance.suppliers.col_remaining')}:</span><span className="font-medium text-destructive">{Number(paymentModal.remaining).toLocaleString()} {cur}</span></div></div>
            <Input label={t('finance.suppliers.lbl_pay_amount')} type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} autoFocus />
          </div>
        )}
      </Modal>

      <Modal open={!!opening} onClose={() => setOpening(null)} title={t('finance.suppliers.opening_title')}
        footer={<><Button variant="outline" onClick={() => setOpening(null)}>{t('finance.suppliers.btn_cancel')}</Button><Button
          onClick={() => openingMutation.mutate({ supplierId: id, amount: parseFloat(opening.amount), date: opening.date, notes: opening.notes })}
          loading={openingMutation.isPending} disabled={!(parseFloat(opening?.amount) > 0)}>{t('finance.debts.btn_add_confirm')}</Button></>}>
        {opening && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('finance.suppliers.opening_desc')}</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('finance.debts.lbl_debt_amount')} type="number" min="0" value={opening.amount} onChange={e => setOpening({ ...opening, amount: e.target.value })} autoFocus />
              <Input label={t('finance.debts.lbl_date')} type="date" max={today()} value={opening.date} onChange={e => setOpening({ ...opening, date: e.target.value })} />
            </div>
            <Input label={t('finance.debts.lbl_notes')} value={opening.notes} onChange={e => setOpening({ ...opening, notes: e.target.value })} />
          </div>
        )}
      </Modal>

      {(() => {
        const debt = (supplier.supplierDebts || []).find(d => d.id === historyId)
        return (
          <PaymentHistoryModal open={!!debt} onClose={() => setHistoryId(null)}
            title={t('finance.debts.history_title', { name: supplier.name })}
            payments={debt?.payments || []} canCancel onCancel={cancelPayment} />
        )
      })()}

      <Modal open={showPO} onClose={() => setShowPO(false)} title={t('finance.suppliers.po_title')} size="xl"
        footer={<><Button variant="outline" onClick={() => setShowPO(false)}>{t('finance.suppliers.btn_cancel')}</Button><Button onClick={submitPO} loading={poMutation.isPending} disabled={!linesValid}>{t('finance.suppliers.po_create')}</Button></>}>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
              <span className="col-span-6">{t('finance.suppliers.po_item')}</span>
              <span className="col-span-2">{t('finance.suppliers.po_qty')}</span>
              <span className="col-span-3">{t('finance.suppliers.po_unit_cost')}</span>
            </div>
            {poLines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <select value={line.inventoryItemId} onChange={e => pickItem(idx, e.target.value)} className="col-span-6 h-9 rounded-sm border border-input bg-popover px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">{t('finance.suppliers.po_select_item')}</option>
                  {(items || []).map(i => <option key={i.id} value={i.id}>{i.name}{i.brand ? ` (${i.brand} ${i.model || ''})` : ''}</option>)}
                </select>
                <input type="number" min="1" value={line.quantity} onChange={e => setLine(idx, { quantity: e.target.value })} className="col-span-2 h-9 rounded-sm border border-input bg-popover px-2 text-sm" />
                <input type="number" min="0" value={line.unitCost} onChange={e => setLine(idx, { unitCost: e.target.value })} className="col-span-3 h-9 rounded-sm border border-input bg-popover px-2 text-sm" />
                <button type="button" onClick={() => setPoLines(poLines.filter((_, i) => i !== idx))} disabled={poLines.length === 1} className="col-span-1 p-1.5 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPoLines([...poLines, { ...emptyLine }])}><Plus className="h-3.5 w-3.5" /> {t('finance.suppliers.po_add_line')}</Button>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('finance.suppliers.po_payment')}</label>
            <select value={poPayment} onChange={e => setPoPayment(e.target.value)} className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="CREDIT">{t('finance.suppliers.po_pay_credit')}</option>
              <option value="CASH">{t('finance.suppliers.po_pay_cash')}</option>
            </select>
          </div>
          <Input label={t('finance.suppliers.po_notes')} value={poNotes} onChange={e => setPoNotes(e.target.value)} />
          <div className="p-3 bg-muted rounded-md flex justify-between text-sm">
            <span className="text-muted-foreground">{t('finance.suppliers.po_total')}:</span>
            <span className="font-bold">{poTotal.toLocaleString()} {cur}</span>
          </div>
        </div>
      </Modal>
    </div>
  )
}
