import { app, shell, BrowserWindow, ipcMain, net } from 'electron'
import { machineIdSync } from 'node-machine-id'
import { autoUpdater } from 'electron-updater'
import prisma from './server/lib/prisma.js'
if (require('electron-squirrel-startup')) {
    app.quit();
}
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { startServer } from './server/index.js'

// Supabase config for server-side license validation
const SUPABASE_URL = 'https://amlcmorpizpzgzjgltuf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtbGNtb3JwaXpwemd6amdsdHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3OTAzMjUsImV4cCI6MjA4OTM2NjMyNX0.wAk_r39NhaAgL8yANumflkig-psoEIKpfFmZnciCXJ0';
const ONLINE_CHECK_TIMEOUT_MS = 3000;

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
        mainWindow.webContents.openDevTools()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // In dev, load from vite dev server; in prod, load built file
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

// ─────────────────────────────────────────────────
// Online Supabase License Validation (main process)
// ─────────────────────────────────────────────────
async function checkInternetAvailable() {
    // Ping Supabase with a 3s hard timeout; returns true/false
    return new Promise((resolve) => {
        const controller = new AbortController();
        const timer = setTimeout(() => { controller.abort(); resolve(false); }, ONLINE_CHECK_TIMEOUT_MS);
        fetch(SUPABASE_URL, { method: 'HEAD', signal: controller.signal })
            .then(() => { clearTimeout(timer); resolve(true); })
            .catch(() => { clearTimeout(timer); resolve(false); });
    });
}

async function validateLicenseOnline(licenseKey, currentMachineId) {
    // Returns: { valid: true } OR { valid: false, message: '...' }
    try {
        const url = `${SUPABASE_URL}/rest/v1/licenses?key=eq.${encodeURIComponent(licenseKey)}&select=*`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            // Supabase returned an HTTP error — treat as network issue, NOT deactivation
            return { valid: true };
        }

        const records = await response.json();
        if (!records || records.length === 0) {
            // Key was deleted from Supabase entirely — deactivate
            return { valid: false, message: 'Your license key was not found on our servers. Please contact support.' };
        }

        const remoteLicense = records[0];

        // Check 1: Is the key revoked?
        if (remoteLicense.is_active === false) {
            return { valid: false, message: 'Your license has been deactivated. Please contact support.' };
        }

        // Check 2: Does the machine_id match?
        // null machine_id means the binding was intentionally cleared by the owner
        // via "Reset Machine Binding" — the app must NOT treat null as a free pass.
        if (!remoteLicense.machine_id || remoteLicense.machine_id !== currentMachineId) {
            return { valid: false, message: 'This license is registered to a different device. Please contact support.' };
        }

        // Both checks passed
        return { valid: true };
    } catch (e) {
        // Any unexpected error = treat as offline = graceful pass
        console.log('[License] Online validation error (treating as offline):', e.message);
        return { valid: true };
    }
}

app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.rakam.desktop')
    app.setName('Rakam')

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // BACKGROUND AUTO-UPDATER
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.checkForUpdates().catch(() => {});
    
    autoUpdater.on('update-downloaded', () => {
        if (BrowserWindow.getAllWindows().length > 0) {
            BrowserWindow.getAllWindows()[0].webContents.send('update-downloaded');
        }
    });

    ipcMain.handle('restart-to-update', () => {
        autoUpdater.quitAndInstall();
    });

    // NATIVE HARDWARE BINDING & LICENSING IPC
    ipcMain.handle('get-machine-id', () => machineIdSync());

    ipcMain.handle('get-local-license', async () => {
        try {
            const localLicense = await prisma.localLicense.findFirst();
            if (!localLicense) {
                // No local license — return null, renderer will show activation screen
                return { valid: false, license: null, deactivationMessage: null };
            }

            // Local license exists — attempt online validation
            const isOnline = await checkInternetAvailable();
            if (!isOnline) {
                // Outcome 4: Offline — skip check, proceed normally
                console.log('[License] Offline — skipping online validation');
                return { valid: true, license: localLicense, deactivationMessage: null };
            }

            // Online — validate against Supabase
            const currentMachineId = machineIdSync();
            const result = await validateLicenseOnline(localLicense.key, currentMachineId);

            if (result.valid) {
                // Outcome 1: Valid — proceed normally
                return { valid: true, license: localLicense, deactivationMessage: null };
            }

            // Outcome 2 or 3: Deactivated — delete LocalLicense, return message
            // ONLY the LocalLicense row is deleted. App data is NEVER touched.
            console.log('[License] Deactivation triggered:', result.message);
            await prisma.localLicense.deleteMany({});
            return { valid: false, license: null, deactivationMessage: result.message };
        } catch (e) {
            console.error('[License] IPC handler error:', e);
            // On any unexpected error, fail open (don't block the user)
            return { valid: true, license: null, deactivationMessage: null };
        }
    });

    ipcMain.handle('setup-license', async (event, licenseKey, machineId) => {
        try {
            await prisma.localLicense.create({ data: { key: licenseKey, machineId: machineId } });
            return true;
        } catch (e) { return false; }
    });

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

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
