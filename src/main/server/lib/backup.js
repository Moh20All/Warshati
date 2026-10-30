import { app, dialog, shell } from 'electron'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import log from 'electron-log'
import prisma, { dbPath } from './prisma.js'
import { verifyToken } from './jwt.js'

// Backup/restore are owner-only; the renderer passes its login token
export async function isOwner(token) {
  try {
    const { userId } = verifyToken(token)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    return !!user && user.isActive && user.role === 'OWNER'
  } catch (e) {
    return false
  }
}
const NOT_OWNER = { success: false, error: 'Only the store owner can back up or restore the database.' }

function timestamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
}

// Consistent snapshot of the live database, safe while the app is running
async function snapshotTo(destPath) {
  if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
  await prisma.$executeRawUnsafe(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`)
}

// ── Automatic daily backups ───────────────────────────────────────────
const AUTO_KEEP = 14
const AUTO_PREFIX = 'warshati-auto-'
export const autoBackupDir = () => path.join(app.getPath('userData'), 'backups')

function listAutoBackups() {
  const dir = autoBackupDir()
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.startsWith(AUTO_PREFIX) && f.endsWith('.db'))
    .sort() // names carry the date, so this is oldest -> newest
    .map(f => path.join(dir, f))
}

/** Writes today's backup if it does not exist yet and keeps only the newest AUTO_KEEP. */
export async function runAutoBackup() {
  try {
    const dir = autoBackupDir()
    fs.mkdirSync(dir, { recursive: true })
    const d = new Date()
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const target = path.join(dir, `${AUTO_PREFIX}${day}.db`)
    if (!fs.existsSync(target)) {
      await snapshotTo(target)
      log.info(`[AUTO-BACKUP] Saved ${target}`)
    }
    const all = listAutoBackups()
    for (const old of all.slice(0, Math.max(0, all.length - AUTO_KEEP))) {
      fs.unlinkSync(old)
      log.info(`[AUTO-BACKUP] Removed old backup ${old}`)
    }
  } catch (err) {
    log.error('[AUTO-BACKUP] Failed:', err)
  }
}

/** Runs now and then every few hours, so a shop left open overnight still gets a new day's backup. */
export function scheduleAutoBackups() {
  runAutoBackup()
  setInterval(runAutoBackup, 3 * 60 * 60 * 1000)
}

export async function getBackupInfo(token) {
  if (!(await isOwner(token))) return NOT_OWNER
  const all = listAutoBackups()
  const latest = all[all.length - 1]
  return {
    success: true,
    dbPath,
    dir: autoBackupDir(),
    count: all.length,
    latest: latest ? { file: path.basename(latest), at: fs.statSync(latest).mtime.toISOString() } : null
  }
}

export async function openBackupFolder(token) {
  if (!(await isOwner(token))) return NOT_OWNER
  fs.mkdirSync(autoBackupDir(), { recursive: true })
  const error = await shell.openPath(autoBackupDir())
  return error ? { success: false, error } : { success: true }
}

/**
 * Ask where to save, then write a full copy of the database there.
 * @returns {Promise<{success: boolean, canceled?: boolean, path?: string, error?: string}>}
 */
export async function backupDatabase(win, token) {
  if (!(await isOwner(token))) return NOT_OWNER
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Backup Warshati database',
      defaultPath: path.join(app.getPath('documents'), `warshati-backup-${timestamp()}.db`),
      filters: [{ name: 'Warshati backup', extensions: ['db'] }]
    })
    if (canceled || !filePath) return { success: false, canceled: true }

    await snapshotTo(filePath)
    log.info(`[BACKUP] Database backed up to ${filePath}`)
    return { success: true, path: filePath }
  } catch (err) {
    log.error('[BACKUP] Failed:', err)
    return { success: false, error: err.message }
  }
}

// A backup is valid if SQLite can open it and it has Warshati's core tables
async function isValidBackup(filePath) {
  const probe = new PrismaClient({ datasources: { db: { url: `file:${filePath}` } } })
  try {
    const rows = await probe.$queryRawUnsafe(
      `SELECT name FROM sqlite_schema WHERE type='table' AND name IN ('Store','User','Sale','RepairTicket')`
    )
    return rows.length === 4
  } catch (e) {
    return false
  } finally {
    await probe.$disconnect()
  }
}

/**
 * Pick a backup file, confirm, keep a safety copy of the current data,
 * replace the database and relaunch the app.
 * @returns {Promise<{success: boolean, canceled?: boolean, error?: string}>}
 */
export async function restoreDatabase(win, token) {
  if (!(await isOwner(token))) return NOT_OWNER
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Restore Warshati database',
      properties: ['openFile'],
      filters: [{ name: 'Warshati backup', extensions: ['db'] }]
    })
    if (canceled || !filePaths?.length) return { success: false, canceled: true }
    const source = filePaths[0]

    if (!(await isValidBackup(source))) {
      return { success: false, error: 'This file is not a valid Warshati backup.' }
    }

    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['Cancel', 'Restore'],
      defaultId: 0,
      cancelId: 0,
      title: 'Restore database',
      message: 'Replace ALL current data with this backup?',
      detail: `${source}\n\nA safety copy of your current data will be saved first. The app will restart.`
    })
    if (response !== 1) return { success: false, canceled: true }

    // Safety copy of the current data next to the live database
    const safetyCopy = path.join(path.dirname(dbPath), `warshati-before-restore-${timestamp()}.db`)
    await snapshotTo(safetyCopy)
    log.info(`[RESTORE] Safety copy saved to ${safetyCopy}`)

    await prisma.$disconnect()
    for (const f of [dbPath + '-journal', dbPath + '-wal', dbPath + '-shm']) {
      if (fs.existsSync(f)) fs.unlinkSync(f)
    }
    fs.copyFileSync(source, dbPath)
    log.info(`[RESTORE] Database restored from ${source}. Relaunching.`)

    app.relaunch()
    app.exit(0)
    return { success: true }
  } catch (err) {
    log.error('[RESTORE] Failed:', err)
    return { success: false, error: err.message }
  }
}
