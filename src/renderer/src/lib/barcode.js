// Code 128 barcodes as SVG, for the item labels. Every shop scanner reads Code 128.
// Digits use set C (two per symbol, short labels); anything else uses set B.

// Bar/space widths of the 107 symbols (0-102 data, 103-105 start A/B/C, 106 stop)
const PATTERNS = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 '
  + '221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 '
  + '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 '
  + '212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 '
  + '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 '
  + '231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 '
  + '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 '
  + '112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 '
  + '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 '
  + '214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 '
  + '114131 311141 411131 211412 211214 211232 2331112').split(' ')

const START_B = 104, START_C = 105, TO_B = 100, STOP = 106

/** Symbol values for the text, checksum and stop included */
export function code128Values(text) {
  const s = String(text).replace(/[^\x20-\x7e]/g, '?')
  const values = []
  if (/^\d{4,}$/.test(s)) {
    const even = s.length - (s.length % 2)
    values.push(START_C)
    for (let i = 0; i < even; i += 2) values.push(Number(s.slice(i, i + 2)))
    if (even < s.length) values.push(TO_B, s.charCodeAt(even) - 32)
  } else {
    values.push(START_B, ...Array.from(s, (c) => c.charCodeAt(0) - 32))
  }
  const check = values.reduce((sum, v, i) => sum + v * (i || 1), 0) % 103
  return [...values, check, STOP]
}

/** SVG markup; it stretches to the width and height given (CSS units, e.g. '36mm') */
export function code128Svg(text, { width = '100%', height = '12mm' } = {}) {
  const quiet = 10
  let x = quiet
  let rects = ''
  for (const v of code128Values(text)) {
    PATTERNS[v].split('').forEach((w, i) => {
      if (i % 2 === 0) rects += `<rect x="${x}" y="0" width="${w}" height="1"/>`
      x += Number(w)
    })
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + quiet} 1" preserveAspectRatio="none" `
    + `style="display:block;width:${width};height:${height}" shape-rendering="crispEdges" fill="#000">${rects}</svg>`
}

/** What a repair ticket's barcode holds: its digits only ("TKT-2026-0051" → "20260051"), so set C keeps the bars wide */
export const ticketBarcode = (ticketNumber) => String(ticketNumber || '').replace(/\D/g, '')

export const CODE128_PATTERNS = PATTERNS // for tests
