// Builds assets/catalog/devices.json (shipped in the installer) from csv/*.csv.
// Cleans the raw data once, so the app never sees impossible or inconsistent values.
// Run: npm run build:catalog   (re-run whenever the CSV files change)
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { parseCsv } = require('./csv')

const root = path.join(__dirname, '..')
const csvDir = path.join(root, 'csv')
const outFile = path.join(root, 'assets', 'catalog', 'devices.json')

const readCsv = (f) => parseCsv(fs.readFileSync(path.join(csvDir, f), 'utf8'))

// ── Cleaning helpers ──
const empty = (v) => v === undefined || v === null || /^(|nan|null|none|n\/a|unknown|-)$/i.test(String(v).trim())
const num = (v) => (empty(v) || isNaN(Number(v)) ? null : Number(v))
const text = (v) => (empty(v) ? null : String(v).trim().replace(/\s+/g, ' '))
const inRange = (v, min, max) => (v !== null && v >= min && v <= max ? v : null)

const BRAND_NAMES = {
  qualcomm: 'Qualcomm', mediatek: 'MediaTek', unisoc: 'Unisoc', hisilicon: 'HiSilicon',
  apple: 'Apple', samsung: 'Samsung', xiaomi: 'Xiaomi', poco: 'POCO', redmi: 'Redmi', oneplus: 'OnePlus',
  oppo: 'OPPO', vivo: 'vivo', realme: 'realme', infinix: 'Infinix', tecno: 'TECNO', itel: 'itel',
  honor: 'HONOR', huawei: 'HUAWEI', google: 'Google', nothing: 'Nothing', nokia: 'Nokia', sony: 'Sony',
  asus: 'ASUS', redmagic: 'REDMAGIC', motorola: 'Motorola', lenovo: 'Lenovo', hp: 'HP', dell: 'Dell',
  acer: 'Acer', msi: 'MSI', toshiba: 'Toshiba', microsoft: 'Microsoft', nintendo: 'Nintendo', valve: 'Valve',
  razer: 'Razer', lg: 'LG', mediacom: 'Mediacom', chuwi: 'Chuwi', vero: 'Vero', fujitsu: 'Fujitsu',
  xiaomi_mi: 'Xiaomi', huawei_: 'HUAWEI', google_: 'Google', lg_: 'LG', samsung_: 'Samsung'
}
const brandName = (v) => {
  const t = text(v)
  if (!t) return null
  return BRAND_NAMES[t.toLowerCase()] || t.charAt(0).toUpperCase() + t.slice(1)
}

function phoneOs(osRaw, brand) {
  const t = text(osRaw)
  if (!t) return null
  const m = t.match(/^(iOS|HarmonyOS)?\s*v?\s*(\d+(?:\.\d+)?)$/i)
  if (!m) return t
  const version = m[2].replace(/\.0$/, '')
  if (m[1]) return `${/^ios$/i.test(m[1]) ? 'iOS' : 'HarmonyOS'} ${version}`
  return brand === 'Apple' ? `iOS ${version}` : `Android ${version}`
}

// Value-for-money rating from phones.csv (vfm_label) -> stable key the app translates
const VFM_LABELS = { 'overpriced': 'OVERPRICED', 'average value': 'AVERAGE', 'value king': 'VALUE_KING', 'performance beast': 'PERFORMANCE_BEAST' }
const vfmLabel = (v) => VFM_LABELS[String(v || '').trim().toLowerCase()] || null

