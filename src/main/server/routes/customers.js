import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/customers — list with search
router.get('/', async (req, res) => {
  try {
    const { search } = req.query
    const where = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } }
      ]
    }
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            repairTickets: true,
            sales: true,
            debtLedger: { where: { status: { not: 'SETTLED' } } },
            tradeIns: true
          }
        }
      }
    })
    res.json({ customers })
  } catch (err) {
    console.error('List customers error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/customers/:id — single customer with all relations
router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        repairTickets: { orderBy: { receivedAt: 'desc' } },
        sales: { orderBy: { createdAt: 'desc' }, include: { items: { include: { inventoryItem: true } } } },
        debtLedger: { orderBy: { createdAt: 'desc' }, include: { payments: true } },
        tradeIns: { orderBy: { createdAt: 'desc' } }
      }
    })
    if (!customer) return res.status(404).json({ error: 'Customer not found' })
    res.json({ customer })
  } catch (err) {
    console.error('Get customer error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/customers/lookup/:phone — quick phone lookup
router.get('/lookup/:phone', async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { phone: req.params.phone }
    })
    res.json({ customer: customer || null })
  } catch (err) {
    console.error('Lookup error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, notes } = req.body
    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }
    // If phone provided, check for duplicates
    if (phone) {
      const existing = await prisma.customer.findFirst({ where: { phone } })
      if (existing) {
        return res.status(400).json({ error: 'Phone number already exists' })
      }
    }
    const customer = await prisma.customer.create({
      data: { name, phone: phone || null, email: email || null, notes: notes || null }
    })
    res.status(201).json({ customer })
  } catch (err) {
    console.error('Create customer error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, notes } = req.body
    const data = {}
    if (name !== undefined) data.name = name
    if (phone !== undefined) data.phone = phone
    if (email !== undefined) data.email = email
    if (notes !== undefined) data.notes = notes

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data
    })
    res.json({ customer })
  } catch (err) {
    console.error('Update customer error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    console.error('Delete customer error:', err)
    res.status(500).json({ error: 'Cannot delete customer with linked records' })
  }
})

export default router
