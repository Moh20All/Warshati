import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Wrench, ShoppingCart, DollarSign, Settings,
  ClipboardList, Ticket, Shield, ArrowLeftRight,
  Receipt, CreditCard, BookOpen, FileWarning,
  CalendarCheck, Store, Users, Database,
  ChevronLeft, ChevronRight, LayoutDashboard,
  Contact, Package, BarChart3, Info,
  MessageSquarePlus, Smartphone
} from 'lucide-react'
import { useState } from 'react'
import FeedbackModal from '../FeedbackModal'
import { useAuth } from '../../lib/auth'


export default function Sidebar() {
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
        { name: t('navigation.inventory'), path: '/inventory', icon: Package },
        { name: t('navigation.devices'), path: '/devices', icon: Smartphone }
      ]
    },
    {
      group: t('navigation.groups.repairs'),
      items: [
        { name: t('navigation.check_in'), path: '/repairs/checkins', icon: ClipboardList },
        { name: t('navigation.tickets'), path: '/repairs/tickets', icon: Ticket },
        { name: t('navigation.warranty'), path: '/repairs/warranty', icon: Shield },
        { name: t('navigation.trade_ins'), path: '/repairs/trade-ins', icon: ArrowLeftRight }
      ]
    },
    {
      group: t('navigation.groups.sales'),
      items: [
        { name: t('navigation.pos'), path: '/sales/pos', icon: ShoppingCart },
        { name: t('navigation.invoices'), path: '/sales/invoices', icon: Receipt }
      ]
    },
    {
      group: t('navigation.groups.finance'),
      items: [
        { name: t('navigation.expenses'), path: '/finance/expenses', icon: CreditCard },
        { name: t('navigation.suppliers'), path: '/finance/suppliers', icon: BookOpen, ownerOnly: true },
        { name: t('navigation.debt_ledger'), path: '/finance/debts', icon: FileWarning },
        { name: t('navigation.daily_close'), path: '/finance/daily-close', icon: CalendarCheck },
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
    <aside className={`flex flex-col h-screen bg-card border-r border-border transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0 bg-[#0c0f1a]">
        {/* Rakam Icon Mark (36x36) */}
        <div className="relative flex flex-col justify-center items-start h-9 w-9 rounded-md shrink-0 bg-[#0c0f1a] overflow-hidden" style={{ minWidth: '36px' }}>
          {/* Horizontal lines */}
          <div className="w-5 h-[2px] bg-white opacity-100 mb-1 rounded-sm ml-1.5" />
          <div className="w-4 h-[2px] bg-white opacity-75 mb-1 rounded-sm ml-1.5" />
          <div className="w-3 h-[2px] bg-white opacity-50 rounded-sm ml-1.5" />
          {/* Gold circle in lower right */}
          <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#c9972b]" />
        </div>

        {/* Text Area */}
        {!collapsed && (
          <div className="flex flex-col justify-center overflow-hidden">
            <div className="flex items-end gap-1.5 leading-none mb-0.5">
              <span className="font-bold text-white text-base tracking-wide">RAKAM</span>
              <span className="text-[#c9972b] text-xs font-semibold mb-[2px]">رقم</span>
            </div>
            <span className="text-muted-foreground text-[10px] uppercase font-medium tracking-wider leading-none">
              Shop Manager
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navigation.map((section) => (
          <div key={section.group} className="mb-4">
            {!collapsed && (
              <p className="px-2 mb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {section.group}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-2.5 px-2.5 py-1.5 rounded-md
                    text-sm transition-colors duration-100
                    ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
                    ${collapsed ? 'justify-center' : ''}
                  `}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-2 shrink-0 space-y-1">
        <button onClick={() => setShowFeedback(true)} className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer ${collapsed ? 'justify-center' : ''}`} title={collapsed ? 'Send Feedback' : undefined}>
          <MessageSquarePlus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Send Feedback</span>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center w-full py-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />
    </aside>
  )
}
