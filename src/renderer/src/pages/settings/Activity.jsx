import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { History } from 'lucide-react'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'

const select = 'h-9 rounded-sm border border-input bg-popover px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

/** Who did what (owner): deletions, price changes, cancelled payments, refunds, discounts, imports. */
export default function Activity() {
  const { t } = useTranslation()
  const cur = useCurrency()
  const [filter, setFilter] = useState({ action: '', userId: '', from: '', to: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['activity', filter],
    queryFn: () => api.get('/activity', { params: Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) }).then(r => r.data)
  })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data.users ?? r.data) })

  // { price: [9000, 9500], reason: 'typo' } → "Price: 9,000 → 9,500 · Reason: typo"
  const money = (k) => ['price', 'buy', 'sell', 'amount', 'discount', 'total'].includes(k)
  const val = (k, v) => typeof v === 'number' ? (money(k) ? `${v.toLocaleString()} ${cur}` : v.toLocaleString()) : k === 'kind' ? t(`activity.kind_${v}`) : v === true ? '✓' : String(v)
  const details = (d) => Object.entries(d || {})
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false)
    .map(([k, v]) => `${t(`activity.d.${k}`, { defaultValue: k })}: ${Array.isArray(v) ? `${val(k, v[0])} → ${val(k, v[1])}` : val(k, v)}`)
    .join(' · ')

  const columns = [
    { key: 'createdAt', label: t('activity.col_when'), render: (v) => <span className="whitespace-nowrap tabular-nums">{new Date(v).toLocaleString()}</span> },
    { key: 'userName', label: t('activity.col_who'), render: (v) => <span className="font-medium">{v}</span> },
    { key: 'action', label: t('activity.col_what'), render: (v) => <span className="whitespace-nowrap">{t(`activity.actions.${v}`, { defaultValue: v })}</span> },
    { key: 'label', label: t('activity.col_about'), render: (v) => <span className="font-medium">{v || '—'}</span> },
    { key: 'details', label: t('activity.col_details'), render: (v) => <span className="text-muted-foreground">{details(v)}</span> }
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[22px] leading-[30px] font-semibold text-foreground inline-flex items-center gap-2"><History className="h-5 w-5 text-primary" /> {t('activity.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('activity.subtitle')}</p>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <select value={filter.action} onChange={e => setFilter({ ...filter, action: e.target.value })} className={select}>
          <option value="">{t('activity.all_actions')}</option>
          {(data?.actions || []).map(a => <option key={a} value={a}>{t(`activity.actions.${a}`, { defaultValue: a })}</option>)}
        </select>
        <select value={filter.userId} onChange={e => setFilter({ ...filter, userId: e.target.value })} className={select}>
          <option value="">{t('activity.all_users')}</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <Input type="date" value={filter.from} max={filter.to || undefined} onChange={e => setFilter({ ...filter, from: e.target.value })} aria-label={t('activity.from')} />
        <Input type="date" value={filter.to} min={filter.from || undefined} onChange={e => setFilter({ ...filter, to: e.target.value })} aria-label={t('activity.to')} />
        {data && <span className="text-xs text-muted-foreground ms-auto">{t('activity.count', { count: data.total })}</span>}
      </div>
      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
        : <Table columns={columns} data={data?.entries || []} emptyTitle={t('activity.empty')} emptyDescription={t('activity.subtitle')} />}
    </div>
  )
}
