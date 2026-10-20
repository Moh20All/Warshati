import crypto from 'crypto'

// Random key created on every launch. Only the app's own window receives it (via preload),
// so web pages open in a browser on the same PC cannot call the local API.
export const SESSION_KEY = crypto.randomBytes(32).toString('hex')
export const SESSION_HEADER = 'x-rakam-key'
