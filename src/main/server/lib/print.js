import { BrowserWindow } from 'electron'
import log from 'electron-log'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Sanitise raw HTML: strip any existing <html>, <head>, <body> wrappers
 * so we can inject our own print-safe wrapper.
 */
export function sanitiseHtml(html) {
  return html
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
}

/**
 * Calculate the Electron pageSize object from a human-readable width string.
 * Electron expects microns for custom sizes.
 */
// Item labels: 'label:40x30' = one 40 × 30 mm label per page
export function labelSize(width) {
  const m = /^label:(\d{2,3})x(\d{2,3})$/.exec(String(width || ''))
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null
}

export function pageSizeFromWidth(width) {
  const label = labelSize(width)
  if (label) return { width: label.w * 1000, height: label.h * 1000 }
  if (width === '58mm') return { width: 58000, height: 500000 }
  if (width === '80mm') return { width: 80000, height: 500000 }
  return 'A4'
}

// Design system print fonts (IBM Plex, OFL), embedded in every printout: the print window is a
// data: URL page and cannot load the app's font files. Read once; missing files fall back to system fonts.
const PRINT_FONTS = [
  ['IBM Plex Sans', 500, 'ibm-plex-sans-latin-500-normal'],
  ['IBM Plex Sans', 700, 'ibm-plex-sans-latin-700-normal'],
  ['IBM Plex Sans Arabic', 500, 'ibm-plex-sans-arabic-arabic-500-normal'],
  ['IBM Plex Sans Arabic', 700, 'ibm-plex-sans-arabic-arabic-700-normal'],
  ['IBM Plex Mono', 500, 'ibm-plex-mono-latin-500-normal']
]
let fontCss = null
function printFontCss() {
  if (fontCss !== null) return fontCss
  fontCss = PRINT_FONTS.map(([family, weight, file]) => {
    try {
      const b64 = readFileSync(join(__dirname, '../../assets/fonts', `${file}.woff2`)).toString('base64')
      return `@font-face { font-family: "${family}"; font-weight: ${weight}; src: url(data:font/woff2;base64,${b64}) format("woff2"); }`
    } catch {
      return ''
    }
  }).join('\n')
  return fontCss
}

/**
 * Wrap sanitised HTML in a print-ready document: Plex Sans 500 (700 for bold),
 * Plex Mono for document numbers (.p-mono), black only, zero margins.
 */
export function wrapForPrint(cleanHtml, width) {
  let pageCss = '@page { margin: 0; }'
  if (width === '80mm') pageCss = '@page { margin: 0; size: 80mm 297mm; }'
  if (width === '58mm') pageCss = '@page { margin: 0; size: 58mm 297mm; }'
  const label = labelSize(width)
  if (label) pageCss = `@page { margin: 0; size: ${label.w}mm ${label.h}mm; } body { padding: 0 !important; }`
  const logo = width === '58mm' ? 30 : 40

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        ${printFontCss()}
        ${pageCss}
        body {
          margin: 0;
          padding: 4px 8px 4px 14px;
          width: 100%;
          box-sizing: border-box;
          font-family: "IBM Plex Sans", "IBM Plex Sans Arabic", Tahoma, sans-serif;
          font-weight: 500;
          font-size: 11px;
          line-height: 1.3;
          color: #000;
          background: #fff;
        }
        [dir="rtl"] { font-family: "IBM Plex Sans Arabic", "IBM Plex Sans", Tahoma, sans-serif; }
        * { box-sizing: border-box; overflow-wrap: break-word; color: #000; }
        b, strong, h1, h2, h3, h4, th { font-weight: 700; }
        .p-mono { font-family: "IBM Plex Mono", Consolas, monospace; font-weight: 500; direction: ltr; unicode-bidi: isolate; }
        .p-logo { display: block; width: ${logo}px; height: ${logo}px; margin: 0 auto 4px; }
      </style>
    </head>
    <body>
      ${cleanHtml}
    </body>
    </html>
  `
}

/**
 * Print HTML content.
 *
 * If printerName is provided and non-empty the print is silent (thermal).
 * Otherwise the system print dialog is shown.
 *
 * @param {object} options
 * @param {string} options.html        Raw HTML to print.
 * @param {string} [options.printerName] Target printer for silent mode.
 * @param {string} [options.width]     '58mm' | '80mm' | 'A4' (default '80mm').
 * @param {number} [options.stabilityDelay]  ms to wait before print (default 1000).
 * @param {number} [options.timeout]   ms before aborting (default 30000).
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export function printHtml({
  html,
  printerName,
  width = '80mm',
  stabilityDelay = 1000,
  timeout = 120000
}) {
  log.info(
    `[PRINT] Request received. Printer: "${printerName || 'DEFAULT/DIALOG'}", Width: ${width}`
  )

  const parentWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]

  const printWindow = new BrowserWindow({
    parent: parentWindow || undefined,
    show: false,
    width: 800,
    height: 600,
    paintWhenInitiallyHidden: true,
    webPreferences: { sandbox: false }
  })

  log.info(`[PRINT] Hidden BrowserWindow created. ID: ${printWindow.id}`)

  const cleanHtml = sanitiseHtml(html)
  const content = wrapForPrint(cleanHtml, width)

  return new Promise(async (resolve) => {
    const timer = setTimeout(() => {
      log.error(`[PRINT] Timeout reached (${timeout}ms). Closing window.`)
      if (!printWindow.isDestroyed()) printWindow.close()
      resolve({ success: false, error: 'TIMEOUT' })
    }, timeout)

    printWindow.webContents.on('did-finish-load', () => {
      log.info(`[PRINT] Content loaded (did-finish-load).`)
    })

    printWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
      log.error(`[PRINT] Load failed! Code: ${errorCode}, Desc: ${errorDescription}`)
    })

    try {
      log.info(`[PRINT] Loading Data URL...`)
      await printWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(content)}`
      )

      log.info(`[PRINT] Waiting ${stabilityDelay}ms for driver stability...`)
      await new Promise((r) => setTimeout(r, stabilityDelay))

      const printOptions =
        printerName && printerName.trim() !== ''
          ? {
              silent: true,
              printBackground: true,
              deviceName: printerName,
              margins: { marginType: 'none' },
              pageSize: pageSizeFromWidth(width)
            }
          : {
              silent: false,
              printBackground: true,
              ...(width === 'A4' ? { pageSize: 'A4' } : {}),
              ...(labelSize(width) ? { pageSize: pageSizeFromWidth(width), margins: { marginType: 'none' } } : {})
            }

      log.info(`[PRINT] Calling webContents.print()...`)

      printWindow.webContents.print(printOptions, (success, failureReason) => {
        clearTimeout(timer)
        log.info(
          `[PRINT] Callback — Success: ${success}${
            failureReason ? ', Reason: ' + failureReason : ''
          }`
        )
        if (success) {
          // Destroying immediately on success ruins the Windows native spool stream
          setTimeout(() => {
            if (!printWindow.isDestroyed()) printWindow.close()
          }, 3000)
        } else {
          if (!printWindow.isDestroyed()) printWindow.close()
        }
        resolve({ success, error: failureReason })
      })
    } catch (err) {
      clearTimeout(timer)
      log.error('[PRINT] Critical error:', err)
      if (!printWindow.isDestroyed()) printWindow.close()
      resolve({ success: false, error: err.message })
    }
  })
}
