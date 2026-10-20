// Document numbers past 9999, and {{currency}} in the translations.
import fs from 'fs'
import path from 'path'
import { prepareEnv, startServer, setupOwner, createChecker, importProject, projectRoot } from './helpers/setup.mjs'

prepareEnv()
const { call, close } = await startServer()
const { default: prisma } = await importProject('src/main/server/lib/prisma.js')
const { check, finish } = createChecker()

try {
  const { o, user } = await setupOwner(call)
  const y = new Date().getFullYear()
  const sell = () => o('POST', '/sales', { items: [{ name: 'x', unitPrice: 1, quantity: 1 }], paymentMethod: 'CASH' })

  check('first sale number', (await sell()).data.sale.saleNumber, `INV-${y}-0001`)
  await prisma.sale.create({ data: { saleNumber: `INV-${y}-9999`, createdById: user.id, subtotal: 1, total: 1, amountPaid: 1 } })
  check('after 9999', (await sell()).data.sale.saleNumber, `INV-${y}-10000`)
  check('after 10000', (await sell()).data.sale.saleNumber, `INV-${y}-10001`)

  const cust = (await o('POST', '/customers', { name: 'C' })).data.customer
  check('ticket number', (await o('POST', '/tickets', { customerId: cust.id, deviceBrand: 'A', deviceModel: 'B', issueDesc: 'C' })).data.ticket.ticketNumber, `TKT-${y}-0001`)
  check('check-in number', (await o('POST', '/checkins', { customerId: cust.id, deviceBrand: 'A', deviceModel: 'B', issueDesc: 'C' })).data.checkin.checkInNumber, `CI-${y}-0001`)
  const item = (await o('POST', '/inventory', { type: 'PART', name: 'P', buyPrice: 1, sellPrice: 2, quantity: 0 })).data.item
  const sup = (await o('POST', '/suppliers', { name: 'S' })).data.supplier
  check('purchase order number', (await o('POST', '/purchase-orders', { supplierId: sup.id, lines: [{ inventoryItemId: item.id, quantity: 1, unitCost: 1 }], paymentMethod: 'CREDIT' })).data.order.orderNumber, `PO-${y}-0001`)

  // ── Translations ──
  const { default: i18next } = await importProject('node_modules/i18next/dist/esm/i18next.js')
  const load = (l) => JSON.parse(fs.readFileSync(path.join(projectRoot, `src/renderer/src/i18n/locales/${l}/translation.json`), 'utf8'))
  const locales = { en: load('en'), fr: load('fr'), ar: load('ar') }
  for (const [lang, json] of Object.entries(locales)) {
    check(`${lang}: no hardcoded dinar left`, /\bDZD\b|د\.ج|\(دج\)/.test(JSON.stringify(json)), false)
  }
  await i18next.init({ resources: Object.fromEntries(Object.entries(locales).map(([l, t]) => [l, { translation: t }])), lng: 'en', interpolation: { escapeValue: false, defaultVariables: { currency: 'DZD' } } })
  check('EN label, default', i18next.t('inventory.modal.buy_price'), 'Buy Price (DZD)')
  i18next.options.interpolation.defaultVariables.currency = 'EUR'
  check('EN label after switching to EUR', i18next.t('inventory.modal.buy_price'), 'Buy Price (EUR)')
  check('EN message with amount', i18next.t('sales.invoices.refund_success', { amount: '400' }), 'Refunded. Give back 400 EUR')
  await i18next.changeLanguage('fr')
  check('FR label', i18next.t('repairs.tradeins.lbl_value'), "Valeur d'évaluation (EUR)")
  await i18next.changeLanguage('ar')
  i18next.options.interpolation.defaultVariables.currency = 'د.ج'
  check('AR label with dinar', i18next.t('repairs.details.lbl_deposit'), 'عربون / مقدم (د.ج)')

  // Same keys in every language
  const keys = (obj, pre = '') => Object.entries(obj).flatMap(([k, v]) => typeof v === 'object' ? keys(v, `${pre}${k}.`) : [`${pre}${k}`])
  const en = new Set(keys(locales.en))
  for (const lang of ['fr', 'ar']) {
    const missing = [...en].filter(k => !new Set(keys(locales[lang])).has(k))
    check(`${lang}: has every English key`, missing.length === 0 ? true : missing.slice(0, 5).join(', '), true)
  }
  finish()
} catch (e) {
  finish(e)
} finally {
  close()
}
