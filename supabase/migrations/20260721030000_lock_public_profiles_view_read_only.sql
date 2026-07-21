-- ============================================================
-- SECURITY FIX (High) — public_profiles view was writable by anon
--
-- CONFIRMED VULNERABILITY (live REST probe, 2026-07-21, anon key only):
--   public.public_profiles is a "simple" view (single table, no joins/
--   aggregates/grouping) over users_profile, so Postgres's automatic
--   updatable-view rule applies: information_schema.views reports
--   is_insertable_into = YES, is_updatable = YES. Combined with
--   `security_invoker = off` (needed for its read-side purpose — see
--   below) and Supabase's platform-default DML grants on public-schema
--   relations, anon/authenticated had implicit INSERT/UPDATE/DELETE
--   through the view, gated by NOTHING except users_profile's own column
--   constraints (no RLS backstop — for a security_invoker=off view, row
--   security is evaluated as the VIEW OWNER, which is exactly what let
--   the read side legitimately cross user boundaries, but the same
--   mechanism means writes through the view never hit
--   `profiles_select_own`/the base table's real access control either).
--
--   Live evidence (anon key, engineered to be non-destructive regardless
--   of outcome):
--     INSERT public_profiles (username/avatar_url/points/role, no
--       clerk_id -- not exposed by the view) -> 400
--       {"code":"23502","message":"null value in column \"clerk_id\" ...
--       violates not-null constraint"}
--     -> This is a CONSTRAINT-layer rejection, not a permission-layer
--        one (which would read 42501/permission denied). The request
--        was AUTHORIZED to reach the base table; only the accidental
--        NOT NULL gap on a column the view never exposes stopped a row
--        from being created. A payload supplying any clerk_id value
--        would not have hit this safety net.
--     UPDATE public_profiles?id=eq.<all-zero-uuid> {"points":999999999}
--       -> 200 [] (zero rows matched the filter, but NOT a permission
--          error -- confirms UPDATE was authorized too)
--     DELETE public_profiles?id=eq.<all-zero-uuid> -> 200 [] (same)
--
-- FIX: keep the view's read-side behavior EXACTLY as-is (it is a
-- deliberate, previously-reviewed design: security_invoker=off is
-- REQUIRED here so anon/authenticated can read safe columns across ALL
-- users -- switching to security_invoker=on would collapse the view to
-- "your own row only" under users_profile's profiles_select_own policy,
-- breaking the leaderboard, rank calculation, and reviewer/author
-- username lookups, none of which have ever needed write access to this
-- view -- confirmed zero .insert()/.update()/.delete() call sites against
-- public_profiles anywhere in src/). Close ONLY the write side:
--   1. Explicit REVOKE of INSERT/UPDATE/DELETE/TRUNCATE from PUBLIC (the
--      view was never explicitly granted these, but REVOKE FROM PUBLIC
--      is required rather than just "anon, authenticated" for the same
--      reason 20260721000000 had to for trigger-only functions: default
--      privileges are attached to the PUBLIC pseudo-role, and
--      REVOKE ... FROM anon, authenticated is a no-op if the grant is
--      actually held via PUBLIC membership).
--   2. Defense-in-depth: INSTEAD OF triggers that unconditionally raise,
--      so a future accidental re-grant (the exact class of drift this
--      project already hit once today with archive_instances/
--      supabase_rls.sql) still can't produce a real write -- the trigger
--      is a hard stop independent of whatever the grant state happens to
--      be.
--
-- NOTE ON information_schema AFTER THIS MIGRATION: adding INSTEAD OF
-- triggers makes Postgres report the view as "trigger-updatable", so
-- is_insertable_into/is_updatable MAY still read YES -- that reflects
-- "an attempt is syntactically possible", not "an attempt can succeed".
-- The correctness of the fix is the REVOKE (privilege) + the trigger
-- unconditionally raising (behavior), not the introspection flag.
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- 1. Revoke write privileges. Re-assert SELECT explicitly (documents the
--    intent; CREATE OR REPLACE VIEW does not reset existing grants, but a
--    future recreate of this view must not silently regain PUBLIC's
--    default privileges without this file being re-run).
revoke insert, update, delete, truncate on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- 2. Hard stop: INSTEAD OF triggers that make write attempts fail
--    unconditionally, independent of grant state.
create or replace function public.reject_public_profiles_write()
  returns trigger
  language plpgsql
  security invoker
  set search_path to 'public'
as $$
begin
  raise exception 'public_profiles is a read-only view; write directly to users_profile instead' using errcode = '42501';
end;
$$;

drop trigger if exists reject_public_profiles_insert on public.public_profiles;
create trigger reject_public_profiles_insert
  instead of insert on public.public_profiles
  for each row execute function public.reject_public_profiles_write();

drop trigger if exists reject_public_profiles_update on public.public_profiles;
create trigger reject_public_profiles_update
  instead of update on public.public_profiles
  for each row execute function public.reject_public_profiles_write();

drop trigger if exists reject_public_profiles_delete on public.public_profiles;
create trigger reject_public_profiles_delete
  instead of delete on public.public_profiles
  for each row execute function public.reject_public_profiles_write();

-- TRUNCATE is not a supported operation on views in Postgres at all --
-- `truncate public.public_profiles` fails with "cannot truncate a view"
-- unconditionally, regardless of grants. The REVOKE TRUNCATE above is
-- included only for a complete, self-documenting privilege list.

-- ============================================================
-- POST-APPLY VERIFICATION (run these after applying this migration):
--
--   -- 1. Grants: expect exactly one row per role, privilege_type = SELECT
--   select grantee, privilege_type
--     from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'public_profiles'
--      and grantee in ('anon', 'authenticated', 'PUBLIC');
--
--   -- 2. Live REST re-test (anon key) -- all three should now be REJECTED
--      before reaching any constraint (compare to the pre-fix evidence
--      above, which reached the clerk_id NOT NULL check):
--        POST   /rest/v1/public_profiles   {"username":"x","points":0}
--        PATCH  /rest/v1/public_profiles?id=eq.00000000-0000-0000-0000-000000000000  {"points":1}
--        DELETE /rest/v1/public_profiles?id=eq.00000000-0000-0000-0000-000000000000
--      Expect 42501 (permission denied) from the REVOKE alone; if a future
--      change ever re-grants by accident, expect the trigger's raised
--      exception instead -- either way, no row can ever be written.
--
--   -- 3. Read-side regression (must be UNCHANGED from before this file):
--        GET /rest/v1/public_profiles?select=id,username,points&limit=3
--          -> 200, rows from MULTIPLE users (cross-user read still works)
--        GET /rest/v1/public_profiles?select=email
--          -> 400 42703 (no PII column exists on the view)
-- ============================================================
