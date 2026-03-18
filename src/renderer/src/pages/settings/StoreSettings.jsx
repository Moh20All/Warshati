import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Store, Save } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function StoreSettings() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', phone: '', address: '', currency: 'DZD', warrantyDays: 30 })

  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then(r => r.data.store)
  })

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name || '', phone: store.phone || '',
        address: store.address || '', currency: store.currency || 'DZD',
        warrantyDays: store.warrantyDays || 30
      })
    }
  }, [store])

  const saveMutation = useMutation({
    mutationFn: (d) => api.put('/store', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] })
      toast.success('Store settings saved')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save')
  })

  const handleSave = () => {
    saveMutation.mutate({
      ...form,
      warrantyDays: parseInt(form.warrantyDays)
    })
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Store Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your store information</p>
        </div>
        <Button onClick={handleSave} loading={saveMutation.isPending}><Save className="h-4 w-4" /> Save Changes</Button>
      </div>

      <div className="border border-border rounded-lg bg-card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary text-primary-foreground font-bold text-lg">R</div>
          <div><p className="font-semibold text-foreground">Rakam — رقم</p><p className="text-xs text-muted-foreground">Phone Repair & Store Management</p></div>
        </div>

        <Input label="Store Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        <Input label="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Currency</label>
            <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="DZD">DZD (Algerian Dinar)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="SAR">SAR (Saudi Riyal)</option>
              <option value="MAD">MAD (Moroccan Dirham)</option>
              <option value="TND">TND (Tunisian Dinar)</option>
            </select>
          </div>
          <Input label="Default Warranty (days)" type="number" value={form.warrantyDays} onChange={e => setForm({...form, warrantyDays: e.target.value})} />
        </div>
      </div>
    </div>
  )
}
