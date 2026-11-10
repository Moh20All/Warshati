import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import logger from '../lib/logger.js'
import { ACTIONS } from '../lib/activity.js'

const router = Router()
router.use(requireAuth)
router.use(requireRole('OWNER'))

// GET /api/activity?from=YYYY-MM-DD&to=YYYY-MM-DD&action=&userId=&limit=&offset= — newest first
router.get('/', async (req, res) => {
  try {
    const { from, to, action, userId } = req.query
    const where = {}
    if (action) where.action = action
    if (userId) where.userId = userId
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) { const end = new Date(to); end.setDate(end.getDate() + 1); where.createdAt.lt = end }
    }
    const take = Math.min(500, parseInt(req.query.limit) || 200)
    const skip = Math.max(0, parseInt(req.query.offset) || 0)
    const [entries, total] = await Promise.all([
      prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      prisma.activityLog.count({ where })
    ])
    res.json({ entries: entries.map(e => ({ ...e, details: e.details ? JSON.parse(e.details) : null })), total, actions: ACTIONS })
  } catch (err) {
    logger.error('Activity log list error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
