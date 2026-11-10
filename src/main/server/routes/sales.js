import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { nextSaleNumber } from '../lib/numbering.js'
import { audit } from '../lib/activity.js'
import { LIST_LIMIT } from './tickets.js'

const router = Router()
router.use(requireAuth)

// Thrown inside a transaction to roll it back and answer with a 400
class SaleError extends Error {}

// Generate sale number: INV-YYYY-NNNN (pass the transaction client when inside one)
export async function generateSaleNumber(db = prisma) {
  return nextSaleNumber(db)
}

// GET /api/sales
router.get('/', async (req, res) => {
  try {
    const { search } = req.query
    const where = {}
    if (search) {
      where.OR = [
        { saleNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } }
      ]
    }
    // Without a search, the latest 300 (older invoices are found by number or client); lines carry the item's name only
    const take = search ? undefined : LIST_LIMIT
    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { customer: true, createdBy: { select: { name: true } }, items: { include: { inventoryItem: { select: { id: true, name: true, type: true } } } }, debtEntry: true, refund: true },
        orderBy: { createdAt: 'desc' },
        take
      }),
      prisma.sale.count({ where })
    ])
    res.json({ sales, total, limited: sales.length < total })
  } catch (err) {
    logger.error('List sales error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/sales/:id
router.get('/:id', async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: { include: { inventoryItem: true } }, repairTicket: true, debtEntry: true }
    })
    if (!sale) return res.status(404).json({ error: 'Sale not found' })
    res.json({ sale })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/sales — create sale from POS
router.post('/', async (req, res) => {
  try {
    const { customerId, repairTicketId, items, discount, tradeInCredit, paymentMethod, amountPaid, notes } = req.body

    if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required' })
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) return res.status(400).json({ error: 'Item quantity must be a positive whole number' })
      if (!(parseFloat(item.unitPrice) >= 0)) return res.status(400).json({ error: 'Item price cannot be negative' })
    }

    // Calculate totals
    let subtotal = 0
    for (const item of items) {
      subtotal += item.unitPrice * item.quantity
    }
    const total = subtotal - (discount || 0) - (tradeInCredit || 0)
    if (total < 0) return res.status(400).json({ error: 'Discount and trade-in credit cannot exceed the subtotal' })
    // CREDIT means "pay later": nothing is collected now, whatever the POS sends
    const paid = paymentMethod === 'CREDIT' ? 0 : (amountPaid !== undefined ? parseFloat(amountPaid) : total)
    const change = Math.max(0, paid - total)

    // Determine status
    let status = 'COMPLETED'
    if (paymentMethod === 'CREDIT') status = 'CREDIT'
    else if (paymentMethod === 'SPLIT' && paid < total) status = 'CREDIT'

    if (status === 'CREDIT' && !customerId) {
      return res.status(400).json({ error: 'A customer is required for credit sales' })
    }
    // A cash sale paid short would silently lose the rest: it must be a Split sale (rest becomes a debt)
    if (status === 'COMPLETED' && paid < total - 0.001) {
      return res.status(400).json({ error: 'The amount paid is less than the total. Use Split to record the rest as a debt.' })
    }
    if (!(paid >= 0)) return res.status(400).json({ error: 'The amount paid cannot be negative' })

    // Sale, stock decrement and debt are saved together or not at all
    const sale = await prisma.$transaction(async (tx) => {
      // Stock check: refuse to sell more than is on hand
      for (const item of items) {
        if (!item.inventoryItemId) continue
        const stock = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } })
        if (!stock || !stock.isActive) throw new SaleError(`Item not found: ${item.description || item.name}`)
        if (stock.quantity < item.quantity) {
          throw new SaleError(`Not enough stock for ${stock.name} (available: ${stock.quantity})`)
        }
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: { decrement: item.quantity } }
        })
      }

      const created = await tx.sale.create({
        data: {
          saleNumber: await generateSaleNumber(tx),
          customerId: customerId || null,
          repairTicketId: repairTicketId || null,
          createdById: req.user.id,
          subtotal, discountAmount: discount || 0, tradeInCredit: tradeInCredit || 0,
          total, amountPaid: Math.min(paid, total), change,
          paymentMethod: paymentMethod || 'CASH', status,
          notes: notes || null,
          items: {
            create: items.map(item => ({
              inventoryItemId: item.inventoryItemId || null,
              description: item.description || item.name,
              quantity: item.quantity,
              unitCost: item.unitCost || 0,
              unitPrice: item.unitPrice,
              subtotal: item.unitPrice * item.quantity,
              warrantyDays: item.warrantyDays || 0
            }))
          }
        },
        include: { customer: true, items: { include: { inventoryItem: true } } }
      })

      // Auto-create debt if credit/split
      if (status === 'CREDIT') {
        const debtAmount = total - Math.min(paid, total)
        await tx.debtEntry.create({
          data: {
            customerId,
            saleId: created.id,
            type: 'SALE_CREDIT',
            totalAmount: debtAmount,
            paidAmount: 0,
            remaining: debtAmount,
            status: 'OPEN'
          }
        })
      }

      return created
    })

    if (parseFloat(discount) > 0) audit(req, 'sale_discount', sale.saleNumber, { discount: parseFloat(discount), total })
    res.status(201).json({ sale })
  } catch (err) {
    if (err instanceof SaleError) return res.status(400).json({ error: err.message })
    logger.error('Create sale error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/sales/:id/refund — full refund (owner only): items back in stock, money handed back
router.post('/:id/refund', requireRole('OWNER'), async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: { items: true, debtEntry: true, refund: true }
    })
    if (!sale) return res.status(404).json({ error: 'Sale not found' })
    if (sale.status === 'REFUNDED' || sale.refund) return res.status(400).json({ error: 'This sale is already refunded' })
    if (sale.repairTicketId) return res.status(400).json({ error: 'Repair invoices cannot be refunded here. Use a warranty claim instead.' })

    // Everything the customer actually paid: at the till plus any later debt payments
    const debtPaid = sale.debtEntry ? parseFloat(sale.debtEntry.paidAmount) : 0
    const amount = parseFloat(sale.amountPaid) + debtPaid
    const cost = sale.items.reduce((s, i) => s + parseFloat(i.unitCost || 0) * i.quantity, 0)

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        if (!item.inventoryItemId) continue
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: { increment: item.quantity } }
        })
      }

      // Nothing more is owed on a refunded sale
      if (sale.debtEntry && sale.debtEntry.status !== 'SETTLED') {
        await tx.debtEntry.update({
          where: { id: sale.debtEntry.id },
          data: { remaining: 0, status: 'SETTLED', notes: `Closed by refund of ${sale.saleNumber}` }
        })
      }

      await tx.refund.create({
        data: {
          saleId: sale.id,
          amount,
          revenue: parseFloat(sale.total),
          cost,
          reason: req.body.reason || null,
          createdById: req.user.id
        }
      })

      return tx.sale.update({
        where: { id: sale.id },
        data: { status: 'REFUNDED' },
        include: { customer: true, items: { include: { inventoryItem: true } }, debtEntry: true, refund: true }
      })
    })

    audit(req, 'sale_refund', sale.saleNumber, { amount, reason: req.body.reason || '' })
    res.json({ sale: updated, refundedAmount: amount })
  } catch (err) {
    logger.error('Refund sale error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
