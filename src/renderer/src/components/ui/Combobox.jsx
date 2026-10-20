import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Searchable dropdown. Click to open the full list, or type to filter it.
 * options: [{ value, label, sub?, image?, keywords? }]
 */
export default function Combobox({ label, value, options, onChange, placeholder, emptyText, disabled, maxResults = 200, footer }) {
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
    return hits.slice(0, maxResults)
  }, [options, query, maxResults])

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
    <div className="space-y-1.5 relative" ref={rootRef}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className={`flex h-9 w-full items-center rounded-md border border-input bg-background text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'focus-within:ring-2 focus-within:ring-ring'}`}>
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
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
          <ul ref={listRef} className="max-h-64 overflow-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>}
            {filtered.map((o, i) => (
              <li key={o.value}
                onMouseDown={(e) => { e.preventDefault(); pick(o) }}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm ${i === active ? 'bg-accent' : ''} ${o.value === value ? 'font-medium text-primary' : ''}`}>
                {o.image !== undefined && (
                  o.image ? <img src={o.image} alt="" loading="lazy" className="h-8 w-8 rounded object-contain bg-muted shrink-0" /> : <span className="h-8 w-8 rounded bg-muted shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.sub && <span className="block truncate text-xs text-muted-foreground">{o.sub}</span>}
                </span>
              </li>
            ))}
          </ul>
          {footer && <div className="border-t border-border">{footer(() => setOpen(false), query)}</div>}
        </div>
      )}
    </div>
  )
}
