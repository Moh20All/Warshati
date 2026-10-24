import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Phone, Mail, StickyNote, Wrench, ShoppingCart, CreditCard, ArrowLeftRight } from 'lucide-react'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Table from '../../components/ui/Table'

export default function CustomerProfile() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('repairs')

  const tabs = [
    { key: 'repairs', label: t('customers.tabs.repairs'), icon: Wrench },
    { key: 'sales', label: t('customers.tabs.sales'), icon: ShoppingCart },
    { key: 'debt', label: t('customers.tabs.debt'), icon: CreditCard },
    { key: 'tradeins', label: t('customers.tabs.tradeins'), icon: ArrowLeftRight }
  ]

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/customers/${id}`).then(r => r.data.customer)
  })

  if (isLoading) return <div className="text-center py-12 text-sm text-muted-foreground">{t('customers.loading')}</div>
  if (!customer) return <div className="text-center py-12 text-sm text-destructive">{t('customers.not_found')}</div>

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/customers')} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{customer.name}</h1>
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
      {activeTab === 'repairs' && <RepairsTab tickets={customer.repairTickets || []} t={t} />}
      {activeTab === 'sales' && <SalesTab sales={customer.sales || []} t={t} />}
      {activeTab === 'debt' && <DebtTab debts={customer.debtLedger || []} t={t} />}
      {activeTab === 'tradeins' && <TradeInsTab tradeIns={customer.tradeIns || []} t={t} />}
    </div>
  )
}

function RepairsTab({ tickets, t }) {
  const cur = useCurrency()
  const columns = [
    { key: 'ticketNumber', label: t('customers.columns.ticket_num') },
    { key: 'deviceBrand', label: t('customers.columns.device'), render: (v, r) => `${v} ${r.deviceModel}` },
    { key: 'status', label: t('customers.columns.status'), render: (v) => <Badge color={v}>{v.replace('_', ' ')}</Badge> },
    { key: 'priority', label: t('customers.columns.priority'), render: (v) => <Badge color={v}>{v}</Badge> },
    { key: 'finalCost', label: t('customers.columns.cost'), render: (v) => v ? `${Number(v).toLocaleString()} ${cur}` : '—' },
    { key: 'receivedAt', label: t('customers.columns.date'), render: (v) => new Date(v).toLocaleDateString() }
  ]
  return <Table columns={columns} data={tickets} emptyTitle={t('customers.empty.repairs_title')} emptyDescription={t('customers.empty.repairs_desc')} />
}

function SalesTab({ sales, t }) {
  const cur = useCurrency()
  const columns = [
    { key: 'saleNumber', label: t('customers.columns.invoice_num') },
    { key: 'status', label: t('customers.columns.status'), render: (v) => <Badge color={v === 'COMPLETED' ? 'success' : v === 'CREDIT' ? 'warning' : 'danger'}>{v}</Badge> },
    { key: 'total', label: t('customers.columns.total'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'paymentMethod', label: t('customers.columns.payment'), render: (v) => <Badge>{v}</Badge> },
    { key: 'createdAt', label: t('customers.columns.date'), render: (v) => new Date(v).toLocaleDateString() }
  ]
  return <Table columns={columns} data={sales} emptyTitle={t('customers.empty.sales_title')} emptyDescription={t('customers.empty.sales_desc')} />
}

function DebtTab({ debts, t }) {
  const cur = useCurrency()
  const columns = [
    { key: 'type', label: t('customers.columns.type'), render: (v) => <Badge>{v.replace('_', ' ')}</Badge> },
    { key: 'totalAmount', label: t('customers.columns.total'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'paidAmount', label: t('customers.columns.paid'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'remaining', label: t('customers.columns.remaining'), render: (v) => <span className="font-medium text-destructive">{Number(v).toLocaleString()} {cur}</span> },
    { key: 'status', label: t('customers.columns.status'), render: (v) => <Badge color={v}>{v}</Badge> },
    { key: 'createdAt', label: t('customers.columns.date'), render: (v) => new Date(v).toLocaleDateString() }
  ]
  return <Table columns={columns} data={debts} emptyTitle={t('customers.empty.debt_title')} emptyDescription={t('customers.empty.debt_desc')} />
}

function TradeInsTab({ tradeIns, t }) {
  const cur = useCurrency()
  const columns = [
    { key: 'brand', label: t('customers.columns.device'), render: (v, r) => `${v} ${r.model}` },
    { key: 'condition', label: t('customers.columns.condition'), render: (v) => v ? <Badge>{v}</Badge> : '—' },
    { key: 'appraisedValue', label: t('customers.columns.value'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    { key: 'status', label: t('customers.columns.status'), render: (v) => <Badge color={v === 'ACCEPTED' ? 'success' : v === 'REJECTED' ? 'danger' : 'info'}>{v}</Badge> },
    { key: 'createdAt', label: t('customers.columns.date'), render: (v) => new Date(v).toLocaleDateString() }
  ]
  return <Table columns={columns} data={tradeIns} emptyTitle={t('customers.empty.tradeins_title')} emptyDescription={t('customers.empty.tradeins_desc')} />
}
