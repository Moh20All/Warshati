import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Printer } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'

const statusFlow = {
  DIAGNOSING: ['WAITING_PARTS', 'IN_REPAIR', 'DONE', 'CANCELLED'],
  WAITING_PARTS: ['IN_REPAIR', 'DONE', 'CANCELLED'],
  IN_REPAIR: ['DONE', 'WAITING_PARTS', 'CANCELLED'],
  DONE: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
}

export default function TicketDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const checkinId = searchParams.get('checkinId')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const isNew = id === 'new'

  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerId: '',
    deviceBrand: '', deviceModel: '', imei: '', devicePassword: '',
    color: '', condition: '', issueDesc: '', diagnosis: '', partsUsedNotes: '',
    finalCost: '', partsCost: '', deposit: '0', priority: 'NORMAL', estimatedDoneAt: '', warrantyDays: 30
  })
  const [transitionModal, setTransitionModal] = useState(null)
  const [finalCostInput, setFinalCostInput] = useState('')
  const [partsCostInput, setPartsCostInput] = useState('')

  // Load check-in data if creating from check-in
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

  const saveMutation = useMutation({
    mutationFn: (d) => isNew
      ? api.post('/tickets', { ...d, checkInId: checkinId || undefined })
      : api.put(`/tickets/${id}`, d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast.success(isNew ? `Ticket ${res.data.ticket.ticketNumber} created` : 'Ticket updated')
      if (isNew) navigate(`/repairs/tickets/${res.data.ticket.id}`, { replace: true })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
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
      toast.success(`Status changed to ${res.data.ticket.status}`)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Transition failed')
  })

  const handleSave = () => {
    const data = { ...form }
    if (data.finalCost) data.finalCost = parseFloat(data.finalCost)
    if (data.partsCost) data.partsCost = parseFloat(data.partsCost)
    if (data.deposit) data.deposit = parseFloat(data.deposit)
    data.warrantyDays = parseInt(data.warrantyDays)
    saveMutation.mutate(data)
  }

  // If viewing existing ticket, populate form
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
        estimatedDoneAt: ticket.estimatedDoneAt ? ticket.estimatedDoneAt.split('T')[0] : '', warrantyDays: ticket.warrantyDays
      })
    }
  }, [ticket, isNew])

  if (!isNew && isLoading) return <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>

  const daysSince = ticket ? Math.floor((Date.now() - new Date(ticket.receivedAt).getTime()) / 86400000) : 0
  const nextStatuses = ticket ? (statusFlow[ticket.status] || []) : []

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/repairs/tickets')} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{isNew ? 'New Ticket' : ticket?.ticketNumber}</h1>
          {ticket && <div className="flex items-center gap-2 mt-1">
            <Badge color={ticket.status}>{ticket.status.replace('_', ' ')}</Badge>
            <Badge color={ticket.priority}>{ticket.priority}</Badge>
            {ticket.status !== 'DELIVERED' && ticket.status !== 'CANCELLED' && daysSince > 30 && <Badge color="warning" dot>⚠ Waiting {daysSince} days</Badge>}
          </div>}
        </div>
        <Button onClick={handleSave} loading={saveMutation.isPending}><Save className="h-4 w-4" /> Save</Button>
      </div>

      {/* Status transitions */}
      {!isNew && nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 p-3 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground mr-2 self-center">Move to:</span>
          {nextStatuses.map(s => (
            <Button key={s} variant={s === 'CANCELLED' ? 'danger' : 'outline'} size="sm" onClick={() => { setTransitionModal(s); if (s === 'DONE') { setFinalCostInput(form.finalCost || ''); setPartsCostInput(form.partsCost || '') } }}>
              {s.replace('_', ' ')}
            </Button>
          ))}
        </div>
      )}

      {/* Customer info — inline for new tickets, display for existing */}
      {isNew ? (
        <div className="grid grid-cols-2 gap-4 mb-4 p-4 border border-border rounded-lg bg-card">
          <Input label="Customer Name *" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} placeholder="e.g. Ahmed" autoFocus />
          <Input label="Customer Phone" value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} placeholder="e.g. 0671222227" />
        </div>
      ) : ticket?.customer && (
        <div className="mb-4 p-3 bg-muted rounded-md text-sm">
          <span className="font-medium">{ticket.customer.name}</span> · {ticket.customer.phone}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input label="Device Brand *" value={form.deviceBrand} onChange={e => setForm({...form, deviceBrand: e.target.value})} placeholder="Samsung, iPhone, Xiaomi..." />
        <Input label="Device Model *" value={form.deviceModel} onChange={e => setForm({...form, deviceModel: e.target.value})} placeholder="S23, 15 Pro Max..." />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Input label="IMEI" value={form.imei} onChange={e => setForm({...form, imei: e.target.value})} />
        <Input label="Color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
        <Input label="Device Password" value={form.devicePassword} onChange={e => setForm({...form, devicePassword: e.target.value})} />
      </div>
      <div className="space-y-1.5 mb-4">
        <label className="text-sm font-medium text-foreground">Issue Description *</label>
        <textarea value={form.issueDesc} onChange={e => setForm({...form, issueDesc: e.target.value})} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Screen cracked, battery drains fast..." />
      </div>
      <div className="space-y-1.5 mb-4">
        <label className="text-sm font-medium text-foreground">Diagnosis</label>
        <textarea value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Your technical diagnosis..." />
      </div>
      <div className="space-y-1.5 mb-4">
        <label className="text-sm font-medium text-foreground">Parts Used Notes</label>
        <textarea value={form.partsUsedNotes} onChange={e => setForm({...form, partsUsedNotes: e.target.value})} className="flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="LCD screen replacement, new battery..." />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Input label="Final Cost to Customer (DZD)" type="number" value={form.finalCost} onChange={e => setForm({...form, finalCost: e.target.value})} />
        <Input label="Parts Cost (DZD)" type="number" value={form.partsCost} onChange={e => setForm({...form, partsCost: e.target.value})} />
        <Input label="Deposit / Advance (DZD)" type="number" value={form.deposit} onChange={e => setForm({...form, deposit: e.target.value})} />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Priority</label>
          <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input label="Est. Completion Date" type="date" value={form.estimatedDoneAt} onChange={e => setForm({...form, estimatedDoneAt: e.target.value})} />
        <Input label="Warranty (days)" type="number" value={form.warrantyDays} onChange={e => setForm({...form, warrantyDays: e.target.value})} />
      </div>

      {/* Transition confirmation */}
      <Modal open={!!transitionModal} onClose={() => setTransitionModal(null)} title={`Move to ${transitionModal?.replace('_', ' ')}?`}
        footer={<>
          <Button variant="outline" onClick={() => setTransitionModal(null)}>Cancel</Button>
          {transitionModal !== 'DELIVERED' && (
            <Button variant={transitionModal === 'CANCELLED' ? 'danger' : 'primary'} onClick={() => transitionMutation.mutate({ status: transitionModal, finalCost: finalCostInput, partsCost: partsCostInput })} loading={transitionMutation.isPending}>Confirm</Button>
          )}
        </>}
      >
        {transitionModal === 'DONE' && (
          <div className="space-y-4 mb-4">
            <Input label="Final Cost to Customer (DZD)" type="number" value={finalCostInput} onChange={e => setFinalCostInput(e.target.value)} required />
            <Input label="Our Cost for Parts (DZD)" type="number" value={partsCostInput} onChange={e => setPartsCostInput(e.target.value)} />
          </div>
        )}
        
        {transitionModal === 'DELIVERED' && !ticket?.sale && (
          <div className="space-y-4 mb-4">
            <p className="text-sm text-muted-foreground">Select payment method to complete the delivery and generate an invoice.</p>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => transitionMutation.mutate({ status: 'DELIVERED', paymentMethod: 'CASH' })} loading={transitionMutation.isPending && transitionMutation.variables?.paymentMethod === 'CASH'}>
                Cash Payment
              </Button>
              <Button variant="outline" onClick={() => transitionMutation.mutate({ status: 'DELIVERED', paymentMethod: 'CREDIT' })} loading={transitionMutation.isPending && transitionMutation.variables?.paymentMethod === 'CREDIT'}>
                Credit (Debt)
              </Button>
            </div>
          </div>
        )}

        {transitionModal === 'DELIVERED' && ticket?.sale && (
           <p className="text-sm text-muted-foreground mb-4">Mark this ticket as delivered? Payment was already recorded.</p>
        )}

        {transitionModal !== 'DONE' && transitionModal !== 'DELIVERED' && (
          <p className="text-sm text-muted-foreground mb-4">Are you sure you want to change the status to <strong>{transitionModal?.replace('_', ' ')}</strong>?</p>
        )}

        {transitionModal === 'DELIVERED' && ticket?.sale && (
          <div className="flex justify-end mt-4">
             <Button onClick={() => transitionMutation.mutate({ status: 'DELIVERED' })} loading={transitionMutation.isPending}>Confirm Delivery</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
