import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Smartphone, Laptop, Gamepad2, PencilLine, List, Info } from 'lucide-react'
import Combobox from './ui/Combobox'
import Input from './ui/Input'
import DeviceDetails from './DeviceDetails'
import { DEVICE_CATEGORIES, useCatalog, catalogImageSrc, specsSummary } from '../lib/catalog'

const ICONS = { PHONE: Smartphone, LAPTOP: Laptop, CONSOLE: Gamepad2 }

/**
 * Pick a device from the catalog (category -> brand -> model, all searchable) or type it by hand.
 * value: { category, brand, model }; onChange(value, catalogDevice|null)
 * Typed-by-hand devices are remembered by the server when the form is saved.
 */
export default function DevicePicker({ value, onChange, categories = DEVICE_CATEGORIES, disabled, required }) {
  const { t } = useTranslation()
  const category = value.category || categories[0]
  const { data: devices = [], isLoading } = useCatalog(category)
  const [manual, setManual] = useState(false)
  const [details, setDetails] = useState(null)

  // A saved value that is not in the catalog (old or typed by hand) is shown in manual mode
  useEffect(() => {
    if (isLoading || !value.brand || !value.model) return
    const known = devices.some(d => d.brand === value.brand && d.model === value.model)
    if (!known) setManual(true)
  }, [isLoading, devices, value.brand, value.model])

  const brandOptions = useMemo(() => {
    const counts = {}
    devices.forEach(d => { counts[d.brand] = (counts[d.brand] || 0) + 1 })
    return Object.keys(counts).sort((a, b) => a.localeCompare(b)).map(b => ({ value: b, label: b, sub: t('catalog.models_count', { count: counts[b] }) }))
  }, [devices, t])

  const modelOptions = useMemo(() => {
    const list = value.brand ? devices.filter(d => d.brand === value.brand) : devices
    return list.map(d => ({
      value: d.id,
      label: value.brand ? d.model : `${d.brand} ${d.model}`,
      keywords: d.brand,
      sub: [specsSummary(d), d.isCustom ? t('catalog.added_by_hand') : null].filter(Boolean).join(' · '),
      image: d.category === 'PHONE' ? catalogImageSrc(d.imageFile) : undefined,
      device: d
    }))
  }, [devices, value.brand, t])

  const selectedId = devices.find(d => d.brand === value.brand && d.model === value.model)?.id ?? null
  const set = (patch, device = null) => onChange({ ...value, category, ...patch }, device)

  const manualToggle = (
    <button type="button" disabled={disabled} onClick={() => setManual(!manual)}
      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50">
      {manual ? <><List className="h-3.5 w-3.5" /> {t('catalog.choose_from_list')}</> : <><PencilLine className="h-3.5 w-3.5" /> {t('catalog.type_manually')}</>}
    </button>
  )

  return (
    <div className="flex flex-col gap-3 p-3 border border-border rounded-md bg-card">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex gap-0.5 p-[3px] rounded-full border border-border bg-muted">
          {categories.map(c => {
            const Icon = ICONS[c]
            return (
              <button key={c} type="button" disabled={disabled}
                onClick={() => c !== category && onChange({ category: c, brand: '', model: '' }, null)}
                className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs cursor-pointer disabled:cursor-not-allowed ${c === category ? 'bg-card text-foreground font-semibold ring-1 ring-input' : 'font-medium text-muted-foreground hover:text-foreground'}`}>
                <Icon className="h-3.5 w-3.5" /> {t(`catalog.categories.${c}`)}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-3">
          {!manual && selectedId && (
            <button type="button" onClick={() => setDetails(devices.find(d => d.id === selectedId))}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer">
              <Info className="h-3.5 w-3.5" /> {t('catalog.details')}
            </button>
          )}
          {manualToggle}
        </div>
      </div>
      <DeviceDetails device={details} onClose={() => setDetails(null)} />

      {manual ? (
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('catalog.brand')} value={value.brand || ''} onChange={e => set({ brand: e.target.value })} placeholder={t('catalog.ph_brand')} disabled={disabled} required={required} />
          <Input label={t('catalog.model')} value={value.model || ''} onChange={e => set({ model: e.target.value })} placeholder={t('catalog.ph_model')} disabled={disabled} required={required} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Combobox label={t('catalog.brand')} value={value.brand || null} options={brandOptions} disabled={disabled || isLoading}
            placeholder={isLoading ? t('catalog.loading') : t('catalog.choose_brand')} emptyText={t('catalog.no_results')}
            onChange={(brand) => set({ brand: brand || '', model: '' })} />
          <Combobox label={t('catalog.model')} value={selectedId} options={modelOptions} disabled={disabled || isLoading}
            placeholder={value.brand ? t('catalog.choose_model') : t('catalog.search_all')} emptyText={t('catalog.no_results')}
            onChange={(_, opt) => opt ? set({ brand: opt.device.brand, model: opt.device.model }, opt.device) : set({ model: '' })}
            footer={(close, query) => (
              <button type="button" onMouseDown={(e) => { e.preventDefault(); close(); setManual(true); if (query) set({ model: query }) }}
                className="w-full text-start px-2 py-2 text-[13px] font-semibold text-primary hover:bg-accent rounded-sm cursor-pointer inline-flex items-center gap-1.5">
                <PencilLine className="h-3.5 w-3.5" /> {query ? t('catalog.use_typed', { text: query }) : t('catalog.not_in_list')}
              </button>
            )} />
        </div>
      )}
    </div>
  )
}
