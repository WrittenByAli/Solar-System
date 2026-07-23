-- ============================================================
-- Fix: review queue shows wrong relative time ("23 min ago" for a just-
-- submitted entry), and the same root cause also mis-times staleness
-- detection in two other places.
--
-- ROOT CAUSE (verified live): archive_entries.created_at is set once, at
-- the row's FIRST insert -- which, for any entry that went through the
-- draft-autosave workflow, is the moment the DRAFT was first created, not
-- the moment the user actually hit Submit. Every place in the codebase
-- that used created_at as a stand-in for "time since this became a
-- reviewable submission" inherited this bug:
--   1. QueueRail.jsx's timeAgo(entry.created_at) -- the reported symptom.
--   2. GradeSubmissions.jsx's isStale/sort calculation (created_at as the
--      lastActivity floor).
--   3. resurface-stale-reviews edge function -- same created_at cutoff,
--      by its own comment deliberately mirroring #2.
--
-- Live proof: entry 214da213-eaf2-4955-8df4-679969742d85 ("I am Superman")
-- has created_at = 2026-07-23 03:22:16 (original draft save) but
-- updated_at = 2026-07-23 03:42:55 (the actual submit, ~20.7 min later --
-- trg_archive_entries_updated_at bumps updated_at on every UPDATE,
-- including the is_draft:true->false transition). The old code showed
-- ~24-25 minutes old at time of testing; the entry had actually been
-- reviewable for under 5 minutes.
--
-- FIX: a dedicated, server-computed submitted_at column -- not updated_at,
-- which is a generic "last touched" field also bumped by unrelated later
-- events (e.g. process_review_consensus's status flip on approve/reject),
-- so it is not a safe long-term proxy either. submitted_at is set by
-- trigger, ignoring any client-supplied value (same defense-in-depth
-- pattern as guard_users_profile_managed_cols):
--   - INSERT: now() if the row is not a draft, else null (drafts aren't
--     "submitted" yet).
--   - UPDATE: now() the moment is_draft flips true->false (or if somehow
--     unset on an already-non-draft row); null if it becomes a draft
--     again; otherwise preserved untouched -- so a later status-only
--     update (approve/reject) never resets the queue-age clock.
--
-- Backfill: existing non-draft rows get submitted_at = created_at. This is
-- an honest backfill, not a retroactive "fix" -- there is no audit trail
-- to recover the true historical submit moment for old rows, and for the
-- large majority of entries (submitted directly, no draft phase) created_at
-- already equals the true submit time anyway. Only rows submitted from now
-- on benefit from the corrected trigger-computed value; historical display
-- is unchanged (no regression).
--
-- Verified live: inserted a draft (submitted_at correctly null), waited 26
-- real seconds, flipped is_draft to false -- submitted_at came back equal
-- to updated_at (the true submit moment), 26s after created_at, not 0s.
-- ============================================================

alter table public.archive_entries add column submitted_at timestamptz;

update public.archive_entries set submitted_at = created_at where is_draft = false;

create or replace function public.set_archive_entry_submitted_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    new.submitted_at := case when new.is_draft then null else now() end;
  elsif tg_op = 'UPDATE' then
    if new.is_draft then
      new.submitted_at := null;
    elsif old.is_draft or old.submitted_at is null then
      new.submitted_at := now();
    else
      new.submitted_at := old.submitted_at;
    end if;
  end if;
  return new;
end;
$function$;

create trigger trg_set_archive_entry_submitted_at
  before insert or update on public.archive_entries
  for each row execute function public.set_archive_entry_submitted_at();
