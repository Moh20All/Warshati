import { app, shell, BrowserWindow, ipcMain, net, protocol } from 'electron'
import { pathToFileURL } from 'url'
import { resolve as resolvePath, sep } from 'path'
import { catalogImagesDir } from './server/lib/catalog.js'

// rakam-media://catalog/<file> serves downloaded device images (and nothing outside that folder)
protocol.registerSchemesAsPrivileged([
    { scheme: 'rakam-media', privileges: { standard: true, secure: true, supportFetchAPI: true } }
])
import { machineIdSync } from 'node-machine-id'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import prisma from './server/lib/prisma.js'
import { printHtml } from './server/lib/print.js'
import { backupDatabase, restoreDatabase, scheduleAutoBackups, getBackupInfo, openBackupFolder } from './server/lib/backup.js'

// Configure logging
autoUpdater.logger = log
log.info('App starting...')
log.transports.file.level = 'info'

if (require('electron-squirrel-startup')) {
    app.quit();
}
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { startServer } from './server/index.js'

import { checkLicense, activateLicense } from './license.js'
import { exportXlsx } from './export.js'
import { SESSION_KEY } from './server/lib/session-key.js'

// The renderer reads the per-launch API key synchronously while its preload runs
ipcMain.on('get-api-key', (event) => { event.returnValue = SESSION_KEY })

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        title: 'Rakam — رقم',
        icon: join(__dirname, '../../assets/r.png'),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        // Only web links leave the app (never file:// or other protocols)
        if (/^https?:\/\//i.test(details.url)) shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // In dev, load from vite dev server; in prod, load built file
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.rakam.desktop')
    app.setName('Rakam')

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    protocol.handle('rakam-media', (request) => {
        const url = new URL(request.url)
        const base = resolvePath(catalogImagesDir())
        const file = resolvePath(base, decodeURIComponent(url.pathname).replace(/^\/+/, ''))
        if (url.hostname !== 'catalog' || !file.startsWith(base + sep)) return new Response('Forbidden', { status: 403 })
        return net.fetch(pathToFileURL(file).toString())
    })

    // BACKGROUND AUTO-UPDATER
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false; // We will handle this explicitly via UI now
    
    // Wire up events to send back to the renderer
    autoUpdater.on('update-available', (info) => {
        log.info('Update available:', info.version);
        if (BrowserWindow.getAllWindows().length > 0) {
            BrowserWindow.getAllWindows()[0].webContents.send('update-available', info);
        }
    });

    autoUpdater.on('download-progress', (progressObj) => {
        // progressObj contains: bytesPerSecond, percent, total, transferred
        if (BrowserWindow.getAllWindows().length > 0) {
            BrowserWindow.getAllWindows()[0].webContents.send('download-progress', progressObj);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded, ready to install');
        if (BrowserWindow.getAllWindows().length > 0) {
            BrowserWindow.getAllWindows()[0].webContents.send('update-downloaded', info);
        }
    });

    autoUpdater.on('error', (err) => {
        log.error('Auto-updater error:', err);
        if (BrowserWindow.getAllWindows().length > 0) {
            BrowserWindow.getAllWindows()[0].webContents.send('update-error', err.message);
        }
    });

    // Start checking for updates after handlers are attached
    autoUpdater.checkForUpdates().catch(() => {});

    ipcMain.handle('restart-to-update', () => {
        autoUpdater.quitAndInstall(false, true); // (isSilent, isForceRunAfter)
    });

    // NATIVE HARDWARE BINDING & LICENSING IPC
    ipcMain.handle('get-machine-id', () => machineIdSync());

    // Validation (with offline grace period) and activation both happen here, not in the renderer
    ipcMain.handle('get-local-license', () => checkLicense());
    ipcMain.handle('activate-license', (_e, licenseKey) => activateLicense(licenseKey));
    
    // NATIVE THERMAL PRINTING
    ipcMain.handle('get-printers', async () => {
        const list = await mainWindow.webContents.getPrintersAsync();
        console.log(`[DEBUG-PRINTERS] Discovered ${list.length} printers:`, list.map(p => p.name).join(', '));
        return list;
    });

    // Print the focused window with the system print dialog
    ipcMain.handle('print-page', async () => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return;
        win.webContents.print(
            { silent: false, printBackground: true },
            (success, errorType) => {
                if (!success) console.error('Print failed:', errorType);
            }
        );
    });

    // Print HTML content: silent to thermal printer, or with dialog as fallback
    ipcMain.handle('print-receipt', async (event, { html, printerName, width = '80mm' }) => {
        return printHtml({ html, printerName, width })
    });

    // DATABASE BACKUP & RESTORE
    ipcMain.handle('backup-db', (_e, token) => backupDatabase(mainWindow, token))
    ipcMain.handle('restore-db', (_e, token) => restoreDatabase(mainWindow, token))
    ipcMain.handle('get-backup-info', (_e, token) => getBackupInfo(token))
    ipcMain.handle('open-backup-folder', (_e, token) => openBackupFolder(token))

    // WHATSAPP: opens WhatsApp (app or web) with a ready message; the URL is built here, not in the renderer
    ipcMain.handle('open-whatsapp', async (_e, { phone, text } = {}) => {
        // The renderer sends international digits only; anything else is refused, not "repaired"
        const digits = String(phone || '')
        if (!/^\d{8,15}$/.test(digits)) return { success: false, error: 'Invalid phone number' }
        await shell.openExternal(`https://wa.me/${digits}?text=${encodeURIComponent(String(text || '').slice(0, 2000))}`)
        return { success: true }
    })

    // EXCEL EXPORT (the renderer sends only rows the user can already see)
    ipcMain.handle('export-xlsx', (_e, payload) => exportXlsx(mainWindow, payload))

    // Start Express API server first
    try {
        await startServer()
    } catch (err) {
        const { dialog } = require('electron')
        dialog.showErrorBox('Store Already Running', err.message || 'Failed to start the local database server.')
        app.exit(1)
        return
    }

    createWindow()
    scheduleAutoBackups()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// ─────────────────────────────────────────────────
// Main Process Crash Handlers
// ─────────────────────────────────────────────────
process.on('uncaughtException', (error) => {
    log.error('[CRASH] Uncaught exception:', error)
    try {
        const { writeFileSync, appendFileSync } = require('fs')
        const { join } = require('path')
        const logPath = join(app.getPath('logs'), 'rakam-crash.log')
        appendFileSync(logPath, `[${new Date().toISOString()}] UNCAUGHT: ${error.stack || error.message}\n`)
    } catch (e) { /* ignore write errors */ }
})

process.on('unhandledRejection', (reason) => {
    log.error('[CRASH] Unhandled rejection:', reason)
    try {
        const { appendFileSync } = require('fs')
        const { join } = require('path')
        const logPath = join(app.getPath('logs'), 'rakam-crash.log')
        appendFileSync(logPath, `[${new Date().toISOString()}] REJECTION: ${reason?.stack || reason}\n`)
    } catch (e) { /* ignore write errors */ }
})
