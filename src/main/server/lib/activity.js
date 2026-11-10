// Activity log (Settings → Activity): who did a sensitive action. Recording never fails the request itself.
import prisma from './prisma.js'
import logger from './logger.js'

// Translated in the apps: activity.actions.<action>
export const ACTIONS = [
  'ticket_delete', 'ticket_cancel', 'ticket_price',
  'inventory_delete', 'inventory_price', 'inventory_quantity',
  'payment_cancel', 'sale_refund', 'sale_discount',
  'supplier_delete', 'expense_delete', 'import_run'
]

/** audit(req, 'ticket_delete', 'TKT-2026-0051', { device: 'Samsung A54' }) — details: amounts, [old, new] pairs… */
export function audit(req, action, label, details) {
  prisma.activityLog.create({
    data: { userId: req.user?.id || null, userName: req.user?.name || '?', action, label: String(label ?? ''), details: details ? JSON.stringify(details) : null }
  }).catch(err => logger.error('Activity log error:', err))
}
