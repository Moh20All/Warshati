import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from 'lucide-react'
import { whatsNew } from '../lib/whatsNew'
import Modal from './ui/Modal'
import Button from './ui/Button'

const SEEN_KEY = 'warshati_whats_new_seen'
const seen = () => { try { return localStorage.getItem(SEEN_KEY) } catch { return __APP_VERSION__ } }
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, __APP_VERSION__) } catch { /* private mode */ } }

/** One screenshot at a time with its text, Previous / Next, and "Open" to go to that page; then "And also". */
export function WhatsNewModal({ open, onClose, version }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [i, setI] = useState(0)
  const notes = whatsNew(version, i18n.resolvedLanguage || i18n.language)
  if (!notes) return null
  const total = notes.slides.length + (notes.also.length ? 1 : 0)
  const slide = notes.slides[i]
  const close = () => { setI(0); onClose() }

  return (
    <Modal open={open} onClose={close} size="xl"
      title={<span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {t('whats_new.title', { version: notes.version })}</span>}
      footer={<>
        <span className="me-auto text-xs text-muted-foreground tabular-nums">{i + 1} / {total}</span>
        {i > 0 && <Button variant="outline" onClick={() => setI(i - 1)}><ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t('whats_new.prev')}</Button>}
        {slide?.route && <Button variant="outline" onClick={() => { close(); navigate(slide.route) }}><ExternalLink className="h-4 w-4" /> {t('whats_new.open')}</Button>}
        {i < total - 1
          ? <Button onClick={() => setI(i + 1)}>{t('whats_new.next')} <ChevronRight className="h-4 w-4 rtl:rotate-180" /></Button>
          : <Button variant="flux" onClick={close}>{t('whats_new.done')}</Button>}
      </>}>
      {slide ? (
        <div className="space-y-3">
          <img src={slide.image} alt="" className="w-full max-h-[55vh] object-contain rounded-md border border-border bg-muted" />
          <h3 className="text-lg font-semibold text-foreground">{slide.title}</h3>
          <p className="text-sm text-muted-foreground">{slide.text}</p>
        </div>
      ) : (
        <div className="space-y-3 py-4">
          <h3 className="text-lg font-semibold text-foreground">{t('whats_new.also')}</h3>
          <ul className="space-y-2">
            {notes.also.map((x) => <li key={x} className="flex gap-2 text-sm text-foreground"><span className="text-primary">✓</span>{x}</li>)}
          </ul>
        </div>
      )}
      <div className="flex justify-center gap-1.5 mt-4">
        {Array.from({ length: total }, (_, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={String(k + 1)} className={`h-1.5 rounded-full cursor-pointer transition-all ${k === i ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`} />
        ))}
      </div>
    </Modal>
  )
}

/** Opens the notes of the installed version once per PC, right after an update. */
export default function WhatsNewPrompt() {
  const [open, setOpen] = useState(() => !!whatsNew(__APP_VERSION__, 'en') && seen() !== __APP_VERSION__)
  return <WhatsNewModal open={open} version={__APP_VERSION__} onClose={() => { markSeen(); setOpen(false) }} />
}
