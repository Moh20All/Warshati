import { NavLink } from 'react-router-dom'
import {
  Wrench, ShoppingCart, DollarSign, Settings,
  ClipboardList, Ticket, Shield, ArrowLeftRight,
  Receipt, CreditCard, BookOpen, FileWarning,
  CalendarCheck, Store, Users, Database,
  ChevronLeft, ChevronRight, LayoutDashboard,
  Contact, Package
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  {
    group: 'Main',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Customers', path: '/customers', icon: Contact },
      { name: 'Inventory', path: '/inventory', icon: Package }
    ]
  },
  {
    group: 'Repairs',
    items: [
      { name: 'Check-In', path: '/repairs/checkin', icon: ClipboardList },
      { name: 'Tickets', path: '/repairs/tickets', icon: Ticket },
      { name: 'Warranty', path: '/repairs/warranty', icon: Shield },
      { name: 'Trade-Ins', path: '/repairs/trade-ins', icon: ArrowLeftRight }
    ]
  },
  {
    group: 'Sales',
    items: [
      { name: 'POS', path: '/sales/pos', icon: ShoppingCart },
      { name: 'Invoices', path: '/sales/invoices', icon: Receipt }
    ]
  },
  {
    group: 'Finance',
    items: [
      { name: 'Expenses', path: '/finance/expenses', icon: CreditCard },
      { name: 'Suppliers', path: '/finance/suppliers', icon: BookOpen },
      { name: 'Debt Ledger', path: '/finance/debts', icon: FileWarning },
      { name: 'Daily Close', path: '/finance/daily-close', icon: CalendarCheck }
    ]
  },
  {
    group: 'Settings',
    items: [
      { name: 'Store', path: '/settings/store', icon: Store },
      { name: 'Users', path: '/settings/users', icon: Users },
      { name: 'Backup', path: '/settings/backup', icon: Database }
    ]
  }
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

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
            <span className="text-muted-foreground text-[10px] uppercase font-medium tracking-wider leading-none">Shop Manager</span>
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

      <div className="border-t border-border p-2 shrink-0">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center w-full py-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
