import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, Youtube, Globe, Facebook, Instagram, Music2, Link as LinkIcon, ExternalLink, Sparkles } from 'lucide-react'
import { WhatsNewModal } from '../../components/WhatsNew'
import { latestNotes } from '../../lib/whatsNew'
import Button from '../../components/ui/Button'
import cover from '../../assets/brand/about-cover.png'
import avatar from '../../assets/brand/about-avatar.png'
import avatarDark from '../../assets/brand/about-avatar-dark.png'

// Warshati's own channels (links open in the browser: see setWindowOpenHandler in src/main/index.js)
const SUPPORT_WHATSAPP = 'https://wa.me/213541677893'
const DEMOS = 'https://www.youtube.com/watch?v=DLGKHmDPQqA&list=PLRAnHAwYeiX8'
const LINKS = [
  { key: 'website', url: 'https://warshatidz.com', icon: Globe, label: 'warshatidz.com' },
  { key: 'facebook', url: 'https://facebook.com/share/1KvSNXZkMV/', icon: Facebook, label: 'Facebook' },
  { key: 'instagram', url: 'https://www.instagram.com/warshati_dz', icon: Instagram, label: '@warshati_dz' },
  { key: 'tiktok', url: 'https://www.tiktok.com/@warshati_dz16', icon: Music2, label: '@warshati_dz16' },
  { key: 'linktree', url: 'https://linktr.ee/Warshatidz', icon: LinkIcon, label: 'linktr.ee/Warshatidz' }
]

/** About Warshati: a profile card with support, demos and every link (no long changelog). */
export default function AboutApp() {
  const { t } = useTranslation()
  const [showNotes, setShowNotes] = useState(false)
  const notesVersion = latestNotes()

  return (
    <div className="animate-fade-in max-w-3xl mx-auto pb-10">
      {/* Profile: cover, logo, name, version */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <img src={cover} alt="" className="w-full aspect-[1640/624] object-cover" />
        <div className="px-6 pb-6">
          {/* Only the logo overlaps the cover; the name sits under it */}
          <div className="flex items-end justify-between -mt-10">
            <img src={avatar} alt="Warshati" className="h-20 w-20 rounded-xl border-4 border-card shadow-sm dark:hidden" />
            <img src={avatarDark} alt="Warshati" className="h-20 w-20 rounded-xl border-4 border-card shadow-sm hidden dark:block" />
            <span className="mb-1 px-2.5 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold p-mono" dir="ltr">v{__APP_VERSION__}</span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">Warshati — ورشتي</h1>
              <p className="text-sm text-muted-foreground">{t('about.tagline')}</p>
            </div>
            {notesVersion && <Button variant="outline" size="sm" onClick={() => setShowNotes(true)}><Sparkles className="h-4 w-4 text-primary" /> {t('whats_new.title', { version: notesVersion })}</Button>}
          </div>
          <WhatsNewModal open={showNotes} version={notesVersion} onClose={() => setShowNotes(false)} />

          {/* The two things users come here for */}
          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 rounded-md border border-border hover:border-success hover:bg-success-soft transition-colors">
              <MessageCircle className="h-6 w-6 text-success shrink-0" />
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">{t('about.support')}</span>
                <span className="block text-xs text-muted-foreground"><bdi>+213 541 67 78 93</bdi> · {t('about.support_desc')}</span>
              </span>
            </a>
            <a href={DEMOS} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 rounded-md border border-border hover:border-destructive hover:bg-destructive/5 transition-colors">
              <Youtube className="h-6 w-6 text-destructive shrink-0" />
              <span className="min-w-0">
                <span className="block font-semibold text-foreground">{t('about.demos')}</span>
                <span className="block text-xs text-muted-foreground">{t('about.demos_desc')}</span>
              </span>
            </a>
          </div>

          {/* Everywhere else */}
          <h2 className="text-xs font-semibold uppercase tracking-[.04em] text-muted-foreground rtl:normal-case rtl:tracking-normal mt-6 mb-2">{t('about.follow')}</h2>
          <ul className="divide-y divide-border border border-border rounded-md">
            {LINKS.map(({ key, url, icon: Icon, label }) => (
              <li key={key}>
                <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 text-sm text-foreground">{t(`about.links.${key}`)}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">{label}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">© 2026 Warshati — ورشتي · {t('about.made')}</p>
    </div>
  )
}
