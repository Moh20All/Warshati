import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wrench, 
  Package, 
  Calendar,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Table from '../../components/ui/Table'
import { useQuery } from '@tanstack/react-query'
import { usePrint } from '../../lib/usePrint'

export default function MonthlySummary() {
  const cur = useCurrency()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const print = usePrint()
  const { summary = { dailyData: [] }, stats = {}, topItems = [] } = data || {}

  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then(r => r.data.store)
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/reports/monthly?month=${selectedMonth}`)
      setData(res.data)
    } catch (err) {
      console.error('Failed to fetch monthly report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const changeMonth = (offset) => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const date = new Date(year, month - 1 + offset, 1)
    setSelectedMonth(date.toISOString().slice(0, 7))
  }

  const printMonthlyReport = () => {
    if (!data) return
    const dir = i18n.dir()
    const storeName = store?.name || 'Warshati — ورشتي'
    
    const html = `
      <div dir="${dir}" style="font-family:sans-serif; padding: 20px; color: #333;">
        <div style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h1 style="margin:0; font-size:24px;">${storeName}</h1>
          <h2 style="margin:5px 0 0 0; font-size:18px; color: #666;">MONTHLY SUMMARY / تقرير شهري</h2>
          <p style="margin:5px 0 0 0; font-size:14px;">Month: ${selectedMonth}</p>
          <p style="margin:2px 0 0 0; font-size:12px;">Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px;">
          <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-transform: uppercase;">Total Revenue</div>
            <div style="font-size: 18px; font-weight: bold;">${summary.totalRevenue.toLocaleString()} ${cur}</div>
          </div>
          <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-transform: uppercase;">Total Expenses</div>
            <div style="font-size: 18px; font-weight: bold;">${summary.totalExpenses.toLocaleString()} ${cur}</div>
          </div>
          <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-transform: uppercase;">Net Profit</div>
            <div style="font-size: 18px; font-weight: bold; color: ${summary.netProfit >= 0 ? '#10b981' : '#f43f5e'};">${summary.netProfit.toLocaleString()} ${cur}</div>
          </div>
          <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-transform: uppercase;">Net Cash</div>
            <div style="font-size: 18px; font-weight: bold; color: ${summary.netCash >= 0 ? '#10b981' : '#f43f5e'};">${summary.netCash.toLocaleString()} ${cur}</div>
          </div>
          <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #666; margin-bottom: 3px; text-transform: uppercase;">Debt Collected</div>
            <div style="font-size: 18px; font-weight: bold;">${summary.totalDebtCollected.toLocaleString()} ${cur}</div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">Repairs Stats</h3>
          <p>Tickets Received: <strong>${stats.ticketsReceived}</strong></p>
          <p>Tickets Delivered: <strong>${stats.ticketsDelivered}</strong></p>
        </div>

        <div>
          <h3 style="font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">Top Items Sold</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9f9f9;">
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Item Name</th>
                <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${topItems.map(item => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
                  <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eee;">x${item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
    print.print(html, 'report')
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Spinner size="lg" />
      <p className="text-muted-foreground mt-4">{t('users.loading')}</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('finance.reports.title')}</h1>
          <p className="text-muted-foreground">
            {t('finance.reports.subtitle', { month: selectedMonth })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-card border border-border rounded-lg p-1">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none outline-none px-2 py-1 text-sm font-medium"
            />
            <button 
              onClick={() => changeMonth(1)}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={printMonthlyReport}>
            <Printer className="w-4 h-4" /> {t('finance.reports.btn_print')}
          </Button>
        </div>
      </div>

      {!data || (summary.dailyData.length === 0) ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">{t('finance.reports.no_data')}</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard 
              label={t('finance.reports.stat_revenue')} 
              value={summary.totalRevenue} 
              icon={TrendingUp} 
              color="text-muted-foreground" 
              bg="bg-muted"
              currency={t('settings.currency_placeholder')}
            />
            <StatCard 
              label={t('finance.reports.stat_expenses')} 
              value={summary.totalExpenses} 
              icon={TrendingDown} 
              color="text-muted-foreground" 
              bg="bg-muted"
              currency={t('settings.currency_placeholder')}
            />
            <StatCard 
              label={t('finance.reports.stat_profit')}
              value={summary.netProfit}
              icon={DollarSign} 
              color="text-primary" 
              bg="bg-primary-soft"
              currency={t('settings.currency_placeholder')}
              isProfit
            />
            <StatCard 
              label={t('finance.reports.stat_collected')} 
              value={summary.totalDebtCollected} 
              icon={TrendingUp} 
              color="text-muted-foreground"
              bg="bg-muted"
              currency={t('settings.currency_placeholder')}
            />
            <StatCard
              label={t('finance.reports.stat_net_cash')}
              value={summary.netCash}
              icon={DollarSign}
              color="text-muted-foreground"
              bg="bg-muted"
              currency={t('settings.currency_placeholder')}
              isProfit
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Revenue Chart (Simple CSS implementation) */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">{t('finance.reports.chart_title')}</h2>
              </div>
              
              <div className="h-64 flex items-end gap-1 px-2 border-b border-border">
                {summary.dailyData.map((d, i) => {
                  const maxRevenue = Math.max(...summary.dailyData.map(x => x.revenue), 1)
                  const height = (d.revenue / maxRevenue) * 100
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      <div 
                        className="w-full bg-primary/20 hover:bg-primary transition-all rounded-t-sm"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap border border-border">
                            {new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: {d.revenue.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-2 px-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                <span>1st</span>
                <span>15th</span>
                <span>{summary.dailyData.length}th</span>
              </div>
            </div>

            {/* Ticket Stats */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Wrench className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">{t('navigation.repairs')}</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">{t('finance.reports.stat_received')}</span>
                    <span className="text-lg font-bold text-foreground">{stats.ticketsReceived}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">{t('finance.reports.stat_delivered')}</span>
                    <span className="text-lg font-bold text-foreground">{stats.ticketsDelivered}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">{t('finance.reports.top_items_title')}</h2>
                </div>
                <div className="space-y-2">
                  {topItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                      <span className="truncate max-w-[150px]">{item.name}</span>
                      <span className="font-medium">x{item.quantity}</span>
                    </div>
                  ))}
                  {topItems.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No parts or items sold this month.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, bg, currency, isProfit }) {
  const isNegative = isProfit && value < 0
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${bg} ${color} transition-colors`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${isNegative ? 'text-destructive' : 'text-foreground'}`}>
          {value.toLocaleString()}
        </span>
        <span className="text-[10px] text-muted-foreground font-bold">{currency}</span>
      </div>
    </div>
  )
}
