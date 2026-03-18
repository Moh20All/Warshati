import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Phone, Mail, StickyNote, Wrench, ShoppingCart, CreditCard, ArrowLeftRight } from 'lucide-react'
import api from '../../lib/api'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Table from '../../components/ui/Table'

const tabs = [
  { key: 'repairs', label: 'Repairs', icon: Wrench },
  { key: 'sales', label: 'Sales', icon: ShoppingCart },
  { key: 'debt', label: 'Debt', icon: CreditCard },
  { key: 'tradeins', label: 'Trade-Ins', icon: ArrowLeftRight }
]

export default function CustomerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('repairs')

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/customers/${id}`).then(r => r.data.customer)
  })

  if (isLoading) return <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
  if (!customer) return <div className="text-center py-12 text-sm text-destructive">Customer not found</div>

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/customers')} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer.phone}</span>
            {customer.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{customer.email}</span>}
          </div>
        </div>
      </div>

      {customer.notes && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
          <StickyNote className="h-4 w-4 mt-0.5 shrink-0" />
          {customer.notes}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'repairs' && <RepairsTab tickets={customer.repairTickets || []} />}
      {activeTab === 'sales' && <SalesTab sales={customer.sales || []} />}
      {activeTab === 'debt' && <DebtTab debts={customer.debtLedger || []} />}
      {activeTab === 'tradeins' && <TradeInsTab tradeIns={customer.tradeIns || []} />}
    </div>
  )
}

function RepairsTab({ tickets }) {
  const columns = [
    { key: 'ticketNumber', label: 'Ticket #' },
    { key: 'deviceBrand', label: 'Device', render: (v, r) => `${v} ${r.deviceModel}` },
    { key: 'status', label: 'Status', render: (v) => <Badge color={v}>{v.replace('_', ' ')}</Badge> },
    { key: 'priority', label: 'Priority', render: (v) => <Badge color={v}>{v}</Badge> },
    { key: 'finalCost', label: 'Cost', render: (v) => v ? `${Number(v).toLocaleString()} DZD` : '—' },
    { key: 'receivedAt', label: 'Date', render: (v) => new Date(v).toLocaleDateString() }
  ]
  return <Table columns={columns} data={tickets} emptyTitle="No repairs" emptyDescription="No repair tickets for this customer yet." />
}

function SalesTab({ sales }) {
  const columns = [
    { key: 'saleNumber', label: 'Invoice #' },
    { key: 'status', label: 'Status', render: (v) => <Badge color={v === 'COMPLETED' ? 'success' : v === 'CREDIT' ? 'warning' : 'danger'}>{v}</Badge> },
    { key: 'total', label: 'Total', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'paymentMethod', label: 'Payment', render: (v) => <Badge>{v}</Badge> },
    { key: 'createdAt', label: 'Date', render: (v) => new Date(v).toLocaleDateString() }
  ]
  return <Table columns={columns} data={sales} emptyTitle="No sales" emptyDescription="No sales for this customer yet." />
}

function DebtTab({ debts }) {
  const columns = [
    { key: 'type', label: 'Type', render: (v) => <Badge>{v.replace('_', ' ')}</Badge> },
    { key: 'totalAmount', label: 'Total', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'paidAmount', label: 'Paid', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'remaining', label: 'Remaining', render: (v) => <span className="font-medium text-destructive">{Number(v).toLocaleString()} DZD</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge color={v}>{v}</Badge> },
    { key: 'createdAt', label: 'Date', render: (v) => new Date(v).toLocaleDateString() }
  ]
  return <Table columns={columns} data={debts} emptyTitle="No debt" emptyDescription="This customer has no outstanding debt." />
}

function TradeInsTab({ tradeIns }) {
  const columns = [
    { key: 'brand', label: 'Device', render: (v, r) => `${v} ${r.model}` },
    { key: 'condition', label: 'Condition', render: (v) => v ? <Badge>{v}</Badge> : '—' },
    { key: 'appraisedValue', label: 'Value', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'status', label: 'Status', render: (v) => <Badge color={v === 'ACCEPTED' ? 'success' : v === 'REJECTED' ? 'danger' : 'info'}>{v}</Badge> },
    { key: 'createdAt', label: 'Date', render: (v) => new Date(v).toLocaleDateString() }
  ]
  return <Table columns={columns} data={tradeIns} emptyTitle="No trade-ins" emptyDescription="No trade-ins from this customer yet." />
}
