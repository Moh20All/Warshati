import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Headphones, ArrowLeft, Plus, Image } from 'lucide-react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { useAuth } from '../../lib/auth'
import { useCurrency } from '../../lib/currency'
import { ACCESSORY_CATEGORIES, useAccessories, catalogImageSrc } from '../../lib/catalog'
import { useAccessoryStatus } from '../../components/AccessoryPhotos'

const PAGE = 60
const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Accessory catalog (opened from Inventory): search, category, sort by price; the owner adds one to stock. */
export default function AccessoriesPage() {
  const { t } = useTranslation()
  const cur = useCurrency()
  const { isOwner, can } = useAuth()
  const navigate = useNavigate()
  const { data: accessories = [], isLoading } = useAccessories()
  const { data: status } = useAccessoryStatus()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('name')
  const [shown, setShown] = useState(PAGE)

  const counts = useMemo(() => {
    const c = {}
    accessories.forEach(a => { c[a.category] = (c[a.category] || 0) + 1 })
    return c
  }, [accessories])

  const list = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    const hits = accessories.filter(a => (!category || a.category === category) && words.every(w => normalize(a.name).includes(w)))
    const byName = (a, b) => a.name.localeCompare(b.name, 'fr')
    if (sort === 'cheap') return hits.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || byName(a, b))
    if (sort === 'expensive') return hits.sort((a, b) => (b.price ?? -1) - (a.price ?? -1) || byName(a, b))
    if (words.length) {
      // Names where the first word comes earlier first ("chargeur" -> "Chargeur…" before "Pack … chargeur")
      const at = (a) => normalize(a.name).indexOf(words[0])
      return hits.sort((a, b) => at(a) - at(b) || byName(a, b))
    }
    return hits.sort(byName)
  }, [accessories, query, category, sort])

  const pick = (c) => { setCategory(c); setShown(PAGE) }
  const chip = (value, label, count) => (
    <button key={value || 'all'} type="button" onClick={() => pick(value)}
      className={`h-8 px-3 rounded-full text-[13px] cursor-pointer border ${category === value ? 'bg-primary text-primary-foreground border-primary font-semibold' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>
      {label} <span className="opacity-70">{count}</span>
    </button>
  )

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link to="/inventory" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mb-2">
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t('inventory.title')}
        </Link>
        <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('accessories.browse_title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('accessories.browse_subtitle')}</p>
      </div>

      {/* No photo on this computer yet: say where to get them */}
      {status && status.images.downloaded === 0 && status.images.available > 0 && (
        <div className="flex items-center gap-3 flex-wrap rounded-md border border-border bg-info-soft px-4 py-3 mb-4 text-sm">
          <Image className="h-4 w-4 text-info shrink-0" />
          <span className="flex-1 text-foreground">{t('accessories.no_photos')}</span>
          {isOwner && <Link to="/settings/catalog" className="text-xs font-semibold text-primary hover:underline">{t('accessories.get_photos')}</Link>}
        </div>
      )}

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex-1 min-w-[220px] max-w-md"><Input icon={Search} data-search placeholder={t('accessories.search_ph')} value={query} onChange={e => { setQuery(e.target.value); setShown(PAGE) }} /></div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="h-9 rounded-sm border border-input bg-popover px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="name">{t('catalog.sort_name')}</option>
          <option value="cheap">{t('accessories.sort_cheap')}</option>
          <option value="expensive">{t('accessories.sort_expensive')}</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {chip('', t('accessories.all'), accessories.length)}
        {ACCESSORY_CATEGORIES.filter(c => counts[c]).map(c => chip(c, t(`accessories.categories.${c}`), counts[c]))}
      </div>

      <p className="text-xs text-muted-foreground mb-3">{t('accessories.results', { count: list.length })}</p>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">{t('catalog.loading')}</div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
            {list.slice(0, shown).map(a => {
              const image = catalogImageSrc(a.imageFile)
              return (
                <div key={a.id} className="border border-border rounded-md bg-card flex flex-col">
                  <div className="p-3 flex gap-3 flex-1">
                    <div className="h-20 w-20 shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-contain" /> : <Headphones className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground truncate">{t(`accessories.categories.${a.category}`)}</p>
                      <p dir="auto" className="text-[13px] leading-[18px] font-medium text-foreground line-clamp-3 text-start" title={a.name}>{a.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border">
                    <div className="leading-tight whitespace-nowrap" title={t('accessories.market_price')}>
                      {a.price != null ? <>
                        <p className="text-sm font-semibold text-foreground">{a.price.toLocaleString()} {cur}</p>
                        {a.oldPrice != null && <p className="text-[11px] text-muted-foreground line-through">{a.oldPrice.toLocaleString()} {cur}</p>}
                      </> : <span className="text-muted-foreground">—</span>}
                    </div>
                    {can('inventory_edit') && (
                      <button type="button" onClick={() => navigate(`/inventory?accessory=${a.id}`)} title={t('accessories.add_to_stock')}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-sm text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer whitespace-nowrap shrink-0">
                        <Plus className="h-3.5 w-3.5" /> {t('accessories.add_to_stock')}
                      </button>
                    )}
                  </div>
                </div>
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
    </div>
  )
}
