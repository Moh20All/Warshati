import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Wrench, CheckCircle, Truck, XCircle, Clock, Package, Plus, DollarSign, CreditCard } from 'lucide-react'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import { useToast } from '../../components/ui/Toast'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

const statusOptions = ['', 'DIAGNOSING', 'WAITING_PARTS', 'IN_REPAIR', 'DONE', 'DELIVERED', 'CANCELLED']

export default function TicketList() {
  const cur = useCurrency()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [costModal, setCostModal] = useState(null)
  const [deliveryModal, setDeliveryModal] = useState(null)
  const [finalCost, setFinalCost] = useState('')
  const [partsCost, setPartsCost] = useState('')

  const quickActions = {
    DIAGNOSING: [
      { label: t('repairs.tickets.actions.start'), next: 'IN_REPAIR', icon: Wrench, color: 'text-info' },
      { label: t('repairs.tickets.actions.wait_parts'), next: 'WAITING_PARTS', icon: Package, color: 'text-warning' }
    ],
    WAITING_PARTS: [
      { label: t('repairs.tickets.actions.start'), next: 'IN_REPAIR', icon: Wrench, color: 'text-info' }
    ],
    IN_REPAIR: [
      { label: t('repairs.tickets.actions.mark_done'), next: 'DONE', icon: CheckCircle, color: 'text-success', needsCost: true }
    ],
    DONE: [
      { label: t('repairs.tickets.actions.delivered'), next: 'DELIVERED', icon: Truck, color: 'text-primary', needsPayment: true }
    ]
  }

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', search, statusFilter],
    queryFn: () => api.get('/tickets', { params: { search: search || undefined, status: statusFilter || undefined } }).then(r => r.data)
  })
  const tickets = data?.tickets

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
      toast.success(`→ ${t(`repairs.statuses.${res.data.ticket.status}`)}`)
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
    { key: 'ticketNumber', label: t('repairs.tickets.ticket_num'), render: (v) => <span className="font-mono font-medium text-primary">{v}</span> },
    { key: 'customer', label: t('repairs.tickets.customer'), render: (v) => <div><p className="font-medium">{v?.name}</p><p className="text-xs text-muted-foreground"><bdi dir="ltr">{v?.phone || ''}</bdi></p></div> },
    { key: 'deviceBrand', label: t('repairs.tickets.device'), render: (v, r) => `${v} ${r.deviceModel}` },
    { key: 'status', label: t('repairs.tickets.status'), render: (v) => <StatusBadge kind="ticket" value={v} /> },
    { key: 'priority', label: t('repairs.tickets.priority'), render: (v) => <StatusBadge kind="priority" value={v} /> },
    {
      key: 'receivedAt', label: t('repairs.tickets.waiting'),
      render: (v, r) => {
        if (r.status === 'DELIVERED' || r.status === 'CANCELLED') return '—'
        const days = daysSince(v)
        return days > 30 ? <Badge color="warning" dot>⚠ {t('repairs.tickets.waiting_days', {days})}</Badge> : t('repairs.tickets.waiting_days', {days})
      }
    },
    { key: 'finalCost', label: t('repairs.tickets.cost'), render: (v) => v ? `${Number(v).toLocaleString()} ${cur}` : '—' },
    {
      key: 'quickActions', label: t('repairs.tickets.quick_actions'), className: 'text-right',
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
        <div><h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('repairs.tickets.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('repairs.tickets.subtitle')}</p></div>
        <Button onClick={() => navigate('/repairs/tickets/new')}><Plus className="h-4 w-4" /> {t('repairs.tickets.new')}</Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="max-w-sm flex-1"><Input placeholder={t('repairs.tickets.search')} icon={Search} data-search value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={async e => {
            // A scanned sticker ends with Enter (faster than the list refresh): open its ticket when it is the only match
            if (e.key !== 'Enter' || !search.trim()) return
            const found = (await api.get('/tickets', { params: { search: search.trim() } })).data.tickets
            if (found.length === 1) navigate(`/repairs/tickets/${found[0].id}`)
          }} /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">{t('repairs.tickets.all_statuses')}</option>
          {statusOptions.filter(Boolean).map(s => <option key={s} value={s}>{t(`repairs.statuses.${s}`)}</option>)}
        </select>
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={tickets || []} emptyTitle={t('repairs.tickets.empty_title')} emptyDescription={t('repairs.tickets.empty_desc')} onRowClick={(r) => navigate(`/repairs/tickets/${r.id}`)} />}
      {data?.limited && <p className="mt-3 text-xs text-muted-foreground">{t('lists.latest', { shown: tickets.length, total: data.total })}</p>}

      {/* Final Cost Modal for Mark Done */}
      <Modal open={!!costModal} onClose={() => setCostModal(null)} title={t('repairs.tickets.modal_done')}
        footer={<>
          <Button variant="outline" onClick={() => setCostModal(null)}>{t('repairs.tickets.cancel')}</Button>
          <Button onClick={() => transitionMutation.mutate({ id: costModal?.ticket?.id, status: 'DONE', finalCost, partsCost })} loading={transitionMutation.isPending} disabled={!finalCost}>
            <CheckCircle className="h-4 w-4" /> {t('repairs.tickets.btn_done')}
          </Button>
        </>}
      >
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-md text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t('repairs.tickets.ticket_num')}:</span><span className="font-medium text-primary">{costModal?.ticket?.ticketNumber}</span></div>
            <div className="flex justify-between mt-1"><span className="text-muted-foreground">{t('repairs.tickets.customer')}:</span><span>{costModal?.ticket?.customer?.name}</span></div>
            <div className="flex justify-between mt-1"><span className="text-muted-foreground">{t('repairs.tickets.device')}:</span><span>{costModal?.ticket?.deviceBrand} {costModal?.ticket?.deviceModel}</span></div>
          </div>
          <Input label={t('repairs.tickets.lbl_final')} type="number" value={finalCost} onChange={e => setFinalCost(e.target.value)} autoFocus required />
          <Input label={t('repairs.tickets.lbl_parts')} type="number" value={partsCost} onChange={e => setPartsCost(e.target.value)} placeholder="0" />
        </div>
      </Modal>

      {/* Delivery Payment Modal */}
      <Modal open={!!deliveryModal} onClose={() => setDeliveryModal(null)} title={t('repairs.tickets.modal_delivery')}
        footer={<Button variant="outline" onClick={() => setDeliveryModal(null)}>{t('repairs.tickets.cancel')}</Button>}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('repairs.tickets.delivery_desc')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => transitionMutation.mutate({ id: deliveryModal?.ticket?.id, status: 'DELIVERED', paymentMethod: 'CASH' })} loading={transitionMutation.isPending && transitionMutation.variables?.paymentMethod === 'CASH'}>
              <DollarSign className="h-4 w-4" /> {t('repairs.tickets.cash')}
            </Button>
            <Button variant="outline" onClick={() => transitionMutation.mutate({ id: deliveryModal?.ticket?.id, status: 'DELIVERED', paymentMethod: 'CREDIT' })} loading={transitionMutation.isPending && transitionMutation.variables?.paymentMethod === 'CREDIT'}>
              <CreditCard className="h-4 w-4" /> {t('repairs.tickets.credit')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
