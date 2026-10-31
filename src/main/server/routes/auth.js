import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { requireAuth } from '../middleware/auth.js'
import logger from '../lib/logger.js'

const router = Router()

// Brute-force protection: after MAX_FAILURES wrong passwords an email is locked for LOCK_MS
const MAX_FAILURES = 5
const LOCK_MS = 5 * 60 * 1000
const failures = new Map() // email -> { count, lockedUntil }

function lockedFor(email) {
    const f = failures.get(email)
    return f && f.lockedUntil > Date.now() ? Math.ceil((f.lockedUntil - Date.now()) / 60000) : 0
}

function recordFailure(email) {
    const f = failures.get(email) || { count: 0, lockedUntil: 0 }
    f.count += 1
    if (f.count >= MAX_FAILURES) { f.lockedUntil = Date.now() + LOCK_MS; f.count = 0 }
    failures.set(email, f)
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { password } = req.body
        const typedEmail = String(req.body.email || '').trim()
        const email = typedEmail.toLowerCase() // lock-out key, case-insensitive

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' })
        }

        const minutes = lockedFor(email)
        if (minutes) {
            return res.status(429).json({ error: `Too many failed attempts. Try again in ${minutes} minute(s).` })
        }

        // Accounts keep the email as it was typed at creation; also accept it in lower case
        const user = await prisma.user.findUnique({ where: { email: typedEmail } })
            || (typedEmail !== email ? await prisma.user.findUnique({ where: { email } }) : null)
        if (!user || !user.isActive) {
            recordFailure(email)
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) {
            recordFailure(email)
            return res.status(401).json({ error: 'Invalid credentials' })
        }
        failures.delete(email)

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
        logger.error('Login error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// POST /api/auth/recover — owner forgot email or password: the shop's license key proves it.
// { key } returns the owner's email; { key, password } also sets a new password.
router.post('/recover', async (req, res) => {
    try {
        const minutes = lockedFor('#recover')
        if (minutes) {
            return res.status(429).json({ error: `Too many failed attempts. Try again in ${minutes} minute(s).` })
        }

        const key = String(req.body.key || '').trim().toUpperCase()
        const local = key ? await prisma.localLicense.findFirst() : null
        if (!local || local.key !== key) {
            recordFailure('#recover')
            return res.status(401).json({ error: 'wrong_key' })
        }
        failures.delete('#recover')

        const owner = await prisma.user.findFirst({ where: { role: 'OWNER', isActive: true }, orderBy: { createdAt: 'asc' } })
        if (!owner) return res.status(404).json({ error: 'no_owner' })

        const { password } = req.body
        if (password !== undefined) {
            if (String(password).length < 6) return res.status(400).json({ error: 'short_password' })
            await prisma.user.update({ where: { id: owner.id }, data: { passwordHash: await bcrypt.hash(String(password), 10) } })
            logger.info('Owner password reset with the license key')
        }
        res.json({ email: owner.email })
    } catch (err) {
        logger.error('Recover error:', err)
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
        logger.error('Me error:', err)
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
        logger.error('[Raw Prisma Error in /api/auth/setup]:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router
