// Minimal stand-in for the 'electron' module so the server code runs in plain Node.
import path from 'path'

const dir = () => process.env.WARSHATI_TEST_DIR

export const app = {
  isPackaged: process.env.WARSHATI_PACKAGED === '1',
  getPath: () => path.join(dir(), 'userData'),
  getAppPath: () => process.env.WARSHATI_APP_PATH, // where assets/ (e.g. the bundled device catalog) live
  getVersion: () => '0.0.0-test'
}
export const dialog = {}
export const shell = { openPath: async () => '' }
export const BrowserWindow = { getAllWindows: () => [], getFocusedWindow: () => null }
export default { app, dialog, shell, BrowserWindow }
