-- ============================================================
-- LAYER (F11) — bound archive_entries' free-text/array fields server-side.
--
-- FINDING (security audit, 2026-07-20): title/short_summary/content have
-- client-only length caps (SubmitArchive.jsx maxLength 80/400/2500 — see
-- src/pages/SubmitArchive.jsx, "Subject Title"/"Short Summary"/"Technical
-- Deep Detail" fields); tags is bounded client-side only by
-- normalizeSubmissionTags (src/utils/submissionStorage.js, 16 tags x 32
-- chars, silently truncates rather than rejecting); alternate_perspectives
-- has a client-side entry-count cap (MAX_ALTERNATE_PERSPECTIVES=6,
-- SubmitArchive.jsx) but NO per-entry length cap anywhere, client or server;
-- layer_data is a plain nullable jsonb column with no cap at all and is not
-- yet written by the frontend. NONE of the above had a database CHECK
-- constraint, so a direct POST/PATCH to PostgREST -- bypassing the client
-- entirely -- could store an arbitrarily large title/summary/content/tag
-- array/perspectives array/layer_data blob. This is the same class of gap
-- F4 (20260719070000_bound_notes_and_attachments.sql) already closed for
-- reviews.notes and archive_entries.attachments; this migration closes the
-- remaining fields on the same table.
--
-- WHY THIS COVERS EVERY WRITE PATH WITHOUT TOUCHING ANY FUNCTION BODY:
-- archive_entries has exactly two write paths that accept these fields from
-- the client -- (1) direct PostgREST insert/update, gated by RLS policies
-- entries_insert_own_pending / entries_update_own_pending_rejected (which
-- already force status='pending' and submitted_by=caller -- no
-- mass-assignment gap there, verified by reading supabase_rls.sql), and
-- (2) the replace_archive_entry_on_edit() SQL function (SECURITY INVOKER,
-- forces submitted_by/status server-side per its own ownership re-check --
-- see supabase_schema.sql -- but inserts title/content/short_summary/tags/
-- alternate_perspectives straight from client-supplied jsonb with ZERO
-- length validation of its own). A table-level CHECK constraint is
-- enforced on every INSERT/UPDATE regardless of which of these two paths
-- produced the row, so this migration closes the gap for both without
-- editing replace_archive_entry_on_edit() itself -- same "don't touch the
-- one write path with a complex/unaudited history" caution this project
-- already applied to process_review_consensus (see
-- 20260719050000_fix_review_point_farming.sql's header).
--
-- BOUNDS CHOSEN (matched to the client's own limits so no legitimate
-- submission is ever rejected -- verified against SubmitArchive.jsx, not
-- guessed):
--   • title:          <= 80 chars,  non-blank (client: required, maxLength 80)
--   • short_summary:  <= 700 chars                (client: maxLength 700 --
--     widened from an original 400 after this bound was hand-adjusted
--     directly against production; the client constant was raised to match
--     so client and server ceilings agree again)
--   • content:        <= 2500 chars               (client: maxLength 2500)
--   • tags:           <= 16 elements, <= 32 chars each
--                     (client: MAX_TAGS_PER_SUBMISSION / MAX_TAG_CHARS in
--                      src/utils/submissionStorage.js)
--   • alternate_perspectives: <= 6 elements, <= 320 chars per serialized
--     JSON element (client: MAX_ALTERNATE_PERSPECTIVES=6 entries,
--     ALTERNATE_PERSPECTIVE_MAX_CHARS=200 chars of raw line text per entry
--     in src/utils/archiveEntryValidation.js — 320 leaves headroom for the
--     `{"hubId":"...","label":"..."}` JSON-encoding overhead around that
--     200-char line).
--   • layer_data: <= 50 KB serialized. Not yet written by the frontend at
--     all (confirmed: no `layer_data:` write site in SubmitArchive.jsx), so
--     this is a forward-looking bound, not a fit to existing traffic --
--     chosen generously so it cannot collide with a real future feature,
--     while still closing the "unbounded jsonb column reachable via direct
--     API" shape entirely.
--
-- SAFETY: every constraint below is added NOT VALID, exactly like F4's
-- migration — enforced on all NEW inserts/updates immediately, but does not
-- require (or risk failing on) validating every pre-existing row at
-- migration-apply time. Run the preflight queries below FIRST.
--
-- ⚠️ PREFLIGHT (read-only, run first — paste the counts back before applying):
--   select count(*) from public.archive_entries where length(title) > 80 or length(trim(title)) < 1;
--   select count(*) from public.archive_entries where length(coalesce(short_summary,'')) > 700;
--   select count(*) from public.archive_entries where length(coalesce(content,'')) > 2500;
--   select count(*) from public.archive_entries
--     where coalesce(array_length(tags,1),0) > 16
--        or coalesce((select max(length(x)) from unnest(tags) x), 0) > 32;
--   select count(*) from public.archive_entries
--     where jsonb_typeof(coalesce(alternate_perspectives,'[]'::jsonb)) <> 'array'
--        or jsonb_array_length(
--             case when jsonb_typeof(coalesce(alternate_perspectives,'[]'::jsonb)) = 'array'
--                  then coalesce(alternate_perspectives,'[]'::jsonb) else '[]'::jsonb end
--           ) > 6;
--   select count(*) from public.archive_entries where length(coalesce(layer_data::text, '')) > 51200;
--   • All zero → proceed, nothing to clean up.
--   • Any > 0 → STOP. Either legitimate historical data exceeds an assumed
--     bound (re-check the bound against real data before applying) or this
--     exact gap was already exploited via direct API — inspect the offending
--     row(s) before applying or touching anything.
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- ── Helper functions (kept generic + reusable rather than inlining the
-- unnest/jsonb_array_elements logic 6 times; SQL-language + IMMUTABLE so the
-- planner can treat them as cheap scalar expressions in the CHECK) ─────────

create or replace function public.check_text_array_bounds(arr text[], max_elems int, max_elem_chars int)
  returns boolean
  language sql
  immutable
  parallel safe
as $function$
  select coalesce(array_length(arr, 1), 0) <= max_elems
    and coalesce((select max(length(x)) from unnest(arr) x), 0) <= max_elem_chars
$function$;

create or replace function public.check_jsonb_array_bounds(val jsonb, max_elems int, max_elem_json_chars int)
  returns boolean
  language sql
  immutable
  parallel safe
as $function$
  select case jsonb_typeof(coalesce(val, '[]'::jsonb))
    when 'array' then
      jsonb_array_length(coalesce(val, '[]'::jsonb)) <= max_elems
      and not exists (
        select 1 from jsonb_array_elements(coalesce(val, '[]'::jsonb)) elem
        where length(elem::text) > max_elem_json_chars
      )
    else false   -- must be a JSON array, not an object/scalar/string
  end
$function$;

-- Function calls inside a CHECK constraint still go through normal ACL
-- checks for whichever role performs the INSERT/UPDATE (anon/authenticated
-- via PostgREST) -- explicit grants here rather than relying on the default
-- PUBLIC EXECUTE grant, matching this project's existing convention of being
-- explicit about function privileges (see replace_archive_entry_on_edit's
-- revoke/grant pair in supabase_schema.sql).
grant execute on function public.check_text_array_bounds(text[], int, int) to anon, authenticated;
grant execute on function public.check_jsonb_array_bounds(jsonb, int, int) to anon, authenticated;

-- ── The constraints themselves ──────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'archive_entries_title_bound_check') then
    alter table public.archive_entries
      add constraint archive_entries_title_bound_check
      check (length(title) <= 80 and length(trim(title)) >= 1)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'archive_entries_short_summary_bound_check') then
    alter table public.archive_entries
      add constraint archive_entries_short_summary_bound_check
      check (length(coalesce(short_summary, '')) <= 700)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'archive_entries_content_bound_check') then
    alter table public.archive_entries
      add constraint archive_entries_content_bound_check
      check (length(coalesce(content, '')) <= 2500)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'archive_entries_tags_bound_check') then
    alter table public.archive_entries
      add constraint archive_entries_tags_bound_check
      check (public.check_text_array_bounds(tags, 16, 32))
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'archive_entries_alternate_perspectives_bound_check') then
    alter table public.archive_entries
      add constraint archive_entries_alternate_perspectives_bound_check
      check (public.check_jsonb_array_bounds(alternate_perspectives, 6, 320))
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'archive_entries_layer_data_bound_check') then
    alter table public.archive_entries
      add constraint archive_entries_layer_data_bound_check
      check (layer_data is null or length(layer_data::text) <= 51200)
      not valid;
  end if;
