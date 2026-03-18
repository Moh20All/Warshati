import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Ticket, ShoppingCart, AlertTriangle, Package, TrendingUp, Clock, DollarSign, CreditCard, Plus, UserPlus, Receipt, CalendarCheck } from 'lucide-react'
import api from '../lib/api'
import Badge from '../components/ui/Badge'
import { useAuth } from '../lib/auth'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: tickets } = useQuery({
    queryKey: ['tickets-dash'],
    queryFn: () => api.get('/tickets').then(r => r.data.tickets)
  })

  const { data: sales } = useQuery({
    queryKey: ['sales-dash'],
    queryFn: () => api.get('/sales').then(r => r.data.sales)
  })

  const { data: debts } = useQuery({
    queryKey: ['debts-dash'],
    queryFn: () => api.get('/debts').then(r => r.data.debts)
  })

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock-dash'],
    queryFn: () => api.get('/inventory/low-stock-count').then(r => r.data.count)
  })

  const { data: expenses } = useQuery({
    queryKey: ['expenses-dash'],
    queryFn: () => api.get('/expenses').then(r => r.data.expenses)
  })

  // Calculate stats
  const activeTickets = tickets?.filter(t => ['DIAGNOSING', 'WAITING_PARTS', 'IN_REPAIR'].includes(t.status)) || []
  const readyTickets = tickets?.filter(t => t.status === 'DONE') || []
  const urgentTickets = activeTickets.filter(t => t.priority === 'URGENT').length || 0

  const today = new Date().toDateString()
  // Exclude ticket-linked sales to avoid double-counting (those are counted as ticket profit)
  const todaySales = sales?.filter(s => new Date(s.createdAt).toDateString() === today && !s.repairTicketId) || []
  const todayRevenue = todaySales.reduce((sum, s) => sum + parseFloat(s.total), 0)
  
  let todayCogs = 0
  todaySales.forEach(sale => {
    sale.items?.forEach(item => { todayCogs += parseFloat(item.unitCost || 0) * item.quantity })
  })

  // Include tickets that were either marked DONE today or DELIVERED today
  const finishedToday = tickets?.filter(t => 
    (['DONE', 'DELIVERED'].includes(t.status)) && 
    new Date(t.updatedAt).toDateString() === today
  ) || []
  
  const ticketRevenue = finishedToday.reduce((sum, t) => sum + parseFloat(t.finalCost || 0), 0)
  const ticketCogs = finishedToday.reduce((sum, t) => sum + parseFloat(t.partsCost || 0), 0)
  const netTicketProfit = ticketRevenue - ticketCogs

  // Today's expenses
  const todayExpenses = expenses?.filter(e => new Date(e.expenseDate).toDateString() === today) || []
  const totalExpenses = todayExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)

  // Today's debt collected
  const todayDebtCollected = debts?.reduce((sum, d) => {
    const todayPayments = d.payments?.filter(p => new Date(p.paidAt).toDateString() === today) || []
    return sum + todayPayments.reduce((s, p) => s + parseFloat(p.amount), 0)
  }, 0) || 0

  // Net Profit = (Sales Revenue - COGS) + Ticket Net Profit + Debt Collected - Expenses
  const netProfit = (todayRevenue - todayCogs) + netTicketProfit + todayDebtCollected - totalExpenses

  const openDebts = debts?.filter(d => d.status !== 'SETTLED') || []
  const totalDebt = openDebts.reduce((sum, d) => sum + parseFloat(d.remaining), 0)

  const kpis = [
    { label: 'Pending Repairs', value: activeTickets.length, icon: Ticket, color: 'text-info', sub: readyTickets.length > 0 ? `${readyTickets.length} ready for pickup` : (urgentTickets > 0 ? `${urgentTickets} urgent` : 'No active jobs'), subColor: readyTickets.length > 0 ? 'text-success' : 'text-muted-foreground', onClick: () => navigate('/repairs/tickets') },
    { label: "Today's Net Profit", value: `${netProfit.toLocaleString()} DZD`, icon: TrendingUp, color: 'text-success', sub: `${todaySales.length} sales, ${finishedToday.length} completed repairs`, onClick: () => navigate('/finance/daily-close') },
    { label: 'Outstanding Debt', value: `${totalDebt.toLocaleString()} DZD`, icon: CreditCard, color: 'text-warning', sub: `${openDebts.length} entries`, onClick: () => navigate('/finance/debts') },
    { label: 'Low Stock Items', value: lowStock ?? '—', icon: Package, color: 'text-destructive', onClick: () => navigate('/inventory') }
  ]

  // Recent tickets
  const recentTickets = tickets?.slice(0, 5) || []
  // Recent sales
  const recentSales = sales?.slice(0, 5) || []

  const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Quick Access Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { label: 'New Ticket', icon: Plus, path: '/repairs/tickets/new', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20' },
          { label: 'New Sale', icon: ShoppingCart, path: '/sales/pos', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' },
          { label: 'Add Customer', icon: UserPlus, path: '/customers?new=1', color: 'bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/20' },
          { label: 'Add Expense', icon: Receipt, path: '/finance/expenses?new=1', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20' },
          { label: 'Daily Close', icon: CalendarCheck, path: '/finance/daily-close', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20 hover:bg-pink-500/20' },
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
            className="border border-border rounded-lg bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            {kpi.sub && <p className={`text-xs mt-1 ${kpi.subColor || 'text-muted-foreground'}`}>{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <div className="border border-border rounded-lg bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Recent Tickets</h3>
            <button onClick={() => navigate('/repairs/tickets')} className="text-xs text-primary hover:underline cursor-pointer">View all</button>
          </div>
          <div className="divide-y divide-border">
            {recentTickets.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No tickets yet</div>
            ) : recentTickets.map(t => (
              <div key={t.id} onClick={() => navigate(`/repairs/tickets/${t.id}`)} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">{t.ticketNumber}</span>
                    <Badge color={t.status}>{t.status.replace('_', ' ')}</Badge>
                    <Badge color={t.priority}>{t.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.customer?.name} · {t.deviceBrand} {t.deviceModel}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{daysSince(t.receivedAt)}d ago</p>
                  {t.finalCost && <p className="text-xs font-medium">{Number(t.finalCost).toLocaleString()} DZD</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="border border-border rounded-lg bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Recent Sales</h3>
            <button onClick={() => navigate('/sales/invoices')} className="text-xs text-primary hover:underline cursor-pointer">View all</button>
          </div>
          <div className="divide-y divide-border">
            {recentSales.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No sales yet</div>
            ) : recentSales.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">{s.saleNumber}</span>
                    <Badge color={s.status === 'COMPLETED' ? 'success' : 'warning'}>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.customer?.name || 'Walk-in'} · {s.items?.length || 0} items</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{Number(s.total).toLocaleString()} DZD</p>
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
