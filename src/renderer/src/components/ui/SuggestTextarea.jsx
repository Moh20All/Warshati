import { useEffect, useMemo, useRef, useState } from 'react'
import { ListPlus } from 'lucide-react'

const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ًͯ-ْ]/g, '')

/** Text after the last comma (Latin or Arabic) or line break: what the user is typing now */
function lastPart(text) {
  const i = Math.max(text.lastIndexOf(','), text.lastIndexOf('،'), text.lastIndexOf('\n'))
  return { head: text.slice(0, i + 1), part: text.slice(i + 1) }
}

/**
 * Text area with a list of ready-made phrases. Typing filters the list (the typed words are replaced by the
 * phrase picked); the list button shows every phrase (the phrase is added after the text). Free text always works.
 * Several phrases are joined with ", " (or "، " in Arabic: comma prop). suggestions: [{ label, keywords? }]
 */
export default function SuggestTextarea({ value, onChange, suggestions, placeholder, className = '', invalid, disabled, listLabel, minHeight = 60, comma = ',' }) {
  const [open, setOpen] = useState(false)
  const [typing, setTyping] = useState(false) // opened by typing: the typed words are a search
  const [active, setActive] = useState(-1)
  const rootRef = useRef(null)
  const areaRef = useRef(null)
  const listRef = useRef(null)
  const text = value || ''

  const options = useMemo(() => {
    const chosen = new Set(text.split(/[,،\n]/).map((p) => normalize(p.trim())).filter(Boolean))
    const left = suggestions.filter((s) => !chosen.has(normalize(s.label)))
    const words = typing ? normalize(lastPart(text).part).split(/\s+/).filter(Boolean) : []
    if (!words.length) return left
    return left.filter((s) => { const hay = normalize(`${s.label} ${s.keywords || ''}`); return words.every((w) => hay.includes(w)) })
  }, [suggestions, text, typing])

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  useEffect(() => { if (active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' }) }, [active])

  const pick = (s) => {
    let next
    if (typing && lastPart(text).part.trim()) {
      // Replace the words typed to search with the phrase
      const head = lastPart(text).head
      next = head ? `${head.trimEnd()} ${s.label}` : s.label
    } else {
      const base = text.trimEnd().replace(/[,،]$/, '')
      next = base ? `${base}${comma} ${s.label}` : s.label
    }
    onChange(next)
    setTyping(false)
    setActive(-1)
    setOpen(false)
    areaRef.current?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)) }
    else if (e.key === 'ArrowUp' && open) { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    // Enter picks only a phrase chosen with the arrows; otherwise it is a normal new line
    else if (e.key === 'Enter' && open && active >= 0 && options[active]) { e.preventDefault(); pick(options[active]) }
    else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false) }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div className="relative" ref={rootRef}>
      <textarea
        ref={areaRef}
        value={text}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); setTyping(true); setActive(-1); setOpen(!!lastPart(e.target.value).part.trim()) }}
        onFocus={() => { if (!disabled && !text.trim()) { setTyping(false); setOpen(true) } }}
        onKeyDown={onKeyDown}
        style={{ minHeight }}
        className={`flex w-full rounded-sm border bg-popover px-3 py-2 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-disabled-foreground disabled:cursor-not-allowed ${invalid ? 'border-destructive' : 'border-input'} ${className}`}
        placeholder={placeholder}
      />
      {!disabled && (
        <button
          type="button"
          tabIndex={-1}
          title={listLabel}
          aria-label={listLabel}
          onMouseDown={(e) => { e.preventDefault(); setTyping(false); setActive(-1); setOpen((o) => !o || typing) ; areaRef.current?.focus() }}
          className={`absolute top-1.5 end-1.5 p-1.5 rounded-sm cursor-pointer transition-colors ${open && !typing ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
        >
          <ListPlus className="h-4 w-4" />
        </button>
      )}
      {open && !disabled && options.length > 0 && (
        <div className="absolute z-40 mt-1 w-full rounded-md border border-border bg-popover shadow-pop p-1">
          <ul ref={listRef} className="max-h-60 overflow-auto">
            {options.map((s, i) => (
              <li key={s.label}
                onMouseDown={(e) => { e.preventDefault(); pick(s) }}
                onMouseEnter={() => setActive(i)}
                className={`px-2 py-1.5 rounded-sm cursor-pointer text-[13px] leading-[18px] ${i === active ? 'bg-accent text-accent-foreground' : ''}`}>
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
