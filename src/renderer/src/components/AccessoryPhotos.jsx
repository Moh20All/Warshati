import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Headphones, Search, Check } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import { useCurrency } from '../lib/currency'
import { ACCESSORY_CATEGORIES, useAccessories } from '../lib/catalog'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import { useToast } from './ui/Toast'

const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export const useAccessoryStatus = (options = {}) => useQuery({
  queryKey: ['accessory-status'],
  queryFn: () => api.get('/catalog/accessories/status').then(r => r.data),
  ...options
})

/** Starts downloading accessory photos: ids = only these, none = all. */
export async function downloadAccessoryPhotos(ids) {
  return api.post('/catalog/accessories/images/download', ids ? { ids } : {})
}

/** Pick which accessories to download photos for (search, category, select all shown). */
export function AccessoryChooser({ open, onClose, onStarted }) {
  const { t } = useTranslation()
  const cur = useCurrency()
  const toast = useToast()
  const { data: accessories = [] } = useAccessories(open)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [chosen, setChosen] = useState(() => new Set())
  const [busy, setBusy] = useState(false)

  const counts = useMemo(() => {
    const c = {}
    accessories.forEach(a => { c[a.category] = (c[a.category] || 0) + 1 })
    return c
  }, [accessories])
  const shown = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    return accessories.filter(a => (!category || a.category === category) && words.every(w => normalize(a.name).includes(w)))
  }, [accessories, query, category])
  const selectable = shown.filter(a => !a.imageFile)
  const allShownChosen = selectable.length > 0 && selectable.every(a => chosen.has(a.id))

  const toggle = (id) => setChosen(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const toggleShown = () => setChosen(prev => {
    const next = new Set(prev)
    selectable.forEach(a => (allShownChosen ? next.delete(a.id) : next.add(a.id)))
    return next
  })

  const start = async () => {
    setBusy(true)
    try {
      await downloadAccessoryPhotos([...chosen])
      toast.success(t('accessories.download_started'))
      setChosen(new Set())
      onStarted?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || t('accessories.download_failed'))
    }
    setBusy(false)
  }

  const chip = (value, label, count) => (
    <button key={value || 'all'} type="button" onClick={() => setCategory(value)}
      className={`h-7 px-3 rounded-full text-xs cursor-pointer border ${category === value ? 'bg-primary text-primary-foreground border-primary font-semibold' : 'border-border text-muted-foreground hover:text-foreground'}`}>
      {label} <span className="opacity-70">{count}</span>
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} title={t('accessories.choose_title')} size="lg"
      footer={<>
        <span className="me-auto text-sm text-muted-foreground">{t('accessories.chosen_count', { count: chosen.size })}</span>
        <Button variant="outline" onClick={onClose}>{t('inventory.modal.cancel')}</Button>
        <Button onClick={start} loading={busy} disabled={chosen.size === 0}>{t('accessories.download_chosen', { count: chosen.size })}</Button>
      </>}>
      <div className="space-y-3">
        <Input placeholder={t('accessories.search_ph')} icon={Search} value={query} onChange={e => setQuery(e.target.value)} autoFocus />
        <div className="flex flex-wrap gap-1.5">
          {chip('', t('accessories.all'), accessories.length)}
          {ACCESSORY_CATEGORIES.filter(c => counts[c]).map(c => chip(c, t(`accessories.categories.${c}`), counts[c]))}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('accessories.shown_count', { count: shown.length })}</span>
          <button type="button" onClick={toggleShown} disabled={!selectable.length} className="text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-default">
            {allShownChosen ? t('accessories.unselect_shown') : t('accessories.select_shown')}
          </button>
        </div>
        <ul className="max-h-[46vh] overflow-auto border border-border rounded-md divide-y divide-border">
          {shown.map(a => (
            <li key={a.id}>
              <label className={`flex items-center gap-3 px-3 py-2 text-[13px] ${a.imageFile ? 'opacity-60' : 'cursor-pointer hover:bg-accent'}`}>
                {a.imageFile
                  ? <Check className="h-4 w-4 text-success shrink-0" aria-label={t('accessories.has_photo')} />
                  : <input type="checkbox" checked={chosen.has(a.id)} onChange={() => toggle(a.id)} className="rounded border-input text-primary focus:ring-primary shrink-0" />}
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-foreground">{a.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{t(`accessories.categories.${a.category}`)}{a.imageFile ? ` · ${t('accessories.has_photo')}` : ''}</span>
                </span>
                {a.price != null && <span className="text-muted-foreground whitespace-nowrap">{a.price.toLocaleString()} {cur}</span>}
              </label>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t('catalog.no_results')}</li>}
        </ul>
      </div>
    </Modal>
  )
}

/**
 * Asks the owner once whether to download the accessory photos: all of them, a choice, or later.
 * Waits until the device photo question is answered, so the two never show at the same time.
 */
export default function AccessoryPhotosPrompt() {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [choosing, setChoosing] = useState(false)

  const { data: deviceStatus } = useQuery({ queryKey: ['catalog-status'], queryFn: () => api.get('/catalog/status').then(r => r.data), enabled: isOwner })
  const { data: status } = useAccessoryStatus({ enabled: isOwner })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['accessory-status'] })

  const open = isOwner && !dismissed && !choosing && deviceStatus && deviceStatus.imagesConsent !== null
    && status && status.imagesConsent === null && status.images.available > 0

  const answer = async (accept) => {
    setBusy(true)
    try {
      if (accept) { await downloadAccessoryPhotos(); toast.success(t('accessories.download_started')) }
      else await api.post('/catalog/accessories/images/decline')
    } catch (e) { /* the Settings page offers it again */ }
    setBusy(false)
    setDismissed(true)
    refresh()
  }
  // Closing the chooser without downloading counts as "later"
  const closeChooser = async () => {
    setChoosing(false)
    setDismissed(true)
    const s = (await api.get('/catalog/accessories/status').catch(() => null))?.data
    if (s?.imagesConsent === null) await api.post('/catalog/accessories/images/decline').catch(() => {})
    refresh()
  }

  return (
    <>
      <Modal open={!!open} onClose={() => answer(false)} title={t('accessories.prompt_title')}
        footer={<>
          <Button variant="outline" onClick={() => answer(false)} disabled={busy}>{t('catalog.prompt_later')}</Button>
          <Button variant="outline" onClick={() => setChoosing(true)} disabled={busy}>{t('accessories.prompt_choose')}</Button>
          <Button onClick={() => answer(true)} loading={busy}>{t('accessories.prompt_all')}</Button>
        </>}>
        <div className="flex gap-3">
          <div className="p-2 h-fit rounded-sm bg-info-soft"><Headphones className="h-5 w-5 text-info" /></div>
          <p className="text-sm text-muted-foreground">{t('accessories.prompt_desc', { count: status?.images.available || 0 })}</p>
        </div>
      </Modal>
      <AccessoryChooser open={choosing} onClose={closeChooser} onStarted={refresh} />
    </>
  )
}
