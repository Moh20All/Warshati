import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query
    const where = {}
    if (category) where.category = category
    if (startDate || endDate) {
      where.expenseDate = {}
      if (startDate) where.expenseDate.gte = new Date(startDate)
      if (endDate) where.expenseDate.lte = new Date(endDate)
    }
    const expenses = await prisma.expense.findMany({
      where,
      include: { createdBy: { select: { name: true } } },
      orderBy: { expenseDate: 'desc' }
    })

    // Calculate monthly total
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthTotal = expenses
      .filter(e => new Date(e.expenseDate) >= monthStart)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0)

    res.json({ expenses, monthTotal })
  } catch (err) {
    console.error('List expenses error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { category, description, amount, paidTo, expenseDate } = req.body
    if (!category || !description || !amount) {
      return res.status(400).json({ error: 'Category, description, and amount are required' })
    }
    const expense = await prisma.expense.create({
      data: {
        category, description, amount: parseFloat(amount),
        paidTo: paidTo || null,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        createdById: req.user.id
      }
    })
    res.status(201).json({ expense })
  } catch (err) {
    console.error('Create expense error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
