import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    // Print receipt using Electron's print dialog
    printReceipt: (htmlContent) => ipcRenderer.invoke('print-receipt', htmlContent),
    
    // License Activation APIs
    getLocalLicense: () => ipcRenderer.invoke('get-local-license'),
    getMachineId: () => ipcRenderer.invoke('get-machine-id'),
    setupLicense: (licenseKey, machineId) => ipcRenderer.invoke('setup-license', licenseKey, machineId),
    
    // Auto Updater APIs
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
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
