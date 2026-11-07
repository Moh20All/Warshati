import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, ArrowLeft, Wallet, Undo2 } from 'lucide-react'
import api from '../../lib/api'
import { useCurrency } from '../../lib/currency'
import { PAY_TYPES } from '../../lib/repairmen'
import { useToast } from '../../components/ui/Toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table from '../../components/ui/Table'
import Modal, { ConfirmModal } from '../../components/ui/Modal'
import StatusBadge from '../../components/ui/StatusBadge'

const emptyForm = { name: '', phone: '', payType: 'PROFIT_PERCENT', payValue: '', isActive: true }

/** Repairmen paid per repair (Settings → Store → Features → Repairmen). Click one to see his repairs and pay him. */
export default function Repairmen() {
  const { t } = useTranslation()
  const cur = useCurrency()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [edit, setEdit] = useState(null) // {} = new, or the repairman being edited
  const [form, setForm] = useState(emptyForm)
  const [openId, setOpenId] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const money = (v) => `${Number(v || 0).toLocaleString()} ${cur}`
  const rule = (r) => r.payType === 'FIXED' ? t('repairmen.rule_fixed', { amount: money(r.payValue) }) : t(`repairmen.rule_${r.payType === 'PRICE_PERCENT' ? 'price' : 'profit'}`, { value: Number(r.payValue) })

  const { data: list = [], isLoading } = useQuery({ queryKey: ['repairmen'], queryFn: () => api.get('/repairmen').then(r => r.data.repairmen) })
  const { data: page } = useQuery({ queryKey: ['repairman', openId], queryFn: () => api.get(`/repairmen/${openId}`).then(r => r.data.repairman), enabled: !!openId })
  // Empty amount = pay what he is owed
  const payValue = parseFloat(payAmount === '' ? page?.owed : payAmount) || 0
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['repairmen'] }); queryClient.invalidateQueries({ queryKey: ['repairman'] }) }

  const save = useMutation({
    mutationFn: (d) => edit?.id ? api.put(`/repairmen/${edit.id}`, d) : api.post('/repairmen', d),
    onSuccess: () => { refresh(); setEdit(null); toast.success(t('repairmen.saved')) },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })
  const pay = useMutation({
    mutationFn: () => api.post(`/repairmen/${openId}/payments`, { amount: payValue }),
    onSuccess: () => { refresh(); setPayAmount(''); toast.success(t('repairmen.paid')) },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const [cancelPay, setCancelPay] = useState(null) // wrong payment to cancel
  const cancel = useMutation({
    mutationFn: (paymentId) => api.post(`/repairmen/${openId}/payments/${paymentId}/cancel`),
    onSuccess: () => { refresh(); setCancelPay(null); toast.success(t('repairmen.cancelled')) },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed')
  })

  const openEdit = (r) => { setEdit(r || {}); setForm(r ? { name: r.name, phone: r.phone || '', payType: r.payType, payValue: String(Number(r.payValue)), isActive: r.isActive } : emptyForm) }

  const columns = [
    { key: 'name', label: t('repairmen.col_name'), render: (v, r) => <span className={`font-medium ${r.isActive ? '' : 'text-muted-foreground line-through'}`}>{v}</span> },
    { key: 'payType', label: t('repairmen.col_rule'), render: (_, r) => rule(r) },
    { key: 'owed', label: t('repairmen.col_owed'), render: (v) => v > 0 ? <span className="font-semibold text-destructive">{money(v)}</span> : money(v) },
    { key: 'actions', label: '', className: 'text-right', render: (_, r) => (
      <button onClick={(e) => { e.stopPropagation(); openEdit(r) }} className="p-1.5 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
    ) }
  ]

  return (
    <div className="animate-fade-in max-w-3xl">
      <Link to="/settings/store" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mb-2">
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t('settings.title')}
      </Link>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-[22px] leading-[30px] font-semibold text-foreground">{t('repairmen.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('repairmen.subtitle')}</p>
        </div>
        <Button onClick={() => openEdit(null)}><Plus className="h-4 w-4" /> {t('repairmen.btn_add')}</Button>
      </div>

      {isLoading ? <div className="text-center py-12 text-sm text-muted-foreground">{t('catalog.loading')}</div>
        : <Table columns={columns} data={list} emptyTitle={t('repairmen.empty')} emptyDescription={t('repairmen.empty_desc')} onRowClick={(r) => setOpenId(r.id)} />}

      {/* Add / edit */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('repairmen.title_edit') : t('repairmen.btn_add')}
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>{t('inventory.modal.cancel')}</Button><Button onClick={() => save.mutate({ ...form, payValue: parseFloat(form.payValue) || 0 })} loading={save.isPending} disabled={!form.name.trim()}>{t('settings.save')}</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('repairmen.col_name')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
            <Input label={t('repairs.details.lbl_phone')} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('repairmen.col_rule')}</label>
            {PAY_TYPES.map(p => (
              <label key={p} className="flex gap-2 items-start p-2 rounded-md border border-border cursor-pointer">
                <input type="radio" name="payType" checked={form.payType === p} onChange={() => setForm({ ...form, payType: p })} className="mt-0.5" />
                <span><span className="block text-sm font-medium">{t(`repairmen.type_${p}`)}</span><span className="block text-xs text-muted-foreground">{t(`repairmen.type_${p}_desc`)}</span></span>
              </label>
            ))}
          </div>
          <Input label={form.payType === 'FIXED' ? `${t('repairmen.lbl_amount')} (${cur})` : t('repairmen.lbl_percent')} type="number" min="0" value={form.payValue} onChange={e => setForm({ ...form, payValue: e.target.value })} />
          <p className="text-xs text-muted-foreground">{t('repairmen.manual_hint')}</p>
          {edit?.id && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> {t('repairmen.active')}
            </label>
          )}
        </div>
      </Modal>

      {/* His page: what he earned, what he was paid, his repairs */}
      <Modal open={!!openId} onClose={() => setOpenId(null)} title={page?.name || ''} size="lg">
        {page && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[['earned', page.earned], ['paid_total', page.paid], ['owed', page.owed]].map(([k, v]) => (
                <div key={k} className="rounded-md bg-muted p-3">
                  <p className="text-xs text-muted-foreground">{t(`repairmen.${k}`)}</p>
                  <p className={`text-lg font-semibold ${k === 'owed' && v > 0 ? 'text-destructive' : 'text-foreground'}`}>{money(v)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1"><Input label={t('repairmen.pay_amount')} type="number" min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={page.owed > 0 ? String(page.owed) : ''} /></div>
              <Button onClick={() => pay.mutate()} loading={pay.isPending} disabled={!(payValue > 0)}><Wallet className="h-4 w-4" /> {t('repairmen.btn_pay')}</Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('repairmen.pay_hint')}</p>
            <div>
              <h3 className="text-sm font-semibold mb-2">{t('repairmen.repairs')}</h3>
              {page.tickets.length === 0 ? <p className="text-sm text-muted-foreground">{t('repairmen.no_repairs')}</p> : (
                <ul className="divide-y divide-border text-sm max-h-64 overflow-auto">
                  {page.tickets.map(x => (
                    <li key={x.id} className="flex items-center gap-3 py-1.5">
                      <Link to={`/repairs/tickets/${x.id}`} className="p-mono text-primary hover:underline">{x.ticketNumber}</Link>
                      <span className="flex-1 truncate text-muted-foreground">{x.deviceBrand} {x.deviceModel} · {x.customer?.name}</span>
                      <StatusBadge kind="ticket" value={x.status} />
                      <span className={x.status === 'DELIVERED' ? 'font-medium' : 'text-muted-foreground'}>{money(x.share)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {page.payments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">{t('repairmen.payments')}</h3>
                <ul className="divide-y divide-border text-sm max-h-40 overflow-auto">
                  {page.payments.map(p => {
                    const cancelled = page.payments.some(x => x.reversalOf === p.id)
                    return (
                      <li key={p.id} className="flex items-center gap-3 py-1.5">
                        <span className="flex-1 text-muted-foreground">{new Date(p.paidAt).toLocaleString()}{p.reversalOf ? ` · ${t('repairmen.cancel_entry')}` : ''}</span>
                        <span className={cancelled ? 'line-through text-muted-foreground' : ''}>{money(p.amount)}</span>
                        {!p.reversalOf && !cancelled && Number(p.amount) > 0 && (
                          <button onClick={() => setCancelPay(p)} className="p-1 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer" title={t('repairmen.btn_cancel_pay')}><Undo2 className="h-3.5 w-3.5" /></button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!cancelPay} onClose={() => setCancelPay(null)} onConfirm={() => cancel.mutate(cancelPay.id)} loading={cancel.isPending}
        title={t('repairmen.btn_cancel_pay')} message={t('repairmen.cancel_msg', { amount: money(cancelPay?.amount) })} confirmText={t('repairmen.btn_cancel_pay')} />
    </div>
  )
}
