import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Ticket, ShoppingCart, AlertTriangle, Package, TrendingUp, Clock, DollarSign, CreditCard, Plus, UserPlus, Receipt, CalendarCheck, Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../lib/api'
import { useCurrency } from '../lib/currency'
import Badge from '../components/ui/Badge'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import { useAuth } from '../lib/auth'
import { usePrint } from '../lib/usePrint'

export default function Dashboard() {
  const cur = useCurrency()
  const { user, isOwner } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const print = usePrint()

  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then(r => r.data.store)
  })

  // One small answer with counts and the latest rows (never the whole history)
  const { data: dash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data)
  })

  const { data: todayFigures } = useQuery({
    queryKey: ['daily-close-preview'],
    queryFn: () => api.get('/daily-close/preview').then(r => r.data)
  })

  const activeTickets = dash?.activeTickets || []
  const activeCount = dash?.tickets.active || 0
  const readyCount = dash?.tickets.ready || 0
  const urgentTickets = dash?.tickets.urgent || 0
  const todaySales = dash?.todaySales || []
  const lowStock = dash?.lowStock

  // Today's figures come from the server so they always match the Daily Close
  const netProfit = todayFigures?.netProfit || 0
  const deliveredToday = todaySales.filter(s => s.repairTicketId).length

  const openDebts = dash?.debts.open || 0
  const totalDebt = dash?.debts.total || 0

  const printOverview = () => {
    const dir = i18n.dir()
    const storeName = store?.name || 'Warshati — ورشتي'
    
    const html = `
      <div dir="${dir}" style="padding: 20px; color: #000;">
        <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h1 style="margin:0; font-size:24px;">${storeName}</h1>
          <h2 style="margin:5px 0 0 0; font-size:18px; color: #000;">DASHBOARD OVERVIEW / نظرة عامة</h2>
          <p style="margin:5px 0 0 0; font-size:14px;">Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>

        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
          ${kpis.map(k => `
            <div style="border: 1px solid #000; padding: 15px; border-radius: 8px;">
              <div style="font-size: 11px; color: #000; margin-bottom: 5px; text-transform: uppercase;">${k.label}</div>
              <div style="font-size: 20px; font-weight: bold;">${k.value}</div>
              <div style="font-size: 11px; color: #000; margin-top: 3px;">${k.sub || ''}</div>
            </div>
          `).join('')}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div>
            <h3 style="font-size: 16px; border-bottom: 1px dotted #000; padding-bottom: 5px; margin-bottom: 15px;">Recent Active Tickets</h3>
            ${activeTickets.slice(0, 10).map(t => `
               <div style="font-size: 12px; margin-bottom: 8px; border-bottom: 1px dotted #000; padding-bottom: 5px;">
                  <strong class="p-mono">${t.ticketNumber}</strong> - ${t.customer?.name} (${t.deviceBrand} ${t.deviceModel})
                  <div style="color: #000;">Status: ${t.status} | Priority: ${t.priority}</div>
               </div>
            `).join('')}
          </div>
          <div>
            <h3 style="font-size: 16px; border-bottom: 1px dotted #000; padding-bottom: 5px; margin-bottom: 15px;">Recent Shop Sales</h3>
            ${todaySales.slice(0, 10).map(s => `
               <div style="font-size: 12px; margin-bottom: 8px; border-bottom: 1px dotted #000; padding-bottom: 5px;">
                  <strong class="p-mono">${s.saleNumber}</strong> - ${Number(s.total).toLocaleString()} ${cur}
                  <div style="color: #000;">${s.customer?.name || 'Walk-in'} | ${s.paymentMethod}</div>
               </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
    print.print(html, 'report')
  }

  const kpis = [
    { label: t('dashboard.pending_repairs'), value: activeCount, icon: Ticket, color: 'text-info', sub: readyCount > 0 ? `${readyCount} ready for pickup` : (urgentTickets > 0 ? `${urgentTickets} urgent` : 'No active jobs'), subColor: readyCount > 0 ? 'text-success' : 'text-muted-foreground', onClick: () => navigate('/repairs/tickets') },
    // Staff see today's drawer cash instead of the shop's profit
    isOwner
      ? { label: t('dashboard.net_profit'), value: `${netProfit.toLocaleString()} ${cur}`, icon: TrendingUp, color: 'text-success', sub: `${todaySales.length - deliveredToday} sales, ${deliveredToday} delivered repairs`, onClick: () => navigate('/finance/daily-close') }
      : { label: t('finance.reports.stat_net_cash'), value: `${(todayFigures?.netCash || 0).toLocaleString()} ${cur}`, icon: TrendingUp, color: 'text-success', sub: `${todaySales.length - deliveredToday} sales, ${deliveredToday} delivered repairs`, onClick: () => navigate('/finance/daily-close') },
    { label: t('dashboard.outstanding_debt'), value: `${totalDebt.toLocaleString()} ${cur}`, icon: CreditCard, color: 'text-warning', sub: `${openDebts} entries`, onClick: () => navigate('/finance/debts') },
    { label: t('dashboard.low_stock'), value: lowStock ?? '—', icon: Package, color: 'text-destructive', onClick: () => navigate('/inventory') }
  ]

  const recentTickets = dash?.recentTickets || []
  const recentSales = dash?.recentSales || []

  const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('dashboard.welcome')}, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Button variant="outline" size="sm" onClick={printOverview}>
          <Printer className="h-4 w-4" /> {t('common.print', 'Print Overview')}
        </Button>
      </div>

      {/* Quick Access Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { label: t('dashboard.new_ticket'), icon: Plus, path: '/repairs/tickets/new', color: 'bg-primary text-primary-foreground border-primary hover:bg-primary-hover' },
          { label: t('dashboard.new_sale'), icon: ShoppingCart, path: '/sales/pos', color: 'bg-secondary text-secondary-foreground border-transparent hover:bg-accent hover:text-accent-foreground' },
          { label: t('dashboard.add_customer'), icon: UserPlus, path: '/customers?new=1', color: 'bg-secondary text-secondary-foreground border-transparent hover:bg-accent hover:text-accent-foreground' },
          { label: t('dashboard.add_expense'), icon: Receipt, path: '/finance/expenses?new=1', color: 'bg-secondary text-secondary-foreground border-transparent hover:bg-accent hover:text-accent-foreground' },
          { label: t('dashboard.daily_close'), icon: CalendarCheck, path: '/finance/daily-close', color: 'bg-secondary text-secondary-foreground border-transparent hover:bg-accent hover:text-accent-foreground' },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={() => navigate(btn.path)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${btn.color}`}
          >
            <btn.icon className="h-4 w-4" />
            {btn.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} onClick={kpi.onClick}
            className="border border-border rounded-md bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <p className="text-[22px] leading-[30px] font-semibold text-foreground">{kpi.value}</p>
            {kpi.sub && <p className={`text-xs mt-1 ${kpi.subColor || 'text-muted-foreground'}`}>{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <div className="border border-border rounded-md bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">{t('dashboard.recent_tickets')}</h3>
            <button onClick={() => navigate('/repairs/tickets')} className="text-xs text-primary hover:underline cursor-pointer">{t('dashboard.view_all')}</button>
          </div>
          <div className="divide-y divide-border">
            {recentTickets.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t('dashboard.no_tickets')}</div>
            ) : recentTickets.map(t => (
              <div key={t.id} onClick={() => navigate(`/repairs/tickets/${t.id}`)} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-primary">{t.ticketNumber}</span>
                    <StatusBadge kind="ticket" value={t.status} />
                    <StatusBadge kind="priority" value={t.priority} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.customer?.name} · {t.deviceBrand} {t.deviceModel}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{daysSince(t.receivedAt)}d ago</p>
                  {t.finalCost && <p className="text-xs font-medium">{Number(t.finalCost).toLocaleString()} {cur}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="border border-border rounded-md bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">{t('dashboard.recent_sales')}</h3>
            <button onClick={() => navigate('/sales/invoices')} className="text-xs text-primary hover:underline cursor-pointer">{t('dashboard.view_all')}</button>
          </div>
          <div className="divide-y divide-border">
            {recentSales.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t('dashboard.no_sales')}</div>
            ) : recentSales.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-primary">{s.saleNumber}</span>
                    <StatusBadge kind="sale" value={s.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.customer?.name || 'Walk-in'} · {s.itemsCount || 0} items</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{Number(s.total).toLocaleString()} {cur}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
