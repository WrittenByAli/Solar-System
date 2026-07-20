-- ============================================================
-- CRITICAL SECURITY FIX — reviewer point farming → privilege escalation
--
-- CONFIRMED VULNERABILITY (operator-verified 2026-07-19):
--   A normal student/member could INSERT a review row targeting an ALREADY
--   APPROVED entry. The AFTER-INSERT consensus trigger awards the reviewer
--   +85 points unconditionally, so the attacker repeated this across every
--   public approved entry (~54 seeded), banked ~4,590 points, crossed the
--   2,500 `app_settings.reviewer_points_threshold`, and `auto_promote_reviewer`
--   silently promoted them student → reviewer. Privilege escalation +
--   leaderboard inflation.
--
--   Root cause: NOTHING constrained the review TARGET. `reviews_insert_as_member`
--   only checked (a) reviewer_id = caller and (b) not-self-review. Entry
--   `status` was never consulted on the write path — only in the read policy
--   that populates the queue UI, which is frontend-shaped and bypassable by
--   posting straight to PostgREST.
--
-- DESIGN DECISION — why this migration does NOT rewrite process_review_consensus:
--   The LIVE consensus function carries two migrations that exist only in the
--   database and in NO repo file: `fix_consensus_race_condition_duplicate_notify`
--   and `harden_trigger_functions` (referenced in
--   supabase_notify_reviewers_on_consensus.sql:6-8). The copy in
--   supabase_schema.sql:150 is therefore STALE. A `create or replace` from that
--   stale copy would silently CLOBBER the live race + hardening fixes — a
--   regression worse than the bug being fixed.
--   Instead we reject ineligible reviews in a BEFORE INSERT trigger and in RLS.
--   A row that is never inserted never fires the AFTER INSERT consensus trigger,
--   so no points can be awarded for it. Identical security outcome, zero risk to
--   the unauditable live function. (Same "additive, don't clobber" precedent the
--   project already set in supabase_notify_reviewers_on_consensus.sql.)
--
-- Idempotent. Safe to re-run.
-- ============================================================

begin;

-- ── LAYER 4a: duplicate/replay protection — one review per (entry, reviewer) ──
-- Documented as existing but its DDL is in no repo file, so assert it here.
-- PREFLIGHT: if this errors with a uniqueness violation you already have
-- duplicate review rows. Inspect them BEFORE deleting anything (they are audit
-- history and may indicate prior farming):
--   select entry_id, reviewer_id, count(*), min(created_at), max(created_at)
--   from public.reviews group by 1,2 having count(*) > 1;
create unique index if not exists reviews_entry_reviewer_uniq
  on public.reviews (entry_id, reviewer_id);

-- ── LAYER 1+2: server-side eligibility gate (BEFORE INSERT) ─────────────────
-- This is the authoritative check. It runs BEFORE the consensus AFTER-INSERT
-- trigger, so an ineligible review is rejected before any point award can
-- happen. SECURITY DEFINER on purpose: it must evaluate the TRUE row state
-- regardless of what the caller can SELECT, and it must also constrain callers
-- that bypass RLS entirely (service_role, dashboard, future server jobs) —
-- those are exactly the paths an RLS-only fix would miss.
--
-- The `for update` row lock is the LAYER 4 concurrency control: concurrent
-- review inserts against the SAME entry serialize on that entry's row, so two
-- simultaneous "3rd reviews" cannot both observe status='pending' and both
-- drive the consensus/reward path (duplicate approval + duplicate reward).
create or replace function public.enforce_review_eligibility()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $$
declare
  v_status     text;
  v_is_draft   boolean;
  v_deleted_at timestamptz;
  v_author     uuid;
begin
  select status, is_draft, deleted_at, submitted_by
    into v_status, v_is_draft, v_deleted_at, v_author
  from public.archive_entries
  where id = new.entry_id
  for update;                      -- serialize concurrent reviews of this entry

  if not found then
    raise exception 'review target entry % does not exist', new.entry_id
      using errcode = '23503';
  end if;

  if v_deleted_at is not null then
    raise exception 'entry % is deleted and cannot be reviewed', new.entry_id
      using errcode = '42501';
  end if;

  if v_is_draft then
    raise exception 'entry % is a draft and cannot be reviewed', new.entry_id
      using errcode = '42501';
  end if;

  -- THE FIX: only an open (pending) entry may receive a review. Blocks
  -- approved / rejected / any future status outright.
  if v_status is distinct from 'pending' then
    raise exception 'entry % is not open for review (status=%)', new.entry_id, v_status
      using errcode = '42501';
  end if;

  -- Defence in depth; the consensus fn also raises on this.
  if v_author is not null and v_author = new.reviewer_id then
    raise exception 'cannot review own submission'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- `aa_` prefix: Postgres fires BEFORE triggers in NAME order, so this runs
