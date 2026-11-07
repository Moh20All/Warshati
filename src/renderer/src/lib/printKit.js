// Shared bits of the printed templates (design system print.md).
// The print wrapper (src/main/server/lib/print.js) sizes .p-logo (40px on 80mm, 30px on 58mm) and styles .p-mono.

/** Black Trace mark (assets/brand/mark-trace-black.svg), inline so it prints without loading a file. */
export const PRINT_LOGO = '<svg class="p-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">'
  + '<path d="M12 16 L12 34 L22 46 L32 34 L42 46 L52 34 L52 16" fill="none" stroke="#000" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>'
  + '<circle cx="32" cy="34" r="4.5" fill="#000"/><circle cx="12" cy="16" r="6" fill="#000"/><circle cx="12" cy="16" r="2.52" fill="#fff"/>'
  + '<circle cx="52" cy="16" r="6" fill="#000"/><circle cx="52" cy="16" r="2.52" fill="#fff"/></svg>'

/** Logo at the top of printed papers: the shop's own logo (Settings → Store), or none */
export const printLogo = (store) =>
  /^data:image\/(png|jpeg|webp);base64,/.test(store?.logoPath || '') ? `<img class="p-logo" src="${store.logoPath}" alt="" style="object-fit:contain">` : ''

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/** Top of every printed paper: the logo beside the shop's name, address and phone (centred when there is no logo) */
export function printHeader(store) {
  const info = `<div style="min-width:0;">`
    + `<div style="font-size:15px; font-weight:700; text-transform:uppercase; line-height:1.2;">${esc(store?.name || 'Warshati — ورشتي')}</div>`
    + (store?.address ? `<div style="font-size:10px;">${esc(store.address)}</div>` : '')
    + (store?.phone ? `<div style="font-size:10px;"><bdi dir="ltr">${esc(store.phone)}</bdi></div>` : '')
    + '</div>'
  const logo = printLogo(store).replace('style="object-fit:contain"', 'style="object-fit:contain; margin:0; flex-shrink:0;"')
  return logo
    ? `<div style="display:flex; align-items:center; gap:8px; text-align:start;">${logo}${info}</div>`
    : `<div style="text-align:center;">${info}</div>`
}

/** A4 reports print negatives with a real minus sign (no red on paper). */
export const signed = (n) => (Number(n) < 0 ? `−${Math.abs(Number(n)).toLocaleString()}` : Number(n).toLocaleString())
