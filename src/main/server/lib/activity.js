// Activity log (Settings → Activity): who did what in the shop.
// One middleware (recordWrites) writes a line for every change that goes through the API, so nothing has to
// remember to log itself. A route that knows more than "it happened" (old → new price, a reason) calls
// audit() instead, and that line replaces the automatic one. Recording never fails the request itself.
import prisma from './prisma.js'
import logger from './logger.js'

const amount = (req) => ({ amount: parseFloat(req.body?.amount) || 0 })

// 'METHOD /route' → [action, details(req, answer)?]. A write that is not listed here is not logged
// (printing a slip, downloading catalog photos, reading an Excel file before the import).
const WRITES = {
  'POST /auth/login': ['login'],
  'POST /auth/recover': ['password_recover'],
  'POST /users': ['user_create'],
  'PUT /users/:id': ['user_update'],
  'DELETE /users/:id': ['user_deactivate'],
  'PUT /store': ['settings_update'],
  'POST /customers': ['customer_create'],
  'PUT /customers/:id': ['customer_update'],
  'DELETE /customers/:id': ['customer_delete'],
  'POST /inventory': ['inventory_create', (req) => ({ quantity: parseInt(req.body?.quantity) || 0 })],
  'PUT /inventory/:id': ['inventory_update'],
  'POST /inventory/:id/restock': ['inventory_restock', (req) => ({ quantity: parseInt(req.body?.addQuantity) || 0 })],
  'POST /checkins': ['checkin_create'],
  'POST /tickets': ['ticket_create', (_req, a) => ({ device: `${a?.ticket?.deviceBrand} ${a?.ticket?.deviceModel}` })],
  'PUT /tickets/:id': ['ticket_update'],
  'POST /tickets/:id/transition': ['ticket_status', (req) => ({ status: req.body?.status })],
  'POST /tickets/:id/parts': ['ticket_part_add', (req) => ({ quantity: parseInt(req.body?.quantity) || 1 })],
  'DELETE /tickets/:id/parts/:partId': ['ticket_part_remove'],
  'POST /sales': ['sale_create', (_req, a) => ({ total: Number(a?.sale?.total) || 0 })],
  'POST /debts': ['debt_create', amount],
  'POST /debts/:id/payment': ['debt_payment', amount],
  'POST /suppliers': ['supplier_create'],
  'PUT /suppliers/:id': ['supplier_update'],
  'POST /purchase-orders': ['purchase_create', (_req, a) => ({ total: Number(a?.order?.totalAmount ?? a?.purchaseOrder?.totalAmount) || 0 })],
  'POST /supplier-debts/opening': ['supplier_debt_create', amount],
  'POST /supplier-debts/:id/payment': ['supplier_payment', amount],
  'POST /expenses': ['expense_create', amount],
  'PUT /expenses/:id': ['expense_update'],
  'POST /warranty': ['warranty_create'],
  'PUT /warranty/:id': ['warranty_update'],
  'POST /warranty/:id/new-ticket': ['warranty_ticket'],
  'POST /trade-ins': ['tradein_create'],
  'POST /trade-ins/:id/accept': ['tradein_accept'],
  'POST /trade-ins/:id/reject': ['tradein_reject'],
  'POST /daily-close': ['day_close'],
  'POST /repairmen': ['repairman_create'],
  'PUT /repairmen/:id': ['repairman_update'],
  'POST /repairmen/:id/payments': ['repairman_payment', amount]
}

// Written by the routes themselves, with their details
const DETAILED = [
  'ticket_delete', 'ticket_cancel', 'ticket_price',
  'inventory_delete', 'inventory_price', 'inventory_quantity',
  'payment_cancel', 'sale_refund', 'sale_discount',
  'supplier_delete', 'expense_delete', 'import_run'
]

// Translated in the apps: activity.actions.<action>
export const ACTIONS = [...new Set([...Object.values(WRITES).map(([action]) => action), ...DETAILED])]

function write(who, action, label, details) {
  const text = details && Object.keys(details).length ? JSON.stringify(details) : null
  prisma.activityLog.create({
    data: { userId: who?.id || null, userName: who?.name || '?', action, label: String(label ?? ''), details: text }
  }).catch(err => logger.error('Activity log error:', err))
}

/** audit(req, 'ticket_delete', 'TKT-2026-0051', { device: 'Samsung A54' }) — details: amounts, [old, new] pairs… */
export function audit(req, action, label, details) {
  req.audited = true // the automatic line is not written on top of this one
  write(req.user, action, label, details)
}

// What the line is about, found in the answer: a ticket or invoice number, else a name
const LABELS = ['ticketNumber', 'saleNumber', 'orderNumber', 'checkInNumber', 'name', 'description', 'email']
function labelOf(answer, depth = 0) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return ''
  for (const k of LABELS) if (typeof answer[k] === 'string' && answer[k]) return answer[k]
  if (depth < 2) for (const v of Object.values(answer)) { const found = labelOf(v, depth + 1); if (found) return found }
  return ''
}

/** Mounted once on /api: logs every successful change (see WRITES) after its answer is sent */
export function recordWrites(req, res, next) {
  if (req.method === 'GET') return next()
  const send = res.json.bind(res)
  res.json = (body) => { res.locals.answer = body; return send(body) }
  res.on('finish', () => {
    if (res.statusCode >= 400 || req.audited || !req.route) return
    const path = req.route.path === '/' ? '' : req.route.path
    const entry = WRITES[`${req.method} ${req.baseUrl.replace(/^\/api/, '')}${path}`]
    if (!entry) return
    const [action, details] = entry
    const answer = res.locals.answer
    // Signing in: nobody is logged in yet, the account is in the answer
    write(req.user || answer?.user, action, labelOf(answer), details?.(req, answer))
  })
  next()
}
