import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const JWT_EXPIRES_IN = '7d'

// Random secret generated once per install and stored in userData,
// so tokens cannot be forged from a copy of the installer
let JWT_SECRET = null

function getSecret() {
    if (JWT_SECRET) return JWT_SECRET
    const secretPath = path.join(app.getPath('userData'), 'jwt-secret')
    try {
        JWT_SECRET = fs.readFileSync(secretPath, 'utf8').trim()
    } catch (e) { /* not created yet */ }
    if (!JWT_SECRET) {
        JWT_SECRET = crypto.randomBytes(48).toString('hex')
        fs.mkdirSync(path.dirname(secretPath), { recursive: true })
        fs.writeFileSync(secretPath, JWT_SECRET, { mode: 0o600 })
    }
    return JWT_SECRET
}

export function signToken(user) {
    return jwt.sign(
        { userId: user.id, role: user.role },
        getSecret(),
        { expiresIn: JWT_EXPIRES_IN }
    )
}

export function verifyToken(token) {
    return jwt.verify(token, getSecret())
}
