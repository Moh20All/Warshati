// Printable receipts built as HTML for the thermal/A4 printer (see usePrint).
import { printLogo } from './printKit.js'

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/** Balance left right after `payment` (payments in time order, cancelling entries included). */
export function remainingAfter(debt, payment) {
  const ordered = [...(debt.payments || [])].sort((a, b) => new Date(a.paidAt) - new Date(b.paidAt) || String(a.id).localeCompare(String(b.id)))
  let paid = 0
  for (const p of ordered) {
    paid += Number(p.amount)
    if (p.id === payment.id) break
  }
  return Math.max(0, Number(debt.totalAmount) - paid)
}

/** Delivery receipt: proof the repaired device was handed back (what was paid, what is left, warranty, signature). */
export function deliveryReceiptHtml({ t, dir, store, cur, ticket }) {
  const money = (v) => `${Number(v || 0).toLocaleString()} ${esc(cur)}`
  const row = (label, value, strong = false) =>
    `<div style="display:flex; justify-content:space-between; gap:8px; margin:3px 0;${strong ? ' font-weight:bold; font-size:14px;' : ''}"><span>${esc(label)}:</span><bdi style="text-align:end;">${value}</bdi></div>`
  const delivered = new Date(ticket.deliveredAt || Date.now())
  const warrantyEnd = new Date(delivered.getTime() + (ticket.warrantyDays || 0) * 86400000)
  const sale = ticket.sale
  const deposit = Number(sale?.depositApplied ?? ticket.deposit ?? 0)
  const paidNow = sale ? Number(sale.amountPaid) - Number(sale.depositApplied || 0) : 0
  const owed = Number(sale?.creditAmount || 0)
  const work = [ticket.diagnosis, ticket.partsUsedNotes].filter(Boolean).map(esc).join('<br>')

  return `<div dir="${dir}" style="box-sizing:border-box; width:100%;">
    <div style="text-align:center; margin-bottom:10px;">
      ${printLogo(store)}
      <h2 style="margin:0; font-size:16px; text-transform:uppercase;">${esc(store?.name || 'Warshati — ورشتي')}</h2>
      ${store?.address ? `<p style="margin:2px 0; font-size:10px;">${esc(store.address)}</p>` : ''}
      ${store?.phone ? `<p style="margin:2px 0; font-size:10px;"><bdi>${esc(store.phone)}</bdi></p>` : ''}
      <div style="border-top:2px solid #000; margin:8px 0;"></div>
      <p style="margin:0; font-size:13px; font-weight:bold;">${esc(t('repairs.delivery.title'))}</p>
      <p class="p-mono" style="margin:4px 0; font-size:14px; font-weight:bold;">${esc(ticket.ticketNumber)}</p>
    </div>
    <div style="font-size:11px;">
      ${row(t('repairs.delivery.delivered_on'), esc(delivered.toLocaleString()))}
      ${row(t('sales.receipt.customer'), esc(ticket.customer?.name))}
      ${ticket.customer?.phone ? row(t('repairs.delivery.phone'), esc(ticket.customer.phone)) : ''}
      ${row(t('repairs.tickets.device'), esc(`${ticket.deviceBrand} ${ticket.deviceModel}`))}
      ${ticket.imei ? row('IMEI', `<span class="p-mono">${esc(ticket.imei)}</span>`) : ''}
      ${work ? `<div style="margin:6px 0;"><div>${esc(t('repairs.delivery.work_done'))}:</div><div>${work}</div></div>` : ''}
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
      ${row(t('repairs.delivery.price'), money(ticket.finalCost))}
      ${deposit > 0 ? row(t('repairs.delivery.deposit'), `− ${money(deposit)}`) : ''}
      ${row(t('repairs.delivery.paid_now'), money(paidNow), true)}
      ${owed > 0 ? row(t('repairs.delivery.still_owed'), money(owed), true) : ''}
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
      ${ticket.warrantyDays > 0
        ? row(t('repairs.delivery.warranty'), esc(t('repairs.delivery.warranty_until', { days: ticket.warrantyDays, date: warrantyEnd.toLocaleDateString() })))
        : row(t('repairs.delivery.warranty'), esc(t('repairs.delivery.no_warranty')))}
    </div>
    <div style="margin-top:22px; font-size:11px;">
      <div>${esc(t('repairs.delivery.signature'))}:</div>
      <div style="border-bottom:1px solid #000; height:28px;"></div>
    </div>
    <p style="text-align:center; font-size:10px; margin-top:12px;">${esc(t('sales.receipt.footer'))}</p>
  </div>`
}

/** Receipt for one payment on a customer debt. */
export function paymentReceiptHtml({ t, dir, store, cur, debt, payment }) {
  const money = (v) => `${Number(v).toLocaleString()} ${esc(cur)}`
  const remaining = remainingAfter(debt, payment)
  const reference = debt.sale?.saleNumber || debt.repairTicket?.ticketNumber || t('finance.debts.types.OPENING_BALANCE')
  const row = (label, value, strong = false) =>
    `<div style="display:flex; justify-content:space-between; margin:3px 0;${strong ? ' font-weight:bold; font-size:14px;' : ''}"><span>${esc(label)}:</span><span>${value}</span></div>`

  return `<div dir="${dir}" style="box-sizing:border-box; width:100%;">
    <div style="text-align:center; margin-bottom:10px;">
      ${printLogo(store)}
      <h2 style="margin:0; font-size:16px; text-transform:uppercase;">${esc(store?.name || 'Warshati — ورشتي')}</h2>
      ${store?.address ? `<p style="margin:2px 0; font-size:10px;">${esc(store.address)}</p>` : ''}
      ${store?.phone ? `<p style="margin:2px 0; font-size:10px;">${esc(store.phone)}</p>` : ''}
      <div style="border-top:2px solid #000; margin:8px 0;"></div>
      <p style="margin:0; font-size:13px; font-weight:bold;">${esc(t('finance.debts.receipt_title'))}</p>
    </div>
    <div style="font-size:11px;">
      ${row(t('sales.receipt.date'), esc(new Date(payment.paidAt).toLocaleString()))}
      ${row(t('sales.receipt.customer'), esc(debt.customer?.name))}
      ${row(t('finance.debts.receipt_for'), `<span class="p-mono">${esc(reference)}</span>`)}
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
      ${row(t('finance.debts.receipt_total'), money(debt.totalAmount))}
      ${row(t('finance.debts.receipt_paid'), money(payment.amount), true)}
      ${row(t('finance.debts.receipt_remaining'), money(remaining), true)}
    </div>
    <div style="border-top:1px dashed #000; margin:10px 0;"></div>
    <p style="text-align:center; font-size:11px; margin:0;">${esc(remaining <= 0 ? t('finance.debts.receipt_settled') : t('finance.debts.receipt_thanks'))}</p>
  </div>`
}
