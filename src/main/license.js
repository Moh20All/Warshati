// License activation & validation — runs only in the main process, never in the renderer.
//
// It talks to the `license` Supabase Edge Function (supabase/functions/license) when it is
// deployed, and falls back to the licenses table REST API while it is not, so the app works
// before and after the migration.
import nodeMachineId from 'node-machine-id' // CommonJS package: default import works in Node and the bundle
const { machineIdSync } = nodeMachineId
import { app } from 'electron'
import log from 'electron-log'
import prisma from './server/lib/prisma.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const TIMEOUT_MS = 5000
// How long the app keeps working without reaching the license server
export const OFFLINE_GRACE_DAYS = 30

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json'
}

class Unreachable extends Error {}

async function request(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, headers: { ...headers, ...options.headers }, signal: controller.signal })
  } catch (e) {
    throw new Unreachable(e.message)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Ask the license service about a key.
 * @param {'validate'|'activate'} action  activate also binds an unbound key to this machine
 * @returns {Promise<{status: 'valid'|'not_found'|'revoked'|'other_device'}>}
 * @throws {Unreachable} when the service cannot be reached or answers with an error
 */
async function askLicenseService(action, key, machineId) {
  const fn = await request(`${SUPABASE_URL}/functions/v1/license`, {
    method: 'POST',
    body: JSON.stringify({ action, key, machineId, appVersion: app.getVersion() }) // version shows in the dashboard
  })
  if (fn.status !== 404) {
    if (!fn.ok) throw new Unreachable(`license function HTTP ${fn.status}`)
    return fn.json()
  }

  // Fallback: Edge Function not deployed yet — use the table directly
  const res = await request(`${SUPABASE_URL}/rest/v1/licenses?key=eq.${encodeURIComponent(key)}&select=id,is_active,machine_id`)
  if (!res.ok) throw new Unreachable(`licenses HTTP ${res.status}`)
  const [rec] = await res.json()
  if (!rec) return { status: 'not_found' }
  if (rec.is_active === false) return { status: 'revoked' }
  if (rec.machine_id) return { status: rec.machine_id === machineId ? 'valid' : 'other_device' }
  if (action === 'validate') return { status: 'other_device' } // unbound = binding was reset by the owner

  // Bind atomically: only succeeds if nobody bound it in the meantime
  const bind = await request(`${SUPABASE_URL}/rest/v1/licenses?id=eq.${rec.id}&machine_id=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ machine_id: machineId, activated_at: new Date().toISOString() })
  })
  if (!bind.ok) throw new Unreachable(`bind HTTP ${bind.status}`)
  const bound = await bind.json()
  return { status: bound.length === 1 ? 'valid' : 'other_device' }
}

const MESSAGES = {
  not_found: 'Your license key was not found on our servers. Please contact support.',
  revoked: 'Your license has been deactivated. Please contact support.',
  other_device: 'This license is registered to a different device. Please contact support.'
}

/** Startup check. Returns { valid, license, deactivationMessage }. */
export async function checkLicense() {
  let local = null
  try {
    local = await prisma.localLicense.findFirst()
    if (!local) return { valid: false, license: null, deactivationMessage: null }

    // Installs from before this check start their grace period now
    if (!local.lastValidatedAt) {
      local = await prisma.localLicense.update({ where: { id: local.id }, data: { lastValidatedAt: new Date() } })
    }

    let result
    try {
      result = await askLicenseService('validate', local.key, machineIdSync())
    } catch (e) {
      if (!(e instanceof Unreachable)) throw e
      return offlineDecision(local, e.message)
    }

    if (result.status === 'valid') {
      await prisma.localLicense.update({ where: { id: local.id }, data: { lastValidatedAt: new Date() } })
      return { valid: true, license: local, deactivationMessage: null }
    }

    // Revoked / deleted / moved: remove ONLY the local license row, never app data
    log.warn('[License] Deactivation:', result.status)
    await prisma.localLicense.deleteMany({})
    return { valid: false, license: null, deactivationMessage: MESSAGES[result.status] || MESSAGES.not_found }
  } catch (e) {
    log.error('[License] Check error:', e)
    // Unexpected error: an existing activation keeps working within the grace period
    return local ? offlineDecision(local, e.message) : { valid: false, license: null, deactivationMessage: null }
  }
}

function offlineDecision(local, reason) {
  const last = new Date(local.lastValidatedAt || local.activatedAt)
  const days = Math.floor((Date.now() - last.getTime()) / 86400000)
  log.info(`[License] Offline (${reason}); last verified ${days} day(s) ago`)
  if (days <= OFFLINE_GRACE_DAYS) return { valid: true, license: local, deactivationMessage: null }
  return {
    valid: false,
    license: null,
    deactivationMessage: `Warshati could not verify your license for ${days} days. Please connect this computer to the internet and enter your key again.`
  }
}

/**
 * Activate a key on this machine.
 * @returns {Promise<{ok: true} | {ok: false, code: 'invalid'|'revoked'|'in_use'|'offline'|'cache'}>}
 */
export async function activateLicense(rawKey) {
  const key = String(rawKey || '').trim().toUpperCase()
  if (!key) return { ok: false, code: 'invalid' }
  const machineId = machineIdSync()

  let result
  try {
    result = await askLicenseService('activate', key, machineId)
  } catch (e) {
    log.warn('[License] Activation unreachable:', e.message)
    return { ok: false, code: 'offline' }
  }
  if (result.status === 'not_found') return { ok: false, code: 'invalid' }
  if (result.status === 'revoked') return { ok: false, code: 'revoked' }
  if (result.status !== 'valid') return { ok: false, code: 'in_use' }

  try {
    await prisma.$transaction([
      prisma.localLicense.deleteMany({}),
      prisma.localLicense.create({ data: { key, machineId, lastValidatedAt: new Date() } })
    ])
    return { ok: true }
  } catch (e) {
    log.error('[License] Could not save activation:', e)
    return { ok: false, code: 'cache' }
  }
}
