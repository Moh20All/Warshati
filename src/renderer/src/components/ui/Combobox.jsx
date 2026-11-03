import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Searchable dropdown. Click to open the full list, or type to filter it.
 * options: [{ value, label, sub?, image?, keywords? }]
 */
export default function Combobox({ label, value, options, onChange, placeholder, emptyText, disabled, maxResults = 200, footer, rankByPosition = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const selected = options.find(o => o.value === value)

  const filtered = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    const hits = words.length
      ? options.filter(o => { const hay = normalize(`${o.label} ${o.keywords || ''}`); return words.every(w => hay.includes(w)) })
      : options
    // rankByPosition: labels where the first typed word comes earlier are shown first ("chargeur 20w" -> "Chargeur…" before "Pack … chargeur")
    if (rankByPosition && words.length) {
      const at = (o) => { const i = normalize(o.label).indexOf(words[0]); return i < 0 ? Infinity : i }
      return hits.map((o, i) => [o, at(o), i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(([o]) => o).slice(0, maxResults)
    }
    return hits.slice(0, maxResults)
  }, [options, query, maxResults, rankByPosition])

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  useEffect(() => { setActive(0) }, [query, open])
  useEffect(() => { listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' }) }, [active])

  const pick = (o) => { onChange(o.value, o); setOpen(false); setQuery('') }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { if (open && filtered[active]) { e.preventDefault(); pick(filtered[active]) } }
    else if (e.key === 'Escape') { if (open) { e.stopPropagation(); setOpen(false) } }
  }

  return (
    <div className="flex flex-col gap-1.5 relative min-w-0" ref={rootRef}>
      {label && <label className="text-[13px] leading-[18px] font-medium text-foreground">{label}</label>}
      <div className={`flex h-9 w-full items-center rounded-sm border border-input bg-popover text-sm ${disabled ? 'bg-muted text-disabled-foreground cursor-not-allowed' : 'focus-within:outline-2 focus-within:outline-ring focus-within:outline-offset-1'}`}>
        {open ? <Search className="h-4 w-4 mx-2 shrink-0 text-muted-foreground" /> : selected?.image ? <img src={selected.image} alt="" className="h-6 w-6 mx-1.5 rounded object-contain shrink-0" /> : null}
        <input
          className={`flex-1 min-w-0 bg-transparent outline-none py-1 ${open || selected?.image ? '' : 'ps-3'} placeholder:text-muted-foreground`}
          value={open ? query : (selected?.label || '')}
          placeholder={selected && open ? selected.label : placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => !disabled && setOpen(true)}
          onClick={() => !disabled && setOpen(true)}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {selected && !disabled && (
          <button type="button" tabIndex={-1} onClick={() => onChange(null, null)} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-3.5 w-3.5" /></button>
        )}
        <ChevronDown className="h-4 w-4 mx-2 shrink-0 text-muted-foreground" />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-pop p-1">
          <ul ref={listRef} className="max-h-64 overflow-auto">
            {filtered.length === 0 && <li className="px-2 py-2 text-[13px] text-muted-foreground">{emptyText}</li>}
            {filtered.map((o, i) => (
              <li key={o.value}
                onMouseDown={(e) => { e.preventDefault(); pick(o) }}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-sm cursor-pointer text-[13px] leading-[18px] ${i === active ? 'bg-accent text-accent-foreground' : ''} ${o.value === value ? 'font-semibold text-primary' : ''}`}>
                {o.image !== undefined && (
                  o.image ? <img src={o.image} alt="" loading="lazy" className="h-7 w-7 rounded-sm object-contain bg-muted shrink-0" /> : <span className="h-7 w-7 rounded-sm bg-muted shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.sub && <span className="block truncate text-[11px] leading-[14px] text-muted-foreground">{o.sub}</span>}
                </span>
              </li>
            ))}
          </ul>
          {footer && <div className="border-t border-dashed border-border mt-1">{footer(() => setOpen(false), query)}</div>}
        </div>
      )}
    </div>
  )
}
