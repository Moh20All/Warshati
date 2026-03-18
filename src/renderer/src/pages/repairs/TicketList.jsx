import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Wrench, CheckCircle, Truck, XCircle, Clock, Package, Plus, DollarSign, CreditCard } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

const statusOptions = ['', 'DIAGNOSING', 'WAITING_PARTS', 'IN_REPAIR', 'DONE', 'DELIVERED', 'CANCELLED']

const quickActions = {
  DIAGNOSING: [
    { label: 'Start Repair', next: 'IN_REPAIR', icon: Wrench, color: 'text-info' },
    { label: 'Wait Parts', next: 'WAITING_PARTS', icon: Package, color: 'text-warning' }
  ],
  WAITING_PARTS: [
    { label: 'Start Repair', next: 'IN_REPAIR', icon: Wrench, color: 'text-info' }
  ],
  IN_REPAIR: [
    { label: 'Mark Done', next: 'DONE', icon: CheckCircle, color: 'text-success', needsCost: true }
  ],
  DONE: [
    { label: 'Delivered', next: 'DELIVERED', icon: Truck, color: 'text-primary', needsPayment: true }
  ]
}

export default function TicketList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [costModal, setCostModal] = useState(null)
  const [deliveryModal, setDeliveryModal] = useState(null)
  const [finalCost, setFinalCost] = useState('')
  const [partsCost, setPartsCost] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', search, statusFilter],
    queryFn: () => api.get('/tickets', { params: { search: search || undefined, status: statusFilter || undefined } }).then(r => r.data.tickets)
  })

  const transitionMutation = useMutation({
    mutationFn: ({ id, status, finalCost, partsCost, paymentMethod }) => 
      api.post(`/tickets/${id}/transition`, { 
        status, 
        finalCost: finalCost ? parseFloat(finalCost) : undefined, 
        partsCost: partsCost ? parseFloat(partsCost) : undefined,
        paymentMethod
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setCostModal(null)
      setDeliveryModal(null)
      setFinalCost('')
      setPartsCost('')
      toast.success(`→ ${res.data.ticket.status.replace('_', ' ')}`)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const handleQuickAction = (ticket, action) => {
    if (action.needsCost) {
      setCostModal({ ticket, action })
      setFinalCost(ticket.finalCost || '')
      setPartsCost(ticket.partsCost || '')
    } else if (action.needsPayment && !ticket.sale) {
      setDeliveryModal({ ticket, action })
    } else {
      transitionMutation.mutate({ id: ticket.id, status: action.next })
    }
  }

  const daysSince = (date) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000)

  const columns = [
    { key: 'ticketNumber', label: 'Ticket #', render: (v) => <span className="font-medium text-primary">{v}</span> },
    { key: 'customer', label: 'Customer', render: (v) => <div><p className="font-medium">{v?.name}</p><p className="text-xs text-muted-foreground">{v?.phone || ''}</p></div> },
    { key: 'deviceBrand', label: 'Device', render: (v, r) => `${v} ${r.deviceModel}` },
    { key: 'status', label: 'Status', render: (v) => <Badge color={v}>{v.replace('_', ' ')}</Badge> },
    { key: 'priority', label: 'Priority', render: (v) => <Badge color={v}>{v}</Badge> },
    {
      key: 'receivedAt', label: 'Waiting',
      render: (v, r) => {
        if (r.status === 'DELIVERED' || r.status === 'CANCELLED') return '—'
        const days = daysSince(v)
        return days > 30 ? <Badge color="warning" dot>⚠ {days}d</Badge> : `${days}d`
      }
    },
    { key: 'finalCost', label: 'Cost', render: (v) => v ? `${Number(v).toLocaleString()} DZD` : '—' },
    {
      key: 'quickActions', label: 'Quick Actions', className: 'text-right',
      render: (_, r) => {
        const actions = quickActions[r.status] || []
        if (actions.length === 0) return null
        return (
          <div className="flex items-center justify-end gap-1">
            {actions.map(a => (
              <button
                key={a.next}
                onClick={(e) => { e.stopPropagation(); handleQuickAction(r, a) }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${a.color} bg-current/5 hover:bg-current/15 border border-current/20 transition-colors cursor-pointer`}
                style={{ backgroundColor: 'var(--color-muted)', borderColor: 'currentColor', borderWidth: '1px', opacity: 0.9 }}
                title={a.label}
              >
                <a.icon className="h-3 w-3" />
                {a.label}
              </button>
            ))}
          </div>
        )
      }
    }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-foreground">Repair Tickets</h1><p className="text-sm text-muted-foreground mt-1">Track all repairs</p></div>
        <Button onClick={() => navigate('/repairs/tickets/new')}><Plus className="h-4 w-4" /> New Ticket</Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="max-w-sm flex-1"><Input placeholder="Search ticket #, IMEI, customer..." icon={Search} value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Statuses</option>
          {statusOptions.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle="No tickets" emptyDescription="Tickets will appear here after converting check-ins." onRowClick={(r) => navigate(`/repairs/tickets/${r.id}`)} />}

      {/* Final Cost Modal for Mark Done */}
      <Modal open={!!costModal} onClose={() => setCostModal(null)} title="Mark as Done"
        footer={<>
          <Button variant="outline" onClick={() => setCostModal(null)}>Cancel</Button>
          <Button onClick={() => transitionMutation.mutate({ id: costModal?.ticket?.id, status: 'DONE', finalCost, partsCost })} loading={transitionMutation.isPending} disabled={!finalCost}>
            <CheckCircle className="h-4 w-4" /> Mark Done
          </Button>
        </>}
      >
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Ticket:</span><span className="font-medium text-primary">{costModal?.ticket?.ticketNumber}</span></div>
            <div className="flex justify-between mt-1"><span className="text-muted-foreground">Customer:</span><span>{costModal?.ticket?.customer?.name}</span></div>
            <div className="flex justify-between mt-1"><span className="text-muted-foreground">Device:</span><span>{costModal?.ticket?.deviceBrand} {costModal?.ticket?.deviceModel}</span></div>
          </div>
          <Input label="Final Cost to Customer (DZD)" type="number" value={finalCost} onChange={e => setFinalCost(e.target.value)} autoFocus required />
          <Input label="Our Cost for Parts (DZD)" type="number" value={partsCost} onChange={e => setPartsCost(e.target.value)} placeholder="0" />
        </div>
      </Modal>

      {/* Delivery Payment Modal */}
      <Modal open={!!deliveryModal} onClose={() => setDeliveryModal(null)} title="Deliver & Complete Sale"
        footer={<Button variant="outline" onClick={() => setDeliveryModal(null)}>Cancel</Button>}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Select payment method to complete the delivery and generate an invoice.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => transitionMutation.mutate({ id: deliveryModal?.ticket?.id, status: 'DELIVERED', paymentMethod: 'CASH' })} loading={transitionMutation.isPending && transitionMutation.variables?.paymentMethod === 'CASH'}>
              <DollarSign className="h-4 w-4" /> Cash Payment
            </Button>
            <Button variant="outline" onClick={() => transitionMutation.mutate({ id: deliveryModal?.ticket?.id, status: 'DELIVERED', paymentMethod: 'CREDIT' })} loading={transitionMutation.isPending && transitionMutation.variables?.paymentMethod === 'CREDIT'}>
              <CreditCard className="h-4 w-4" /> Credit (Debt)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
