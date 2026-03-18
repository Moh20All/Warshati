import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, DollarSign } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'

export default function DebtLedger() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['debts', search, statusFilter],
    queryFn: () => api.get('/debts', { params: { search: search || undefined, status: statusFilter || undefined } }).then(r => r.data.debts)
  })

  const payMutation = useMutation({
    mutationFn: ({ id, amount }) => api.post(`/debts/${id}/payment`, { amount: parseFloat(amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      setPaymentModal(null); setPaymentAmount('')
      toast.success('Payment recorded')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)

  const columns = [
    { key: 'customer', label: 'Customer', render: (v) => <div><p className="font-medium">{v?.name}</p><p className="text-xs text-muted-foreground">{v?.phone}</p></div> },
    { key: 'type', label: 'Type', render: (v) => <Badge>{v.replace('_', ' ')}</Badge> },
    { key: 'totalAmount', label: 'Total', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'paidAmount', label: 'Paid', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'remaining', label: 'Remaining', render: (v) => <span className="font-medium text-destructive">{Number(v).toLocaleString()} DZD</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge color={v}>{v}</Badge> },
    {
      key: 'createdAt', label: 'Age',
      render: (v, r) => {
        const days = daysSince(v)
        return r.status !== 'SETTLED' && days > 30
          ? <span className="text-destructive font-medium">{days}d overdue</span>
          : `${days}d`
      }
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (_, r) => r.status !== 'SETTLED' && (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPaymentModal(r); setPaymentAmount('') }}>
          <DollarSign className="h-3.5 w-3.5" /> Pay
        </Button>
      )
    }
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-6"><h1 className="text-2xl font-bold text-foreground">Debt Ledger</h1><p className="text-sm text-muted-foreground mt-1">Track and collect outstanding debts</p></div>

      <div className="flex items-center gap-3 mb-4">
        <div className="max-w-sm flex-1"><Input placeholder="Search customer..." icon={Search} value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All</option><option value="OPEN">Open</option><option value="PARTIAL">Partial</option><option value="SETTLED">Settled</option>
        </select>
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data || []} emptyTitle="No debts" emptyDescription="No outstanding debts." />}

      {/* Record Payment Modal */}
      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Record Payment"
        footer={<><Button variant="outline" onClick={() => setPaymentModal(null)}>Cancel</Button><Button onClick={() => payMutation.mutate({ id: paymentModal?.id, amount: paymentAmount })} loading={payMutation.isPending} disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}>Record</Button></>}
      >
        {paymentModal && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer:</span><span className="font-medium">{paymentModal.customer?.name}</span></div>
              <div className="flex justify-between mt-1"><span className="text-muted-foreground">Remaining:</span><span className="font-medium text-destructive">{Number(paymentModal.remaining).toLocaleString()} DZD</span></div>
            </div>
            <Input label="Payment Amount (DZD)" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={paymentModal.remaining?.toString()} autoFocus />
          </div>
        )}
      </Modal>
    </div>
  )
}
