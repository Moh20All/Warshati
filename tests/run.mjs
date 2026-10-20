// `npm test`: rebuilds the empty template DB from prisma/schema.prisma, then runs every
// tests/*.test.mjs in its own Node process (each gets a throwaway database).
// Usage: npm test            all suites
//        npm test -- money   only suites whose file name contains "money"
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const testsDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(testsDir, '..')
const filter = process.argv[2] || ''
const register = pathToFileURL(path.join(testsDir, 'helpers', 'register.mjs')).href

const stage = spawnSync(process.execPath, [path.join(root, 'scripts', 'stage-db.js')], { cwd: root, encoding: 'utf8' })
if (stage.status !== 0) {
  console.error('Could not build the template database:\n' + stage.stdout + stage.stderr)
  process.exit(1)
}

const suites = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.mjs') && f.includes(filter)).sort()
const results = []
for (const file of suites) {
  console.log(`\n━━ ${file}`)
  const run = spawnSync(process.execPath, ['--no-warnings', '--import', register, path.join(testsDir, file)], { cwd: root, encoding: 'utf8' })
  // electron-log cannot find an app name outside Electron, and app log lines are not test results
  const noise = /electron-log|tried these methods|electron\.app\.name|productName or name|setAppName|^\s+at |^\s*- |^\d\d:\d\d:\d\d\.\d+ >|locize/i
  const out = (run.stdout + run.stderr).split(/\r?\n/).filter(l => l && !noise.test(l))
  for (const line of out) if (!/^PASS /.test(line) || process.env.VERBOSE) console.log(line)
  const summary = out.reverse().find(l => /passed, \d+ failed/.test(l)) || 'did not finish'
  results.push({ file, ok: run.status === 0, summary })
}

console.log('\n━━ Summary')
for (const r of results) console.log(`${r.ok ? '✔' : '✘'} ${r.file.padEnd(36)} ${r.summary}`)
const failed = results.filter(r => !r.ok).length
console.log(failed ? `\n${failed} suite(s) failed` : `\nAll ${results.length} suites passed`)
process.exit(failed ? 1 : 0)
