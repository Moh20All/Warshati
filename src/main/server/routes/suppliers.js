import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import logger from '../lib/logger.js'

const router = Router()
router.use(requireAuth)
router.use(requireRole('OWNER'))

// GET /api/suppliers
router.get('/', async (req, res) => {
  try {
    const { search } = req.query
    const where = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } }
      ]
    }
    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { purchaseOrders: true } },
        supplierDebts: { where: { status: { not: 'SETTLED' } }, select: { remaining: true } }
      }
    })
    // owed = what the store still has to pay this supplier
    res.json({ suppliers: suppliers.map(({ supplierDebts, ...s }) => ({ ...s, owed: supplierDebts.reduce((t, d) => t + parseFloat(d.remaining), 0) })) })
  } catch (err) {
    logger.error('List suppliers error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/suppliers/:id
router.get('/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: {
        purchaseOrders: { orderBy: { orderedAt: 'desc' }, include: { items: { include: { inventoryItem: true } } } },
        supplierDebts: { orderBy: { createdAt: 'desc' }, include: { payments: true, purchaseOrder: true } }
      }
    })
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' })
    res.json({ supplier })
  } catch (err) {
    logger.error('Get supplier error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/suppliers
router.post('/', async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const supplier = await prisma.supplier.create({ data: { name, phone: phone || null, address: address || null, notes: notes || null } })
    res.status(201).json({ supplier })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body
    const data = {}
    if (name !== undefined) data.name = name
    if (phone !== undefined) data.phone = phone
    if (address !== undefined) data.address = address
    if (notes !== undefined) data.notes = notes
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data })
    res.json({ supplier })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete supplier with linked records' })
  }
})

export default router
