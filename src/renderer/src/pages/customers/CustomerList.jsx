import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Phone, Mail, User } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { ImportButton } from '../../components/ImportModal'
import { useAuth } from '../../lib/auth'

export default function Customers() {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [formLoading, setFormLoading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => api.get('/customers', { params: { search: search || undefined } }).then(r => r.data.customers)
  })

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/customers', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setShowAdd(false)
      setForm({ name: '', phone: '', email: '', notes: '' })
      toast.success(t('customers.created'))
    },
    onError: (err) => toast.error(err.response?.data?.error || t('customers.create_failed'))
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const columns = [
    {
      key: 'name', label: t('customers.columns.name'), sortable: true,
      render: (val, row) => (
        <div>
          <p className="font-medium text-foreground">{val}</p>
          <p className="text-xs text-muted-foreground"><bdi dir="ltr">{row.phone}</bdi></p>
        </div>
      )
    },
    { key: 'email', label: t('customers.columns.email'), render: (val) => val || '—' },
    {
      key: '_count', label: t('customers.columns.repairs'),
      render: (val) => <span className="text-sm">{val?.repairTickets || 0}</span>
    },
    {
      key: '_count', label: t('customers.columns.sales'),
      render: (val) => <span className="text-sm">{val?.sales || 0}</span>
    },
    {
      key: '_count', label: t('customers.columns.debt'),
      render: (val) => val?.debtLedger > 0
        ? <Badge color="warning" dot>{val.debtLedger} {t('customers.labels.open')}</Badge>
        : <span className="text-sm text-muted-foreground">{t('customers.labels.none')}</span>
    }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('customers.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('customers.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {isOwner && <ImportButton kind="customers" />}
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> {t('customers.new_customer')}
          </Button>
        </div>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder={t('customers.search_placeholder')}
          icon={Search} data-search
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">{t('customers.loading')}</div>
      ) : (
        <Table
          columns={columns}
          data={data || []}
          emptyTitle={t('customers.empty.customers_title')}
          emptyDescription={t('customers.empty.customers_desc')}
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
        />
      )}

      {/* Add Customer Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={t('customers.modal.title')}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAdd(false)}>{t('customers.modal.cancel')}</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>{t('customers.modal.create')}</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label={t('customers.modal.name')} value={form.name} onChange={e => setForm({...form, name: e.target.value})} icon={User} required />
          <Input label={t('customers.modal.phone')} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} icon={Phone} required />
          <Input label={t('customers.modal.email_opt')} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} icon={Mail} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('customers.modal.notes')}</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              className="flex min-h-[60px] w-full rounded-sm border border-input bg-popover px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              placeholder={t('customers.modal.notes_placeholder')}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