end $$;

-- ============================================================
-- WHY "NOT VALID" IS NOT A LOOPHOLE: identical reasoning to F4's migration —
-- Postgres still enforces a NOT VALID CHECK constraint on every INSERT and
-- UPDATE from the moment it's added; it only skips the one-time scan of
-- pre-existing rows. The direct-API abuse path this migration targets is
-- closed immediately regardless of whether VALIDATE CONSTRAINT is ever run.
--
-- OPTIONAL FOLLOW-UP (only if every preflight query above returned 0 —
-- cosmetic/completeness, not a security requirement):
--   alter table public.archive_entries validate constraint archive_entries_title_bound_check;
--   alter table public.archive_entries validate constraint archive_entries_short_summary_bound_check;
--   alter table public.archive_entries validate constraint archive_entries_content_bound_check;
--   alter table public.archive_entries validate constraint archive_entries_tags_bound_check;
--   alter table public.archive_entries validate constraint archive_entries_alternate_perspectives_bound_check;
--   alter table public.archive_entries validate constraint archive_entries_layer_data_bound_check;
--
-- ROLLBACK NOTES
--   alter table public.archive_entries drop constraint if exists archive_entries_title_bound_check;
--   alter table public.archive_entries drop constraint if exists archive_entries_short_summary_bound_check;
--   alter table public.archive_entries drop constraint if exists archive_entries_content_bound_check;
--   alter table public.archive_entries drop constraint if exists archive_entries_tags_bound_check;
--   alter table public.archive_entries drop constraint if exists archive_entries_alternate_perspectives_bound_check;
--   alter table public.archive_entries drop constraint if exists archive_entries_layer_data_bound_check;
--   drop function if exists public.check_text_array_bounds(text[], int, int);
--   drop function if exists public.check_jsonb_array_bounds(jsonb, int, int);
--
-- BACKWARD COMPATIBILITY
--   • SubmitArchive.jsx's real submission payloads (title<=80, short_summary
--     <=700, content<=2500, <=16 tags of <=32 chars via normalizeSubmissionTags,
--     <=6 alternate-perspective lines of <=200 chars each via
--     validateAlternatePerspectivesInput/parseAlternatePerspectives) all sit
--     strictly under every bound above -- verified against the client code
--     these constraints were matched to, not assumed.
--   • layer_data is currently never written by the client, so this bound has
--     zero effect on any real traffic today; it only forecloses future abuse
--     of an already-unbounded column reachable via direct API.
--   • A direct-API caller who violates any bound gets a standard Postgres
--     23514 (check_violation) error instead of silently storing an
--     oversized/malformed row -- same degradation SubmitArchive.jsx/
--     GradeSubmissions.jsx already handle gracefully for other DB errors
--     (dbError.message rendered as a generic "couldn't save" toast).
-- ============================================================
