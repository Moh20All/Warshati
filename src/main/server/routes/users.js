import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import logger from '../lib/logger.js'

const router = Router()

// True if this change would leave the store with no active owner
async function wouldRemoveLastOwner(targetId, { role, isActive }) {
    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target || target.role !== 'OWNER' || !target.isActive) return false
    const losesOwner = (role !== undefined && role !== 'OWNER') || isActive === false
    if (!losesOwner) return false
    const otherOwners = await prisma.user.count({ where: { role: 'OWNER', isActive: true, id: { not: targetId } } })
    return otherOwners === 0
}

// All user routes require OWNER role
router.use(requireAuth)
router.use(requireRole('OWNER'))

// GET /api/users
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        })
        res.json({ users })
    } catch (err) {
        logger.error('List users error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// POST /api/users
router.post('/', async (req, res) => {
    try {
        const { name, email, password, role } = req.body

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' })
        }
        if (role !== undefined && !['OWNER', 'STAFF'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' })
        }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
            return res.status(400).json({ error: 'Email already in use' })
        }

        const passwordHash = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: role || 'STAFF'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        })

        res.status(201).json({ user })
    } catch (err) {
        logger.error('Create user error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { name, email, password, role, isActive } = req.body

        if (role !== undefined && !['OWNER', 'STAFF'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' })
        }
        // An owner cannot demote or deactivate their own account (prevents self lock-out)
        if (id === req.user.id && ((role !== undefined && role !== 'OWNER') || isActive === false)) {
            return res.status(400).json({ error: 'You cannot change your own role or deactivate your own account' })
        }
        if (await wouldRemoveLastOwner(id, { role, isActive })) {
            return res.status(400).json({ error: 'The store must keep at least one active owner' })
        }

        const data = {}
        if (name !== undefined) data.name = name
        if (email !== undefined) data.email = email
        if (role !== undefined) data.role = role
        if (isActive !== undefined) data.isActive = isActive
        if (password) {
            data.passwordHash = await bcrypt.hash(password, 10)
        }

        const user = await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        })

        res.json({ user })
    } catch (err) {
        if (err.code === 'P2002') return res.status(400).json({ error: 'Email already in use' })
        if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' })
        logger.error('Update user error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// DELETE /api/users/:id (soft deactivate)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params

        // Can't deactivate yourself
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot deactivate your own account' })
        }
        if (await wouldRemoveLastOwner(id, { isActive: false })) {
            return res.status(400).json({ error: 'The store must keep at least one active owner' })
        }

        const user = await prisma.user.update({
            where: { id },
            data: { isActive: false },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true
            }
        })

        res.json({ user })
    } catch (err) {
        logger.error('Deactivate user error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router
