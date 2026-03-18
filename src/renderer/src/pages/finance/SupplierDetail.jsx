import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Package, CreditCard, DollarSign } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'

const tabs = [
  { key: 'orders', label: 'Purchase Orders', icon: Package },
  { key: 'debt', label: 'Debt', icon: CreditCard }
]

export default function SupplierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('orders')
  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => api.get(`/suppliers/${id}`).then(r => r.data.supplier)
  })

  const payMutation = useMutation({
    mutationFn: ({ debtId, amount }) => api.post(`/supplier-debts/${debtId}/payment`, { amount: parseFloat(amount) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['supplier', id] }); setPaymentModal(null); setPaymentAmount(''); toast.success('Payment recorded') },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  if (isLoading) return <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
  if (!supplier) return <div className="text-center py-12 text-destructive">Supplier not found</div>

  const poColumns = [
    { key: 'poNumber', label: 'PO #', render: (v) => <span className="font-medium text-primary">{v}</span> },
    { key: 'total', label: 'Total', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'status', label: 'Status', render: (v) => <Badge color={v === 'PAID' ? 'success' : v === 'PARTIAL' ? 'warning' : 'danger'}>{v}</Badge> },
    { key: 'lines', label: 'Items', render: (v) => v?.length || 0 },
    { key: 'createdAt', label: 'Date', render: (v) => new Date(v).toLocaleDateString() }
  ]

  const debtColumns = [
    { key: 'purchaseOrder', label: 'PO #', render: (v) => <span className="font-medium">{v?.poNumber || '—'}</span> },
    { key: 'totalAmount', label: 'Total', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'paidAmount', label: 'Paid', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'remaining', label: 'Remaining', render: (v) => <span className="font-medium text-destructive">{Number(v).toLocaleString()} DZD</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge color={v}>{v}</Badge> },
    { key: 'actions', label: '', className: 'text-right', render: (_, r) => r.status !== 'SETTLED' && (
      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPaymentModal(r); setPaymentAmount('') }}><DollarSign className="h-3.5 w-3.5" /> Pay</Button>
    )}
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/finance/suppliers')} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"><ArrowLeft className="h-5 w-5" /></button>
        <div><h1 className="text-2xl font-bold text-foreground">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground">{[supplier.phone, supplier.address].filter(Boolean).join(' · ') || 'No contact info'}</p>
        </div>
      </div>

      <div className="flex border-b border-border mb-6">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && <Table columns={poColumns} data={supplier.purchaseOrders || []} emptyTitle="No purchase orders" emptyDescription="No POs for this supplier." />}
      {activeTab === 'debt' && <Table columns={debtColumns} data={supplier.debts || []} emptyTitle="No debt" emptyDescription="No outstanding debt to this supplier." />}

      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Record Payment"
        footer={<><Button variant="outline" onClick={() => setPaymentModal(null)}>Cancel</Button><Button onClick={() => payMutation.mutate({ debtId: paymentModal?.id, amount: paymentAmount })} loading={payMutation.isPending} disabled={!paymentAmount}>Record</Button></>}>
        {paymentModal && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Remaining:</span><span className="font-medium text-destructive">{Number(paymentModal.remaining).toLocaleString()} DZD</span></div></div>
            <Input label="Payment Amount (DZD)" type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} autoFocus />
          </div>
        )}
      </Modal>
    </div>
  )
}
