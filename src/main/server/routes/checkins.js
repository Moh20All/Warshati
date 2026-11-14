import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePerm } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { nextCheckInNumber } from '../lib/numbering.js'
import { rememberDevice } from '../lib/catalog.js'

const router = Router()
router.use(requireAuth)
router.use(requirePerm('repairs'))

// Generate CI number: CI-YYYY-NNNN (pass the transaction client when inside one)
async function generateCINumber(db = prisma) {
  return nextCheckInNumber(db)
}

// GET /api/checkins
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query
    const where = {}
    if (search) {
      where.OR = [
        { checkInNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { deviceBrand: { contains: search } },
        { deviceModel: { contains: search } }
      ]
    }
    if (status === 'pending') where.convertedAt = null
    if (status === 'converted') where.convertedAt = { not: null }

    const checkins = await prisma.checkIn.findMany({
      where,
      include: { customer: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ checkins })
  } catch (err) {
    logger.error('List checkins error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/checkins/:id
router.get('/:id', async (req, res) => {
  try {
    const checkin = await prisma.checkIn.findUnique({
      where: { id: req.params.id },
      include: { customer: true, createdBy: { select: { name: true } }, repairTicket: true }
    })
    if (!checkin) return res.status(404).json({ error: 'Check-in not found' })
    res.json({ checkin })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/checkins
// Accepts either customerId (existing) or customerName (auto-creates customer)
router.post('/', async (req, res) => {
  try {
    const { customerId, customerName, customerPhone, deviceBrand, deviceModel, imei, color, issueDesc, condition } = req.body
    if (!deviceBrand || !deviceModel || !issueDesc) {
      return res.status(400).json({ error: 'Device brand, model, and issue description are required' })
    }
    if (!customerId && !customerName) {
      return res.status(400).json({ error: 'Customer name is required' })
    }

    // Customer and check-in are saved together or not at all
    const checkin = await prisma.$transaction(async (tx) => {
      // Resolve or create customer
      let resolvedCustomerId = customerId
      if (!resolvedCustomerId) {
        const customer = await tx.customer.create({
          data: { name: customerName, phone: customerPhone || null }
        })
        resolvedCustomerId = customer.id
      }

      return tx.checkIn.create({
        data: {
          checkInNumber: await generateCINumber(tx), customerId: resolvedCustomerId, createdById: req.user.id,
          deviceBrand, deviceModel, imei: imei || null, color: color || null,
          issueDesc, condition: condition || null
        },
        include: { customer: true }
      })
    })
    await rememberDevice(prisma, { category: req.body.deviceCategory, brand: deviceBrand, model: deviceModel })
    res.status(201).json({ checkin })
  } catch (err) {
    logger.error('Create checkin error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/checkins/:id/print — mark as printed
router.post('/:id/print', async (req, res) => {
  try {
    const checkin = await prisma.checkIn.update({
      where: { id: req.params.id },
      data: { printedAt: new Date() }
    })
    res.json({ checkin })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
