-- ============================================================
-- Pre-production security audit (2026-07-21) — defense-in-depth hardening.
--
-- All changes here are NON-BEHAVIORAL and reversible. They tighten
-- attack surface that the live Supabase advisors flagged and that the
-- audit confirmed, WITHOUT changing any application-visible behavior:
--
--  1. Pin search_path on the two CHECK-constraint helper functions the
--     advisor flagged as `function_search_path_mutable`. They call only
--     pg_catalog built-ins, so `= public` (pg_catalog is always implicitly
--     first) is safe and matches this project's convention on every other
--     function. EXECUTE grants to anon/authenticated are KEPT — the CHECK
--     constraints on archive_entries evaluate these in the writer's context.
--
--  2. Revoke direct EXECUTE (RPC callability) on trigger-ONLY functions
--     from anon/authenticated. PostgreSQL does NOT check EXECUTE privilege
--     on a trigger function when the trigger fires as part of a DML
--     statement, so this does NOT break any trigger — it only removes the
--     `/rest/v1/rpc/<fn>` direct-call surface the advisors flagged
--     (0028/0029). These functions reference NEW/OLD and error out if
--     called directly anyway; this makes that explicit.
--
--  3. Revoke EXECUTE on enforce_rate_limit(text) from anon/authenticated.
--     It is invoked only from the rl_* wrapper trigger functions, which are
--     SECURITY DEFINER (owned by postgres) — a DEFINER function's calls are
--     authorized as its owner, not the original caller, so revoking the
--     caller's grant does not affect rate-limit enforcement.
--
--  4. Revoke EXECUTE on refresh_leaderboard_view() from anon only.
--     authenticated is KEPT (the /leaderboard manual-refresh button calls
--     it); anon has no legitimate need.
--
--  5. Revoke INSERT/UPDATE/DELETE/TRUNCATE on app_settings and planets from
--     anon/authenticated. RLS already denies these (both tables have RLS
--     enabled with only *_public_read SELECT policies — verified live via an
--     authenticated-role RLS simulation: writes affected 0 rows and did not
--     persist). This removes the redundant table-level grant so the tables
--     are no longer "one missing policy away" from being client-writable.
--     SELECT is KEPT (planets drives the /submit dropdown; app_settings is
--     read by client + functions).
--
-- Idempotent. Safe to re-run. Rollback notes at the bottom.
-- ============================================================

-- 1. search_path on the CHECK-constraint helpers ------------------------
alter function public.check_text_array_bounds(text[], integer, integer) set search_path = public;
alter function public.check_jsonb_array_bounds(jsonb, integer, integer) set search_path = public;

-- 2. Revoke RPC callability on trigger-only functions -------------------
-- IMPORTANT: these were created with the CREATE FUNCTION default of EXECUTE
-- to PUBLIC, so `REVOKE FROM anon, authenticated` is a no-op (anon/auth
-- inherit via PUBLIC). Must REVOKE FROM PUBLIC. Verified live post-apply:
-- has_function_privilege('anon'/'authenticated', fn, 'EXECUTE') = false for all.
revoke execute on function public.process_review_consensus()          from public, anon, authenticated;
revoke execute on function public.enforce_review_eligibility()        from public, anon, authenticated;
revoke execute on function public.notify_reviewers_on_consensus()     from public, anon, authenticated;
revoke execute on function public.notify_reviewers_new_submission()   from public, anon, authenticated;
revoke execute on function public.auto_promote_reviewer()             from public, anon, authenticated;
revoke execute on function public.guard_users_profile_managed_cols()  from public, anon, authenticated;
revoke execute on function public.update_updated_at()                 from public, anon, authenticated;
revoke execute on function public.validate_archive_entry_coords()     from public, anon, authenticated;
revoke execute on function public.rl_reviews_insert()                 from public, anon, authenticated;
revoke execute on function public.rl_archive_entries_insert()         from public, anon, authenticated;
revoke execute on function public.rl_segment_reports_insert()         from public, anon, authenticated;

-- 3. Rate-limit enforcer: not meant to be called directly ---------------
revoke execute on function public.enforce_rate_limit(text)            from public, anon, authenticated;

-- 4. Leaderboard refresh: authenticated only ----------------------------
revoke execute on function public.refresh_leaderboard_view()          from anon;

-- 5. Remove redundant write grants on read-only reference tables --------
revoke insert, update, delete, truncate on public.app_settings from anon, authenticated;
revoke insert, update, delete, truncate on public.planets       from anon, authenticated;

-- ============================================================
-- ROLLBACK (only if a regression appears — none expected):
--   alter function public.check_text_array_bounds(text[],integer,integer) reset search_path;
--   alter function public.check_jsonb_array_bounds(jsonb,integer,integer) reset search_path;
--   grant execute on function public.process_review_consensus() to anon, authenticated;  -- etc. per function
--   grant execute on function public.enforce_rate_limit(text) to authenticated;
--   grant execute on function public.refresh_leaderboard_view() to anon;
--   grant insert, update, delete on public.app_settings to authenticated;  -- (not recommended)
--   grant insert, update, delete on public.planets to authenticated;       -- (not recommended)
-- ============================================================
