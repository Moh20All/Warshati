import { useTranslation } from 'react-i18next'
import { Info, Sparkles, Rocket, ShieldCheck, Cpu, Printer, Zap, Globe, Lock, History } from 'lucide-react'

export default function AboutApp() {
  const { t } = useTranslation()

  const phases = [
    {
      version: 'v1.5.2',
      title: t('about.phases.v152.title'),
      status: t('about.current', 'Current'),
      icon: Sparkles,
      desc: t('about.phases.v152.desc')
    },
    {
      version: 'v1.5.1',
      title: t('about.phases.v151.title'),
      icon: Cpu,
      desc: t('about.phases.v151.desc')
    },
    {
      version: 'v1.5.0',
      title: t('about.phases.v150.title'),
      icon: ShieldCheck,
      desc: t('about.phases.v150.desc')
    },
    {
      version: 'v1.4.2',
      title: t('about.phases.v142.title', 'Printing & Stability Engine'),
      icon: Printer,
      desc: t('about.phases.v142.desc', 'Major improvements to thermal printing accuracy, resolved OS dialog hangs, and introduced the seamless Feedback & Crash recovery systems.')
    },
    {
      version: 'v1.4.1',
      title: t('about.phases.v141.title', 'Initial Regression Patch'),
      icon: Zap,
      desc: t('about.phases.v141.desc', 'Fixed critical database column crashes, corrected inventory warranty saving, and eliminated duplicate data in Trade-In management.')
    },
    {
      version: 'v1.4.0',
      title: t('about.phases.v140.title', 'Advanced Logistics'),
      icon: Rocket,
      desc: t('about.phases.v140.desc', 'Introduced the automated Trade-In workflow with inventory auto-creation and multi-size thermal receipt (58mm/80mm) toggles.')
    },
    {
      version: 'v1.3.0',
      title: t('about.phases.v130.title', 'Security & RTL Architecture'),
      icon: Lock,
      desc: t('about.phases.v130.desc', 'Locked down production DevTools, added the in-app History view, and perfected the Arabic Right-to-Left (RTL) mirroring engine.')
    },
    {
      version: 'v1.2.2',
      title: t('about.phases.v122.title', 'Desktop Polish'),
      icon: Sparkles,
      desc: t('about.phases.v122.desc', 'Polished the native Electron environment, improved app security, and integrated the first version of the internal reference timeline.')
    },
    {
      version: 'v1.2.1',
      title: t('about.phases.v121.title', 'Multilingual Reports'),
      icon: Globe,
      desc: t('about.phases.v121.desc', 'Initial rollout of English, French, and Arabic translation support alongside the Monthly Summary analytical charts page.')
    },
    {
      version: 'v1.0.3',
      title: t('about.phases.v103.title', 'Foundation & Activation'),
      icon: ShieldCheck,
      desc: t('about.phases.v103.desc', 'Established core licensing with hardware binding, self-healing database initialization, and the background auto-updater.')
    }
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Header */}
      <div className="text-center space-y-2 mb-10 pt-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center justify-center gap-3">
          <Info className="h-8 w-8 text-primary" />
          {t('about.title', 'About Rakam')}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('about.subtitle', 'From a concept to a robust production engine, see how Rakam evolved to manage your shop flawlessly.')}
        </p>
      </div>

      {/* Changelog Timeline */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 md:p-8">
        <h2 className="text-xl font-bold mb-8 flex items-center justify-between px-2">
          {t('about.changelog', 'Release History')}
          <span className="text-xs font-semibold tracking-wide text-muted-foreground px-2 py-1 bg-secondary rounded-md">Electron • React • Prisma</span>
        </h2>
        
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          
          {phases.map((phase, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              
              {/* Icon / Marker */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-primary/20 text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors group-hover:text-amber-500">
                <phase.icon className="h-4 w-4" />
              </div>
              
              {/* Content Card */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border border-border bg-background shadow-sm group-hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-foreground flex items-center gap-2">
                    {phase.version}
                    {phase.status && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-primary/20 text-primary">{phase.status}</span>}
                  </div>
                </div>
                <h3 className="font-semibold text-foreground/90 mb-1">{phase.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {phase.desc}
                </p>
              </div>

            </div>
          ))}

        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground mt-8">
        &copy; 2024 Rakam. All rights reserved.<br/>
        Made with dedication for phone repair artisans.
      </div>
      
    </div>
  )
}
