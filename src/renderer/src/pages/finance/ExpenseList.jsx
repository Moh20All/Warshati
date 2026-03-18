import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2 } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'

const categories = ['SUPPLIER_RESTOCK', 'RENT', 'UTILITIES', 'TOOLS_EQUIPMENT', 'PETTY_CASH', 'OTHER']

export default function ExpenseList() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [catFilter, setCatFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteItem, setDeleteItem] = useState(null)
  const [form, setForm] = useState({ category: 'OTHER', description: '', amount: '', paidTo: '', expenseDate: new Date().toISOString().split('T')[0] })

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', catFilter, startDate, endDate],
    queryFn: () => api.get('/expenses', { params: { category: catFilter || undefined, startDate: startDate || undefined, endDate: endDate || undefined } }).then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/expenses', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setShowAdd(false); setForm({ category: 'OTHER', description: '', amount: '', paidTo: '', expenseDate: new Date().toISOString().split('T')[0] }); toast.success('Expense added') },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setDeleteItem(null); toast.success('Expense deleted') }
  })

  const columns = [
    { key: 'category', label: 'Category', render: (v) => <Badge>{v.replace('_', ' ')}</Badge> },
    { key: 'description', label: 'Description', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'amount', label: 'Amount', render: (v) => <span className="font-medium">{Number(v).toLocaleString()} DZD</span> },
    { key: 'paidTo', label: 'Paid To', render: (v) => v || '—' },
    { key: 'expenseDate', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
    { key: 'createdBy', label: 'By', render: (v) => v?.name || '—' },
    { key: 'actions', label: '', className: 'text-right', render: (_, r) => (
      <button onClick={(e) => { e.stopPropagation(); setDeleteItem(r) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
    )}
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Track shop expenses</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Add Expense</Button>
      </div>

      {/* Monthly total */}
      {data?.monthTotal !== undefined && (
        <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total expenses this month</span>
          <span className="text-lg font-bold text-foreground">{data.monthTotal.toLocaleString()} DZD</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
        <span className="text-sm text-muted-foreground">to</span>
        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data?.expenses || []} emptyTitle="No expenses" emptyDescription="Add your first expense." />}

      {/* Add Expense Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Expense"
        footer={<><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={() => createMutation.mutate({...form, amount: parseFloat(form.amount)})} loading={createMutation.isPending}>Add</Button></>}>
        <div className="space-y-4">
          <div className="space-y-1.5"><label className="text-sm font-medium text-foreground">Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <Input label="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
          <Input label="Amount (DZD)" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
          <Input label="Paid To" value={form.paidTo} onChange={e => setForm({...form, paidTo: e.target.value})} />
          <Input label="Date" type="date" value={form.expenseDate} onChange={e => setForm({...form, expenseDate: e.target.value})} />
        </div>
      </Modal>

      <ConfirmModal open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={() => deleteMutation.mutate(deleteItem?.id)}
        title="Delete Expense" message={`Delete "${deleteItem?.description}"?`} confirmText="Delete" loading={deleteMutation.isPending} />
    </div>
  )
}
