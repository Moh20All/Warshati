// Builds assets/catalog/accessories.json (shipped in the installer) from csv/accessories.csv (a shop's web listing).
// Each accessory: name, category (guessed from the name), market price (only suggested in the app), photo link.
// Run: npm run build:catalog   (re-run whenever the CSV changes)
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { parseCsv } = require('./csv')

const root = path.join(__dirname, '..')
const inFile = path.join(root, 'csv', 'accessories.csv')
const outFile = path.join(root, 'assets', 'catalog', 'accessories.json')

// Category = the keyword found earliest in the name ("Câble chargeur…" is a cable, "Chargeur + câble…" a charger)
const CATEGORY_WORDS = {
  PACK: ['pack', 'ensemble', 'lot de'],
  CASE: ['coque', 'etui', 'antichoc', 'pochette', 'housse', 'cover', 'bumper', 'sacoche'],
  SCREEN: ['verre', 'protecteur', 'film', 'protection ecran', 'protection d\'ecran', 'hydrogel', 'ceramic', 'ceramique', 'anneau de protection', 'protection d\'objectif'],
  CHARGER: ['chargeur', 'clip de charge', 'station de charge', 'station d\'accueil', 'socle', 'charge sans fil', 'panneau solaire', 'magsafe'],
  CABLE: ['cable', 'cordon'],
  ADAPTER: ['adaptateur', 'convertisseur', 'hub', 'repartiteur', 'otg', 'dock'],
  POWER_BANK: ['powerbank', 'power bank', 'batterie externe', 'batterie'],
  AUDIO: ['ecouteur', 'casque', 'micro', 'boya', 'airpods', 'enceinte', 'haut-parleur', 'kit main', 'earbuds', 'buds', 'speaker', 'baffe', 'carte son', 'recepteur bluetooth'],
  HOLDER: ['support', 'anneau', 'clip', 'stabilisateur', 'trepied', 'perche', 'selfie', 'porte-cles', 'cordon tour'],
  WATCH: ['smartwatch', 'montre', 'bracelet', 'watch'],
  GAMING: ['manette', 'refroidisseur', 'ventilateur', 'radiateur', 'gamepad', 'joystick', 'gachette'],
  STORAGE: ['carte memoire', 'carte sd', 'micro sd', 'cle usb', 'flash disk', 'disque'],
  CAMERA: ['objectif', 'lentille', 'camera', 'lampe', 'ring light', 'led']
}
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, '\'')

function categoryOf(name) {
  const n = fold(name)
  let best = { at: Infinity, category: 'OTHER' }
  for (const [category, words] of Object.entries(CATEGORY_WORDS)) {
    for (const w of words) {
      const m = new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).exec(n)
      if (m && m.index < best.at) best = { at: m.index, category }
    }
  }
  return best.category
}

// "3.400" -> 3400 (dots and spaces are thousands separators); empty -> null
const price = (v) => {
  const n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}
const cleanName = (v) => {
  const t = String(v || '').replace(/[​-‏‪-‮]/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').replace(/\s+([,|])/g, '$1').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : null
}

const report = { rows: 0, duplicates: 0, noPrice: 0, skipped: 0 }
const out = new Map()
for (const r of parseCsv(fs.readFileSync(inFile, 'utf8'))) {
  report.rows++
  const name = cleanName(r['wd-entities-title'])
  if (!name) { report.skipped++; continue }
  const key = name.toLowerCase()
  if (out.has(key)) { report.duplicates++; continue }
  // On sale: first price is the old one, the second the current one; otherwise the first is the price
  const before = price(r['woocommerce-Price-amount'])
  const now = price(r['woocommerce-Price-amount 2'])
  const current = now ?? before
  if (!current) report.noPrice++
  out.set(key, {
    name,
    category: categoryOf(name),
    price: current,
    oldPrice: now && before && before > now ? before : null,
    imageUrl: r['attachment-woocommerce_thumbnail src'] || null
  })
}
const accessories = [...out.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'fr'))

const version = crypto.createHash('sha256').update(JSON.stringify(accessories)).digest('hex').slice(0, 12)
fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify({ version, generatedAt: new Date().toISOString(), accessories }))

const counts = {}
accessories.forEach(a => { counts[a.category] = (counts[a.category] || 0) + 1 })
console.log(`[accessories] ${accessories.length} accessories -> ${path.relative(root, outFile)} (version ${version})`)
console.log(`[accessories] ${Object.entries(counts).map(([c, n]) => `${c} ${n}`).join(', ')}`)
console.log(`[accessories] rows ${report.rows}, duplicates removed ${report.duplicates}, without price ${report.noPrice}, skipped ${report.skipped}`)