// ── Phones ──
function buildPhones(report) {
  const out = new Map()
  for (const r of readCsv('phones.csv')) {
    const brand = brandName(r.brand_name)
    const model = text(r.model_name)
    if (!brand || !model) { report.skipped++; continue }
    const key = `${brand}|${model}`.toLowerCase()
    if (out.has(key)) { report.duplicates++; continue }

    let storage = num(r.memory)
    if (storage !== null && storage <= 4) { storage *= 1024; report.fixedStorage++ } // 1 / 2 = TB
    const battery = inRange(num(r.battery_capacity_mAh), 1000, 20000)
    const screen = inRange(num(r.screen_size), 3, 11)
    if (num(r.battery_capacity_mAh) !== null && battery === null) report.droppedValues++
    if (num(r.screen_size) !== null && screen === null) report.droppedValues++

    out.set(key, {
      category: 'PHONE', brand, model,
      specs: {
        ram: inRange(num(r.ram), 1, 32),
        storage: inRange(storage, 4, 4096),
        battery, screen,
        rearCamera: inRange(num(r.rear_camera), 1, 300),
        frontCamera: inRange(num(r.front_camera), 1, 100),
        processor: text(r.processor_name),
        processorBrand: brandName(r.processor_brand),
        processorSpeed: inRange(num(r.processor_speed), 0.5, 6), // GHz
        os: phoneOs(r.os, brand),
        has5G: /^true$/i.test(r.has_5G),
        vfmPercentage: inRange(num(r.vfm_percentage), 0, 100), // value for money score
        vfmLabel: vfmLabel(r.vfm_label)
      },
      imageUrl: text(r.image_url)
    })
  }
  return [...out.values()]
}

// ── Laptops: one entry per brand + product, with its distinct configurations ──
function buildLaptops(report) {
  const out = new Map()
  for (const r of readCsv('laptops.csv')) {
    const brand = brandName(r.Company)
    const model = text(r.Product)
    if (!brand || !model) { report.skipped++; continue }
    const key = `${brand}|${model}`.toLowerCase()
    const config = {
      cpu: text(r.Cpu), ram: text(r.Ram), storage: text(r.Memory), gpu: text(r.Gpu),
      screen: num(r.Inches), resolution: text(r.ScreenResolution), os: text(r.OpSys), weight: text(r.Weight)
    }
    if (!out.has(key)) out.set(key, { category: 'LAPTOP', brand, model, specs: { type: text(r.TypeName), configs: [] }, imageUrl: null })
    const entry = out.get(key)
    const sig = JSON.stringify(config)
    if (entry.specs.configs.some(c => JSON.stringify(c) === sig)) { report.duplicates++; continue }
    entry.specs.configs.push(config)
  }
  return [...out.values()]
}

// ── Consoles ──
function buildConsoles(report) {
  return readCsv('Gaming_Consoles_DB.csv').map(r => ({
    category: 'CONSOLE',
    brand: brandName(r.brand),
    model: text(r.model_name),
    specs: {
      generation: text(r.generation), releaseYear: num(r.release_year), type: text(r.type),
      cpu: text(r.cpu), gpu: text(r.gpu), ram: text(r.ram), storage: text(r.storage),
      maxResolution: text(r.max_resolution), priceUsd: num(r.price_usd)
    },
    imageUrl: text(r.image_url)
  })).filter(d => d.brand && d.model || (report.skipped++, false))
}

const report = { skipped: 0, duplicates: 0, fixedStorage: 0, droppedValues: 0 }
const devices = [...buildPhones(report), ...buildLaptops(report), ...buildConsoles(report)]
  .sort((a, b) => a.category.localeCompare(b.category) || a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model, undefined, { numeric: true }))

// Version = content hash, so the app re-syncs exactly when the data changes
const version = crypto.createHash('sha256').update(JSON.stringify(devices)).digest('hex').slice(0, 12)
fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify({ version, generatedAt: new Date().toISOString(), devices }))

const count = (c) => devices.filter(d => d.category === c).length
console.log(`[catalog] ${devices.length} devices (phones ${count('PHONE')}, laptops ${count('LAPTOP')}, consoles ${count('CONSOLE')}) -> ${path.relative(root, outFile)}`)
console.log(`[catalog] version ${version}; duplicates removed ${report.duplicates}, TB storage fixed ${report.fixedStorage}, impossible values removed ${report.droppedValues}, rows skipped ${report.skipped}`)
console.log(`[catalog] with image links: ${devices.filter(d => d.imageUrl).length}`)
