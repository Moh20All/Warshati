import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, User, Check, X } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'

const conditions = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'BROKEN']

export default function TradeInList() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ customerName: '', brand: '', model: '', imei: '', storage: '', color: '', condition: 'GOOD', conditionNotes: '', appraisedValue: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['trade-ins', statusFilter],
    queryFn: () => api.get('/trade-ins', { params: { status: statusFilter || undefined } }).then(r => r.data.tradeIns)
  })

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/trade-ins', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-ins'] })
      setShowForm(false)
      setForm({ customerName: '', brand: '', model: '', imei: '', storage: '', color: '', condition: 'GOOD', conditionNotes: '', appraisedValue: '' })
      toast.success('Trade-in appraised')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const acceptMutation = useMutation({
    mutationFn: (id) => api.post(`/trade-ins/${id}/accept`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['trade-ins'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success(`Accepted! Added to inventory as "${res.data.tradeIn.inventoryItem?.name}"`)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const rejectMutation = useMutation({
    mutationFn: (id) => api.post(`/trade-ins/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-ins'] })
      toast.success('Trade-in rejected')
    }
  })

  const columns = [
    { key: 'customer', label: 'Customer', render: (v) => <span className="font-medium">{v?.name}</span> },
    { key: 'brand', label: 'Device', render: (v, r) => `${v} ${r.model}` },
    { key: 'imei', label: 'IMEI', render: (v) => v || '—' },
    { key: 'condition', label: 'Condition', render: (v) => v ? <Badge color={v === 'EXCELLENT' || v === 'GOOD' ? 'success' : v === 'POOR' || v === 'BROKEN' ? 'danger' : 'warning'}>{v}</Badge> : '—' },
    { key: 'appraisedValue', label: 'Value', render: (v) => <span className="font-medium">{Number(v).toLocaleString()} DZD</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge color={v === 'ACCEPTED' ? 'success' : v === 'REJECTED' ? 'danger' : 'info'}>{v}</Badge> },
    { key: 'createdAt', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
    { key: 'actions', label: '', className: 'text-right',
      render: (_, r) => r.status === 'APPRAISED' && (
        <div className="flex items-center justify-end gap-1">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); acceptMutation.mutate(r.id) }}><Check className="h-3.5 w-3.5" /> Accept</Button>
          <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(r.id) }}><X className="h-3.5 w-3.5" /> Reject</Button>
        </div>
      )
    }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-foreground">Trade-Ins</h1><p className="text-sm text-muted-foreground mt-1">Appraise and accept used devices</p></div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Trade-In</Button>
      </div>

      <div className="mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All</option><option value="APPRAISED">Appraised</option><option value="ACCEPTED">Accepted</option><option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle="No trade-ins" emptyDescription="Appraise your first trade-in." />}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Appraise Trade-In" size="lg"
        footer={<><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createMutation.mutate({...form, appraisedValue: parseFloat(form.appraisedValue)})} loading={createMutation.isPending} disabled={!form.customerName || !form.brand || !form.model || !form.appraisedValue}>Appraise</Button></>}
      >
        <div className="space-y-4">
          <Input label="Customer Name" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} icon={User} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Brand" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Samsung, iPhone..." required />
            <Input label="Model" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Galaxy S24..." required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="IMEI" value={form.imei} onChange={e => setForm({...form, imei: e.target.value})} />
            <Input label="Storage" value={form.storage} onChange={e => setForm({...form, storage: e.target.value})} placeholder="128GB" />
            <Input label="Color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Condition</label>
              <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {conditions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Appraised Value (DZD)" type="number" value={form.appraisedValue} onChange={e => setForm({...form, appraisedValue: e.target.value})} required />
          </div>
          <Input label="Condition Notes" value={form.conditionNotes} onChange={e => setForm({...form, conditionNotes: e.target.value})} placeholder="Scratches, battery health..." />
        </div>
      </Modal>
    </div>
  )
}
