import jwt from 'jsonwebtoken'

// For a desktop app, a hardcoded secret is acceptable
// In production, you could derive this from machine-specific info
const JWT_SECRET = 'rakam-desktop-secret-key-2024'
const JWT_EXPIRES_IN = '7d'

export function signToken(user) {
    return jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    )
}

export function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET)
}
