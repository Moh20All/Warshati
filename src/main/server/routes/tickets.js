import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Generate TKT number: TKT-YYYY-NNNN
async function generateTicketNumber() {
  const year = new Date().getFullYear()
  const prefix = `TKT-${year}-`
  const last = await prisma.repairTicket.findFirst({
    where: { ticketNumber: { startsWith: prefix } },
    orderBy: { ticketNumber: 'desc' }
  })
  const num = last ? parseInt(last.ticketNumber.split('-').pop()) + 1 : 1
  return `${prefix}${String(num).padStart(4, '0')}`
}

// Generate sale number for auto-invoicing
async function generateSaleNumber() {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  const last = await prisma.sale.findFirst({
    where: { saleNumber: { startsWith: prefix } },
    orderBy: { saleNumber: 'desc' }
  })
  const num = last ? parseInt(last.saleNumber.split('-').pop()) + 1 : 1
  return `${prefix}${String(num).padStart(4, '0')}`
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
    console.error('List tickets error:', err)
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
        debtEntry: { include: { payments: true } }
      }
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    res.json({ ticket })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/tickets — create directly (no check-in needed)
router.post('/', async (req, res) => {
  try {
    const { checkInId, customerId, customerName, customerPhone, deviceBrand, deviceModel, imei, devicePassword, color, condition, issueDesc, diagnosis, partsUsedNotes, estimatedCost, deposit, priority, estimatedDoneAt, warrantyDays } = req.body

    if (!deviceBrand || !deviceModel || !issueDesc) {
      return res.status(400).json({ error: 'Device brand, model, and issue description are required' })
    }
    if (!customerId && !customerName) {
      return res.status(400).json({ error: 'Customer name is required' })
    }

    // Find or create customer
    let finalCustomerId = customerId
    if (!finalCustomerId) {
      // Try to find existing customer by phone first
      let customer = null
      if (customerPhone) {
        customer = await prisma.customer.findFirst({ where: { phone: customerPhone } })
      }
      if (!customer) {
        // Create new customer with just name (+ optional phone)
        customer = await prisma.customer.create({
          data: { name: customerName, phone: customerPhone || null }
        })
      }
      finalCustomerId = customer.id
    }

    const ticketNumber = await generateTicketNumber()
    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNumber, customerId: finalCustomerId, createdById: req.user.id,
        checkInId: checkInId || null,
        deviceBrand, deviceModel, imei: imei || null,
        devicePassword: devicePassword || null, color: color || null, condition: condition || null,
        issueDesc, diagnosis: diagnosis || null, partsUsedNotes: partsUsedNotes || null,
        estimatedCost: estimatedCost || null, deposit: deposit || 0,
        priority: priority || 'NORMAL',
        estimatedDoneAt: estimatedDoneAt ? new Date(estimatedDoneAt) : null,
        warrantyDays: warrantyDays || 30
      },
      include: { customer: true }
    })

    // Mark check-in as converted (if from check-in)
    if (checkInId) {
      await prisma.checkIn.update({
        where: { id: checkInId },
        data: { convertedAt: new Date() }
      })
    }

    res.status(201).json({ ticket })
  } catch (err) {
    console.error('Create ticket error:', err)
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
    if (deposit !== undefined) data.deposit = deposit
    if (priority !== undefined) data.priority = priority
    if (estimatedDoneAt !== undefined) data.estimatedDoneAt = estimatedDoneAt ? new Date(estimatedDoneAt) : null

    const ticket = await prisma.repairTicket.update({
      where: { id: req.params.id },
      data,
      include: { customer: true }
    })
    res.json({ ticket })
  } catch (err) {
    console.error('Update ticket error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

  // POST /api/tickets/:id/transition — change status
router.post('/:id/transition', async (req, res) => {
  try {
    const { status, finalCost, partsCost, paymentMethod } = req.body
    const ticket = await prisma.repairTicket.findUnique({ where: { id: req.params.id }, include: { sale: true } })
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

    // DELIVERED logic: Auto-create sale if missing
    if (status === 'DELIVERED') {
      data.deliveredAt = new Date()
      
      if (!ticket.sale) {
        if (!paymentMethod) {
          return res.status(400).json({ error: 'Payment method (CASH/CREDIT) is required to deliver and create an invoice' })
        }

        const saleNumber = await generateSaleNumber()
        const costToCustomer = parseFloat(finalCost || ticket.finalCost || 0)
        const costOfParts = parseFloat(partsCost !== undefined ? partsCost : (ticket.partsCost || 0))

        // Create the sale linking it to this ticket
        const newSale = await prisma.sale.create({
          data: {
            saleNumber,
            customerId: ticket.customerId,
            repairTicketId: ticket.id,
            createdById: req.user.id,
            subtotal: costToCustomer,
            total: costToCustomer,
            amountPaid: paymentMethod === 'CREDIT' ? 0 : costToCustomer,
            change: 0,
            paymentMethod,
            status: paymentMethod === 'CREDIT' ? 'CREDIT' : 'COMPLETED',
            items: {
              create: [{
                description: `Repair: ${ticket.deviceBrand} ${ticket.deviceModel}`,
                quantity: 1,
                unitCost: costOfParts,
                unitPrice: costToCustomer,
                subtotal: costToCustomer
              }]
            }
          }
        })

        // Auto-create debt entry if credit
        if (paymentMethod === 'CREDIT' && ticket.customerId) {
          await prisma.debtEntry.create({
            data: {
              customerId: ticket.customerId,
              saleId: newSale.id,
              type: 'SALE_CREDIT',
              totalAmount: costToCustomer,
              paidAmount: 0,
              remaining: costToCustomer,
              status: 'OPEN'
            }
          })
        }
      }
    }

    const updated = await prisma.repairTicket.update({
      where: { id: req.params.id },
      data,
      include: { customer: true, sale: true }
    })
    res.json({ ticket: updated })
  } catch (err) {
    console.error('Transition error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
