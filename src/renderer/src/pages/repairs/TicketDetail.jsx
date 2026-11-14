import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Save, Printer, Plus, Trash2, MessageCircle, Tag } from 'lucide-react'
import { sendWhatsApp } from '../../lib/whatsapp'
import api from '../../lib/api'
import { printHeader } from '../../lib/printKit'
import { useCurrency } from '../../lib/currency'
import { usePrint } from '../../lib/usePrint'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'
import DevicePicker from '../../components/DevicePicker'
import SuggestTextarea from '../../components/ui/SuggestTextarea'
import { repairPhrases } from '../../lib/repairPhrases'
import { DEFAULT_WARRANTY_DAYS } from '../../lib/warranty'
import { useHotkeys } from '../../lib/hotkeys'
import { deliveryReceiptHtml } from '../../lib/receipts'
import { code128Svg, ticketBarcode } from '../../lib/barcode'
import RepairLabelModal from '../../components/RepairLabelModal'
import { repairmanShare } from '../../lib/repairmen'
import { useAuth } from '../../lib/auth'

const statusFlow = {
  DIAGNOSING: ['WAITING_PARTS', 'IN_REPAIR', 'DONE', 'CANCELLED'],
  WAITING_PARTS: ['IN_REPAIR', 'DONE', 'CANCELLED'],
  IN_REPAIR: ['DONE', 'WAITING_PARTS', 'CANCELLED'],
  DONE: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
}

