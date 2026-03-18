import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Printer, ArrowRight, User } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'

export default function CheckInList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    customerName: '', customerPhone: '',
    deviceBrand: '', deviceModel: '', imei: '', color: '', issueDesc: '', condition: ''
  })

  const { data, isLoading } = useQuery({
    queryKey: ['checkins', search, statusFilter],
    queryFn: () => api.get('/checkins', { params: { search: search || undefined, status: statusFilter || undefined } }).then(r => r.data.checkins)
  })

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/checkins', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      toast.success(`Check-in ${res.data.checkin.checkInNumber} created`)
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const resetForm = () => {
    setForm({ customerName: '', customerPhone: '', deviceBrand: '', deviceModel: '', imei: '', color: '', issueDesc: '', condition: '' })
  }

  const handleCreate = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const handlePrint = async (checkin) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    printWindow.document.write(`
      <html><head><title>Check-In Receipt</title>
      <style>body{font-family:monospace;padding:20px;font-size:12px}h2{text-align:center;margin:0}.line{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;margin:4px 0}</style></head>
      <body><h2>Rakam - رقم</h2><p style="text-align:center">Check-In Receipt</p><div class="line"></div>
      <div class="row"><span>CI#:</span><strong>${checkin.checkInNumber}</strong></div>
      <div class="row"><span>Date:</span><span>${new Date(checkin.createdAt).toLocaleString()}</span></div>
      <div class="line"></div>
      <div class="row"><span>Customer:</span><span>${checkin.customer.name}</span></div>
      ${checkin.customer.phone ? `<div class="row"><span>Phone:</span><span>${checkin.customer.phone}</span></div>` : ''}
      <div class="line"></div>
      <div class="row"><span>Device:</span><span>${checkin.deviceBrand} ${checkin.deviceModel}</span></div>
      ${checkin.imei ? `<div class="row"><span>IMEI:</span><span>${checkin.imei}</span></div>` : ''}
      ${checkin.color ? `<div class="row"><span>Color:</span><span>${checkin.color}</span></div>` : ''}
      <div class="line"></div>
      <p><strong>Issue:</strong> ${checkin.issueDesc}</p>
      ${checkin.condition ? `<p><strong>Condition:</strong> ${checkin.condition}</p>` : ''}
      <div class="line"></div><p style="text-align:center;font-size:10px">Thank you for choosing Rakam</p>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.print()
    await api.post(`/checkins/${checkin.id}/print`)
  }

  const columns = [
    { key: 'checkInNumber', label: 'CI #', render: (v) => <span className="font-medium text-primary">{v}</span> },
    { key: 'customer', label: 'Customer', render: (v) => <div><p className="font-medium">{v?.name}</p>{v?.phone && <p className="text-xs text-muted-foreground">{v.phone}</p>}</div> },
    { key: 'deviceBrand', label: 'Device', render: (v, r) => `${v} ${r.deviceModel}` },
    { key: 'issueDesc', label: 'Issue', render: (v) => <span className="truncate max-w-[200px] inline-block">{v}</span> },
    { key: 'convertedAt', label: 'Status', render: (v) => v ? <Badge color="success">Converted</Badge> : <Badge color="warning" dot>Pending</Badge> },
    { key: 'createdAt', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); handlePrint(r) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer" title="Print"><Printer className="h-3.5 w-3.5" /></button>
          {!r.convertedAt && (
            <button onClick={(e) => { e.stopPropagation(); navigate(`/repairs/tickets/new?checkinId=${r.id}`) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer" title="Convert to Ticket"><ArrowRight className="h-3.5 w-3.5" /></button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-foreground">Check-In</h1><p className="text-sm text-muted-foreground mt-1">Fast device intake</p></div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}><Plus className="h-4 w-4" /> New Check-In</Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="max-w-sm flex-1"><Input placeholder="Search..." icon={Search} value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All</option><option value="pending">Pending</option><option value="converted">Converted</option>
        </select>
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle="No check-ins" emptyDescription="Create your first check-in." />}

      {/* New Check-In Modal — Simplified */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Check-In" size="lg"
        footer={<><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={handleCreate} loading={createMutation.isPending} disabled={!form.customerName}>Create Check-In</Button></>}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Customer — just type a name */}
          <div className="p-3 bg-muted rounded-md space-y-3">
            <p className="text-sm font-medium text-foreground">Customer</p>
            <Input label="Client Name" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} icon={User} placeholder="Type customer name..." required autoFocus />
            <Input label="Phone (optional)" value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} placeholder="Phone number if available..." />
          </div>

          {/* Device info */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Device Brand" value={form.deviceBrand} onChange={e => setForm({...form, deviceBrand: e.target.value})} placeholder="Samsung, iPhone..." required />
            <Input label="Device Model" value={form.deviceModel} onChange={e => setForm({...form, deviceModel: e.target.value})} placeholder="Galaxy S24, iPhone 15..." required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="IMEI (optional)" value={form.imei} onChange={e => setForm({...form, imei: e.target.value})} />
            <Input label="Color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Issue Description</label>
            <textarea value={form.issueDesc} onChange={e => setForm({...form, issueDesc: e.target.value})} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Customer's words exactly..." required />
          </div>
          <Input label="Visible Condition" value={form.condition} onChange={e => setForm({...form, condition: e.target.value})} placeholder="Scratches on screen, dent on corner..." />
        </form>
      </Modal>
    </div>
  )
}
