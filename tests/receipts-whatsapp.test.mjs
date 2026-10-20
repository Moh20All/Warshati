// WhatsApp phone numbers and payment receipts (pure helpers from the renderer).
import { createChecker, importProject } from './helpers/setup.mjs'

const { internationalPhone } = await importProject('src/renderer/src/lib/whatsapp.js')
const { remainingAfter, paymentReceiptHtml } = await importProject('src/renderer/src/lib/receipts.js')
const { check, finish } = createChecker()

try {
  // ── Phone numbers for wa.me ──
  check('Algerian local number', internationalPhone('0661 23 45 67', 'DZD'), '213661234567')
  check('dashes and brackets removed', internationalPhone('(0661)-23-45-67', 'DZD'), '213661234567')
  check('already international with +', internationalPhone('+33 6 12 34 56 78', 'DZD'), '33612345678')
  check('international with 00', internationalPhone('00212612345678', 'DZD'), '212612345678')
  check('Moroccan shop', internationalPhone('0612345678', 'MAD'), '212612345678')
  check('Tunisian shop', internationalPhone('021234567', 'TND'), '21621234567')
  check('local number with unknown country -> unusable', internationalPhone('0612345678', 'EUR'), null)
  check('too short', internationalPhone('0661', 'DZD'), null)
  check('empty', internationalPhone('', 'DZD'), null)
  check('letters rejected', internationalPhone('06abc12345', 'DZD'), null)

  // ── Receipt balance after each payment (cancelling entries included, in time order) ──
  const debt = {
    totalAmount: 3000, customer: { name: 'Karim <b>' }, sale: { saleNumber: 'INV-2026-0042' },
    payments: [
      { id: 'p3', amount: '-2000', reversalOf: 'p2', paidAt: '2026-10-20T12:00:00Z' },
      { id: 'p1', amount: '500', paidAt: '2026-10-18T10:00:00Z' },
      { id: 'p2', amount: '2000', paidAt: '2026-10-19T10:00:00Z' },
      { id: 'p4', amount: '1000', paidAt: '2026-10-20T15:00:00Z' }
    ]
  }
  check('after 1st payment (3000 - 500)', remainingAfter(debt, debt.payments[1]), 2500)
  check('after the wrong payment (2500 - 2000)', remainingAfter(debt, debt.payments[2]), 500)
  check('after its cancellation (back to 2500)', remainingAfter(debt, debt.payments[0]), 2500)
  check('after the last payment (2500 - 1000)', remainingAfter(debt, debt.payments[3]), 1500)

  const t = (k) => ({ 'finance.debts.receipt_settled': 'PAID IN FULL', 'finance.debts.receipt_thanks': 'THANKS' }[k] || k)
  const html = paymentReceiptHtml({ t, dir: 'ltr', store: { name: 'Shop & Co' }, cur: 'DZD', debt, payment: debt.payments[3] })
  check('receipt shows the sale number', html.includes('INV-2026-0042'), true)
  check('receipt shows the amount paid', html.includes('1,000 DZD') || html.includes('1 000 DZD') || html.includes('1000 DZD'), true)
  check('receipt shows what is left', html.includes('1,500 DZD') || html.includes('1 500 DZD') || html.includes('1500 DZD'), true)
  check('names are escaped (no HTML injection)', html.includes('Karim &lt;b&gt;') && !html.includes('Karim <b>'), true)
  check('store name escaped', html.includes('Shop &amp; Co'), true)
  const last = paymentReceiptHtml({ t, dir: 'rtl', store: {}, cur: 'د.ج', debt: { ...debt, totalAmount: 1500 }, payment: debt.payments[3] })
  check('fully paid message when nothing is left', last.includes('PAID IN FULL'), true)
  check('opening balance as reference when no sale/ticket', paymentReceiptHtml({ t, dir: 'ltr', store: {}, cur: 'DZD', debt: { ...debt, sale: null }, payment: debt.payments[3] }).includes('finance.debts.types.OPENING_BALANCE'), true)
  finish()
} catch (e) {
  finish(e)
}
