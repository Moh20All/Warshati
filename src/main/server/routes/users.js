import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

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
        console.error('List users error:', err)
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
        console.error('Create user error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { name, email, password, role, isActive } = req.body

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
        console.error('Update user error:', err)
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
        console.error('Deactivate user error:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

export default router
