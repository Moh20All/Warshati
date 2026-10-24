import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Smartphone, Laptop, Gamepad2 } from 'lucide-react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import DeviceDetails, { ValueRating } from '../../components/DeviceDetails'
import { DEVICE_CATEGORIES, useCatalog, catalogImageSrc, specsSummary, VFM_RATINGS } from '../../lib/catalog'

const ICONS = { PHONE: Smartphone, LAPTOP: Laptop, CONSOLE: Gamepad2 }
const PAGE = 60
const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Device catalog for sellers: search, filter by brand / value rating, and open the full spec sheet. */
export default function DevicesPage() {
  const { t } = useTranslation()
  const [category, setCategory] = useState('PHONE')
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('')
  const [rating, setRating] = useState('')
  const [sort, setSort] = useState('name')
  const [shown, setShown] = useState(PAGE)
  const [open, setOpen] = useState(null)
  const { data: devices = [], isLoading } = useCatalog(category)

  const brands = useMemo(() => [...new Set(devices.map(d => d.brand))].sort((a, b) => a.localeCompare(b)), [devices])

  const list = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    const hits = devices.filter(d =>
      (!brand || d.brand === brand) &&
      (!rating || d.specs?.vfmLabel === rating) &&
      words.every(w => normalize(`${d.brand} ${d.model} ${d.specs?.processor || ''} ${d.specs?.cpu || ''}`).includes(w)))
    const byName = (a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model, undefined, { numeric: true })
    if (sort === 'value') return hits.sort((a, b) => (b.specs?.vfmPercentage ?? -1) - (a.specs?.vfmPercentage ?? -1) || byName(a, b))
    if (sort === 'newest') return hits.sort((a, b) => (b.specs?.releaseYear ?? 0) - (a.specs?.releaseYear ?? 0) || byName(b, a))
    return hits.sort(byName)
  }, [devices, query, brand, rating, sort])

  const switchCategory = (c) => { setCategory(c); setBrand(''); setRating(''); setSort('name'); setShown(PAGE) }
  const select = 'h-9 rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('catalog.browse_title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('catalog.browse_subtitle')}</p>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="inline-flex rounded-md border border-input p-0.5 bg-muted/40">
          {DEVICE_CATEGORIES.map(c => {
            const Icon = ICONS[c]
            return (
              <button key={c} type="button" onClick={() => switchCategory(c)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium cursor-pointer ${c === category ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon className="h-4 w-4" /> {t(`catalog.categories.${c}`)}
              </button>
            )
          })}
        </div>
        <div className="flex-1 min-w-[220px] max-w-sm"><Input icon={Search} placeholder={t('catalog.search_ph')} value={query} onChange={e => { setQuery(e.target.value); setShown(PAGE) }} /></div>
        <select value={brand} onChange={e => { setBrand(e.target.value); setShown(PAGE) }} className={select}>
          <option value="">{t('catalog.all_brands')}</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {category === 'PHONE' && (
          <select value={rating} onChange={e => { setRating(e.target.value); setShown(PAGE) }} className={select}>
            <option value="">{t('catalog.all_ratings')}</option>
            {Object.keys(VFM_RATINGS).map(r => <option key={r} value={r}>{t(`catalog.vfm.${r}`)}</option>)}
          </select>
        )}
        <select value={sort} onChange={e => setSort(e.target.value)} className={select}>
          <option value="name">{t('catalog.sort_name')}</option>
          {category === 'PHONE' && <option value="value">{t('catalog.sort_value')}</option>}
          {category === 'CONSOLE' && <option value="newest">{t('catalog.sort_newest')}</option>}
        </select>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{t('catalog.results', { count: list.length })}</p>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">{t('catalog.loading')}</div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {list.slice(0, shown).map(d => {
              const Icon = ICONS[d.category]
              const image = catalogImageSrc(d.imageFile)
              return (
                <button key={d.id} type="button" onClick={() => setOpen(d)}
                  className="text-start border border-border rounded-md bg-card p-3 hover:border-primary/50 hover:shadow-sm transition cursor-pointer flex gap-3">
                  <div className="h-16 w-16 shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                    {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-contain" /> : <Icon className="h-6 w-6 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs text-muted-foreground">{d.brand}</p>
                    <p className="font-medium text-foreground truncate">{d.model}</p>
                    <p className="text-xs text-muted-foreground truncate">{specsSummary(d)}</p>
                    {d.category === 'PHONE' && <ValueRating specs={d.specs} compact />}
                  </div>
                </button>
              )
            })}
          </div>
          {list.length > shown && (
            <div className="text-center mt-4">
              <Button variant="outline" onClick={() => setShown(shown + PAGE)}>{t('catalog.show_more', { count: list.length - shown })}</Button>
            </div>
          )}
          {list.length === 0 && <p className="text-center py-12 text-sm text-muted-foreground">{t('catalog.no_results')}</p>}
        </>
      )}

      <DeviceDetails device={open} onClose={() => setOpen(null)} />
    </div>
  )
}
