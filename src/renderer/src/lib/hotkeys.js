import { useEffect, useRef } from 'react'
import { hasOpenModal } from '../components/ui/Modal'

// Keyboard shortcuts. Keys are written like 'F2', 'Ctrl+K', 'Ctrl+Enter', 'Enter'.
// F-keys and Ctrl combinations work even while typing in a field; plain keys (Enter) do not.
// Shortcuts pause while a dialog is open, unless the handler map is marked { whenModal: true }.

function keyName(e) {
  const k = e.key.length === 1 ? e.key.toUpperCase() : e.key
  return `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey && e.key.length > 1 ? 'Shift+' : ''}${k}`
}

const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

/**
 * useHotkeys({ F2: () => ..., 'Ctrl+S': () => ... }, { enabled, whenModal })
 * Handlers always see the latest props/state (no need to list dependencies).
 */
export function useHotkeys(map, { enabled = true, whenModal = false } = {}) {
  const ref = useRef(map)
  ref.current = map

  useEffect(() => {
    if (!enabled) return
    const onKey = (e) => {
      if (e.repeat) return
      const name = keyName(e)
      const fn = ref.current[name]
      if (!fn) return
      if (!whenModal && hasOpenModal()) return
      const fnKey = /^(Ctrl\+|F\d)/.test(name)
      // A field behind an open dialog does not count as typing for that dialog's shortcuts
      if (!fnKey && isTyping(e.target) && !(whenModal && hasOpenModal() && !e.target.closest('[role="dialog"], .fixed'))) return
      e.preventDefault()
      fn(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, whenModal])
}

/** Puts the cursor in the page's search box (inputs marked with data-search). */
export function focusPageSearch() {
  const el = document.querySelector('main input[data-search]')
  if (el) { el.focus(); el.select?.() }
}

/** Shortcut list shown in the F1 help window: [group, [[keys, translation key, fallback]]] */
export const SHORTCUTS = [
  ['shortcuts.group_anywhere', [
    ['F1', 'shortcuts.help', 'Show keyboard shortcuts'],
    ['F2', 'navigation.pos'],
    ['F3', 'dashboard.new_ticket'],
    ['F4', 'repairs.checkin.new'],
    ['F6', 'navigation.tickets'],
    ['F7', 'navigation.inventory'],
    ['F8', 'navigation.debt_ledger'],
    ['F9', 'navigation.daily_close'],
    ['Ctrl+K', 'shortcuts.search', 'Go to the search box'],
    ['Esc', 'shortcuts.close', 'Close the window on top']
  ]],
  ['shortcuts.group_pos', [
    ['F10', 'sales.pos.btn_complete'],
    ['Enter', 'shortcuts.scan', 'Add the scanned or only matching item'],
    ['Enter', 'shortcuts.print_after_sale', 'Print the receipt (after a sale)']
  ]],
  ['shortcuts.group_ticket', [
    ['Ctrl+S', 'repairs.details.save'],
    ['Ctrl+P', 'repairs.tickets.print']
  ]]
]

/** Small key label, e.g. <Kbd>F2</Kbd> */
export const KBD_CLASS = 'inline-flex items-center h-5 px-1.5 rounded-sm border border-border bg-card text-[11px] font-mono font-medium text-muted-foreground'
