import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requirePerm } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { audit } from '../lib/activity.js'

const router = Router()
router.use(requireAuth)
router.use(requirePerm('expenses'))

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
    logger.error('List expenses error:', err)
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
    logger.error('Create expense error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/expenses/:id — correct an expense (owner only)
router.put('/:id', requirePerm('corrections'), async (req, res) => {
  try {
    const { category, description, amount, paidTo, expenseDate } = req.body
    const data = {}
    if (category !== undefined) data.category = category
    if (description !== undefined) {
      if (!String(description).trim()) return res.status(400).json({ error: 'Description is required' })
      data.description = description
    }
    if (amount !== undefined) {
      if (!(parseFloat(amount) > 0)) return res.status(400).json({ error: 'Amount must be positive' })
      data.amount = parseFloat(amount)
    }
    if (paidTo !== undefined) data.paidTo = paidTo || null
    if (expenseDate !== undefined) data.expenseDate = new Date(expenseDate)

    const expense = await prisma.expense.update({ where: { id: req.params.id }, data })
    res.json({ expense })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Expense not found' })
    logger.error('Update expense error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/expenses/:id
router.delete('/:id', requirePerm('corrections'), async (req, res) => {
  try {
    const expense = await prisma.expense.delete({ where: { id: req.params.id } })
    audit(req, 'expense_delete', expense.description, { amount: Number(expense.amount) })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
