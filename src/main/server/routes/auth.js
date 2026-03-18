import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' })
        }

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        const token = signToken(user)
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        })
    } catch (err) {
        console.error('Login error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, isActive: true }
        })
        res.json({ user })
    } catch (err) {
        console.error('Me error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// POST /api/auth/setup — first-run only
router.post('/setup', async (req, res) => {
    try {
        // Check if already set up
        const storeCount = await prisma.store.count()
        if (storeCount > 0) {
            return res.status(400).json({ error: 'Setup already completed' })
        }

        const { storeName, storePhone, storeAddress, currency, warrantyDays, userName, email, password } = req.body

        if (!storeName || !userName || !email || !password) {
            return res.status(400).json({ error: 'Store name, user name, email, and password are required' })
        }

        // Create store
        const store = await prisma.store.create({
            data: {
                name: storeName,
                phone: storePhone || null,
                address: storeAddress || null,
                currency: currency || 'DZD',
                warrantyDays: warrantyDays ? parseInt(warrantyDays) : 30
            }
        })

        // Create owner user
        const passwordHash = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({
            data: {
                name: userName,
                email,
                passwordHash,
                role: 'OWNER'
            }
        })

        const token = signToken(user)
        res.json({
            store: { id: store.id, name: store.name },
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        })
    } catch (err) {
        console.error('[Raw Prisma Error in /api/auth/setup]:', err)
        res.status(500).json({ error: 'Internal server error', details: err.message })
    }
})

export default router
