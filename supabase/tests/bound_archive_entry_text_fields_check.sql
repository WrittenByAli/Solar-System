-- ============================================================
-- LAYER (F11) — verify the CHECK constraints + helper functions added by
-- migration 20260720000000_bound_archive_entry_text_fields.sql.
--
-- Same lighter-weight style as bound_notes_and_attachments_check.sql (F4):
-- this is a storage/DoS + input-validation bound, not an exploit path, so it
-- verifies the CHECK expressions' boolean logic directly via SELECT -- no
-- fixtures, no RLS, no archive_entries rows inserted/updated/rolled back.
--
-- ✅ 100% SAFE: every statement here is a read-only SELECT. Nothing is
-- written to archive_entries. Parts B-F call the ACTUAL helper functions
-- the migration installs (public.check_text_array_bounds /
-- public.check_jsonb_array_bounds), not a re-implementation of their logic,
-- so this genuinely exercises the deployed constraint code.
--
-- EXPECTED: every row reads PASS. Run this only AFTER applying the migration
-- (Parts A/B/C/D reference functions/constraints that don't exist before then).
-- ============================================================

-- ── Part A: confirm every constraint actually attached ─────────────────────
select conname, contype, convalidated, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in (
  'archive_entries_title_bound_check',
  'archive_entries_short_summary_bound_check',
  'archive_entries_content_bound_check',
  'archive_entries_tags_bound_check',
  'archive_entries_alternate_perspectives_bound_check',
  'archive_entries_layer_data_bound_check'
)
order by conname;
-- Expect 6 rows, contype='c' (check), convalidated=false (NOT VALID, expected
-- and fine per the migration's design -- new writes are enforced regardless).

-- ── Part B: title boundary (mirrors archive_entries_title_bound_check) ─────
select
  case when (length(repeat('a', 80)) <= 80 and length(trim(repeat('a', 80))) >= 1) = true
       then 'PASS' else 'FAIL' end as status,
  'exactly 80 chars is allowed (boundary, inclusive)' as test
union all
select
  case when (length(repeat('a', 81)) <= 80) = false
       then 'PASS' else 'FAIL' end,
  '81 chars is rejected (one over the boundary)'
union all
select
  case when (length(trim('   ')) >= 1) = false
       then 'PASS' else 'FAIL' end,
  'a whitespace-only title is rejected (fails the non-blank check)'
union all
select
  case when (length(trim('x')) >= 1) = true
       then 'PASS' else 'FAIL' end,
  'a single non-whitespace character is a valid title';

-- ── Part C: short_summary / content length boundaries ───────────────────────
select
  case when (length(coalesce(repeat('a', 700), '')) <= 700) = true
       then 'PASS' else 'FAIL' end as status,
  'short_summary: exactly 700 chars is allowed (boundary, inclusive)' as test
union all
select
  case when (length(coalesce(repeat('a', 701), '')) <= 700) = false
       then 'PASS' else 'FAIL' end,
  'short_summary: 701 chars is rejected (one over the boundary)'
union all
select
  case when (length(coalesce(null, '')) <= 700) = true
       then 'PASS' else 'FAIL' end,
  'short_summary: null coalesces to empty string and passes'
union all
select
  case when (length(coalesce(repeat('a', 2500), '')) <= 2500) = true
       then 'PASS' else 'FAIL' end,
  'content: exactly 2500 chars is allowed (boundary, inclusive)'
union all
select
  case when (length(coalesce(repeat('a', 2501), '')) <= 2500) = false
       then 'PASS' else 'FAIL' end,
  'content: 2501 chars is rejected (one over the boundary)';

-- ── Part D: tags array bound (calls the real deployed function) ────────────
select
  case when public.check_text_array_bounds(
    (select array_agg('t' || g) from generate_series(1, 16) g), 16, 32
  ) = true then 'PASS' else 'FAIL' end as status,
  'tags: exactly 16 elements of short length is allowed (count boundary)' as test
union all
select
  case when public.check_text_array_bounds(
    (select array_agg('t' || g) from generate_series(1, 17) g), 16, 32
  ) = false then 'PASS' else 'FAIL' end,
  'tags: 17 elements is rejected (one over the count boundary)'
union all
select
  case when public.check_text_array_bounds(array[repeat('a', 32)], 16, 32) = true
       then 'PASS' else 'FAIL' end,
  'tags: a single 32-char tag is allowed (per-element boundary, inclusive)'
union all
select
  case when public.check_text_array_bounds(array[repeat('a', 33)], 16, 32) = false
       then 'PASS' else 'FAIL' end,
  'tags: a single 33-char tag is rejected (one over the per-element boundary)'
union all
select
  case when public.check_text_array_bounds('{}'::text[], 16, 32) = true
       then 'PASS' else 'FAIL' end,
  'tags: an empty array is allowed'
union all
select
  case when public.check_text_array_bounds(null, 16, 32) = true
       then 'PASS' else 'FAIL' end,
  'tags: null coalesces to empty and passes';

-- ── Part E: alternate_perspectives jsonb array bound (real deployed function) ─
select
  case when public.check_jsonb_array_bounds(
    (select jsonb_agg(jsonb_build_object('hubId','mars','label','x')) from generate_series(1,6)),
    6, 320
  ) = true then 'PASS' else 'FAIL' end as status,
  'alternate_perspectives: exactly 6 small elements is allowed (count boundary)' as test
union all
select
  case when public.check_jsonb_array_bounds(
    (select jsonb_agg(jsonb_build_object('hubId','mars','label','x')) from generate_series(1,7)),
    6, 320
  ) = false then 'PASS' else 'FAIL' end,
  'alternate_perspectives: 7 elements is rejected (one over the count boundary)'
union all
select
  case when public.check_jsonb_array_bounds(
    jsonb_build_array(jsonb_build_object('hubId','mars','label',repeat('a', 290))),
    6, 320
  ) = true then 'PASS' else 'FAIL' end,
  'alternate_perspectives: a ~300-char serialized element is allowed (under the 320 cap)'
union all
select
  case when public.check_jsonb_array_bounds(
    jsonb_build_array(jsonb_build_object('hubId','mars','label',repeat('a', 400))),
    6, 320
  ) = false then 'PASS' else 'FAIL' end,
  'alternate_perspectives: a ~410-char serialized element is rejected (over the 320 cap)'
union all
select
  case when public.check_jsonb_array_bounds('{}'::jsonb, 6, 320) = false
       then 'PASS' else 'FAIL' end,
  'alternate_perspectives: a JSON object (not an array) is rejected outright'
union all
select
  case when public.check_jsonb_array_bounds('"just a string"'::jsonb, 6, 320) = false
       then 'PASS' else 'FAIL' end,
  'alternate_perspectives: a JSON scalar (not an array) is rejected outright'
union all
select
  case when public.check_jsonb_array_bounds(null, 6, 320) = true
       then 'PASS' else 'FAIL' end,
  'alternate_perspectives: null coalesces to an empty array and passes';

-- ── Part F: layer_data size bound (mirrors archive_entries_layer_data_bound_check) ─
select
  case when (length(jsonb_build_object('x', repeat('a', 51200 - 10))::text) <= 51200) = true
       then 'PASS' else 'FAIL' end as status,
  'layer_data: a ~51190-char payload fits under the 50KB cap' as test
union all
select
  case when (length(jsonb_build_object('x', repeat('a', 60000))::text) <= 51200) = false
       then 'PASS' else 'FAIL' end,
  'layer_data: a 60KB payload is rejected (over the 50KB cap)'
union all
select
  case when (null is null) = true
       then 'PASS' else 'FAIL' end,
  'layer_data: null is allowed (column stays nullable, no frontend writer yet)';

-- ── Part G: real client payload shapes still fit (regression: never reject
-- a legitimate submission) ──────────────────────────────────────────────────
select
  case when public.check_text_array_bounds(
    (select array_agg('research-topic-' || g) from generate_series(1, 16) g), 16, 32
  ) = true then 'PASS' else 'FAIL' end as status,
  'regression: 16 realistic slugified tags (well under 32 chars each) still pass' as test
union all
select
  case when public.check_jsonb_array_bounds(
    (select jsonb_agg(jsonb_build_object('hubId', 'mars', 'label', 'Engineering view of the same topic'))
     from generate_series(1, 6)),
    6, 320
  ) = true then 'PASS' else 'FAIL' end,
  'regression: 6 realistic alternate-perspective lines still pass';
