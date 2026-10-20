import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Phone } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'

export default function SupplierList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => api.get('/suppliers', { params: { search: search || undefined } }).then(r => r.data.suppliers)
  })

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/suppliers', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setShowAdd(false); setForm({ name: '', phone: '', address: '', notes: '' }); toast.success(t('finance.suppliers.success_created')) },
    onError: (err) => toast.error(err.response?.data?.error || t('finance.suppliers.err_failed'))
  })

  const columns = [
    { key: 'name', label: t('finance.suppliers.col_name'), sortable: true, render: (v) => <span className="font-medium">{v}</span> },
    { key: 'phone', label: t('finance.suppliers.col_phone'), render: (v) => v || '—' },
    { key: 'address', label: t('finance.suppliers.col_address'), render: (v) => v || '—' },
    { key: '_count', label: t('finance.suppliers.col_pos'), render: (v) => v?.purchaseOrders || 0 }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-foreground">{t('finance.suppliers.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('finance.suppliers.subtitle')}</p></div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> {t('finance.suppliers.btn_add')}</Button>
      </div>
      <div className="mb-4 max-w-sm"><Input placeholder={t('finance.suppliers.search_ph')} icon={Search} value={search} onChange={e => setSearch(e.target.value)} /></div>
      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle={t('finance.suppliers.empty_title')} emptyDescription={t('finance.suppliers.empty_desc')} onRowClick={r => navigate(`/finance/suppliers/${r.id}`)} />}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('finance.suppliers.modal_title')}
        footer={<><Button variant="outline" onClick={() => setShowAdd(false)}>{t('finance.suppliers.btn_cancel')}</Button><Button onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>{t('finance.suppliers.btn_create')}</Button></>}
      >
        <div className="space-y-4">
          <Input label={t('finance.suppliers.lbl_name')} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <Input label={t('finance.suppliers.lbl_phone')} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} icon={Phone} />
          <Input label={t('finance.suppliers.lbl_address')} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          <div className="space-y-1.5"><label className="text-sm font-medium text-foreground">{t('finance.suppliers.lbl_notes')}</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
        </div>
      </Modal>
    </div>
  )
}
