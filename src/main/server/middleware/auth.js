import { verifyToken } from '../lib/jwt.js'
import prisma from '../lib/prisma.js'
import { can, permissionsOf } from '../lib/permissions.js'

export async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        })

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid or inactive user' })
        }

        // Read on every request: a permission the owner removes stops working at once
        req.user = { id: user.id, role: user.role, name: user.name, email: user.email, repairmanId: user.repairmanId || null, perms: permissionsOf(user) }
        next()
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' })
    }
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' })
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' })
        }
        next()
    }
}

/** requirePerm('sales', 'debts'): the owner, or an account holding any one of them (lib/permissions.js) */
export function requirePerm(...keys) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
        if (!can(req.user, ...keys)) return res.status(403).json({ error: 'Insufficient permissions' })
        next()
    }
}
