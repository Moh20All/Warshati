import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { generateSaleNumber } from './sales.js'
import { nextTicketNumber } from '../lib/numbering.js'
import { rememberDevice } from '../lib/catalog.js'
import { repairmanShare } from './repairmen.js'

const router = Router()
router.use(requireAuth)

// Generate TKT number: TKT-YYYY-NNNN (pass the transaction client when inside one)
export async function generateTicketNumber(db = prisma) {
  return nextTicketNumber(db)
}

// Repair warranty when a shop has no setting yet
export const DEFAULT_WARRANTY_DAYS = 5

/** Warranty days for a new ticket: the typed value (0 allowed), otherwise the store's default */
export async function warrantyFor(db, typed) {
  const days = parseInt(typed)
  if (Number.isFinite(days) && days >= 0) return days
  const store = await db.store.findFirst({ select: { warrantyDays: true } })
  return store?.warrantyDays ?? DEFAULT_WARRANTY_DAYS
}

/** repairmanId (anyone) and repairmanPay (owner only; empty = from his rule at delivery) sent with a ticket */
function repairmanFields(req, body) {
  const data = {}
  if (body.repairmanId !== undefined) data.repairmanId = body.repairmanId || null
  if (body.repairmanPay !== undefined && req.user.role === 'OWNER') {
    data.repairmanPay = body.repairmanPay === '' || body.repairmanPay === null ? null : Math.max(0, parseFloat(body.repairmanPay) || 0)
  }
  return data
}

const validTransitions = {
  DIAGNOSING: ['WAITING_PARTS', 'IN_REPAIR', 'DONE', 'CANCELLED'],
  WAITING_PARTS: ['IN_REPAIR', 'DONE', 'CANCELLED'],
  IN_REPAIR: ['DONE', 'WAITING_PARTS', 'CANCELLED'],
  DONE: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
}

