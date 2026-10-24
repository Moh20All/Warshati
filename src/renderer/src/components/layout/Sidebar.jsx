import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Wrench, ShoppingCart, DollarSign, Settings,
  ClipboardList, Ticket, Shield, ArrowLeftRight,
  Receipt, CreditCard, BookOpen, FileWarning,
  CalendarCheck, Store, Users, Database,
  ChevronLeft, ChevronRight, LayoutDashboard,
  Contact, Package, BarChart3, Info,
  MessageSquarePlus, Smartphone, Keyboard
} from 'lucide-react'
import { useState } from 'react'
import FeedbackModal from '../FeedbackModal'
import markTile from '../../assets/brand/mark-trace-tile.svg'
import { useAuth } from '../../lib/auth'
import { KBD_CLASS } from '../../lib/hotkeys'


export default function Sidebar({ onShowShortcuts }) {
  const { t } = useTranslation()
  const { isOwner } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const navigation = [
    {
      group: t('navigation.groups.main'),
      items: [
        { name: t('navigation.dashboard'), path: '/dashboard', icon: LayoutDashboard },
        { name: t('navigation.customers'), path: '/customers', icon: Contact },
        { name: t('navigation.inventory'), path: '/inventory', icon: Package, kbd: 'F7' },
        { name: t('navigation.devices'), path: '/devices', icon: Smartphone }
      ]
    },
    {
      group: t('navigation.groups.repairs'),
      items: [
        { name: t('navigation.check_in'), path: '/repairs/checkins', icon: ClipboardList, kbd: 'F4' },
        { name: t('navigation.tickets'), path: '/repairs/tickets', icon: Ticket, kbd: 'F6' },
        { name: t('navigation.warranty'), path: '/repairs/warranty', icon: Shield },
        { name: t('navigation.trade_ins'), path: '/repairs/trade-ins', icon: ArrowLeftRight }
      ]
    },
    {
      group: t('navigation.groups.sales'),
      items: [
        { name: t('navigation.pos'), path: '/sales/pos', icon: ShoppingCart, kbd: 'F2' },
        { name: t('navigation.invoices'), path: '/sales/invoices', icon: Receipt }
      ]
    },
    {
      group: t('navigation.groups.finance'),
      items: [
        { name: t('navigation.expenses'), path: '/finance/expenses', icon: CreditCard },
        { name: t('navigation.suppliers'), path: '/finance/suppliers', icon: BookOpen, ownerOnly: true },
        { name: t('navigation.debt_ledger'), path: '/finance/debts', icon: FileWarning, kbd: 'F8' },
        { name: t('navigation.daily_close'), path: '/finance/daily-close', icon: CalendarCheck, kbd: 'F9' },
        { name: t('navigation.monthly_summary'), path: '/finance/monthly-summary', icon: BarChart3, ownerOnly: true }
      ]
    },
    {
      group: t('navigation.groups.settings'),
      items: [
        { name: t('navigation.store'), path: '/settings/store', icon: Store, ownerOnly: true },
        { name: t('navigation.users'), path: '/settings/users', icon: Users, ownerOnly: true },
        { name: t('navigation.backup'), path: '/settings/backup', icon: Database, ownerOnly: true },
        { name: t('navigation.catalog'), path: '/settings/catalog', icon: Smartphone, ownerOnly: true },
        { name: t('navigation.about', 'About App'), path: '/settings/about', icon: Info }
      ]
    }
  ].map(section => ({ ...section, items: section.items.filter(i => isOwner || !i.ownerOnly) }))

  return (
    <aside className={`flex flex-col h-screen bg-muted border-e border-border transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Brand & Logo */}
      <div className="flex items-center gap-2.5 h-14 px-3.5 shrink-0 bg-inverse">
        {/* Warshati Trace app tile */}
        <img src={markTile} alt="Warshati" className="h-8 w-8 shrink-0" />

        {/* Text Area */}
        {!collapsed && (
          <div className="flex flex-col justify-center overflow-hidden">
            <div className="flex items-end gap-1.5 leading-none mb-0.5">
              <span className="font-bold text-inverse-foreground text-base tracking-wide">WARSHATI</span>
              <span className="text-flux text-xs font-semibold mb-[2px] font-arabic">ورشتي</span>
            </div>
            <span className="text-inverse-foreground/75 text-[10px] uppercase font-medium tracking-wider leading-none">
              Shop Manager
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1.5 px-2">
        {navigation.map((section) => (
          <div key={section.group} className="mb-2">
            {!collapsed && (
              <p className="px-2.5 pt-2 pb-[3px] text-[11px] leading-[14px] font-semibold text-muted-foreground uppercase tracking-[.04em] rtl:normal-case rtl:tracking-normal">
                {section.group}
              </p>
            )}
            <div className="flex flex-col gap-px">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-2.5 h-[30px] px-2.5 rounded-sm
                    text-[13px] font-medium transition-colors duration-100
                    ${isActive ? 'bg-primary-soft text-primary-soft-foreground font-semibold [&>svg]:text-primary' : 'text-foreground hover:bg-accent hover:text-accent-foreground [&>svg]:text-muted-foreground'}
                    ${collapsed ? 'justify-center' : ''}
                  `}
                  title={collapsed ? (item.kbd ? `${item.name} (${item.kbd})` : item.name) : undefined}
                >
                  <item.icon className="h-[17px] w-[17px] shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
                  {!collapsed && item.kbd && <kbd className={`${KBD_CLASS} h-[18px] px-1 text-[10px]`}>{item.kbd}</kbd>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-1.5 px-2 shrink-0 flex flex-col gap-1">
        <button onClick={() => setShowFeedback(true)} className={`flex items-center gap-2.5 w-full h-[30px] px-2.5 rounded-sm text-[13px] font-medium text-foreground hover:bg-accent hover:text-accent-foreground [&>svg]:text-muted-foreground transition-colors cursor-pointer ${collapsed ? 'justify-center' : ''}`} title={collapsed ? 'Send Feedback' : undefined}>
          <MessageSquarePlus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Send Feedback</span>}
        </button>
        <button onClick={onShowShortcuts} className={`flex items-center gap-2.5 w-full h-[30px] px-2.5 rounded-sm text-[13px] font-medium text-foreground hover:bg-accent hover:text-accent-foreground [&>svg]:text-muted-foreground transition-colors cursor-pointer ${collapsed ? 'justify-center' : ''}`} title={`${t('shortcuts.title', 'Keyboard shortcuts')} (F1)`}>
          <Keyboard className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="flex-1 text-start truncate">{t('shortcuts.title', 'Keyboard shortcuts')}</span>}
          {!collapsed && <kbd className={`${KBD_CLASS} h-[18px] px-1 text-[10px]`}>F1</kbd>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center w-full h-[30px] rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer rtl:[&>svg]:-scale-x-100">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />
    </aside>
  )
}
