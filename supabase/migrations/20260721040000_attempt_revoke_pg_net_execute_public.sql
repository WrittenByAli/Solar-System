-- ============================================================
-- SECURITY HARDENING ATTEMPT (defense-in-depth) — pg_net HTTP functions
-- executable by PUBLIC (and therefore anon/authenticated).
--
-- FINDING (live security advisor + has_function_privilege check,
-- 2026-07-21): net.http_get / net.http_post / net.http_delete had EXECUTE
-- granted to PUBLIC. These functions make the Postgres server issue
-- arbitrary outbound HTTP requests — if ever reachable by a client role,
-- that's a textbook SSRF primitive.
--
-- REACHABILITY CHECKED LIVE: POST /rest/v1/rpc/http_post (anon key) -> 404
-- PGRST202 "Could not find the function public.http_post" — PostgREST only
-- resolves RPC calls against the `public` schema, so this is NOT currently
-- exploitable via the app's actual REST API surface.
--
-- ⚠️ THIS MIGRATION DOES NOT ACTUALLY CHANGE ANYTHING — documented, not
-- hidden. net.http_get/http_post/http_delete are owned by `supabase_admin`
-- (Supabase's platform-managed role for extensions), and every role
-- available to this project (postgres, service_role) is NOT a member of
-- supabase_admin (verified: `select pg_has_role('postgres','supabase_admin',
-- 'MEMBER')` = false). REVOKE requires the revoking role to own the object,
-- be a superuser, or hold the privilege WITH GRANT OPTION — none apply
-- here, so both `revoke ... from anon, authenticated` and
-- `revoke ... from public` execute without error but have ZERO effect
-- (confirmed via has_function_privilege before/after: unchanged).
--
-- This is a Supabase PLATFORM default (pg_net ships with EXECUTE granted
-- to PUBLIC on every Supabase project that installs it), not a
-- misconfiguration introduced by this project, and is not something a
-- project-level `postgres` role can override. Left in this file as a
-- documented, verified, "Unable to Fix" finding rather than silently
-- dropped — if Supabase Support ever grants supabase_admin membership (or
-- runs this on your behalf), re-running it would then take effect.
-- ============================================================

revoke execute on function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer)
  from public;

revoke execute on function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer)
  from public;

revoke execute on function net.http_delete(url text, params jsonb, headers jsonb, timeout_milliseconds integer, body jsonb)
  from public;
