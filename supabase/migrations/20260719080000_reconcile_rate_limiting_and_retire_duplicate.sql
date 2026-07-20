-- ============================================================
-- Reconcile rate limiting: patch the PRE-EXISTING enforce_rate_limit()
-- system with the one real fix it needed, extend it to segment_reports,
-- and retire the entirely separate parallel system built in
-- 20260719060000_server_side_rate_limiting.sql before this gap was found.
--
-- HOW THIS WAS DISCOVERED: while pulling live-only DB objects into the repo
-- (F5), a full trigger listing on reviews/archive_entries revealed
-- `rl_reviews_insert()` / `rl_archive_entries_insert()` -> `enforce_rate_limit()`
-- already existed live, wired to the SAME tables 20260719060000 also wired
-- its own `rate_limit_reviews()`/`rate_limit_archive_entries()` to. Neither
-- function name appeared in any repo grep beforehand because this entire
-- system was never committed -- the original "zero producers/consumers"
-- finding (REDTEAM_AUDIT_2026-07-19.md F2) was accurate for the repo, not
-- for production. Running both was never intentional; it's two independent,
-- uncoordinated rate limits stacked on the same insert.
--
-- WHY enforce_rate_limit() IS KEPT AS THE BASE (not the other way around):
-- it already has product features 20260719060000's assert_rate_limit() does
-- not -- an admin bypass, and configurable thresholds via app_settings
-- (rl_<action>_max / rl_<action>_window_min) with fail-safe defaults --
-- and resolves the caller internally from the JWT rather than trusting a
-- parameter. It has exactly ONE real gap (below), everything else is sound.
--
-- THE ONE REAL GAP, NOW FIXED: `select ... for update` locks nothing when
-- it matches zero rows, so two concurrent FIRST requests for the same
-- (user_id, action) could both observe "no row" and both INSERT -- there is
-- no unique constraint on (user_id, action) to catch this via ON CONFLICT
-- (confirmed live via pg_constraint: only a PK on id and a user_id FK to
-- users_profile exist). A pg_advisory_xact_lock, keyed by hashing
-- (action, caller_id), serializes the whole check-then-act sequence
-- including the no-row case, and auto-releases at the end of the caller's
-- transaction -- no manual unlock, no leak risk. This is the exact race
-- 20260719060000's assert_rate_limit() was built specifically to avoid; it
-- is the one piece of that now-retired function worth keeping.
--
-- WHAT WAS *NOT* WORTH KEEPING, AND WHY: assert_rate_limit() also wrote
-- `blocked_until` right before RAISE EXCEPTION -- discovered THIS SESSION to
-- be dead code, since RAISE EXCEPTION with no enclosing exception handler
-- rolls back the entire transaction, including that write, one statement
-- earlier. enforce_rate_limit()'s own comment shows its author hit this
-- exact trap first and solved it correctly with RAISE LOG (writes straight
-- to the server log, survives the rollback) instead of trying to persist a
-- cooldown timestamp. No fix needed on this file's side -- just don't
-- reintroduce the mistake.
--
-- Idempotent. Safe to re-run.
-- ============================================================

begin;

