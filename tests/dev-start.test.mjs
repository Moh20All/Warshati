// Dev mode (npm run dev) starts the database and runs the upgrade steps without crashing.
import { prepareEnv, createChecker, importProject } from './helpers/setup.mjs'

prepareEnv()
const { check, finish } = createChecker()

try {
  const { initPrisma } = await importProject('src/main/server/lib/prisma.js')
  const db = await initPrisma()
  check('dev start opens the database', await db.store.count(), 0)
  const cols = (await db.$queryRawUnsafe('PRAGMA table_info("Store")')).map(c => c.name)
  check('upgrade steps ran in dev (feature switches present)', cols.includes('featCheckIn'), true)
  finish()
} catch (e) {
  finish(e)
}
