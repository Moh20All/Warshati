// Adhesive sticker for a repaired device (see components/RepairLabelModal.jsx). Sizes in mm.
import { code128Svg, ticketBarcode } from './barcode.js'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const LINE = 2.9 // mm per text line

/** Ticket number + barcode, client, device (shop name from 25 mm high, problem from 30 mm). */
export function repairLabelHtml(ticket, { size, shop, showShop, showPhone, showIssue }) {
  const [w, h] = size.split('x').map(Number)
  const lines = [
    showShop && h >= 25 && `<div class="rl-shop">${esc(shop)}</div>`,
    `<div class="rl-top"><span class="p-mono rl-num">${esc(ticket.ticketNumber)}</span>${w >= 40 ? `<span>${new Date(ticket.receivedAt || Date.now()).toLocaleDateString()}</span>` : ''}</div>`,
    'BARCODE',
    `<div class="rl-line" dir="auto"><b>${esc(ticket.customer?.name)}</b>${showPhone && ticket.customer?.phone ? ` · <bdi>${esc(ticket.customer.phone)}</bdi>` : ''}</div>`,
    `<div class="rl-line" dir="auto">${esc(`${ticket.deviceBrand} ${ticket.deviceModel}`)}</div>`,
    showIssue && h >= 30 && `<div class="rl-line" dir="auto">${esc(ticket.issueDesc)}</div>`
  ].filter(Boolean)
  const barH = Math.max(4, h - 2.4 - (lines.length - 1) * LINE)
  return `<div class="rl" style="width:${w}mm;height:${h}mm">`
    + lines.map(l => (l === 'BARCODE' ? code128Svg(ticketBarcode(ticket.ticketNumber), { width: `${w - 4}mm`, height: `${barH}mm` }) : l)).join('')
    + '</div>'
}

export const REPAIR_LABEL_CSS = `<style>
  .rl { box-sizing: border-box; padding: 1.2mm 2mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; break-after: page; page-break-after: always; background: #fff; color: #000; }
  .rl:last-child { break-after: auto; page-break-after: auto; }
  .rl > svg { align-self: center; }
  .rl-shop { font-size: 6pt; font-weight: 700; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rl-top { display: flex; justify-content: space-between; gap: 1mm; font-size: 6.5pt; white-space: nowrap; }
  .rl-num { font-size: 7.5pt; font-weight: 700; }
  .rl-line { font-size: 6.5pt; line-height: ${LINE}mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>`
