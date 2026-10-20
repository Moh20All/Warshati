// electron-builder afterPack hook.
//
// electron-builder 25 sometimes leaves out packages that npm de-duplicated (seen in v1.5.0:
// `call-bind-apply-helpers`, needed by Express, so the installed app crashed on launch).
// This walks the real runtime dependency tree — `dependencies` + installed `optionalDependencies`,
// resolved like Node's require() — and copies any package the build skipped.
const fs = require('fs')
const path = require('path')

const projectRoot = path.join(__dirname, '..')
const projectModules = path.join(projectRoot, 'node_modules')

function readPkg(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) } catch { return null }
}

// Node resolution: <dir>/node_modules/<name>, then each parent folder's node_modules, up to the project
function resolveDep(fromDir, name) {
  let dir = fromDir
  while (true) {
    const candidate = path.join(dir, 'node_modules', name)
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate
    if (path.resolve(dir) === path.resolve(projectRoot)) return null
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function runtimePackages() {
  const seen = new Set()
  const queue = [projectRoot]
  while (queue.length) {
    const dir = queue.shift()
    const pkg = readPkg(dir)
    if (!pkg) continue
    const deps = { ...pkg.dependencies, ...pkg.optionalDependencies }
    for (const name of Object.keys(deps)) {
      const found = resolveDep(dir, name)
      if (!found && pkg.optionalDependencies?.[name]) continue // optional and not installed: fine
      if (!found) { console.warn(`  [after-pack] could not resolve ${name} (needed by ${pkg.name || 'app'})`); continue }
      if (!seen.has(found)) { seen.add(found); queue.push(found) }
    }
  }
  return [...seen]
}

exports.default = async function afterPack(context) {
  const appModules = path.join(context.appOutDir, 'resources', 'app', 'node_modules')
  const packages = runtimePackages()
  let copied = 0
  for (const src of packages) {
    const rel = path.relative(projectModules, src)
    const dest = path.join(appModules, rel)
    if (fs.existsSync(path.join(dest, 'package.json'))) continue
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.cpSync(src, dest, { recursive: true })
    console.log(`  [after-pack] added missing package: ${rel}`)
    copied++
  }
  console.log(`  [after-pack] ${packages.length} runtime packages checked, ${copied} added`)
}