-- first and rejects early. (Mirrors the existing `zz_` = run-last convention.)
drop trigger if exists aa_enforce_review_eligibility on public.reviews;
create trigger aa_enforce_review_eligibility
  before insert on public.reviews
  for each row execute function public.enforce_review_eligibility();

-- ── LAYER 3: RLS — reject ineligible INSERTs at the policy layer too ────────
-- ⚠️ CRITICAL: RLS policies for the same command are OR'ed. `reviews_insert_as_reviewer`
-- has NO eligibility check, so leaving it in place would let any reviewer/admin
-- keep farming even after the member policy is tightened. It must be dropped.
-- No functionality is lost: `reviews_insert_as_member` already covers every
-- authenticated user, reviewers and admins included.
-- (Migration 20260719030000 also drops it; repeated here so THIS migration is
-- self-sufficient and correct even if 030000 was never applied.)
drop policy if exists "reviews_insert_as_reviewer" on public.reviews;

drop policy if exists "reviews_insert_as_member" on public.reviews;
create policy "reviews_insert_as_member"
  on public.reviews for insert
  to authenticated
  with check (
    -- identity: you may only file a review AS YOURSELF
    reviewer_id = (
      select up.id from public.users_profile up
      where up.clerk_id = (select auth.jwt() ->> 'sub')
      limit 1
    )
    -- eligibility: the target must be an OPEN, real, someone-else's entry.
    -- `is distinct from` (not `<>`) so a NULL submitted_by — seeded rows —
    -- is handled without collapsing the predicate to NULL.
    and exists (
      select 1 from public.archive_entries e
      where e.id = reviews.entry_id
        and e.status = 'pending'
        and e.is_draft = false
        and e.deleted_at is null
        and e.submitted_by is distinct from reviews.reviewer_id
    )
  );

commit;

-- ============================================================
-- LAYER 5 — reviewer promotion
--
-- No change to auto_promote_reviewer() is required or safe here: its body is
-- not in the repo (see M1 / repo-vs-prod divergence), and it promotes purely
-- as a function of `points`. Once points can only be earned from a review of a
-- genuinely pending entry (above), the farming path that fed promotion is gone,
-- so promotion becomes correct by construction. Rewriting it blind would risk
-- the same clobber problem as the consensus function.
--
-- ⚠️ REMEDIATION OF ALREADY-FARMED STATE (run manually, use judgement):
-- The fix is preventative — it does NOT claw back points already banked or
-- demote anyone already promoted. Detect suspicious reviews (a review whose
-- target is not pending and which was created AFTER that entry's last status
-- change) with:
--
--   select r.reviewer_id, up.username, up.role, up.points,
--          count(*) as suspicious_reviews
--   from public.reviews r
--   join public.archive_entries e on e.id = r.entry_id
--   join public.users_profile   up on up.id = r.reviewer_id
--   where e.status <> 'pending'
--     and r.created_at > e.updated_at      -- review filed after entry resolved
--   group by 1,2,3,4
--   order by suspicious_reviews desc;
--
-- HEURISTIC, NOT PROOF: `updated_at` moves on any row update, so a legitimate
-- review of an entry that was later edited can appear here. Review the list by
-- hand before adjusting anyone's points or role — do not mass-demote. To correct
-- a specific account after confirming abuse (service_role / SQL editor only):
--   update public.users_profile set points = <corrected>, role = 'student'
--   where id = '<uuid>';
-- ============================================================

-- ============================================================
-- ROLLBACK NOTES
--   drop trigger if exists aa_enforce_review_eligibility on public.reviews;
--   drop function if exists public.enforce_review_eligibility();
--   drop index  if exists reviews_entry_reviewer_uniq;
--   -- and restore the permissive policy (NOT RECOMMENDED — reopens the vuln):
--   -- drop policy "reviews_insert_as_member" on public.reviews; then re-create
--   -- the pre-fix version from migration 20260719020000.
--   Rolling back re-opens the confirmed privilege-escalation path. Prefer
--   fixing forward.
--
-- BACKWARD COMPATIBILITY
--   • Legitimate review flow is UNAFFECTED. GradeSubmissions.jsx already only
--     surfaces entries with status='pending', is_draft=false, deleted_at is null,
--     and submitted_by <> me (src/pages/GradeSubmissions.jsx:228,239) — exactly
--     the set the new policy permits. The UI needed no change.
--   • Reviewers/admins are unaffected by the dropped `reviews_insert_as_reviewer`
--     policy: `reviews_insert_as_member` grants every authenticated user the
--     same INSERT, plus the eligibility constraint.
--   • Error surface changes: an ineligible insert now returns a Postgres error
--     (42501) instead of silently succeeding. SubmitArchive/GradeSubmissions
--     already render `error.message` on failure, so this degrades gracefully.
--   • The `for update` lock adds contention only between concurrent reviews of
--     the SAME entry (rare, and previously a correctness bug anyway).
-- ============================================================
