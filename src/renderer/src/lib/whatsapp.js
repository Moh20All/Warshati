// WhatsApp messages to customers ("your phone is ready", debt reminders).
// Local numbers (0661…) get the country code of the store's currency.

const DIAL_CODES = { DZD: '213', MAD: '212', TND: '216', SAR: '966', EGP: '20', AED: '971' }

/** International digits for wa.me, or null if the number cannot be used. */
export function internationalPhone(phone, currency) {
  let p = String(phone || '').replace(/[\s\-().]/g, '')
  if (!p) return null
  if (p.startsWith('+')) p = p.slice(1)
  else if (p.startsWith('00')) p = p.slice(2)
  else if (p.startsWith('0')) {
    const code = DIAL_CODES[currency || 'DZD']
    if (!code) return null
    p = code + p.slice(1)
  }
  return /^\d{8,15}$/.test(p) ? p : null
}

/** Opens WhatsApp with the message. Returns { success, error? }. */
export async function sendWhatsApp(phone, currency, text) {
  const intl = internationalPhone(phone, currency)
  if (!intl) return { success: false, error: 'invalid_phone' }
  return window.api.openWhatsApp({ phone: intl, text })
}
