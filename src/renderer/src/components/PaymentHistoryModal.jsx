import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Undo2, Printer } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import Badge from './ui/Badge'
import { useCurrency } from '../lib/currency'

/**
 * Payments of one debt (customer or supplier), newest first.
 * The owner can cancel a wrong payment: a cancelling entry is recorded today (nothing is deleted).
 * onCancel(payment, reason) must return a promise.
 */
export default function PaymentHistoryModal({ open, onClose, title, payments = [], canCancel, onCancel, onPrint }) {
  const { t } = useTranslation()
  const cur = useCurrency()
  const [confirm, setConfirm] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const cancelledIds = new Set(payments.filter(p => p.reversalOf).map(p => p.reversalOf))
  const sorted = [...payments].sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
  const money = (v) => `${Math.abs(Number(v)).toLocaleString()} ${cur}`

  const doCancel = async () => {
    setBusy(true)
    try { await onCancel(confirm, reason) ; setConfirm(null); setReason('') } finally { setBusy(false) }
  }

  return (
    <>
      <Modal open={open && !confirm} onClose={onClose} title={title} size="lg">
        {sorted.length === 0
          ? <p className="text-sm text-muted-foreground">{t('finance.debts.history_empty')}</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-start py-1.5">{t('finance.debts.col_date')}</th>
                  <th className="text-end py-1.5">{t('finance.debts.col_amount')}</th>
                  <th className="text-start py-1.5 ps-4">{t('finance.debts.col_note')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map(p => {
                  const isReversal = !!p.reversalOf || Number(p.amount) < 0
                  const isCancelled = cancelledIds.has(p.id)
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2">{new Date(p.paidAt).toLocaleString()}</td>
                      <td className={`py-2 text-end font-medium ${isReversal ? 'text-destructive' : ''} ${isCancelled ? 'line-through text-muted-foreground' : ''}`}>
                        {isReversal ? '−' : ''}{money(p.amount)}
                      </td>
                      <td className="py-2 ps-4 text-muted-foreground">
                        {isReversal && <Badge color="danger" className="me-1">{t('finance.debts.cancelling_entry')}</Badge>}
                        {isCancelled && <Badge color="warning" className="me-1">{t('finance.debts.cancelled')}</Badge>}
                        {p.notes}
                      </td>
                      <td className="py-2 text-end whitespace-nowrap">
                        {onPrint && !isReversal && (
                          <Button variant="ghost" size="sm" onClick={() => onPrint(p)} className="me-1">
                            <Printer className="h-3.5 w-3.5" /> {t('finance.debts.btn_receipt')}
                          </Button>
                        )}
                        {canCancel && !isReversal && !isCancelled && (
                          <Button variant="outline" size="sm" onClick={() => { setConfirm(p); setReason('') }}>
                            <Undo2 className="h-3.5 w-3.5" /> {t('finance.debts.btn_cancel_payment')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={t('finance.debts.cancel_title')}
        footer={<><Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>{t('finance.debts.keep')}</Button><Button variant="danger" onClick={doCancel} loading={busy}>{t('finance.debts.confirm_cancel')}</Button></>}>
        {confirm && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{t('finance.debts.cancel_desc', { amount: money(confirm.amount), date: new Date(confirm.paidAt).toLocaleDateString() })}</p>
            <Input label={t('finance.debts.lbl_reason')} value={reason} onChange={e => setReason(e.target.value)} placeholder={t('finance.debts.ph_reason')} autoFocus />
          </div>
        )}
      </Modal>
    </>
  )
}
