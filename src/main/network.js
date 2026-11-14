// Shop network (Pro and VIP plans): one "main PC" shares its database over the shop's Wi-Fi / cable,
// the other PCs ("connected PCs") use it instead of their own.
//
// - The main PC's API listens on the network only while sharing is on and the license is Pro or VIP.
// - Connected PCs prove they belong to the shop with the pairing code shown on the main PC.
// - Connected PCs find the main PC with a UDP broadcast (or the user types its address).
import { app } from 'electron'
import dgram from 'dgram'
import os from 'os'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const API_PORT = 3456
export const NET_HEADER = 'x-warshati-net'
export const VIP_PLAN = 3
// Pro (2) and VIP (3) can share the shop data between PCs
export const NETWORK_PLAN = 2
const DISCOVERY_PORT = 3457
const HELLO = 'WARSHATI_DISCOVER_1'
const TIMEOUT_MS = 4000

// ── Settings (a file, not the database: a connected PC needs them before it has any data) ──
const file = () => path.join(app.getPath('userData'), 'network.json')
let config = null

/** { mode: 'off'|'host'|'client', code (host), host, hostName, code (client) } */
export function getConfig() {
  if (!config) {
    try { config = JSON.parse(fs.readFileSync(file(), 'utf8')) } catch { config = {} }
    if (!['off', 'host', 'client'].includes(config.mode)) config.mode = 'off'
  }
  return config
}

function saveConfig(next) {
  config = next
  fs.writeFileSync(file(), JSON.stringify(config, null, 2))
}

// ── Plan (set by the license check; only the main PC's own license counts) ──
let plan = 1
export const setPlan = (p) => { plan = Number(p) || 1 }
export const getPlan = () => plan

/** Pairing code like "K7QM-3XWD" (no 0/O/1/I to avoid typos) */
function newCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const b = crypto.randomBytes(8)
  const s = Array.from(b, (x) => abc[x % abc.length]).join('')
  return `${s.slice(0, 4)}-${s.slice(4)}`
}
const cleanCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/** This PC's addresses on the shop network */
export function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => ({ address: i.address, netmask: i.netmask }))
}

// ── Main PC side ──
export const isSharing = () => getConfig().mode === 'host' && plan >= NETWORK_PLAN

/** Does this request come from a PC of the shop network that knows the pairing code? */
export function isPairedRequest(req) {
  if (!isSharing()) return false
  const got = Buffer.from(cleanCode(req.get(NET_HEADER)))
  const want = Buffer.from(cleanCode(getConfig().code))
  return got.length === want.length && want.length > 0 && crypto.timingSafeEqual(got, want)
}

// Connected PCs seen recently (address → last request), for the settings page
const seen = new Map()
export function markSeen(req) {
  seen.set(String(req.socket.remoteAddress || '').replace(/^::ffff:/, ''), Date.now())
}
export function connectedPcs() {
  const since = Date.now() - 5 * 60 * 1000
  return [...seen].filter(([, t]) => t > since).map(([address, t]) => ({ address, lastSeen: new Date(t).toISOString() }))
}

let discovery = null
/** Answer "where is the main PC?" broadcasts while sharing */
export function updateDiscovery(storeName) {
  if (!isSharing()) {
    discovery?.close()
    discovery = null
    return
  }
  if (discovery) return
  discovery = dgram.createSocket({ type: 'udp4', reuseAddr: true })
  discovery.on('message', (msg, rinfo) => {
    if (msg.toString() !== HELLO || !isSharing()) return
    const reply = Buffer.from(JSON.stringify({ app: 'warshati', name: storeName() || 'Warshati', port: API_PORT }))
    discovery?.send(reply, rinfo.port, rinfo.address)
  })
  discovery.on('error', () => { discovery?.close(); discovery = null })
  discovery.bind(DISCOVERY_PORT)
}

/** Turn sharing on (keeps the existing code) or off */
export function setSharing(on) {
  const c = getConfig()
  // A connected PC's saved code belongs to another main PC: never reuse it
  saveConfig({ mode: on ? 'host' : 'off', code: c.mode !== 'client' && c.code ? c.code : newCode() })
}

/** New pairing code: every connected PC must type the new one */
export function renewCode() {
  saveConfig({ ...getConfig(), code: newCode() })
  seen.clear()
}

// ── Connected PC side ──
/** Broadcast on every network and list the main PCs that answer */
export function discover(waitMs = 1500) {
  return new Promise((resolve) => {
    const found = new Map()
    const sock = dgram.createSocket('udp4')
    sock.on('message', (msg, rinfo) => {
      try {
        const info = JSON.parse(msg.toString())
        if (info.app === 'warshati') found.set(rinfo.address, { address: rinfo.address, name: info.name })
      } catch { /* not ours */ }
    })
    sock.on('error', () => {})
    sock.bind(() => {
      sock.setBroadcast(true)
      const targets = new Set(['255.255.255.255'])
      for (const { address, netmask } of lanAddresses()) {
        const a = address.split('.').map(Number)
        const m = netmask.split('.').map(Number)
        targets.add(a.map((x, i) => (x & m[i]) | (~m[i] & 255)).join('.'))
      }
      for (const t of targets) sock.send(HELLO, DISCOVERY_PORT, t, () => {})
    })
    setTimeout(() => { try { sock.close() } catch { /* closed */ } resolve([...found.values()]) }, waitMs)
  })
}

/**
 * Ask a main PC who it is, with the pairing code.
 * @returns {Promise<{ok: true, name: string} | {ok: false, code: 'unreachable'|'wrong_code'|'not_vip'}>}
 */
export async function hello(host, code) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`http://${host}:${API_PORT}/api/network/hello`, {
      headers: { [NET_HEADER]: cleanCode(code) },
      signal: controller.signal
    })
    if (res.ok) return { ok: true, name: (await res.json()).name }
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, code: body.error === 'not_vip' ? 'not_vip' : 'wrong_code' }
    }
    return { ok: false, code: 'unreachable' }
  } catch {
    return { ok: false, code: 'unreachable' }
  } finally {
    clearTimeout(timer)
  }
}

/** Join a main PC (checked first). The app restarts to use it. */
export async function join(host, code) {
  const address = String(host || '').trim()
  if (!/^[\w.-]{1,253}$/.test(address)) return { ok: false, code: 'unreachable' }
  const r = await hello(address, code)
  if (!r.ok) return r
  saveConfig({ mode: 'client', host: address, hostName: r.name, code: cleanCode(code) })
  return { ok: true }
}

/** Stop using the main PC; this PC goes back to its own data */
export function leave() {
  saveConfig({ mode: 'off' })
}

/** What the window needs to reach its data (sent once, while the preload runs) */
export function apiTarget(sessionKey, sessionHeader) {
  const c = getConfig()
  if (c.mode === 'client') {
    return { base: `http://${c.host}:${API_PORT}/api`, headers: { [NET_HEADER]: c.code }, mode: 'client', hostName: c.hostName || c.host }
  }
  return { base: `http://127.0.0.1:${API_PORT}/api`, headers: { [sessionHeader]: sessionKey }, mode: c.mode }
}
