import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Trash2, Pencil } from 'lucide-react'
import ExportButton from '../../components/ExportButton'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'

const categories = ['SUPPLIER_RESTOCK', 'RENT', 'UTILITIES', 'TOOLS_EQUIPMENT', 'PETTY_CASH', 'OTHER']

export default function ExpenseList() {
  const cur = useCurrency()
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [catFilter, setCatFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteItem, setDeleteItem] = useState(null)
  const [editItem, setEditItem] = useState(null) // null = adding a new expense
  const emptyForm = () => ({ category: 'OTHER', description: '', amount: '', paidTo: '', expenseDate: new Date().toISOString().split('T')[0] })
  const [form, setForm] = useState(emptyForm())

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', catFilter, startDate, endDate],
    queryFn: () => api.get('/expenses', { params: { category: catFilter || undefined, startDate: startDate || undefined, endDate: endDate || undefined } }).then(r => r.data)
  })

  const openAdd = () => { setEditItem(null); setForm(emptyForm()); setShowAdd(true) }
  const openEdit = (e) => {
    setEditItem(e)
    setForm({ category: e.category, description: e.description, amount: String(Number(e.amount)), paidTo: e.paidTo || '', expenseDate: new Date(e.expenseDate).toISOString().split('T')[0] })
    setShowAdd(true)
  }
  const closeForm = () => { setShowAdd(false); setEditItem(null) }

  const createMutation = useMutation({
    mutationFn: (d) => editItem ? api.put(`/expenses/${editItem.id}`, d) : api.post('/expenses', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['daily-close-preview'] })
      toast.success(t(editItem ? 'finance.expenses.success_edit' : 'finance.expenses.success_add'))
      closeForm(); setForm(emptyForm())
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setDeleteItem(null); toast.success(t('finance.expenses.success_del')) }
  })

  const columns = [
    { key: 'category', label: t('finance.expenses.col_category'), render: (v) => <Badge>{t(`finance.categories.${v}`, { defaultValue: v.replace('_', ' ') })}</Badge> },
    { key: 'description', label: t('finance.expenses.col_desc'), render: (v) => <span className="font-medium">{v}</span> },
    { key: 'amount', label: t('finance.expenses.col_amount'), render: (v) => <span className="font-medium">{Number(v).toLocaleString()} {cur}</span> },
    { key: 'paidTo', label: t('finance.expenses.col_paid_to'), render: (v) => v || '—' },
    { key: 'expenseDate', label: t('finance.expenses.col_date'), render: (v) => new Date(v).toLocaleDateString() },
    { key: 'createdBy', label: t('finance.expenses.col_by'), render: (v) => v?.name || '—' },
    { key: 'actions', label: '', className: 'text-right', render: (_, r) => isOwner && (
      <div className="flex items-center justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(r) }} title={t('finance.expenses.btn_edit')} className="p-1.5 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteItem(r) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    )}
  ]

  const exportColumns = [
    { header: t('finance.expenses.col_date'), key: 'date', type: 'date' },
    { header: t('finance.expenses.col_category'), key: 'category', width: 20 },
    { header: t('finance.expenses.col_desc'), key: 'description', width: 40 },
    { header: `${t('finance.expenses.col_amount')} (${cur})`, key: 'amount', type: 'money', width: 16 },
    { header: t('finance.expenses.col_paid_to'), key: 'paidTo', width: 20 },
    { header: t('finance.expenses.col_by'), key: 'by', width: 18 }
  ]
  const exportRows = (data?.expenses || []).map(e => ({
    date: e.expenseDate,
    category: t(`finance.categories.${e.category}`, { defaultValue: e.category }),
    description: e.description, amount: e.amount, paidTo: e.paidTo, by: e.createdBy?.name
  }))

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('finance.expenses.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('finance.expenses.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <ExportButton fileName="rakam-expenses" sheetName={t('finance.expenses.title')} columns={exportColumns} rows={exportRows} />
          <Button onClick={openAdd}><Plus className="h-4 w-4" /> {t('finance.expenses.btn_add')}</Button>
        </div>
      </div>

      {/* Monthly total */}
      {data?.monthTotal !== undefined && (
        <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('finance.expenses.total_month')}</span>
          <span className="text-lg font-bold text-foreground">{data.monthTotal.toLocaleString()} {cur}</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">{t('finance.expenses.filter_all')}</option>
          {categories.map(c => <option key={c} value={c}>{t(`finance.categories.${c}`, { defaultValue: c.replace('_', ' ') })}</option>)}
        </select>
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
        <span className="text-sm text-muted-foreground">{t('finance.expenses.lbl_to')}</span>
        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data?.expenses || []} emptyTitle={t('finance.expenses.empty_title')} emptyDescription={t('finance.expenses.empty_desc')} />}

      {/* Add Expense Modal */}
      <Modal open={showAdd} onClose={closeForm} title={t(editItem ? 'finance.expenses.modal_edit_title' : 'finance.expenses.modal_add_title')}
        footer={<><Button variant="outline" onClick={closeForm}>{t('finance.expenses.btn_cancel')}</Button><Button onClick={() => createMutation.mutate({...form, amount: parseFloat(form.amount)})} loading={createMutation.isPending}>{t(editItem ? 'finance.expenses.btn_save' : 'finance.expenses.btn_add_confirm')}</Button></>}>
        <div className="space-y-4">
          <div className="space-y-1.5"><label className="text-sm font-medium text-foreground">{t('finance.expenses.lbl_category')}</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {categories.map(c => <option key={c} value={c}>{t(`finance.categories.${c}`, { defaultValue: c.replace('_', ' ') })}</option>)}
            </select>
          </div>
          <Input label={t('finance.expenses.lbl_desc')} value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
          <Input label={t('finance.expenses.lbl_amount')} type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
          <Input label={t('finance.expenses.lbl_paid_to')} value={form.paidTo} onChange={e => setForm({...form, paidTo: e.target.value})} />
          <Input label={t('finance.expenses.lbl_date')} type="date" value={form.expenseDate} onChange={e => setForm({...form, expenseDate: e.target.value})} />
        </div>
      </Modal>

      <ConfirmModal open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={() => deleteMutation.mutate(deleteItem?.id)}
        title={t('finance.expenses.modal_del_title')} message={t('finance.expenses.modal_del_msg', { desc: deleteItem?.description })} confirmText={t('finance.expenses.btn_delete')} loading={deleteMutation.isPending} />
    </div>
  )
}
