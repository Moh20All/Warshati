import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import logger from '../lib/logger.js'

const router = Router()

// GET /api/store/status — public, used by first-run check
router.get('/status', async (_req, res) => {
    try {
        const storeCount = await prisma.store.count()
        res.json({ needsSetup: storeCount === 0 })
    } catch (err) {
        logger.error('[Raw Prisma Error in /api/store/status]:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// GET /api/store — requires auth
router.get('/', requireAuth, async (_req, res) => {
    try {
        const store = await prisma.store.findFirst()
        if (!store) {
            return res.status(404).json({ error: 'Store not configured' })
        }
        res.json({ store })
    } catch (err) {
        logger.error('Get store error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// PUT /api/store — OWNER only
router.put('/', requireAuth, requireRole('OWNER'), async (req, res) => {
    try {
        const store = await prisma.store.findFirst()
        if (!store) {
            return res.status(404).json({ error: 'Store not configured' })
        }

        const { name, phone, address, currency, warrantyDays, logoPath } = req.body
        const data = {}
        if (name !== undefined) data.name = name
        if (phone !== undefined) data.phone = phone
        if (address !== undefined) data.address = address
        if (currency !== undefined) data.currency = currency
        if (warrantyDays !== undefined) data.warrantyDays = parseInt(warrantyDays)
        if (logoPath !== undefined) data.logoPath = logoPath
        for (const k of ['featCheckIn', 'featDeliveryReceipt', 'featQuickCash', 'featDrawerFloat', 'featRepairmen']) {
            if (req.body[k] !== undefined) data[k] = !!req.body[k]
        }
        if (req.body.drawerFloat !== undefined) data.drawerFloat = Math.max(0, parseInt(req.body.drawerFloat) || 0)

        const updated = await prisma.store.update({
            where: { id: store.id },
            data
        })

        res.json({ store: updated })
    } catch (err) {
        logger.error('Update store error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router
