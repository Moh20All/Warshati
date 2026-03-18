import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Package, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'PHONE_NEW', label: 'New Phone' },
  { value: 'PHONE_USED', label: 'Used Phone' },
  { value: 'PART', label: 'Part' },
  { value: 'ACCESSORY', label: 'Accessory' }
]

const emptyForm = { type: 'PART', name: '', sku: '', barcode: '', imei: '', brand: '', model: '', color: '', storage: '', quantity: 0, buyPrice: '', sellPrice: '', lowStockAt: 3 }

export default function InventoryList() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, typeFilter],
    queryFn: () => api.get('/inventory', { params: { search: search || undefined, type: typeFilter || undefined } }).then(r => r.data.items)
  })

  const saveMutation = useMutation({
    mutationFn: (d) => editItem ? api.put(`/inventory/${editItem.id}`, d) : api.post('/inventory', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      if (res.data.isLowStock) toast.warning(`"${res.data.item.name}" is low on stock!`)
      else toast.success(editItem ? 'Item updated' : 'Item created')
      closeForm()
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save item')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setDeleteItem(null)
      toast.success('Item deactivated')
    }
  })

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      type: item.type, name: item.name, sku: item.sku || '', barcode: item.barcode || '',
      imei: item.imei || '', brand: item.brand || '', model: item.model || '',
      color: item.color || '', storage: item.storage || '', quantity: item.quantity,
      buyPrice: item.buyPrice, sellPrice: item.sellPrice, lowStockAt: item.lowStockAt
    })
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditItem(null); setForm({ ...emptyForm }) }

  const handleSave = (e) => {
    e.preventDefault()
    saveMutation.mutate({
      ...form,
      buyPrice: parseFloat(form.buyPrice),
      sellPrice: parseFloat(form.sellPrice),
      quantity: parseInt(form.quantity),
      lowStockAt: parseInt(form.lowStockAt)
    })
  }

  const isPhone = form.type === 'PHONE_NEW' || form.type === 'PHONE_USED'

  const columns = [
    {
      key: 'name', label: 'Item', sortable: true,
      render: (v, r) => (
        <div>
          <p className="font-medium text-foreground">{v}</p>
          <p className="text-xs text-muted-foreground">{r.brand} {r.model}</p>
        </div>
      )
    },
    { key: 'type', label: 'Type', render: (v) => <Badge>{v.replace('_', ' ')}</Badge> },
    { key: 'sku', label: 'SKU', render: (v) => v || '—' },
    {
      key: 'quantity', label: 'Stock',
      render: (v, r) => (
        <div className="flex items-center gap-2">
          <span className={v <= r.lowStockAt ? 'text-destructive font-medium' : ''}>{v}</span>
          {v <= r.lowStockAt && <Badge color="danger">Low Stock</Badge>}
        </div>
      )
    },
    { key: 'buyPrice', label: 'Buy Price', render: (v) => `${Number(v).toLocaleString()} DZD` },
    { key: 'sellPrice', label: 'Sell Price', render: (v) => `${Number(v).toLocaleString()} DZD` },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(r) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteItem(r) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      )
    }
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage stock, parts, and accessories</p>
        </div>
        <Button onClick={() => { setEditItem(null); setForm({...emptyForm}); setShowForm(true) }}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="max-w-sm flex-1">
          <Input placeholder="Search by name, SKU, barcode, IMEI..." icon={Search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
      ) : (
        <Table columns={columns} data={data || []} emptyTitle="No inventory items" emptyDescription="Add your first item to get started." />
      )}

      {/* Add/Edit Modal */}
      <Modal open={showForm} onClose={closeForm} title={editItem ? 'Edit Item' : 'Add Item'} size="lg"
        footer={<><Button variant="outline" onClick={closeForm}>Cancel</Button><Button onClick={handleSave} loading={saveMutation.isPending}>{editItem ? 'Save' : 'Create'}</Button></>}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="PHONE_NEW">New Phone</option>
                <option value="PHONE_USED">Used Phone</option>
                <option value="PART">Part</option>
                <option value="ACCESSORY">Accessory</option>
              </select>
            </div>
            <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Brand" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
            <Input label="Model" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
            <Input label="Color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="SKU" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
            <Input label="Barcode" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
            {isPhone && <Input label="IMEI" value={form.imei} onChange={e => setForm({...form, imei: e.target.value})} />}
            {isPhone && <Input label="Storage" value={form.storage} onChange={e => setForm({...form, storage: e.target.value})} />}
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Input label="Quantity" type="number" value={isPhone && form.imei ? 1 : form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} disabled={isPhone && !!form.imei} />
            <Input label="Buy Price (DZD)" type="number" value={form.buyPrice} onChange={e => setForm({...form, buyPrice: e.target.value})} required />
            <Input label="Sell Price (DZD)" type="number" value={form.sellPrice} onChange={e => setForm({...form, sellPrice: e.target.value})} required />
            <Input label="Low Stock At" type="number" value={form.lowStockAt} onChange={e => setForm({...form, lowStockAt: e.target.value})} />
          </div>
        </form>
      </Modal>

      <ConfirmModal open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={() => deleteMutation.mutate(deleteItem?.id)}
        title="Deactivate Item" message={`Deactivate "${deleteItem?.name}"? It won't appear in searches.`} confirmText="Deactivate" loading={deleteMutation.isPending} />
    </div>
  )
}
