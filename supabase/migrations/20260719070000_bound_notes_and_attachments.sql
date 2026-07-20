-- ============================================================
-- LAYER (F4) — bound reviews.notes and archive_entries.attachments
-- server-side, closing the "unbounded via direct API" gap.
--
-- FINDING: SubmitArchive.jsx caps attachments to MAX_ATTACHMENTS=6 files of
-- MAX_FILE_BYTES=1_200_000 bytes each (stored as raw `data:` URLs via
-- FileReader.readAsDataURL — confirmed at SubmitArchive.jsx:940-969, NOT
-- Storage URLs), and GradeSubmissions.jsx slices review notes to 1200 chars
-- before insert. Neither limit exists in the DATABASE — a direct POST to
-- PostgREST bypasses both entirely. No CHECK constraint on reviews.notes'
-- length or archive_entries.attachments' size/shape was found in any repo
-- .sql file (and, per the audit, neither `reviews`' nor `attachments`'
-- CREATE TABLE is in the repo at all — this migration adds constraints
-- without assuming full knowledge of either table's other columns).
-- Impact: storage bloat / mild DoS, NOT injection (notes render through
-- React's auto-escaping; attachment URLs already go through ArchiveGrid.jsx's
-- scheme-allowlist sanitizer) — see REDTEAM_AUDIT_2026-07-19.md F4.
--
-- BOUNDS CHOSEN (deliberately generous vs. the real client behavior above,
-- verified rather than guessed, so this cannot reject a legitimate submission):
--   • notes: 2000 chars (client sends <= 1200; sourceLinksToAttachments-style
--     headroom isn't relevant here, this is just the review-notes textarea).
--   • attachments: <= 200 elements, <= 20 MB total serialized size.
--     Size: 6 files x ~1.2MB raw ~= 1.6MB each as base64 (~33% inflation) =~
--     9.6MB realistic worst case -- 20MB leaves ample headroom.
--     Count: deliberately NOT tied to MAX_ATTACHMENTS=6 -- SubmitArchive.jsx's
--     sourceLinksToAttachments() appends one small (no data: URL) attachment
--     PER LINE of the free-text source-links field with NO app-side cap on
--     line count, so a citation-heavy L7/L8 entry can legitimately have well
--     over 6 attachment elements. 200 bounds pathological abuse (e.g. a
--     script inserting hundreds of thousands of tiny elements) without
--     constraining realistic heavy citation use.
--
-- SAFETY: both constraints added NOT VALID -- they apply to all NEW
-- inserts/updates immediately, but do not require (or risk failing on)
-- validating every existing row at migration time. Run the preflight queries
-- below FIRST and read the output before applying, so you know whether any
-- existing row would need cleanup before a later VALIDATE CONSTRAINT pass.
--
-- ⚠️ PREFLIGHT (read-only, run first):
--   select count(*) from public.reviews where length(coalesce(notes, '')) > 2000;
--   select count(*) from public.archive_entries
--     where jsonb_typeof(coalesce(attachments, '[]'::jsonb)) <> 'array'
--        or jsonb_array_length(
--             case when jsonb_typeof(coalesce(attachments,'[]'::jsonb)) = 'array'
--                  then coalesce(attachments, '[]'::jsonb) else '[]'::jsonb end
--           ) > 200
--        or length(coalesce(attachments, '[]'::jsonb)::text) > 20 * 1024 * 1024;
--   • Both return 0 → proceed, nothing to clean up.
--   • Either returns > 0 → STOP. Some existing row already exceeds the new
--     bound (either legitimate historical data larger than assumed, or
--     evidence this exact hole was already exploited). Paste the count/rows
--     back before applying — do not silently truncate or delete data.
--
-- Idempotent. Safe to re-run.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reviews_notes_length_check'
  ) then
    alter table public.reviews
      add constraint reviews_notes_length_check
      check (length(coalesce(notes, '')) <= 2000)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'archive_entries_attachments_bound_check'
  ) then
    alter table public.archive_entries
      add constraint archive_entries_attachments_bound_check
      check (
        case jsonb_typeof(coalesce(attachments, '[]'::jsonb))
          when 'array' then
            jsonb_array_length(coalesce(attachments, '[]'::jsonb)) <= 200
            and length(coalesce(attachments, '[]'::jsonb)::text) <= 20 * 1024 * 1024
          else false   -- attachments must be a JSON array, not an object/scalar
        end
      )
      not valid;
  end if;
end $$;

-- ============================================================
-- WHY "NOT VALID" IS NOT A LOOPHOLE: Postgres still enforces a NOT VALID
-- CHECK constraint on every INSERT and UPDATE from the moment it's added --
-- it only skips the one-time scan of PRE-EXISTING rows. So the direct-API
-- abuse path this migration targets is closed immediately regardless of
-- whether you ever run VALIDATE CONSTRAINT.
--
-- OPTIONAL FOLLOW-UP (only if the preflight queries above returned 0, purely
-- to convert the constraints from NOT VALID to fully VALIDATED -- cosmetic/
-- completeness, not a security requirement since new writes are already
-- enforced either way):
--   alter table public.reviews         validate constraint reviews_notes_length_check;
--   alter table public.archive_entries validate constraint archive_entries_attachments_bound_check;
--
-- ROLLBACK NOTES
--   alter table public.reviews         drop constraint if exists reviews_notes_length_check;
--   alter table public.archive_entries drop constraint if exists archive_entries_attachments_bound_check;
--
-- BACKWARD COMPATIBILITY
--   • GradeSubmissions.jsx already slices notes to 1200 chars before insert
--     (src/pages/GradeSubmissions.jsx:290) -- well under the 2000 cap.
--   • SubmitArchive.jsx's realistic worst case (6 x 1.2MB files, base64-
--     encoded, plus any number of small source-link attachments) sits
--     comfortably under both the 20MB size cap and the 200-element cap.
--   • A direct-API caller who violates either bound gets a standard Postgres
--     23514 (check_violation) error instead of silently storing an
--     oversized/malformed row.
-- ============================================================
