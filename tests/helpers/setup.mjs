// Shared test setup: a throwaway copy of the empty template DB and the real Express server.
// Every test file runs in its own Node process (see tests/run.mjs), so module state never leaks.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createRequire } from 'module'

export const projectRoot = fileURLToPath(new URL('../..', import.meta.url))
export const templateDb = path.join(projectRoot, 'assets', 'db', 'template.db')
export const projectRequire = createRequire(path.join(projectRoot, 'package.json'))
export const importProject = (p) => import(pathToFileURL(path.join(projectRoot, p)).href)

/** Temp folder with userData/ (and prisma/warshati.db unless `db: false`). Must run before importing app code. */
export function prepareEnv({ db = true, packaged = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'warshati-test-'))
  fs.mkdirSync(path.join(dir, 'userData'))
  if (db) {
    fs.mkdirSync(path.join(dir, 'prisma'))
    fs.copyFileSync(templateDb, path.join(dir, 'prisma', 'warshati.db'))
  }
  process.env.WARSHATI_TEST_DIR = dir
  process.env.WARSHATI_PACKAGED = packaged ? '1' : '0'
  process.env.WARSHATI_APP_PATH = process.env.WARSHATI_APP_PATH || projectRoot
  process.resourcesPath = dir // only defined inside Electron
  process.chdir(dir)          // prisma.js resolves the dev DB from the working directory
  process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* DB may still be locked */ } })
  return dir
}

/** Starts the real API on a free port. Returns call(token, method, url, body, key?). */
export async function startServer() {
  const { default: app } = await importProject('src/main/server/index.js')
  const { SESSION_KEY } = await importProject('src/main/server/lib/session-key.js')
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)) })
  const base = `http://127.0.0.1:${server.address().port}/api`
  const realFetch = globalThis.__realFetch || globalThis.fetch

  async function call(token, method, url, body, key = SESSION_KEY) {
    const r = await realFetch(base + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { 'x-warshati-key': key } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    })
    const data = await r.json().catch(() => null)
    if (r.status >= 500) console.log(`  server error on ${method} ${url}:`, data)
    return { status: r.status, data }
  }
  return { call, close: () => server.close() }
}

/** Creates the store + owner and returns a helper bound to the owner's token. */
export async function setupOwner(call, email = 'owner@test.local') {
  const r = await call(null, 'POST', '/auth/setup', { storeName: 'Test Shop', userName: 'Owner', email, password: 'pw123456' })
  const token = r.data.token
  return { token, user: r.data.user, o: (m, u, b) => call(token, m, u, b) }
}

/** check(name, actual, expected): numbers compare to 0.001, everything else with ===. */
export function createChecker() {
  let pass = 0, fail = 0
  const near = (a, b) => Math.abs(Number(a) - b) < 0.001
  function check(name, actual, expected) {
    const ok = typeof expected === 'number' ? near(actual, expected) : actual === expected
    ok ? pass++ : fail++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${actual}${ok ? '' : `  (expected ${expected})`}`)
  }
  function finish(error) {
    if (error) { fail++; console.error('CRASH', error) }
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
  return { check, finish }
}
