import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BookOpen, Image, Download, Trash2, PencilLine } from 'lucide-react'
import api from '../../lib/api'
import { DEVICE_CATEGORIES } from '../../lib/catalog'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

export default function DeviceCatalogPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()

  // Poll while images are downloading
  const { data: status } = useQuery({
    queryKey: ['catalog-status'],
    queryFn: () => api.get('/catalog/status').then(r => r.data),
    refetchInterval: (q) => (q.state.data?.images?.running ? 1500 : false)
  })

  const { data: custom = [] } = useQuery({
    queryKey: ['catalog-custom'],
    queryFn: async () => {
      const lists = await Promise.all(DEVICE_CATEGORIES.map(c => api.get('/catalog', { params: { category: c } }).then(r => r.data.devices)))
      return lists.flat().filter(d => d.isCustom)
    }
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['catalog-status'] })
    queryClient.invalidateQueries({ queryKey: ['catalog'] })
    queryClient.invalidateQueries({ queryKey: ['catalog-custom'] })
  }

  const download = useMutation({
    mutationFn: () => api.post('/catalog/images/download'),
    onSuccess: () => { toast.success(t('catalog.download_started')); refresh() },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })
  const removeImages = useMutation({
    mutationFn: () => api.delete('/catalog/images'),
    onSuccess: () => { toast.success(t('catalog.images_deleted')); refresh() }
  })
  const removeDevice = useMutation({
    mutationFn: (id) => api.delete(`/catalog/${id}`),
    onSuccess: () => { toast.success(t('catalog.removed')); refresh() },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const img = status?.images
  const missing = img ? img.available - img.downloaded : 0
  const pct = img?.running && img.total ? Math.round((img.done / img.total) * 100) : 0

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('catalog.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('catalog.subtitle')}</p>
      </div>

      <div className="space-y-6">
        <div className="border border-border rounded-md bg-card p-6 flex items-center gap-3">
          <div className="p-2 rounded-sm bg-primary-soft"><BookOpen className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="font-semibold text-foreground">{status ? t('catalog.devices', { phones: status.counts.PHONE, laptops: status.counts.LAPTOP, consoles: status.counts.CONSOLE }) : '…'}</p>
            {status?.custom > 0 && <p className="text-sm text-muted-foreground">{t('catalog.custom_count', { count: status.custom })}</p>}
          </div>
        </div>

        <div className="border border-border rounded-md bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-sm bg-info-soft"><Image className="h-5 w-5 text-info" /></div>
            <div>
              <h3 className="font-semibold text-foreground">{t('catalog.images_title')}</h3>
              <p className="text-sm text-muted-foreground">{t('catalog.images_desc')}</p>
            </div>
          </div>
          {img && (
            <div className="bg-muted rounded-md p-3 mb-4 text-sm space-y-2">
              <p className="text-foreground">{t('catalog.images_status', { downloaded: img.downloaded, available: img.available })}</p>
              {img.running && (
                <>
                  <div className="h-2 rounded bg-background overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
                  <p className="text-muted-foreground">{t('catalog.downloading', { done: img.done, total: img.total })}</p>
                </>
              )}
              {!img.running && img.failed > 0 && <p className="text-warning">{t('catalog.failed_count', { count: img.failed })}</p>}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => download.mutate()} loading={download.isPending || img?.running} disabled={!img || (missing === 0 && !img.running)}>
              <Download className="h-4 w-4" /> {img?.downloaded ? t('catalog.btn_retry') : t('catalog.btn_download')}
            </Button>
            {img?.downloaded > 0 && !img.running && (
              <Button variant="outline" onClick={() => removeImages.mutate()} loading={removeImages.isPending}><Trash2 className="h-4 w-4" /> {t('catalog.btn_delete_images')}</Button>
            )}
          </div>
        </div>

        <div className="border border-border rounded-md bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-sm bg-warning-soft"><PencilLine className="h-5 w-5 text-warning" /></div>
            <h3 className="font-semibold text-foreground">{t('catalog.custom_title')}</h3>
          </div>
          {custom.length === 0
            ? <p className="text-sm text-muted-foreground">{t('catalog.custom_empty')}</p>
            : (
              <ul className="divide-y divide-border text-sm">
                {custom.map(d => (
                  <li key={d.id} className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2"><Badge>{t(`catalog.categories.${d.category}`)}</Badge> {d.brand} {d.model}</span>
                    <button onClick={() => removeDevice.mutate(d.id)} className="p-1.5 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>
    </div>
  )
}
