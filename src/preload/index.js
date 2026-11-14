import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    // Print receipt using Electron's native silent printing
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    printReceipt: (data) => ipcRenderer.invoke('print-receipt', data),
    printPage: () => ipcRenderer.invoke('print-page'),
    
    // Where the data is: { base, headers, mode, hostName } (this PC, or the shop's main PC)
    apiTarget: ipcRenderer.sendSync('get-api-target'),

    // Shop network (Pro and VIP)
    networkStatus: (token) => ipcRenderer.invoke('network-status', token),
    networkShare: (token, on) => ipcRenderer.invoke('network-share', { token, on }),
    networkRenewCode: (token) => ipcRenderer.invoke('network-renew-code', token),
    networkDiscover: () => ipcRenderer.invoke('network-discover'),
    networkJoin: (host, code) => ipcRenderer.invoke('network-join', { host, code }),
    networkLeave: () => ipcRenderer.invoke('network-leave'),

    // License Activation APIs (all checks run in the main process)
    getLocalLicense: () => ipcRenderer.invoke('get-local-license'),
    getMachineId: () => ipcRenderer.invoke('get-machine-id'),
    activateLicense: (licenseKey) => ipcRenderer.invoke('activate-license', licenseKey),
    // The background check after a quick start found the key revoked / moved
    onLicenseStatus: (callback) => ipcRenderer.on('license-status', callback),

    // Database Backup & Restore
    backupDB: (token) => ipcRenderer.invoke('backup-db', token),
    restoreDB: (token) => ipcRenderer.invoke('restore-db', token),
    getBackupInfo: (token) => ipcRenderer.invoke('get-backup-info', token),
    openBackupFolder: (token) => ipcRenderer.invoke('open-backup-folder', token),

    // WhatsApp with a ready-made message: { phone (international digits), text }
    openWhatsApp: (payload) => ipcRenderer.invoke('open-whatsapp', payload),

    // Excel export: { fileName, sheetName, columns, rows, rtl }
    exportXlsx: (payload) => ipcRenderer.invoke('export-xlsx', payload),
    
    // Auto Updater APIs
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
    onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
    restartToUpdate: () => ipcRenderer.invoke('restart-to-update'),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    window.electron = electronAPI
    window.api = api
}
