import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, User, Check, X } from 'lucide-react'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import DevicePicker from '../../components/DevicePicker'
import { storageText } from '../../lib/catalog'

const conditions = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'BROKEN']

export default function TradeInList() {
  const cur = useCurrency()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const emptyForm = { customerName: '', deviceCategory: 'PHONE', brand: '', model: '', imei: '', storage: '', color: '', condition: 'GOOD', conditionNotes: '', appraisedValue: '', payoutMethod: 'CASH' }
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['trade-ins', statusFilter],
    queryFn: () => api.get('/trade-ins', { params: { status: statusFilter || undefined } }).then(r => r.data.tradeIns)
  })

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/trade-ins', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-ins'] })
      queryClient.invalidateQueries({ queryKey: ['catalog'] }) // a hand-typed device may have been remembered
      setShowForm(false)
      setForm(emptyForm)
      toast.success(t('repairs.tradeins.appraised'))
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const acceptMutation = useMutation({
    mutationFn: (id) => api.post(`/trade-ins/${id}/accept`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['trade-ins'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success(t('repairs.tradeins.accepted', { name: res.data.tradeIn.inventoryItem?.name }))
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const rejectMutation = useMutation({
    mutationFn: (id) => api.post(`/trade-ins/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-ins'] })
      toast.success(t('repairs.tradeins.rejected'))
    }
  })

  const columns = [
    { key: 'customer', label: t('repairs.tradeins.customer'), render: (v) => <span className="font-medium">{v?.name}</span> },
    { key: 'brand', label: t('repairs.tradeins.device'), render: (v, r) => `${v} ${r.model}` },
    { key: 'imei', label: t('repairs.tradeins.imei'), render: (v) => v || '—' },
    { key: 'condition', label: t('repairs.tradeins.condition'), render: (v) => v ? <StatusBadge kind="condition" value={v} /> : '—' },
    { key: 'appraisedValue', label: t('repairs.tradeins.value'), render: (v) => <span className="font-medium">{Number(v).toLocaleString()} {cur}</span> },
    { key: 'status', label: t('repairs.tradeins.status'), render: (v) => <StatusBadge kind="tradein" value={v} /> },
    { key: 'createdAt', label: t('repairs.tradeins.date'), render: (v) => new Date(v).toLocaleDateString() }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('repairs.tradeins.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('repairs.tradeins.subtitle')}</p></div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> {t('repairs.tradeins.new')}</Button>
      </div>

      <div className="mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">{t('repairs.tradeins.all')}</option><option value="APPRAISED">{t('repairs.statuses.APPRAISED')}</option><option value="ACCEPTED">{t('repairs.statuses.ACCEPTED')}</option><option value="REJECTED">{t('repairs.statuses.REJECTED')}</option>
        </select>
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle={t('repairs.tradeins.empty_title')} emptyDescription={t('repairs.tradeins.empty_desc')} />}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('repairs.tradeins.modal_title')} size="lg"
        footer={<><Button variant="outline" onClick={() => setShowForm(false)}>{t('repairs.tradeins.cancel')}</Button><Button variant="flux" onClick={() => createMutation.mutate({...form, appraisedValue: parseFloat(form.appraisedValue)})} loading={createMutation.isPending} disabled={!form.customerName || !form.brand || !form.model || !form.appraisedValue}>{t('repairs.tradeins.btn_appraise')}</Button></>}
      >
        <div className="space-y-4">
          <Input label={t('repairs.tradeins.lbl_customer')} value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} icon={User} required />
          <DevicePicker required
            value={{ category: form.deviceCategory, brand: form.brand, model: form.model }}
            onChange={(v, device) => setForm({ ...form, deviceCategory: v.category, brand: v.brand, model: v.model, ...(device && storageText(device) ? { storage: storageText(device) } : {}) })} />
          <div className="grid grid-cols-3 gap-4">
            <Input label={t('repairs.tradeins.lbl_imei')} value={form.imei} onChange={e => setForm({...form, imei: e.target.value})} />
            <Input label={t('repairs.tradeins.lbl_storage')} value={form.storage} onChange={e => setForm({...form, storage: e.target.value})} placeholder="128GB" />
            <Input label={t('repairs.tradeins.lbl_color')} value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t('repairs.tradeins.lbl_condition')}</label>
              <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {conditions.map(c => <option key={c} value={c}>{t(`repairs.conditions.${c}`)}</option>)}
              </select>
            </div>
            <Input label={t('repairs.tradeins.lbl_value')} type="number" value={form.appraisedValue} onChange={e => setForm({...form, appraisedValue: e.target.value})} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('repairs.tradeins.lbl_payout')}</label>
            <select value={form.payoutMethod} onChange={e => setForm({...form, payoutMethod: e.target.value})} className="flex h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="CASH">{t('repairs.tradeins.payout_cash')}</option>
              <option value="STORE_CREDIT">{t('repairs.tradeins.payout_credit')}</option>
            </select>
          </div>
          <Input label={t('repairs.tradeins.lbl_notes')} value={form.conditionNotes} onChange={e => setForm({...form, conditionNotes: e.target.value})} placeholder={t('repairs.tradeins.ph_notes')} />
        </div>
      </Modal>
    </div>
  )
}
