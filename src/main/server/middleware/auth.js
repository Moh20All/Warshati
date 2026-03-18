import { verifyToken } from '../lib/jwt.js'
import prisma from '../lib/prisma.js'

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

        req.user = { id: user.id, role: user.role, name: user.name, email: user.email }
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
