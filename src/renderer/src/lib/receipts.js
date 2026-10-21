// Printable receipts built as HTML for the thermal/A4 printer (see usePrint).

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

/** Receipt for one payment on a customer debt. */
export function paymentReceiptHtml({ t, dir, store, cur, debt, payment }) {
  const money = (v) => `${Number(v).toLocaleString()} ${esc(cur)}`
  const remaining = remainingAfter(debt, payment)
  const reference = debt.sale?.saleNumber || debt.repairTicket?.ticketNumber || t('finance.debts.types.OPENING_BALANCE')
  const row = (label, value, strong = false) =>
    `<div style="display:flex; justify-content:space-between; margin:3px 0;${strong ? ' font-weight:bold; font-size:14px;' : ''}"><span>${esc(label)}:</span><span>${value}</span></div>`

  return `<div dir="${dir}" style="font-family:'Courier New', monospace; box-sizing:border-box; width:100%;">
    <div style="text-align:center; margin-bottom:10px;">
      <h2 style="margin:0; font-size:16px; text-transform:uppercase;">${esc(store?.name || 'Warshati — ورشتي')}</h2>
      ${store?.address ? `<p style="margin:2px 0; font-size:10px;">${esc(store.address)}</p>` : ''}
      ${store?.phone ? `<p style="margin:2px 0; font-size:10px;">${esc(store.phone)}</p>` : ''}
      <div style="border-top:2px solid #000; margin:8px 0;"></div>
      <p style="margin:0; font-size:13px; font-weight:bold;">${esc(t('finance.debts.receipt_title'))}</p>
    </div>
    <div style="font-size:11px;">
      ${row(t('sales.receipt.date'), esc(new Date(payment.paidAt).toLocaleString()))}
      ${row(t('sales.receipt.customer'), esc(debt.customer?.name))}
      ${row(t('finance.debts.receipt_for'), esc(reference))}
      <div style="border-top:1px dashed #000; margin:8px 0;"></div>
      ${row(t('finance.debts.receipt_total'), money(debt.totalAmount))}
      ${row(t('finance.debts.receipt_paid'), money(payment.amount), true)}
      ${row(t('finance.debts.receipt_remaining'), money(remaining), true)}
    </div>
    <div style="border-top:1px dashed #000; margin:10px 0;"></div>
    <p style="text-align:center; font-size:11px; margin:0;">${esc(remaining <= 0 ? t('finance.debts.receipt_settled') : t('finance.debts.receipt_thanks'))}</p>
  </div>`
}
