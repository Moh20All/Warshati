import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Phone, Mail, User } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'

export default function Customers() {
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
      toast.success('Customer created')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create customer')
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const columns = [
    {
      key: 'name', label: 'Name', sortable: true,
      render: (val, row) => (
        <div>
          <p className="font-medium text-foreground">{val}</p>
          <p className="text-xs text-muted-foreground">{row.phone}</p>
        </div>
      )
    },
    { key: 'email', label: 'Email', render: (val) => val || '—' },
    {
      key: '_count', label: 'Repairs',
      render: (val) => <span className="text-sm">{val?.repairTickets || 0}</span>
    },
    {
      key: '_count', label: 'Sales',
      render: (val) => <span className="text-sm">{val?.sales || 0}</span>
    },
    {
      key: '_count', label: 'Debt',
      render: (val) => val?.debtLedger > 0
        ? <Badge color="warning" dot>{val.debtLedger} open</Badge>
        : <span className="text-sm text-muted-foreground">None</span>
    }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your customer base</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> New Customer
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search by name, phone, or email..."
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
      ) : (
        <Table
          columns={columns}
          data={data || []}
          emptyTitle="No customers"
          emptyDescription="Add your first customer to get started."
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
        />
      )}

      {/* Add Customer Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="New Customer"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>Create</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} icon={User} required />
          <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} icon={Phone} required />
          <Input label="Email (optional)" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} icon={Mail} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              placeholder="Optional notes..."
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
