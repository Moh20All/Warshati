// Loaded with `node --import`: redirects `import ... from 'electron'` to the stub.
import { register } from 'node:module'

const stub = new URL('./electron-stub.mjs', import.meta.url).href
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  if (specifier === 'electron') return { url: ${JSON.stringify(stub)}, shortCircuit: true }
  return next(specifier, context)
}`))
