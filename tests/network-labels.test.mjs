// Shop network (VIP): who may call the main PC's API. Barcode labels: Code 128 symbols, automatic barcodes.
import { prepareEnv, startServer, setupOwner, createChecker, importProject } from './helpers/setup.mjs'

prepareEnv()
const { check, finish } = createChecker()
const realFetch = globalThis.__realFetch || globalThis.fetch

try {
  const { call, base } = await startServer()
  const { token, o } = await setupOwner(call)
  const net = await importProject('src/main/network.js')

  /** Request as another PC of the shop: pairing code header, no per-launch key */
  async function asPc(pairing, path = '/network/hello', auth = null) {
    const res = await realFetch(base + path, {
      headers: { 'x-warshati-net': pairing, ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }
    })
    return { status: res.status, data: await res.json().catch(() => null) }
  }

  // ── Network access ──
  check('sharing off: no pairing works', (await asPc('AAAA-BBBB')).status, 403)

  net.setPlan(1)
  net.setSharing(true)
  const code = net.getConfig().code
  check('code looks like XXXX-XXXX', /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code), true)
  const notVip = await asPc(code)
  check('sharing on but plan 1: refused', notVip.status, 403)
  check('… and says it is not VIP', notVip.data?.error, 'not_vip')

  net.setPlan(2)
  check('Pro plan (2): main PC answers too', (await asPc(code)).status, 200)

  net.setPlan(3)
  const hello = await asPc(code)
  check('VIP + right code: main PC answers', hello.status, 200)
  check('… with the shop name', hello.data?.name, 'Test Shop')
  check('code typed without dash, lower case', (await asPc(code.replace('-', '').toLowerCase())).status, 200)
  check('wrong code: refused', (await asPc('ZZZZ-ZZZZ')).status, 403)
  check('no code: refused', (await asPc('')).status, 403)
  check('paired PC still needs a login for data', (await asPc(code, '/inventory')).status, 401)
  check('paired PC with a login gets data', (await asPc(code, '/inventory', token)).status, 200)
  check('the PC shows as connected', net.connectedPcs().length, 1)

  net.renewCode()
  check('old code stops working after a new code', (await asPc(code)).status, 403)
  const kept = net.getConfig().code
  net.setSharing(false)
  net.setSharing(true)
  check('sharing off and on keeps the code', net.getConfig().code, kept)
  net.setSharing(false)
  check('sharing stopped: refused', (await asPc(kept)).status, 403)
  check('the window\'s own key still works', (await call(token, 'GET', '/inventory')).status, 200)

  // ── Barcodes ──
  const { code128Values, CODE128_PATTERNS } = await importProject('src/renderer/src/lib/barcode.js')
  check('107 Code 128 symbols', CODE128_PATTERNS.length, 107)
  check('every symbol is 11 modules (stop 13)', CODE128_PATTERNS.every((p, i) => [...p].reduce((s, w) => s + Number(w), 0) === (i === 106 ? 13 : 11)), true)
  check('all symbols different', new Set(CODE128_PATTERNS).size, 107)
  // "PJJ123C" in set B: 104 48 42 42 17 18 19 35, checksum (104 + 48 + 42·2 + 42·3 + 17·4 + 18·5 + 19·6 + 35·7) % 103 = 55
  check('set B text', code128Values('PJJ123C').join(' '), '104 48 42 42 17 18 19 35 55 106')
  check('even digits use set C', code128Values('201234567890').slice(0, 7).join(' '), '105 20 12 34 56 78 90')
  check('odd digits end in set B', code128Values('12345').slice(0, 5).join(' '), '105 12 34 100 21')

  const a = await o('POST', '/inventory', { type: 'ACCESSORY', name: 'Câble USB-C', quantity: 3, buyPrice: 100, sellPrice: 300, recordExpense: false })
  const b = await o('POST', '/inventory', { type: 'ACCESSORY', name: 'Coque', barcode: '6111234567890', quantity: 1, buyPrice: 50, sellPrice: 200, recordExpense: false })
  const r = await o('POST', '/inventory/assign-barcodes', { ids: [a.data.item.id, b.data.item.id] })
  const got = r.data.assigned?.[a.data.item.id]
  check('item without barcode gets one', /^20\d{10}$/.test(got || ''), true)
  check('item with a barcode is left alone', r.data.assigned?.[b.data.item.id], undefined)
  check('new barcode is saved', (await o('GET', `/inventory/${a.data.item.id}`)).data.item.barcode, got)
  check('the till finds it', (await o('GET', `/inventory/barcode/${got}`)).data.item?.id, a.data.item.id)
  check('second call assigns nothing', Object.keys((await o('POST', '/inventory/assign-barcodes', { ids: [a.data.item.id] })).data.assigned).length, 0)

  const { pageSizeFromWidth, wrapForPrint } = await importProject('src/main/server/lib/print.js')
  check('40x30 label prints on a 40 × 30 mm page', JSON.stringify(pageSizeFromWidth('label:40x30')), JSON.stringify({ width: 40000, height: 30000 }))
  // Thermal receipts fit the print head, not the paper (the right side was cut on 80 mm printers)
  check('80 mm paper: laid out on 72 mm', wrapForPrint('x', '80mm').includes('width: 72mm'), true)
  check('58 mm paper: laid out on 48 mm', wrapForPrint('x', '58mm').includes('width: 48mm'), true)
  check('narrower width chosen in settings', wrapForPrint('x', '80mm', '64').includes('width: 64mm'), true)
  check('never wider than the head', wrapForPrint('x', '58mm', '70').includes('width: 48mm'), true)
  check('A4 untouched', wrapForPrint('x', 'A4').includes('width: 72mm'), false)

  finish()
} catch (e) {
  finish(e)
}
