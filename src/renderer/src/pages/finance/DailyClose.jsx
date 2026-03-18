import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, DollarSign, TrendingUp, CreditCard, Receipt, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'

export default function DailyClosePage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: preview } = useQuery({
    queryKey: ['daily-close-preview'],
    queryFn: () => api.get('/daily-close/preview').then(r => r.data)
  })

  const { data: history, isLoading } = useQuery({
    queryKey: ['daily-closes'],
    queryFn: () => api.get('/daily-close').then(r => r.data.closes)
  })

  const closeMutation = useMutation({
    mutationFn: () => api.post('/daily-close'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-closes'] })
      queryClient.invalidateQueries({ queryKey: ['daily-close-preview'] })
      setShowConfirm(false)
      toast.success('Day closed successfully!')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Close failed')
  })

  const stats = [
    { label: 'Total Revenue', value: `${(preview?.totalRevenue || 0).toLocaleString()} DZD`, icon: TrendingUp, color: 'text-success' },
    { label: 'Cash Sales', value: `${(preview?.cashSales || 0).toLocaleString()} DZD`, icon: DollarSign, color: 'text-info' },
    { label: 'Credit Sales', value: `${(preview?.totalCreditSales || 0).toLocaleString()} DZD`, icon: CreditCard, color: 'text-warning' },
    { label: 'Debt Collected', value: `${(preview?.totalDebtCollected || 0).toLocaleString()} DZD`, icon: Receipt, color: 'text-primary' },
    { label: 'Expenses', value: `${(preview?.totalExpenses || 0).toLocaleString()} DZD`, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Net Cash', value: `${(preview?.netCash || 0).toLocaleString()} DZD`, icon: DollarSign, color: preview?.netCash >= 0 ? 'text-success' : 'text-destructive' }
  ]

  const historyColumns = [
    { key: 'date', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
    { key: 'totalRevenue', label: 'Revenue', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'totalExpenses', label: 'Expenses', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'totalDebtCollected', label: 'Debt Collected', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'netCash', label: 'Net Cash', render: (v) => <span className={`font-medium ${Number(v) >= 0 ? 'text-success' : 'text-destructive'}`}>{Number(v).toLocaleString()} DZD</span> },
    { key: 'openTickets', label: 'Open Tickets', render: (v) => v },
    { key: 'lowStockCount', label: 'Low Stock', render: (v) => v > 0 ? <Badge color="warning">{v}</Badge> : '0' }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-foreground">Daily Close</h1><p className="text-sm text-muted-foreground mt-1">End-of-day summary</p></div>
        {!preview?.alreadyClosed ? (
          <Button onClick={() => setShowConfirm(true)}><CalendarCheck className="h-4 w-4" /> Close Today</Button>
        ) : (
          <Badge color="success">Today is already closed</Badge>
        )}
      </div>

      {/* Today's Preview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {stats.map(s => (
          <div key={s.label} className="border border-border rounded-lg bg-card p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* History */}
      <h3 className="text-lg font-semibold text-foreground mb-3">Close History</h3>
      {isLoading ? <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={historyColumns} data={history || []} emptyTitle="No closes yet" emptyDescription="Close your first day." />}

      <ConfirmModal open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={() => closeMutation.mutate()}
        title="Close Today?" message="This will create an immutable snapshot of today's financial summary. Make sure all transactions are entered." confirmText="Close Day" loading={closeMutation.isPending} />
    </div>
  )
}