// GET /api/tickets
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query
    const where = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search } },
        { imei: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } }
      ]
    }
    const tickets = await prisma.repairTicket.findMany({
      where,
      include: { customer: true, createdBy: { select: { name: true } } },
      orderBy: { receivedAt: 'desc' }
    })
    res.json({ tickets })
  } catch (err) {
    logger.error('List tickets error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/tickets/:id
router.get('/:id', async (req, res) => {
  try {
    const ticket = await prisma.repairTicket.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        createdBy: { select: { name: true } },
        checkIn: true,
        warrantyClaims: true,
        sale: true,
        debtEntry: { include: { payments: true } },
        repairman: true
      }
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    // The repairman's pay is the owner's business
    if (req.user.role !== 'OWNER') {
      delete ticket.repairmanPay
      if (ticket.repairman) ticket.repairman = { id: ticket.repairman.id, name: ticket.repairman.name }
    }
    res.json({ ticket })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/tickets — create directly (no check-in needed)
router.post('/', async (req, res) => {
  try {
    const { checkInId, customerId, customerName, customerPhone, deviceBrand, deviceModel, imei, devicePassword, color, condition, issueDesc, diagnosis, partsUsedNotes, finalCost, partsCost, deposit, priority, estimatedDoneAt, warrantyDays } = req.body

    if (!deviceBrand || !deviceModel || !issueDesc) {
      return res.status(400).json({ error: 'Device brand, model, and issue description are required' })
    }
    if (!customerId && !customerName) {
      return res.status(400).json({ error: 'Customer name is required' })
    }

    // Customer, ticket and check-in conversion are saved together or not at all
    const ticket = await prisma.$transaction(async (tx) => {
      // Find or create customer
      let finalCustomerId = customerId
      if (!finalCustomerId) {
        // Try to find existing customer by phone first
        let customer = null
        if (customerPhone) {
          customer = await tx.customer.findFirst({ where: { phone: customerPhone } })
        }
        if (!customer) {
          // Create new customer with just name (+ optional phone)
          customer = await tx.customer.create({
            data: { name: customerName, phone: customerPhone || null }
          })
        }
        finalCustomerId = customer.id
      }

      const created = await tx.repairTicket.create({
        data: {
          ticketNumber: await generateTicketNumber(tx), customerId: finalCustomerId, createdById: req.user.id,
          checkInId: checkInId || null,
          deviceBrand, deviceModel, imei: imei || null,
          devicePassword: devicePassword || null, color: color || null, condition: condition || null,
          issueDesc, diagnosis: diagnosis || null, partsUsedNotes: partsUsedNotes || null,
          finalCost: finalCost || null, partsCost: partsCost || 0, deposit: deposit || 0,
          priority: priority || 'NORMAL',
          estimatedDoneAt: estimatedDoneAt ? new Date(estimatedDoneAt) : null,
          warrantyDays: await warrantyFor(tx, warrantyDays),
          ...repairmanFields(req, req.body)
        },
        include: { customer: true }
      })

      // Deposit taken at drop-off counts as cash on this day
      if (parseFloat(deposit) > 0) {
        await tx.repairDeposit.create({ data: { repairTicketId: created.id, amount: parseFloat(deposit) } })
      }

      // Mark check-in as converted (if from check-in)
      if (checkInId) {
        await tx.checkIn.update({
          where: { id: checkInId },
          data: { convertedAt: new Date() }
        })
      }

      return created
    })

    await rememberDevice(prisma, { category: req.body.deviceCategory, brand: deviceBrand, model: deviceModel })
    res.status(201).json({ ticket })
  } catch (err) {
    logger.error('Create ticket error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/tickets/:id — update ticket details
router.put('/:id', async (req, res) => {
  try {
    const { diagnosis, partsUsedNotes, estimatedCost, finalCost, partsCost, deposit, priority, estimatedDoneAt } = req.body
    const data = {}
    if (diagnosis !== undefined) data.diagnosis = diagnosis
    if (partsUsedNotes !== undefined) data.partsUsedNotes = partsUsedNotes
    if (estimatedCost !== undefined) data.estimatedCost = estimatedCost
    if (finalCost !== undefined) data.finalCost = finalCost
    if (partsCost !== undefined) data.partsCost = partsCost
    if (priority !== undefined) data.priority = priority
    if (estimatedDoneAt !== undefined) data.estimatedDoneAt = estimatedDoneAt ? new Date(estimatedDoneAt) : null

    const current = await prisma.repairTicket.findUnique({ where: { id: req.params.id }, include: { sale: true } })
    if (!current) return res.status(404).json({ error: 'Ticket not found' })
    // The repairman and his share are fixed once the repair is invoiced (his share is in its cost)
    if (!current.sale) Object.assign(data, repairmanFields(req, req.body))

    // A deposit change is real cash in (or refunded, if lowered) today
    const depositDelta = deposit !== undefined ? (parseFloat(deposit) || 0) - parseFloat(current.deposit || 0) : 0
    if (depositDelta !== 0) {
      if (current.sale) return res.status(400).json({ error: 'The deposit cannot change after the ticket is invoiced' })
      if ((parseFloat(deposit) || 0) < 0) return res.status(400).json({ error: 'Deposit cannot be negative' })
      data.deposit = parseFloat(deposit) || 0
    }

    const ticket = await prisma.$transaction(async (tx) => {
      if (depositDelta !== 0) {
        await tx.repairDeposit.create({ data: { repairTicketId: current.id, amount: depositDelta } })
      }
      return tx.repairTicket.update({
        where: { id: req.params.id },
        data,
        include: { customer: true }
      })
    })
    res.json({ ticket })
  } catch (err) {
    logger.error('Update ticket error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

  // POST /api/tickets/:id/transition — change status
router.post('/:id/transition', async (req, res) => {
  try {
    const { status, finalCost, partsCost, paymentMethod } = req.body
    const ticket = await prisma.repairTicket.findUnique({ where: { id: req.params.id }, include: { sale: true, repairman: true } })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

    const allowed = validTransitions[ticket.status] || []
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from ${ticket.status} to ${status}` })
    }

    // DONE requires finalCost
    if (status === 'DONE' && !ticket.finalCost && !finalCost) {
      return res.status(400).json({ error: 'Final cost is required to mark as Done' })
    }

    // Capture finalCost/partsCost if provided during transition to DONE
    const data = { status }
    if (status === 'DONE' && finalCost) {
      data.finalCost = finalCost
      if (partsCost !== undefined) data.partsCost = partsCost
    }

    const needsInvoice = status === 'DELIVERED' && !ticket.sale
    if (needsInvoice && !paymentMethod) {
      return res.status(400).json({ error: 'Payment method (CASH/CREDIT) is required to deliver and create an invoice' })
    }
    if (status === 'DELIVERED') data.deliveredAt = new Date()
    // The repairman's share (typed, or from his rule) is fixed on delivery
    if (status === 'DELIVERED' && ticket.repairman) {
      data.repairmanPay = ticket.repairmanPay != null ? parseFloat(ticket.repairmanPay)
        : repairmanShare(ticket.repairman, finalCost || ticket.finalCost, partsCost !== undefined ? partsCost : ticket.partsCost)
    }

    // Invoice, debt and status change are saved together or not at all
    const updated = await prisma.$transaction(async (tx) => {
      // DELIVERED logic: Auto-create sale if missing
      if (needsInvoice) {
        const costToCustomer = parseFloat(finalCost || ticket.finalCost || 0)
        const costOfParts = parseFloat(partsCost !== undefined ? partsCost : (ticket.partsCost || 0))
        const repairCost = costOfParts + (data.repairmanPay || 0) // his share is a cost of this repair
        // The deposit was already counted as cash when received; it only reduces what is due now
        const depositApplied = Math.min(parseFloat(ticket.deposit || 0), costToCustomer)
        const amountDue = costToCustomer - depositApplied
        const amountPaid = paymentMethod === 'CREDIT' ? depositApplied : costToCustomer
        const owed = costToCustomer - amountPaid

        // Create the sale linking it to this ticket
        const newSale = await tx.sale.create({
          data: {
            saleNumber: await generateSaleNumber(tx),
            customerId: ticket.customerId,
            repairTicketId: ticket.id,
            createdById: req.user.id,
            subtotal: costToCustomer,
            total: costToCustomer,
            amountPaid,
            depositApplied,
            creditAmount: owed,
            change: 0,
            paymentMethod,
            status: owed > 0 ? 'CREDIT' : 'COMPLETED',
            notes: depositApplied > 0 ? `Deposit ${depositApplied} deducted, due at delivery ${amountDue}` : null,
            items: {
              create: [{
                description: `Repair: ${ticket.deviceBrand} ${ticket.deviceModel}`,
                quantity: 1,
                unitCost: repairCost,
                unitPrice: costToCustomer,
                subtotal: costToCustomer
              }]
            }
          }
        })

        // Auto-create debt entry for whatever is still owed after the deposit
        if (owed > 0 && ticket.customerId) {
          await tx.debtEntry.create({
            data: {
              customerId: ticket.customerId,
              saleId: newSale.id,
              repairTicketId: ticket.id,
              type: 'REPAIR_CREDIT',
              totalAmount: owed,
              paidAmount: 0,
              remaining: owed,
              status: 'OPEN'
            }
          })
        }
      }

      return tx.repairTicket.update({
        where: { id: req.params.id },
        data,
        include: { customer: true, sale: true }
      })
    })
    res.json({ ticket: updated })
  } catch (err) {
    logger.error('Transition error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── Parts taken from stock ─────────────────────────────────────────────
// Thrown inside a transaction to roll it back and answer with a 400
class PartError extends Error {}

async function partsResponse(db, ticketId) {
  const [parts, ticket] = await Promise.all([
    db.repairPart.findMany({ where: { repairTicketId: ticketId }, include: { inventoryItem: true }, orderBy: { createdAt: 'asc' } }),
    db.repairTicket.findUnique({ where: { id: ticketId }, select: { partsCost: true } })
  ])
  return { parts, partsCost: ticket?.partsCost ?? 0 }
}

// GET /api/tickets/:id/parts
router.get('/:id/parts', async (req, res) => {
  try {
    res.json(await partsResponse(prisma, req.params.id))
  } catch (err) {
    logger.error('List ticket parts error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/tickets/:id/parts — { inventoryItemId, quantity }: take parts from stock
router.post('/:id/parts', async (req, res) => {
  try {
    const quantity = parseInt(req.body.quantity) || 1
    if (!req.body.inventoryItemId || quantity <= 0) return res.status(400).json({ error: 'Choose a part and a positive quantity' })

    await prisma.$transaction(async (tx) => {
      const ticket = await tx.repairTicket.findUnique({ where: { id: req.params.id }, include: { sale: true } })
      if (!ticket) throw new PartError('Ticket not found')
      if (ticket.sale || ['DELIVERED', 'CANCELLED'].includes(ticket.status)) throw new PartError('Parts cannot be added to a closed or invoiced ticket')

      const item = await tx.inventoryItem.findUnique({ where: { id: req.body.inventoryItemId } })
      if (!item || !item.isActive) throw new PartError('Part not found')
      if (item.quantity < quantity) throw new PartError(`Not enough stock for ${item.name} (available: ${item.quantity})`)

      const unitCost = parseFloat(item.buyPrice)
      await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: { decrement: quantity } } })
      await tx.repairPart.create({ data: { repairTicketId: ticket.id, inventoryItemId: item.id, quantity, unitCost } })
      await tx.repairTicket.update({ where: { id: ticket.id }, data: { partsCost: parseFloat(ticket.partsCost || 0) + unitCost * quantity } })
    })

    res.status(201).json(await partsResponse(prisma, req.params.id))
  } catch (err) {
    if (err instanceof PartError) return res.status(400).json({ error: err.message })
    logger.error('Add ticket part error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/tickets/:id/parts/:partId — put the part back in stock
router.delete('/:id/parts/:partId', async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      const part = await tx.repairPart.findUnique({ where: { id: req.params.partId }, include: { repairTicket: { include: { sale: true } } } })
      if (!part || part.repairTicketId !== req.params.id) throw new PartError('Part not found on this ticket')
      if (part.repairTicket.sale) throw new PartError('Parts cannot be removed after the ticket is invoiced')

      await tx.inventoryItem.update({ where: { id: part.inventoryItemId }, data: { quantity: { increment: part.quantity } } })
      await tx.repairPart.delete({ where: { id: part.id } })
      const newCost = parseFloat(part.repairTicket.partsCost || 0) - parseFloat(part.unitCost) * part.quantity
      await tx.repairTicket.update({ where: { id: part.repairTicketId }, data: { partsCost: Math.max(0, newCost) } })
    })

    res.json(await partsResponse(prisma, req.params.id))
  } catch (err) {
    if (err instanceof PartError) return res.status(400).json({ error: err.message })
    logger.error('Remove ticket part error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
