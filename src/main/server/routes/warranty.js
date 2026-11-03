import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { generateTicketNumber, warrantyFor } from './tickets.js'

const router = Router()
router.use(requireAuth)

// GET /api/warranty — list all claims
router.get('/', async (req, res) => {
  try {
    const claims = await prisma.warrantyClaim.findMany({
      include: {
        originalTicket: { include: { customer: true } },
        newTicket: true
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ claims })
  } catch (err) {
    logger.error('List warranty claims error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/warranty — file a new claim
router.post('/', async (req, res) => {
  try {
    const { originalTicketId, issueDesc, responsibleNote } = req.body
    if (!originalTicketId || !issueDesc) {
      return res.status(400).json({ error: 'Original ticket and issue description are required' })
    }

    // Lookup original ticket
    const originalTicket = await prisma.repairTicket.findUnique({ where: { id: originalTicketId } })
    if (!originalTicket) return res.status(404).json({ error: 'Original ticket not found' })
    if (originalTicket.status !== 'DELIVERED') {
      return res.status(400).json({ error: 'Warranty claims can only be filed for delivered tickets' })
    }

    // Check if within warranty window
    const deliveredAt = originalTicket.deliveredAt || originalTicket.updatedAt
    const warrantyEnd = new Date(deliveredAt)
    warrantyEnd.setDate(warrantyEnd.getDate() + originalTicket.warrantyDays)
    const isWithinWarranty = new Date() <= warrantyEnd

    const claim = await prisma.warrantyClaim.create({
      data: {
        originalTicketId,
        issueDesc,
        isWithinWarranty,
        responsibleNote: responsibleNote || null
      },
      include: { originalTicket: { include: { customer: true } } }
    })

    res.status(201).json({ claim })
  } catch (err) {
    logger.error('Create warranty claim error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/warranty/:id/new-ticket — create a follow-up repair ticket from claim
router.post('/:id/new-ticket', async (req, res) => {
  try {
    const claim = await prisma.warrantyClaim.findUnique({
      where: { id: req.params.id },
      include: { originalTicket: true }
    })
    if (!claim) return res.status(404).json({ error: 'Claim not found' })
    if (claim.newTicketId) return res.status(400).json({ error: 'Ticket already created for this claim' })

    const orig = claim.originalTicket

    // New ticket and claim link are saved together or not at all
    const newTicket = await prisma.$transaction(async (tx) => {
      const created = await tx.repairTicket.create({
        data: {
          ticketNumber: await generateTicketNumber(tx),
          customerId: orig.customerId,
          createdById: req.user.id,
          deviceBrand: orig.deviceBrand,
          deviceModel: orig.deviceModel,
          imei: orig.imei,
          color: orig.color,
          issueDesc: claim.issueDesc,
          priority: 'URGENT',
          estimatedCost: claim.isWithinWarranty ? 0 : null,
          finalCost: claim.isWithinWarranty ? 0 : null,
          warrantyDays: await warrantyFor(tx)
        }
      })

      await tx.warrantyClaim.update({
        where: { id: claim.id },
        data: { newTicketId: created.id }
      })

      return created
    })

    res.status(201).json({ ticket: newTicket })
  } catch (err) {
    logger.error('Create warranty ticket error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/warranty/:id — update resolution
router.put('/:id', async (req, res) => {
  try {
    const { resolution, responsibleNote } = req.body
    const data = {}
    if (resolution !== undefined) data.resolution = resolution
    if (responsibleNote !== undefined) data.responsibleNote = responsibleNote

    const claim = await prisma.warrantyClaim.update({
      where: { id: req.params.id },
      data,
      include: { originalTicket: { include: { customer: true } }, newTicket: true }
    })
    res.json({ claim })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
