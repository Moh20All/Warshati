-- Locks the licenses table so the public (anon) key in the desktop app can no longer
-- read, list or rebind licenses. Only the `license` Edge Function and your dashboard
-- (both use the service-role key, which bypasses RLS) can touch it.
--
-- ⚠ Run this ONLY after every customer runs Warshati v1.5+ (which uses the Edge Function).
--   Older versions read the table directly: once it is locked they would see
--   "license not found" and deactivate themselves.

alter table public.licenses enable row level security;

-- Remove every existing policy on the table (they are what currently lets anon read/update).
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'licenses' loop
    execute format('drop policy %I on public.licenses', p.policyname);
  end loop;
end $$;

-- Belt and braces: no direct table privileges for the public roles.
revoke all on table public.licenses from anon, authenticated;

-- Check: this should return no rows.
select policyname, roles, cmd from pg_policies where schemaname = 'public' and tablename = 'licenses';
