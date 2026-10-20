/**
 * usePrint — Reusable hook for receipt printing
 * 
 * Reads printer settings from localStorage (set in StoreSettings).
 * If a thermal printer is configured → silent print via Electron IPC.
 * If no printer → shows the system print dialog via Electron IPC (no window.open).
 */
export function usePrint() {
  const getPrinterConfig = (type = 'receipt') => ({
    printerName: localStorage.getItem('rakam_printer') || '',
    width: localStorage.getItem(`rakam_${type}_width`) || '80mm'
  })

  /**
   * Print HTML content.
   * - If a thermal printer is configured → silent print.
   * - Otherwise → system print dialog via IPC (Electron-safe, no window.open).
   * 
   * @param {string} html - The HTML content to print
   * @param {string} type - Document type: 'receipt', 'ticket', or 'report'
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const print = async (html, type = 'receipt') => {
    const config = getPrinterConfig(type)
    const showDialog = localStorage.getItem('rakam_show_print_dialog') === 'true'

    // Always use Electron IPC — never window.open() which breaks in Electron
    try {
      // If showDialog is true, we pass undefined printerName to trigger the system dialog
      const finalPrinterName = showDialog ? undefined : (config.printerName || undefined)
      const result = await window.api.printReceipt({ 
        html, 
        printerName: finalPrinterName, 
        width: config.width 
      })
      return result
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  return { print, getPrinterConfig }
}
