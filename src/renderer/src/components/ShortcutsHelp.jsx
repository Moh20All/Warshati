import { useTranslation } from 'react-i18next'
import Modal from './ui/Modal'
import { SHORTCUTS, KBD_CLASS } from '../lib/hotkeys'

/** F1 window: every keyboard shortcut, grouped. */
export default function ShortcutsHelp({ open, onClose }) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose} title={t('shortcuts.title', 'Keyboard shortcuts')} size="lg">
      {/* Two columns so the list fits on small screens; scrolls if the window is very short */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 max-h-[65vh] overflow-y-auto pe-1">
        {SHORTCUTS.map(([group, rows], i) => (
          <section key={group} className={i === 0 ? 'md:row-span-2' : ''}>
            <h3 className="text-xs font-semibold uppercase tracking-[.04em] text-muted-foreground rtl:normal-case rtl:tracking-normal mb-2">{t(group)}</h3>
            <ul className="divide-y divide-border">
              {rows.map(([keys, label, fallback]) => (
                <li key={keys + label} className="flex items-center justify-between gap-4 py-1.5 text-[13px]">
                  <span>{t(label, fallback)}</span>
                  <span className="flex gap-1 shrink-0" dir="ltr">
                    {keys.split('+').map((k) => <kbd key={k} className={KBD_CLASS}>{k}</kbd>)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}
