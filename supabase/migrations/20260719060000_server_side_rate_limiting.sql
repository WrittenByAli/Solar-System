-- ============================================================
-- LAYER 6 — server-side rate limiting (replaces nothing; there was none)
--
-- FINDING: `rate_limits` exists in the live DB with deny-all RLS but has ZERO
-- producers and ZERO consumers anywhere in the codebase or SQL (grep-verified).
-- The ONLY throttle in the product is client-side localStorage timestamps in
-- src/pages/Join.jsx:34 — trivially defeated by clearing storage or by posting
-- directly to PostgREST. Every write endpoint was therefore unthrottled, which
-- also amplified the point-farming vulnerability fixed in 20260719050000.
--
-- ⚠️ APPLY 20260719050000 (and 20260719030000) FIRST. Those close the actual
-- vulnerabilities; this one is hardening on top.
--
-- SCHEMA CORRECTION (2026-07-19): an earlier version of this file assumed
-- `rate_limits` didn't exist and invented an append-one-row-per-request log
-- (actor_id/action/created_at, counted via COUNT(*) over a sliding window).
-- WRONG — verified live via information_schema + pg_indexes/pg_constraint:
-- the table already exists with a real, better-designed fixed-window-counter
-- schema that was simply never wired to any logic:
--   id uuid pk, ip_address text, user_id uuid, action text not null (no
--   default), request_count int not null default 1,
--   window_start timestamptz not null default now(), blocked_until timestamptz
--   indexes: (ip_address, action, window_start), (user_id, action, window_start)
--   NO unique constraint on (user_id, action) or (ip_address, action).
-- This migration now uses that real schema as-is — no new columns, no schema
-- change at all, just the missing enforcement logic. Yet another instance of
-- security-relevant DB shape existing only in production (see the repo-vs-prod
-- divergence findings elsewhere) — this file is itself the fix for that, for
-- this one table.
--
-- WHY AN ADVISORY LOCK, NOT ON CONFLICT: with no unique constraint on
-- (user_id, action), there's no INSERT ... ON CONFLICT target to upsert
-- against, and a plain `SELECT ... FOR UPDATE` can't lock a row that doesn't
-- exist yet — so two concurrent first-requests for the same (user_id, action)
-- could both see "no row" and both INSERT, creating two independent counters
-- for the same window (silently doubling everyone's effective limit).
-- `pg_advisory_xact_lock`, keyed by a hash of (action, user_id), serializes
-- the entire check-then-act sequence regardless of whether a row exists yet.
-- It is transaction-scoped (auto-released on commit or rollback of the
-- caller's INSERT), so there is no manual unlock and no leak risk.
--
-- Idempotent. Safe to re-run.
-- ============================================================

begin;

-- Deny-all by design: no policies are created here (and none should exist),
-- so no client can read or write this table directly. Only the SECURITY
-- DEFINER helper below touches it. Matches this project's existing convention
-- for tamper-resistant tables (e.g. stale_review_notified). Safe/idempotent
-- to re-assert even though CLAUDE.md already documents this table as
-- deny-all-by-design.
alter table public.rate_limits enable row level security;

-- ── enforcement helper ─────────────────────────────────────────────────────
-- Fixed-window counter against the REAL schema. Raises 53400
-- (configuration_limit_exceeded) once p_user_id has made p_max attempts at
-- p_action within the current p_window; on violation, sets blocked_until to a
-- fresh p_window-length cooldown (a clean "penalty box", not just "wait for
-- the original window to end").
create or replace function public.assert_rate_limit(
  p_user_id uuid,
  p_action  text,
  p_max     integer,
  p_window  interval
) returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $$
declare
  v_lock_key   bigint;
  v_row        public.rate_limits%rowtype;
  v_window_end timestamptz;
begin
  -- Unauthenticated/unresolvable identity: nothing to attribute a quota to.
  -- The surrounding RLS already requires an authenticated identity for every
  -- rate-limited table, so this is a defensive no-op, not an escape hatch.
  if p_user_id is null then
    return;
  end if;

  v_lock_key := hashtextextended(p_action || ':' || p_user_id::text, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select * into v_row
  from public.rate_limits
  where user_id = p_user_id and action = p_action
  order by window_start desc
  limit 1;

  -- Still serving an earlier violation's cooldown, independent of the window math below.
  if found and v_row.blocked_until is not null and v_row.blocked_until > now() then
    raise exception 'rate limit exceeded: try again after %', v_row.blocked_until
      using errcode = '53400';
  end if;

  v_window_end := coalesce(v_row.window_start, '-infinity'::timestamptz) + p_window;

  if found and v_window_end > now() then
    -- Still inside the current window.
    if v_row.request_count >= p_max then
      update public.rate_limits
        set blocked_until = now() + p_window
        where id = v_row.id;
      raise exception
        'rate limit exceeded: at most % "%" per %', p_max, p_action, p_window
        using errcode = '53400';
    end if;
    update public.rate_limits
      set request_count = request_count + 1
      where id = v_row.id;
  elsif found then
    -- Row exists but its window has expired -- reset it in place rather than
    -- growing a new row per window (keeps at most one live row per identity+action).
    update public.rate_limits
      set request_count = 1, window_start = now(), blocked_until = null
      where id = v_row.id;
  else
    -- No row yet for this (user_id, action).
    insert into public.rate_limits (user_id, action, request_count, window_start)
    values (p_user_id, p_action, 1, now());
  end if;
end;
$$;

revoke all on function public.assert_rate_limit(uuid, text, integer, interval) from public, anon, authenticated;

-- ── trigger wiring ─────────────────────────────────────────────────────────
-- `ab_` prefix: BEFORE triggers fire in name order, so these run AFTER
-- `aa_enforce_review_eligibility` from 20260719050000. Deliberate — a
-- structurally invalid review is rejected on its own merits and does not burn
-- the attacker's quota; the quota exists to bound VALID-shaped spam.

-- reviews: bounds review-spam (the farming amplifier).
create or replace function public.rate_limit_reviews()
  returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.assert_rate_limit(new.reviewer_id, 'review_insert', 30, interval '1 hour');
  return new;
end;
$$;

drop trigger if exists ab_rate_limit_reviews on public.reviews;
create trigger ab_rate_limit_reviews
  before insert on public.reviews
  for each row execute function public.rate_limit_reviews();

-- archive_entries: bounds submission spam.
-- NOTE (compatibility): this counts INSERTs only. Draft autosave
-- (SubmitArchive.jsx, 30s interval) UPDATEs an existing draft row rather than
-- inserting, so a long editing session does not consume quota. Only genuinely
-- new rows do.
create or replace function public.rate_limit_archive_entries()
  returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.assert_rate_limit(new.submitted_by, 'entry_insert', 20, interval '1 hour');
  return new;
end;
$$;

drop trigger if exists ab_rate_limit_archive_entries on public.archive_entries;
create trigger ab_rate_limit_archive_entries
  before insert on public.archive_entries
  for each row execute function public.rate_limit_archive_entries();

-- segment_reports: bounds report spam. Keyed by the caller's profile id
-- resolved from the JWT (the table stores only author_username text).
create or replace function public.rate_limit_segment_reports()
  returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_user_id uuid;
begin
  select id into v_user_id from public.users_profile
   where clerk_id = (auth.jwt() ->> 'sub') limit 1;
  perform public.assert_rate_limit(v_user_id, 'segment_report_insert', 15, interval '1 hour');
  return new;
end;
$$;

drop trigger if exists ab_rate_limit_segment_reports on public.segment_reports;
create trigger ab_rate_limit_segment_reports
  before insert on public.segment_reports
  for each row execute function public.rate_limit_segment_reports();

commit;

-- ── garbage collection ─────────────────────────────────────────────────────
-- Kept OUT of the hot path (this reuses one row per identity+action already,
-- so growth is bounded, but old/abandoned keys — e.g. a user who reviewed once
-- and never again — would sit forever without this). pg_cron is already
-- installed for this project. Filters on window_start, the real column;
-- any blocked_until on a row this old (at most window_start + p_window, and
-- every p_window used above is <= 1 hour) is necessarily already in the past
-- too, so no separate blocked_until check is needed.
select cron.schedule(
  'rate-limits-gc',
  '17 * * * *',
  $$ delete from public.rate_limits where window_start < now() - interval '2 days'; $$
);

-- ============================================================
-- NOT COVERED HERE (stated honestly rather than implied)
--   • "join requests" / signup / login attempts are handled entirely by Clerk
--     and never reach Postgres, so they CANNOT be rate limited from here.
--     Configure those in the Clerk dashboard (Attack Protection → rate limits,
--     bot protection). The localStorage throttle in Join.jsx:34 is UX only and
--     must not be treated as a control.
--   • These limits are per-USER (authenticated profile), not per-IP, even
--     though the table has an ip_address column and a matching index for it.
--     A single attacker with many accounts is bounded per account, not
--     globally. Per-IP limiting (using that existing column) is a natural
--     follow-up for pre-auth surfaces, but none of the three triggers wired
--     here have an unauthenticated write path, so it isn't needed for them.
--
-- TUNING: limits are deliberately generous so real users never hit them
-- (an active reviewer files well under 30 reviews/hour). Lower them by editing
-- the p_max/p_window arguments in the three trigger functions above.
--
-- ROLLBACK NOTES
--   select cron.unschedule('rate-limits-gc');
--   drop trigger if exists ab_rate_limit_reviews         on public.reviews;
--   drop trigger if exists ab_rate_limit_archive_entries on public.archive_entries;
--   drop trigger if exists ab_rate_limit_segment_reports on public.segment_reports;
--   drop function if exists public.rate_limit_reviews(),
--                           public.rate_limit_archive_entries(),
--                           public.rate_limit_segment_reports(),
--                           public.assert_rate_limit(uuid, text, integer, interval);
--   (rate_limits itself is untouched by rollback — it pre-existed this
--   migration and its rows are harmless counters, not derived from it.)
-- ============================================================
