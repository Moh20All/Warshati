import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Package, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import { useAuth } from '../../lib/auth'
import ExportButton from '../../components/ExportButton'
import DevicePicker from '../../components/DevicePicker'
import { storageText } from '../../lib/catalog'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Modal, { ConfirmModal } from '../../components/ui/Modal'

const emptyForm = { type: 'PART', name: '', sku: '', barcode: '', deviceCategory: 'PHONE', brand: '', model: '', color: '', storage: '', quantity: 0, buyPrice: '', sellPrice: '', lowStockAt: 3, warrantyDays: 0, recordExpense: true }

export default function InventoryList() {
  const cur = useCurrency()
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })

  // Restock states
  const [restockItem, setRestockItem] = useState(null)
  const [restockAmount, setRestockAmount] = useState('')
  const [restockCost, setRestockCost] = useState('')
  const [updateBuyPrice, setUpdateBuyPrice] = useState(false)

  const typeOptions = [
    { value: '', label: t('inventory.types.all') },
    { value: 'PHONE_NEW', label: t('inventory.types.phone_new') },
    { value: 'PHONE_USED', label: t('inventory.types.phone_used') },
    { value: 'PART', label: t('inventory.types.part') },
    { value: 'ACCESSORY', label: t('inventory.types.accessory') }
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, typeFilter],
    queryFn: () => api.get('/inventory', { params: { search: search || undefined, type: typeFilter || undefined } }).then(r => r.data.items)
  })

  const saveMutation = useMutation({
    mutationFn: (d) => editItem ? api.put(`/inventory/${editItem.id}`, d) : api.post('/inventory', d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['catalog'] }) // a hand-typed device may have been remembered
      if (res.data.isLowStock) toast.warning(t('inventory.toasts.low_stock', { name: res.data.item.name }))
      else toast.success(editItem ? t('inventory.toasts.updated') : t('inventory.toasts.created'))
      closeForm()
    },
    onError: (err) => toast.error(err.response?.data?.error || t('inventory.toasts.save_failed'))
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setDeleteItem(null)
      toast.success(t('inventory.toasts.deactivated'))
    }
  })

  const restockMutation = useMutation({
    mutationFn: (d) => api.post(`/inventory/${restockItem.id}/restock`, d),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setRestockItem(null)
      toast.success(t('inventory.toasts.restocked', 'Successfully restocked and expense logged!'))
      if (res.data.isLowStock) toast.warning(t('inventory.toasts.low_stock', { name: res.data.item.name }))
    },
    onError: (err) => toast.error(err.response?.data?.error || t('inventory.toasts.save_failed'))
  })

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      type: item.type, name: item.name, sku: item.sku || '', barcode: item.barcode || '',
      deviceCategory: 'PHONE', brand: item.brand || '', model: item.model || '',
      color: item.color || '', storage: item.storage || '', quantity: item.quantity,
      buyPrice: item.buyPrice, sellPrice: item.sellPrice, lowStockAt: item.lowStockAt,
      warrantyDays: item.warrantyDays || 0
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
      lowStockAt: parseInt(form.lowStockAt),
      warrantyDays: parseInt(form.warrantyDays || 0)
    })
  }

  const isPhone = form.type === 'PHONE_NEW' || form.type === 'PHONE_USED'

  const columns = [
    {
      key: 'name', label: t('inventory.columns.item'), sortable: true,
      render: (v, r) => (
        <div>
          <p className="font-medium text-foreground">{v}</p>
          <p className="text-xs text-muted-foreground">{r.brand} {r.model}</p>
        </div>
      )
    },
    { key: 'type', label: t('inventory.columns.type'), render: (v) => <Badge>{v.replace('_', ' ')}</Badge> },
    { key: 'sku', label: t('inventory.columns.sku'), render: (v) => v || '—' },
    {
      key: 'quantity', label: t('inventory.columns.stock'),
      render: (v, r) => (
        <div className="flex items-center gap-2">
          <span className={v <= r.lowStockAt ? 'text-destructive font-medium' : ''}>{v}</span>
          {v <= r.lowStockAt && <Badge color="danger">{t('inventory.labels.low_stock')}</Badge>}
        </div>
      )
    },
    // Buy price (the shop's margin) and stock management are owner-only
    ...(isOwner ? [{ key: 'buyPrice', label: t('inventory.columns.buy_price'), render: (v) => `${Number(v).toLocaleString()} ${cur}` }] : []),
    { key: 'sellPrice', label: t('inventory.columns.sell_price'), render: (v) => `${Number(v).toLocaleString()} ${cur}` },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (_, r) => isOwner && (
        <div className="flex items-center justify-end gap-1">
          {!r.imei && (
            <button onClick={(e) => { e.stopPropagation(); setRestockItem(r); setRestockAmount(''); setRestockCost(r.buyPrice); setUpdateBuyPrice(false) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer" title={t('inventory.restock.title', 'Quick Restock')}><Package className="h-3.5 w-3.5" /></button>
          )}
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
          <h1 className="text-2xl font-bold text-foreground">{t('inventory.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('inventory.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <ExportButton fileName="rakam-inventory" sheetName={t('inventory.title')} rows={(data || []).map(i => ({ ...i, type: i.type.replace('_', ' ') }))} columns={[
            { header: t('inventory.columns.item'), key: 'name', width: 30 },
            { header: t('inventory.columns.type'), key: 'type', width: 14 },
            { header: t('inventory.modal.brand'), key: 'brand', width: 14 },
            { header: t('inventory.modal.model'), key: 'model', width: 16 },
            { header: t('inventory.columns.sku'), key: 'sku', width: 14 },
            { header: t('inventory.modal.barcode'), key: 'barcode', width: 16 },
            { header: t('inventory.modal.imei'), key: 'imei', width: 18 },
            { header: t('inventory.columns.stock'), key: 'quantity', type: 'number' },
            // Buy price is the shop's margin: owner only, like the table
            ...(isOwner ? [{ header: `${t('inventory.columns.buy_price')} (${cur})`, key: 'buyPrice', type: 'money', width: 16 }] : []),
            { header: `${t('inventory.columns.sell_price')} (${cur})`, key: 'sellPrice', type: 'money', width: 16 }
          ]} />
          {isOwner && (
            <Button onClick={() => { setEditItem(null); setForm({...emptyForm}); setShowForm(true) }}>
              <Plus className="h-4 w-4" /> {t('inventory.add_item')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="max-w-sm flex-1">
          <Input placeholder={t('inventory.search_placeholder')} icon={Search} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">{t('inventory.loading')}</div>
      ) : (
        <Table columns={columns} data={data || []} emptyTitle={t('inventory.empty.title')} emptyDescription={t('inventory.empty.desc')} />
      )}

      {/* Add/Edit Modal */}
      <Modal open={showForm} onClose={closeForm} title={editItem ? t('inventory.modal.title_edit') : t('inventory.modal.title_add')} size="lg"
        footer={<><Button variant="outline" onClick={closeForm}>{t('inventory.modal.cancel')}</Button><Button onClick={handleSave} loading={saveMutation.isPending}>{editItem ? t('inventory.modal.save') : t('inventory.modal.create')}</Button></>}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t('inventory.modal.type')}</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="PHONE_NEW">{t('inventory.types.phone_new')}</option>
                <option value="PHONE_USED">{t('inventory.types.phone_used')}</option>
                <option value="PART">{t('inventory.types.part')}</option>
                <option value="ACCESSORY">{t('inventory.types.accessory')}</option>
              </select>
            </div>
            <Input label={t('inventory.modal.name')} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          {/* Phones come from the phone catalog; parts/accessories can name the device they fit */}
          <DevicePicker categories={isPhone ? ['PHONE'] : undefined}
            value={{ category: isPhone ? 'PHONE' : form.deviceCategory, brand: form.brand, model: form.model }}
            onChange={(v, device) => setForm({
              ...form, deviceCategory: v.category, brand: v.brand, model: v.model,
              ...(device && !form.name ? { name: `${device.brand} ${device.model}` } : {}),
              ...(device && isPhone && storageText(device) ? { storage: storageText(device) } : {})
            })} />
          <Input label={t('inventory.modal.color')} value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('inventory.modal.sku')} value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
            <Input label={t('inventory.modal.barcode')} value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
            {isPhone && <Input label={t('inventory.modal.storage')} value={form.storage} onChange={e => setForm({...form, storage: e.target.value})} className="col-span-2" />}
          </div>
          <div className="grid grid-cols-5 gap-4">
            <Input label={t('inventory.modal.quantity')} type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
            <Input label={t('inventory.modal.buy_price')} type="number" value={form.buyPrice} onChange={e => setForm({...form, buyPrice: e.target.value})} required />
            <Input label={t('inventory.modal.sell_price')} type="number" value={form.sellPrice} onChange={e => setForm({...form, sellPrice: e.target.value})} required />
            <Input label={t('inventory.modal.low_stock_at')} type="number" value={form.lowStockAt} onChange={e => setForm({...form, lowStockAt: e.target.value})} />
            <Input label={t('inventory.modal.warranty_days', 'Warranty (Days)')} type="number" value={form.warrantyDays} onChange={e => setForm({...form, warrantyDays: e.target.value})} />
          </div>
          {!editItem && parseInt(form.quantity) > 0 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.recordExpense} onChange={e => setForm({...form, recordExpense: e.target.checked})} className="rounded border-input text-primary focus:ring-primary" />
              {t('inventory.modal.record_expense')}
            </label>
          )}
        </form>
      </Modal>

      <ConfirmModal open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={() => deleteMutation.mutate(deleteItem?.id)}
        title={t('inventory.deactivate.title')} message={t('inventory.deactivate.message', { name: deleteItem?.name })} confirmText={t('inventory.deactivate.confirm')} loading={deleteMutation.isPending} />

      {/* Restock Modal */}
      <Modal open={!!restockItem} onClose={() => setRestockItem(null)} title={t('inventory.restock.title', 'Quick Restock')}
        footer={<><Button variant="outline" onClick={() => setRestockItem(null)}>{t('inventory.modal.cancel')}</Button><Button onClick={() => restockMutation.mutate({ addQuantity: parseInt(restockAmount), unitCost: parseFloat(restockCost), updateBuyPrice })} loading={restockMutation.isPending}>{t('inventory.restock.confirm', 'Confirm Restock')}</Button></>}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('inventory.restock.desc', 'Adding new stock will automatically generate an Expense in the financial ledger.')}</p>
          <div className="p-3 bg-muted rounded-md font-medium text-foreground">{restockItem?.name} {restockItem?.brand ? `(${restockItem.brand} ${restockItem.model})` : ''}</div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('inventory.restock.quantity', 'Quantity to Add')} type="number" min="1" value={restockAmount} onChange={e => setRestockAmount(e.target.value)} autoFocus />
            <Input label={t('inventory.restock.unit_cost')} type="number" value={restockCost} onChange={e => setRestockCost(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm mt-4 cursor-pointer">
            <input type="checkbox" checked={updateBuyPrice} onChange={e => setUpdateBuyPrice(e.target.checked)} className="rounded border-input text-primary focus:ring-primary" />
            {t('inventory.restock.update_price', 'Update the global Buy Price to match this new unit cost')}
          </label>
        </div>
      </Modal>
    </div>
  )
}