export default function TicketDetail() {
  const cur = useCurrency()
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const checkinId = searchParams.get('checkinId')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const print = usePrint()
  const { can, ownRepairsOnly } = useAuth()
  // A repairman on his own repair: the counter's fields (customer, deposit, who repairs it…) are read-only
  const counter = !ownRepairsOnly
  const isNew = id === 'new'

  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then(r => r.data.store)
  })

  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerId: '',
    deviceCategory: 'PHONE', deviceBrand: '', deviceModel: '', imei: '', devicePassword: '',
    color: '', condition: '', issueDesc: '', diagnosis: '', partsUsedNotes: '',
    finalCost: '', partsCost: '', deposit: '0', priority: 'NORMAL', estimatedDoneAt: '', warrantyDays: DEFAULT_WARRANTY_DAYS,
    repairmanId: '', repairmanPay: ''
  })
  // A new ticket starts with the store's default warranty (Settings → Store), unless the user already changed it
  const warrantyTouched = useRef(false)
  useEffect(() => {
    if (isNew && store && !warrantyTouched.current) setForm(f => ({ ...f, warrantyDays: store.warrantyDays ?? DEFAULT_WARRANTY_DAYS }))
  }, [isNew, store])
  const lang = i18n.resolvedLanguage || i18n.language
  const comma = lang.startsWith('ar') ? '،' : ','
  const [transitionModal, setTransitionModal] = useState(null)
  const [deliveredTicket, setDeliveredTicket] = useState(null) // just delivered: offer the delivery receipt
  const [showLabel, setShowLabel] = useState(false) // adhesive sticker for the device
  const [missingField, setMissingField] = useState(null) // highlights the first empty required field
  const [finalCostInput, setFinalCostInput] = useState('')
  const [partsCostInput, setPartsCostInput] = useState('')

  useEffect(() => {
    if (isNew && checkinId) {
      api.get(`/checkins/${checkinId}`).then(res => {
        const ci = res.data.checkin
        setForm(f => ({
          ...f, customerId: ci.customerId,
          customerName: ci.customer?.name || '', customerPhone: ci.customer?.phone || '',
          deviceBrand: ci.deviceBrand,
          deviceModel: ci.deviceModel, imei: ci.imei || '', color: ci.color || '',
          condition: ci.condition || '', issueDesc: ci.issueDesc
        }))
      })
    }
  }, [isNew, checkinId])

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/tickets/${id}`).then(r => r.data.ticket),
    enabled: !isNew
  })

  // Parts from stock live in their own query so adding one never resets unsaved form edits
  const [partPick, setPartPick] = useState({ inventoryItemId: '', quantity: '1' })
  const { data: partsData } = useQuery({
    queryKey: ['ticket-parts', id],
    queryFn: () => api.get(`/tickets/${id}/parts`).then(r => r.data),
    enabled: !isNew
  })
  const { data: stockItems } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory').then(r => r.data.items),
    enabled: !isNew
  })
  const onPartsChanged = (res, msg) => {
    queryClient.setQueryData(['ticket-parts', id], res.data)
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    setForm(f => ({ ...f, partsCost: String(Number(res.data.partsCost)) }))
    toast.success(msg)
  }
  const addPartMutation = useMutation({
    mutationFn: (d) => api.post(`/tickets/${id}/parts`, d),
    onSuccess: (res) => { onPartsChanged(res, t('repairs.details.parts_added')); setPartPick({ inventoryItemId: '', quantity: '1' }) },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })
  const removePartMutation = useMutation({
    mutationFn: (partId) => api.delete(`/tickets/${id}/parts/${partId}`),
    onSuccess: (res) => onPartsChanged(res, t('repairs.details.parts_removed')),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const saveMutation = useMutation({
    mutationFn: (d) => isNew
      ? api.post('/tickets', { ...d, checkInId: checkinId || undefined })
      : api.put(`/tickets/${id}`, d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      if (isNew) queryClient.invalidateQueries({ queryKey: ['catalog'] }) // a hand-typed device may have been remembered
      toast.success(isNew ? t('repairs.details.created', { num: res.data.ticket.ticketNumber }) : t('repairs.details.updated'))
      if (isNew) navigate(`/repairs/tickets/${res.data.ticket.id}`, { replace: true })
      else queryClient.invalidateQueries({ queryKey: ['ticket', id] })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  // Owner: delete a ticket made by mistake (refused once money moved: cancel it instead)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tickets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success(t('repairs.details.deleted'))
      navigate('/repairs/tickets', { replace: true })
    },
    onError: (err) => { setConfirmDelete(false); toast.error(err.response?.data?.error === 'LOCKED' ? t('repairs.details.del_locked') : err.response?.data?.error || 'Failed') }
  })

  const transitionMutation = useMutation({
    mutationFn: ({ status, finalCost, partsCost, paymentMethod }) => 
      api.post(`/tickets/${id}/transition`, { 
        status, 
        finalCost: finalCost ? parseFloat(finalCost) : undefined, 
        partsCost: partsCost ? parseFloat(partsCost) : undefined,
        paymentMethod
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setTransitionModal(null)
      toast.success(t('repairs.details.status_changed', { status: t(`repairs.statuses.${res.data.ticket.status}`) }))
      if (res.data.ticket.status === 'DELIVERED' && store?.featDeliveryReceipt) setDeliveredTicket(res.data.ticket)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Transition failed')
  })

  const handleSave = () => {
    // A ticket needs a customer, a device and the problem — check here, in the user's language
    const missing = !form.customerName.trim() && (isNew ? !form.customerId : true) ? 'customer'
      : !form.deviceBrand.trim() || !form.deviceModel.trim() ? 'device'
      : !form.issueDesc.trim() ? 'issue' : null
    setMissingField(missing)
    if (missing) return toast.warning(t(`repairs.details.err_missing_${missing}`))
    const data = { ...form }
    if (data.finalCost) data.finalCost = parseFloat(data.finalCost)
    if (data.partsCost) data.partsCost = parseFloat(data.partsCost)
    if (data.deposit) data.deposit = parseFloat(data.deposit)
    data.warrantyDays = parseInt(data.warrantyDays)
    saveMutation.mutate(data)
  }
  
  const printTicket = () => {
    if (isNew || !ticket) return
    const dir = i18n.dir()

    const html = `
      <div dir="${dir}" style="box-sizing: border-box; width: 100%;">
        <div style="text-align:center; margin-bottom:15px;">
          ${printHeader(store)}
          <div style="border-top:2px solid #000; margin:10px 0;"></div>
          <h3 style="margin:0; font-size:15px; font-weight:bold;">REPAIR TICKET / تذكرة إصلاح</h3>
          <p class="p-mono" style="margin:5px 0; font-size:16px; font-weight:bold;">${ticket.ticketNumber}</p>
          <div style="display:flex; justify-content:center;">${code128Svg(ticketBarcode(ticket.ticketNumber), { width: '46mm', height: '11mm' })}</div>
        </div>

        <div style="font-size: 12px; margin-bottom: 8px; border: 1px solid #000; padding: 6px; border-radius: 4px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>${t('repairs.details.lbl_name')}:</span><strong>${ticket.customer?.name}</strong></div>
          <div style="display:flex; justify-content:space-between;"><span>${t('repairs.details.lbl_phone')}:</span><bdi dir="ltr">${ticket.customer?.phone || ''}</bdi></div>
        </div>

        <div style="font-size: 12px; margin-bottom: 8px;">
          <h4 style="margin:0 0 3px 0; text-decoration: underline;">DEVICE INFO / الجهاز:</h4>
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Device:</span><strong>${ticket.deviceBrand} ${ticket.deviceModel}</strong></div>
          ${ticket.imei ? `<div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>IMEI:</span><span>${ticket.imei}</span></div>` : ''}
        </div>

        <div style="font-size: 12px; margin-bottom: 8px;">
          <h4 style="margin:0 0 3px 0; text-decoration: underline;">PROBLEM / المشكلة:</h4>
          <p style="margin:0; white-space: pre-wrap;">${ticket.issueDesc}</p>
        </div>

        ${ticket.diagnosis ? `
          <div style="font-size: 12px; margin-bottom: 8px;">
            <h4 style="margin:0 0 3px 0; text-decoration: underline;">DIAGNOSIS / التشخيص:</h4>
            <p style="margin:0; white-space: pre-wrap;">${ticket.diagnosis}</p>
          </div>
        ` : ''}

        <div style="border-top:1px dashed #000; margin:8px 0;"></div>
        
        <div style="font-size: 12px; margin-bottom: 10px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:bold; font-size:14px;"><span>Cost / التكلفة:</span><span>${ticket.finalCost ? Number(ticket.finalCost).toLocaleString() : '—'} ${cur}</span></div>
          ${parseFloat(ticket.deposit) > 0 ? `<div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Deposit / العربون:</span><span>-${Number(ticket.deposit).toLocaleString()} ${cur}</span></div>` : ''}
        </div>
        
        <p style="text-align:center; font-size:10px; margin-top:20px; color: #000;">${t('sales.receipt.footer')}</p>
      </div>
    `
    print.print(html, 'ticket')
  }

  // Repairmen: the list for the select; the share his rule gives (shown until the owner types one)
  const { data: repairmen = [] } = useQuery({
    queryKey: ['repairmen'],
    queryFn: () => api.get('/repairmen').then(r => r.data.repairmen),
    enabled: !!store?.featRepairmen
  })
  const picked = repairmen.find(r => r.id === form.repairmanId)
  const ruleShare = picked?.payType ? repairmanShare(picked, form.finalCost, form.partsCost) : null

  const printDelivery = (x) => print.print(deliveryReceiptHtml({ t, dir: i18n.dir(), store, cur, ticket: x }), 'ticket')

  useEffect(() => {
    if (ticket && !isNew) {
      setForm({
        customerId: ticket.customerId,
        customerName: ticket.customer?.name || '', customerPhone: ticket.customer?.phone || '',
        deviceBrand: ticket.deviceBrand, deviceModel: ticket.deviceModel,
        imei: ticket.imei || '', devicePassword: ticket.devicePassword || '', color: ticket.color || '',
        condition: ticket.condition || '', issueDesc: ticket.issueDesc, diagnosis: ticket.diagnosis || '',
        partsUsedNotes: ticket.partsUsedNotes || '', estimatedCost: ticket.estimatedCost || '',
        finalCost: ticket.finalCost || '', partsCost: ticket.partsCost || '', deposit: ticket.deposit || '0', priority: ticket.priority,
        estimatedDoneAt: ticket.estimatedDoneAt ? ticket.estimatedDoneAt.split('T')[0] : '', warrantyDays: ticket.warrantyDays,
        repairmanId: ticket.repairmanId || '', repairmanPay: ticket.repairmanPay ?? ''
      })
    }
  }, [ticket, isNew])

  // Ctrl+S saves, Ctrl+P prints (an existing ticket)
  useHotkeys({
    'Ctrl+S': () => { if (!saveMutation.isPending) handleSave() },
    'Ctrl+P': () => { if (!isNew) printTicket() }
  })

  if (!isNew && isLoading) return <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>

  // "Your phone is ready" on WhatsApp, with what is left to pay after the deposit
  const notifyReady = async () => {
    const due = Math.max(0, Number(ticket.finalCost || 0) - Number(ticket.deposit || 0))
    const vars = { name: ticket.customer.name, device: `${ticket.deviceBrand} ${ticket.deviceModel}`, store: store?.name || 'Warshati', ticket: ticket.ticketNumber, amount: `${due.toLocaleString()} ${cur}` }
    const r = await sendWhatsApp(ticket.customer.phone, store?.currency, t(due > 0 ? 'repairs.details.wa_ready' : 'repairs.details.wa_ready_paid', vars))
    if (!r.success) toast.error(t('finance.debts.err_invalid_phone'))
  }

  const daysSince = ticket ? Math.floor((Date.now() - new Date(ticket.receivedAt).getTime()) / 86400000) : 0
  const nextStatuses = ticket ? (statusFlow[ticket.status] || []) : []

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/repairs/tickets')} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{isNew ? t('repairs.details.new') : ticket?.ticketNumber}</h1>
          {ticket && <div className="flex items-center gap-2 mt-1">
            <StatusBadge kind="ticket" value={ticket.status} />
            <StatusBadge kind="priority" value={ticket.priority} />
            {ticket.status !== 'DELIVERED' && ticket.status !== 'CANCELLED' && daysSince > 30 && <Badge color="warning" dot>⚠ {t('repairs.tickets.waiting_days', {days: daysSince})}</Badge>}
          </div>}
        </div>
        <div className="flex gap-2">
          {ticket?.status === 'DONE' && ticket.customer?.phone && (
            <Button variant="outline" onClick={notifyReady}><MessageCircle className="h-4 w-4 text-success" /> {t('repairs.details.btn_whatsapp_ready')}</Button>
          )}
          {!isNew && (
            <Button variant="outline" onClick={printTicket}><Printer className="h-4 w-4" /> {t('repairs.tickets.print')}</Button>
          )}
          {!isNew && ticket && (
            <Button variant="outline" onClick={() => setShowLabel(true)}><Tag className="h-4 w-4" /> {t('repair_label.btn')}</Button>
          )}
          {ticket?.status === 'DELIVERED' && (
            <Button variant="outline" onClick={() => printDelivery(ticket)}><Printer className="h-4 w-4" /> {t('repairs.delivery.btn_print')}</Button>
          )}
          {can('corrections') && ticket && !ticket.sale && (
            <Button variant="outline" onClick={() => setConfirmDelete(true)} aria-label={t('repairs.details.btn_delete')} title={t('repairs.details.btn_delete')}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          )}
          <Button onClick={handleSave} loading={saveMutation.isPending}><Save className="h-4 w-4" /> {t('repairs.details.save')}</Button>
        </div>
      </div>

      <ConfirmModal open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => deleteMutation.mutate()} loading={deleteMutation.isPending}
        title={t('repairs.details.del_title')} message={t('repairs.details.del_msg', { num: ticket?.ticketNumber })} confirmText={t('repairs.details.btn_delete')} />

      {/* Status transitions */}
      {!isNew && nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 p-3 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground mr-2 self-center">{t('repairs.details.move_to')}</span>
          {nextStatuses.filter(s => counter || !['CANCELLED', 'DELIVERED'].includes(s)).map(s => (
            <Button key={s} variant={s === 'CANCELLED' ? 'danger' : 'outline'} size="sm" onClick={() => { setTransitionModal(s); if (s === 'DONE') { setFinalCostInput(form.finalCost || ''); setPartsCostInput(form.partsCost || '') } }}>
              {t(`repairs.statuses.${s}`)}
            </Button>
          ))}
        </div>
      )}

      {/* Customer info (on an existing ticket, saving fixes the customer's own name/phone) */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-4 border border-border rounded-md bg-card">
        <Input label={`${t('repairs.details.lbl_name')} *`} value={form.customerName} onChange={e => { setForm({...form, customerName: e.target.value}); setMissingField(null) }} placeholder={t('repairs.details.ph_name')} autoFocus={isNew} disabled={!counter}
          error={missingField === 'customer' ? t('repairs.details.err_missing_customer') : undefined} />
        <Input label={t('repairs.details.lbl_phone')} dir="ltr" value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} placeholder={t('repairs.details.ph_phone')} disabled={!counter} />
      </div>

      <div className="mb-4">
        <DevicePicker
          value={{ category: form.deviceCategory, brand: form.deviceBrand, model: form.deviceModel }}
          onChange={(v) => setForm({ ...form, deviceCategory: v.category, deviceBrand: v.brand, deviceModel: v.model })} />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Input label={t('repairs.details.lbl_imei')} value={form.imei} onChange={e => setForm({...form, imei: e.target.value})} />
        <Input label={t('repairs.details.lbl_color')} value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
        <Input label={t('repairs.details.lbl_pwd')} value={form.devicePassword} onChange={e => setForm({...form, devicePassword: e.target.value})} />
      </div>
      <div className="space-y-1.5 mb-4">
        <label className="text-sm font-medium text-foreground">{t('repairs.details.lbl_issue')} *</label>
        <SuggestTextarea value={form.issueDesc} onChange={v => { setForm(f => ({...f, issueDesc: v})); setMissingField(null) }} suggestions={repairPhrases('issue', lang)} invalid={missingField === 'issue'} listLabel={t('repairs.details.pick_list')} comma={comma} placeholder={t('repairs.details.ph_issue')} />
        {missingField === 'issue' && <p className="text-xs text-destructive">{t('repairs.details.err_missing_issue')}</p>}
      </div>
      <div className="space-y-1.5 mb-4">
        <label className="text-sm font-medium text-foreground">{t('repairs.details.lbl_diag')}</label>
        <SuggestTextarea value={form.diagnosis} onChange={v => setForm(f => ({...f, diagnosis: v}))} suggestions={repairPhrases('diagnosis', lang)} listLabel={t('repairs.details.pick_list')} comma={comma} placeholder={t('repairs.details.ph_diag')} />
      </div>
      <div className="space-y-1.5 mb-4">
        <label className="text-sm font-medium text-foreground">{t('repairs.details.lbl_parts_notes')}</label>
        <SuggestTextarea value={form.partsUsedNotes} onChange={v => setForm(f => ({...f, partsUsedNotes: v}))} suggestions={repairPhrases('parts', lang)} listLabel={t('repairs.details.pick_list')} comma={comma} placeholder={t('repairs.details.ph_parts_notes')} minHeight={40} />
      </div>
      {!isNew && (
        <div className="mb-4 p-4 border border-border rounded-md bg-card space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t('repairs.details.parts_title')}</h3>
            <p className="text-xs text-muted-foreground">{t('repairs.details.parts_desc')}</p>
          </div>
          {(partsData?.parts || []).length === 0
            ? <p className="text-sm text-muted-foreground">{t('repairs.details.parts_empty')}</p>
            : (
              <ul className="divide-y divide-border text-sm">
                {partsData.parts.map(p => (
                  <li key={p.id} className="flex items-center justify-between py-1.5">
                    <span>{p.quantity} × {p.inventoryItem?.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground">{(Number(p.unitCost) * p.quantity).toLocaleString()} {cur}</span>
                      {!ticket?.sale && (
                        <button onClick={() => removePartMutation.mutate(p.id)} disabled={removePartMutation.isPending} className="p-1 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          {ticket && !ticket.sale && !['DELIVERED', 'CANCELLED'].includes(ticket.status) && (
            <div className="flex items-center gap-2">
              <select value={partPick.inventoryItemId} onChange={e => setPartPick({ ...partPick, inventoryItemId: e.target.value })} className="flex-1 h-9 rounded-sm border border-input bg-popover px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">{t('repairs.details.parts_select')}</option>
                {(stockItems || []).filter(i => i.quantity > 0 && ['PART', 'ACCESSORY'].includes(i.type)).map(i => (
                  <option key={i.id} value={i.id}>{i.name}{i.model ? ` (${i.model})` : ''} — {i.quantity} {t('repairs.details.parts_in_stock')}</option>
                ))}
              </select>
              <input type="number" min="1" value={partPick.quantity} onChange={e => setPartPick({ ...partPick, quantity: e.target.value })} aria-label={t('repairs.details.parts_qty')} className="w-20 h-9 rounded-sm border border-input bg-popover px-2 text-sm" />
              <Button size="sm" onClick={() => addPartMutation.mutate({ inventoryItemId: partPick.inventoryItemId, quantity: parseInt(partPick.quantity) })} disabled={!partPick.inventoryItemId} loading={addPartMutation.isPending}><Plus className="h-3.5 w-3.5" /> {t('repairs.details.parts_add')}</Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Input label={t('repairs.details.lbl_final')} type="number" value={form.finalCost} onChange={e => setForm({...form, finalCost: e.target.value})} />
        <Input label={t('repairs.details.lbl_parts')} type="number" value={form.partsCost} onChange={e => setForm({...form, partsCost: e.target.value})} />
        <Input label={t('repairs.details.lbl_deposit')} type="number" value={form.deposit} onChange={e => setForm({...form, deposit: e.target.value})} disabled={!counter} />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('repairs.details.lbl_priority')}</label>
          <select value={form.priority} disabled={!counter} onChange={e => setForm({...form, priority: e.target.value})} className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted">
            <option value="LOW">{t('repairs.priorities.LOW')}</option><option value="NORMAL">{t('repairs.priorities.NORMAL')}</option><option value="URGENT">{t('repairs.priorities.URGENT')}</option>
          </select>
        </div>
        {/* Repairman (Settings → Store → Features): fixed once the repair is invoiced */}
        {store?.featRepairmen && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('repairmen.lbl_repairman')}</label>
            <select value={form.repairmanId} disabled={!!ticket?.sale || !counter} onChange={e => setForm({ ...form, repairmanId: e.target.value })} className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted">
              <option value="">{t('repairmen.none')}</option>
              {repairmen.filter(r => r.isActive || r.id === form.repairmanId).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}
        {store?.featRepairmen && can('repairmen') && form.repairmanId && (
          <Input label={t('repairmen.lbl_share')} type="number" min="0" value={form.repairmanPay} disabled={!!ticket?.sale}
            onChange={e => setForm({ ...form, repairmanPay: e.target.value })}
            placeholder={ruleShare !== null ? t('repairmen.auto_share', { amount: `${ruleShare.toLocaleString()} ${cur}` }) : ''} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input label={t('repairs.details.lbl_est_date')} type="date" value={form.estimatedDoneAt} onChange={e => setForm({...form, estimatedDoneAt: e.target.value})} />
        <Input label={t('repairs.details.lbl_warranty_days')} type="number" value={form.warrantyDays} disabled={!counter} onChange={e => { warrantyTouched.current = true; setForm({...form, warrantyDays: e.target.value}) }} />
      </div>

      {/* Transition confirmation */}
      <Modal open={!!transitionModal} onClose={() => setTransitionModal(null)} title={t('repairs.details.modal_transition', { status: transitionModal ? t(`repairs.statuses.${transitionModal}`) : '' })}
        footer={<>
          <Button variant="outline" onClick={() => setTransitionModal(null)}>{t('repairs.details.cancel')}</Button>
          {transitionModal !== 'DELIVERED' && (
            <Button variant={transitionModal === 'CANCELLED' ? 'danger' : 'primary'} onClick={() => transitionMutation.mutate({ status: transitionModal, finalCost: finalCostInput, partsCost: partsCostInput })} loading={transitionMutation.isPending}>{t('repairs.details.confirm')}</Button>
          )}
        </>}
      >
        {transitionModal === 'DONE' && (
          <div className="space-y-4 mb-4">
            <Input label={t('repairs.tickets.lbl_final')} type="number" value={finalCostInput} onChange={e => setFinalCostInput(e.target.value)} required />
            <Input label={t('repairs.tickets.lbl_parts')} type="number" value={partsCostInput} onChange={e => setPartsCostInput(e.target.value)} />
          </div>
        )}
        
        {transitionModal === 'DELIVERED' && !ticket?.sale && (
          <div className="space-y-4 mb-4">
            <p className="text-sm text-muted-foreground">{t('repairs.tickets.delivery_desc')}</p>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => transitionMutation.mutate({ status: 'DELIVERED', paymentMethod: 'CASH' })} loading={transitionMutation.isPending && transitionMutation.variables?.paymentMethod === 'CASH'}>
                {t('repairs.tickets.cash')}
              </Button>
              <Button variant="outline" onClick={() => transitionMutation.mutate({ status: 'DELIVERED', paymentMethod: 'CREDIT' })} loading={transitionMutation.isPending && transitionMutation.variables?.paymentMethod === 'CREDIT'}>
                {t('repairs.tickets.credit')}
              </Button>
            </div>
          </div>
        )}

        {transitionModal === 'DELIVERED' && ticket?.sale && (
           <p className="text-sm text-muted-foreground mb-4">{t('repairs.details.mark_delivered_paid')}</p>
        )}

        {transitionModal !== 'DONE' && transitionModal !== 'DELIVERED' && (
          <p className="text-sm text-muted-foreground mb-4">{t('repairs.details.sure_change')} <strong>{transitionModal ? t(`repairs.statuses.${transitionModal}`) : ''}</strong>?</p>
        )}

        {transitionModal === 'DELIVERED' && ticket?.sale && (
          <div className="flex justify-end mt-4">
             <Button onClick={() => transitionMutation.mutate({ status: 'DELIVERED' })} loading={transitionMutation.isPending}>{t('repairs.details.confirm_delivery')}</Button>
          </div>
        )}
      </Modal>

      <RepairLabelModal open={showLabel} onClose={() => setShowLabel(false)} ticket={ticket} store={store} />

      {/* Right after delivery: offer the delivery receipt (Settings → Store → Features) */}
      <Modal open={!!deliveredTicket} onClose={() => setDeliveredTicket(null)} title={t('repairs.delivery.prompt_title')} size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setDeliveredTicket(null)}>{t('finance.debts.btn_no')}</Button>
          <Button onClick={() => { printDelivery(deliveredTicket); setDeliveredTicket(null) }}><Printer className="h-4 w-4" /> {t('repairs.delivery.btn_print')}</Button>
        </>}>
        <p className="text-sm text-muted-foreground">{t('repairs.delivery.prompt_desc')}</p>
      </Modal>
    </div>
  )
}