-- ── Patch: close the no-row race (the one real fix) ─────────────────────
create or replace function public.enforce_rate_limit(p_action text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_caller_id uuid;
  v_role      text;
  v_max       int;
  v_window    int;
  v_row       rate_limits%rowtype;
  v_lock_key  bigint;
begin
  select id, role into v_caller_id, v_role
    from users_profile where clerk_id = (select auth.jwt()->>'sub');
  if v_caller_id is null then
    return; -- no resolvable caller identity; nothing to key on
  end if;

  -- Admin bypass: 'admin' is a manual-only, fully-trusted role (no UI path to
  -- it, dashboard/service-role granted only). Exempt by design so moderation
  -- and testing never hit user-facing caps. Reviewers are deliberately NOT
  -- bypassed -- a compromised reviewer account shouldn't get unlimited writes
  -- -- but their cap is configurable (rl_reviews_insert_max) if the default
  -- 50/hr proves too tight for real grading sessions.
  if v_role = 'admin' then
    return;
  end if;

  -- Configurable thresholds with hardcoded fail-safe defaults.
  v_max := coalesce(
    (select nullif(value,'')::int from app_settings where key = 'rl_' || p_action || '_max'),
    case p_action when 'reviews_insert' then 50 else 10 end
  );
  v_window := coalesce(
    (select nullif(value,'')::int from app_settings where key = 'rl_' || p_action || '_window_min'),
    60
  );

  -- THE FIX (see header): serializes ALL callers for this exact
  -- (action, caller) pair, including the "no row exists yet" case a plain
  -- SELECT ... FOR UPDATE cannot lock.
  v_lock_key := hashtextextended(p_action || ':' || v_caller_id::text, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select * into v_row from rate_limits
    where user_id = v_caller_id and action = p_action
    order by window_start desc
    limit 1
    for update;

  if v_row.id is null or v_row.window_start < now() - (v_window || ' minutes')::interval then
    if v_row.id is not null then
      update rate_limits set request_count = 1, window_start = now() where id = v_row.id;
    else
      insert into rate_limits (user_id, action, request_count, window_start)
        values (v_caller_id, p_action, 1, now());
    end if;
    return;
  end if;

  if v_row.request_count >= v_max then
    -- RAISE LOG survives the rollback RAISE EXCEPTION causes; a table INSERT
    -- here would not (see header -- this is the trap 20260719060000's
    -- blocked_until write fell into).
    raise log 'rate_limit_rejected action=% user=% count=% max=%',
      p_action, v_caller_id, v_row.request_count, v_max;
    raise exception 'rate limit exceeded for %: max % per % minutes',
      p_action, v_max, v_window
      using hint = 'Please wait before trying again.';
  end if;

  update rate_limits set request_count = request_count + 1 where id = v_row.id;
end;
$function$;

-- ── Extend coverage to segment_reports (previously uncovered by either system) ──
-- Confirmed live via information_schema.triggers: segment_reports had ONLY
-- 20260719060000's ab_rate_limit_segment_reports -- no pre-existing rl_*
-- equivalent -- so this table's coverage is net-new, not a duplicate.
create or replace function public.rl_segment_reports_insert()
  returns trigger
  language plpgsql
  set search_path to 'public'
as $function$
begin
  if current_user in ('anon', 'authenticated') then
    perform public.enforce_rate_limit('segment_reports_insert');
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_rate_limit_segment_reports_insert on public.segment_reports;
create trigger trg_rate_limit_segment_reports_insert
  before insert on public.segment_reports
  for each row execute function public.rl_segment_reports_insert();

-- ── Retire the entirely-parallel system from 20260719060000 ─────────────
drop trigger if exists ab_rate_limit_reviews         on public.reviews;
drop trigger if exists ab_rate_limit_archive_entries on public.archive_entries;
drop trigger if exists ab_rate_limit_segment_reports on public.segment_reports;

drop function if exists public.rate_limit_reviews();
drop function if exists public.rate_limit_archive_entries();
drop function if exists public.rate_limit_segment_reports();
drop function if exists public.assert_rate_limit(uuid, text, integer, interval);

-- ── Cleanup: redundant unique index ──────────────────────────────────────
-- 20260719050000 created reviews_entry_reviewer_uniq as a defensive
-- CREATE UNIQUE INDEX IF NOT EXISTS on (entry_id, reviewer_id) -- but a
-- differently-NAMED constraint enforcing the identical uniqueness
-- (reviews_entry_id_reviewer_id_key) already existed live, so IF NOT EXISTS
-- (which only checks the given NAME) didn't catch the duplication. Both
-- enforce the same thing; drop the redundant one.
drop index if exists public.reviews_entry_reviewer_uniq;

commit;

-- ============================================================
-- NOT TOUCHED, DELIBERATELY
--   • The `rate-limits-gc` pg_cron job (20260719060000) -- it filters purely
--     on window_start age and is correct regardless of which enforcement
--     function populates the table. No change needed.
--   • Whether the pre-existing system had its OWN gc job already scheduled
--     was not checked this session -- if `select * from cron.job;` shows a
--     second/older job doing equivalent cleanup, drop whichever is redundant
--     (informational, not a security concern either way).
--   • app_settings' own CREATE TABLE (rl_<action>_max/_window_min keys, plus
--     reviewer_points_threshold and leaderboard_refresh_cooldown_sec used
--     elsewhere) -- assumed pre-existing per this project's established
--     convention (supabase_schema.sql already treats it this way for other
--     keys); not verified/committed this session.
--
-- REGRESSION NOTE: GradeSubmissions.jsx's error handler already matches
-- `/rate limit/i` against the raised message (added alongside the F1 fix) --
-- enforce_rate_limit()'s message ("rate limit exceeded for %: max % per %
-- minutes") matches that pattern, so no frontend change is needed by this
-- consolidation.
--
-- ROLLBACK NOTES
--   This migration only ever narrows/patches existing live functionality; it
--   does not remove any user-facing capability. Reverting to two parallel
--   systems is NOT recommended (that was the bug). If you must undo the
--   advisory-lock patch specifically, re-apply enforce_rate_limit() from a
--   pre-2026-07-19 pg_get_functiondef dump.
-- ============================================================
