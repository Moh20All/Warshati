// Rakam license service (Supabase Edge Function).
//
// The desktop app calls this instead of reading the `licenses` table directly, so the table
// can be locked to the public (anon) key. The service-role key never leaves Supabase.
//
// Deploy:  supabase functions deploy license
// Request: POST { action: 'validate' | 'activate', key: string, machineId: string }
// Answer:  { status: 'valid' | 'not_found' | 'revoked' | 'other_device' }
import { createClient } from 'jsr:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { action?: string; key?: string; machineId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const key = String(body.key ?? '').trim().toUpperCase()
  const machineId = String(body.machineId ?? '').trim()
  const action = body.action
  if (!key || !machineId || (action !== 'validate' && action !== 'activate')) {
    return json({ error: 'action, key and machineId are required' }, 400)
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: rec, error } = await db
    .from('licenses')
    .select('id, is_active, machine_id')
    .eq('key', key)
    .maybeSingle()
  if (error) return json({ error: 'Lookup failed' }, 500)

  if (!rec) return json({ status: 'not_found' })
  if (rec.is_active === false) return json({ status: 'revoked' })
  if (rec.machine_id) return json({ status: rec.machine_id === machineId ? 'valid' : 'other_device' })
  // Unbound key: a validate means the owner reset the binding; only activate may bind it
  if (action === 'validate') return json({ status: 'other_device' })

  // Bind atomically: only succeeds if no other machine bound it in the meantime
  const { data: bound, error: bindError } = await db
    .from('licenses')
    .update({ machine_id: machineId, activated_at: new Date().toISOString() })
    .eq('id', rec.id)
    .is('machine_id', null)
    .select('id')
  if (bindError) return json({ error: 'Bind failed' }, 500)

  return json({ status: bound && bound.length === 1 ? 'valid' : 'other_device' })
})
