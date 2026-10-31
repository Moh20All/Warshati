// Owner forgot the email or password: the shop's license key shows the email and sets a new password.
import { prepareEnv, startServer, setupOwner, createChecker, importProject } from './helpers/setup.mjs'

prepareEnv()
const { check, finish } = createChecker()

try {
  const { call } = await startServer()
  await setupOwner(call)
  const { default: prisma } = await importProject('src/main/server/lib/prisma.js')
  const key = 'WARSHATI-AB12-CD34-EF56-GH78'

  check('no license on this PC: refused', (await call(null, 'POST', '/auth/recover', { key })).status, 401)
  await prisma.localLicense.create({ data: { key, machineId: 'test' } })

  check('wrong key: refused', (await call(null, 'POST', '/auth/recover', { key: 'WARSHATI-0000-0000-0000-0000' })).data?.error, 'wrong_key')
  check('empty key: refused', (await call(null, 'POST', '/auth/recover', { key: '' })).status, 401)
  const found = await call(null, 'POST', '/auth/recover', { key: ' ' + key.toLowerCase() + ' ' })
  check('right key (any case, spaces): shows the owner email', found.data?.email, 'owner@test.local')
  check('… and changes nothing', (await call(null, 'POST', '/auth/login', { email: 'owner@test.local', password: 'pw123456' })).status, 200)

  check('new password too short: refused', (await call(null, 'POST', '/auth/recover', { key, password: '123' })).data?.error, 'short_password')
  check('new password saved', (await call(null, 'POST', '/auth/recover', { key, password: 'newpass99' })).status, 200)
  check('old password no longer works', (await call(null, 'POST', '/auth/login', { email: 'owner@test.local', password: 'pw123456' })).status, 401)
  check('new password works', (await call(null, 'POST', '/auth/login', { email: 'owner@test.local', password: 'newpass99' })).status, 200)

  for (let i = 0; i < 5; i++) await call(null, 'POST', '/auth/recover', { key: 'WARSHATI-BAD' + i })
  check('after 5 wrong keys: locked', (await call(null, 'POST', '/auth/recover', { key: 'WARSHATI-BAD9' })).status, 429)
  check('… even with the right key', (await call(null, 'POST', '/auth/recover', { key })).status, 429)

  finish()
} catch (e) {
  finish(e)
}
