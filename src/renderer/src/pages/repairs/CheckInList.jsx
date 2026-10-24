import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Printer, ArrowRight, User } from 'lucide-react'
import api from '../../lib/api'
import { usePrint } from '../../lib/usePrint'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import DevicePicker from '../../components/DevicePicker'

export default function CheckInList() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const print = usePrint()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    customerName: '', customerPhone: '',
    deviceCategory: 'PHONE', deviceBrand: '', deviceModel: '', imei: '', color: '', issueDesc: '', condition: ''
  })

  const { data, isLoading } = useQuery({
    queryKey: ['checkins', search, statusFilter],
    queryFn: () => api.get('/checkins', { params: { search: search || undefined, status: statusFilter || undefined } }).then(r => r.data.checkins)
  })

  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then(r => r.data.store)
  })

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/checkins', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      queryClient.invalidateQueries({ queryKey: ['catalog'] }) // a hand-typed device may have been remembered
      toast.success(t('repairs.checkin.created', { num: res.data.checkin.checkInNumber }))
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const resetForm = () => {
    setForm({ customerName: '', customerPhone: '', deviceCategory: 'PHONE', deviceBrand: '', deviceModel: '', imei: '', color: '', issueDesc: '', condition: '' })
  }

  const handleCreate = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const handlePrint = async (checkin) => {
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
        <p style="margin:0; font-size:13px; font-weight:bold;">${t('repairs.checkin.receipt')} / ايصال</p>
      </div>
      
      <div style="font-size: 11px; margin-bottom: 10px;">
        <div style="display:flex; justify-content:space-between;"><span>${t('repairs.checkin.ci_num')}:</span><strong>${checkin.checkInNumber}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>${t('repairs.checkin.date')}:</span><span>${new Date(checkin.createdAt).toLocaleString()}</span></div>
      </div>
      
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
      <div style="font-size: 11px;">
        <div style="display:flex; justify-content:space-between; margin:3px 0;"><span>${t('repairs.checkin.customer')}:</span><span>${checkin.customer.name}</span></div>
        ${checkin.customer.phone ? `<div style="display:flex; justify-content:space-between; margin:3px 0;"><span>${t('repairs.checkin.phone')}:</span><span>${checkin.customer.phone}</span></div>` : ''}
      </div>
      
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
      <div style="font-size: 11px;">
        <div style="display:flex; justify-content:space-between; margin:3px 0;"><span>${t('repairs.checkin.device')}:</span><span>${checkin.deviceBrand} ${checkin.deviceModel}</span></div>
        ${checkin.imei ? `<div style="display:flex; justify-content:space-between; margin:3px 0;"><span>${t('repairs.checkin.imei')}:</span><span>${checkin.imei}</span></div>` : ''}
      </div>
      
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
      <div style="font-size: 11px;">
        <p style="margin:5px 0;"><strong>${t('repairs.checkin.issue')}:</strong> ${checkin.issueDesc}</p>
        ${checkin.condition ? `<p style="margin:5px 0;"><strong>${t('repairs.checkin.condition')}:</strong> ${checkin.condition}</p>` : ''}
      </div>
      
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
      <p style="text-align:center; font-size:11px; margin-top:10px;">${t('repairs.checkin.thanks')}</p>
    </div>`
    // All printing via Electron IPC — no window.open()
    print.print(html, 'ticket')
    await api.post(`/checkins/${checkin.id}/print`)
  }

  const columns = [
    { key: 'checkInNumber', label: t('repairs.checkin.ci_num'), render: (v) => <span className="font-mono font-medium text-primary">{v}</span> },
    { key: 'customer', label: t('repairs.checkin.customer'), render: (v) => <div><p className="font-medium">{v?.name}</p>{v?.phone && <p className="text-xs text-muted-foreground">{v.phone}</p>}</div> },
    { key: 'deviceBrand', label: t('repairs.checkin.device'), render: (v, r) => `${v} ${r.deviceModel}` },
    { key: 'issueDesc', label: t('repairs.checkin.issue'), render: (v) => <span className="truncate max-w-[200px] inline-block">{v}</span> },
    { key: 'convertedAt', label: t('repairs.checkin.status'), render: (v) => <StatusBadge kind="checkin" value={v ? 'CONVERTED' : 'PENDING'} /> },
    { key: 'createdAt', label: t('repairs.checkin.date'), render: (v) => new Date(v).toLocaleDateString() },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); handlePrint(r) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer" title={t('repairs.checkin.print')}><Printer className="h-3.5 w-3.5" /></button>
          {!r.convertedAt && (
            <button onClick={(e) => { e.stopPropagation(); navigate(`/repairs/tickets/new?checkinId=${r.id}`) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer" title={t('repairs.checkin.convert')}><ArrowRight className="h-3.5 w-3.5" /></button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('repairs.checkin.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('repairs.checkin.subtitle')}</p></div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}><Plus className="h-4 w-4" /> {t('repairs.checkin.new')}</Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="max-w-sm flex-1"><Input placeholder={t('repairs.checkin.search')} icon={Search} value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">{t('repairs.checkin.all')}</option><option value="pending">{t('repairs.checkin.pending')}</option><option value="converted">{t('repairs.checkin.converted')}</option>
        </select>
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle={t('repairs.checkin.empty_title')} emptyDescription={t('repairs.checkin.empty_desc')} />}

      {/* New Check-In Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('repairs.checkin.modal_title')} size="lg"
        footer={<><Button variant="outline" onClick={() => setShowForm(false)}>{t('repairs.checkin.cancel')}</Button><Button variant="flux" onClick={handleCreate} loading={createMutation.isPending} disabled={!form.customerName}>{t('repairs.checkin.create_btn')}</Button></>}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="p-3 bg-muted rounded-md space-y-3">
            <p className="text-sm font-medium text-foreground">{t('repairs.checkin.customer')}</p>
            <Input label={t('repairs.checkin.lbl_client')} value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} icon={User} placeholder={t('repairs.checkin.ph_client')} required autoFocus />
            <Input label={t('repairs.checkin.lbl_phone')} value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} placeholder={t('repairs.checkin.ph_phone')} />
          </div>

          <DevicePicker required
            value={{ category: form.deviceCategory, brand: form.deviceBrand, model: form.deviceModel }}
            onChange={(v) => setForm({ ...form, deviceCategory: v.category, deviceBrand: v.brand, deviceModel: v.model })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('repairs.checkin.lbl_imei')} value={form.imei} onChange={e => setForm({...form, imei: e.target.value})} />
            <Input label={t('repairs.checkin.lbl_color')} value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('repairs.checkin.lbl_issue')}</label>
            <textarea value={form.issueDesc} onChange={e => setForm({...form, issueDesc: e.target.value})} className="flex min-h-[60px] w-full rounded-sm border border-input bg-popover px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder={t('repairs.checkin.ph_issue')} required />
          </div>
          <Input label={t('repairs.checkin.lbl_condition')} value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} placeholder={t('repairs.checkin.ph_condition')} />
        </form>
      </Modal>
    </div>
  )
}
