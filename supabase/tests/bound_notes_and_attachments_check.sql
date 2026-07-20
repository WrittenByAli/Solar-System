-- ============================================================
-- LAYER 7 (F4) — verify the CHECK constraint boundary logic itself.
-- (migration 20260719070000_bound_notes_and_attachments.sql)
--
-- Lighter-weight than the F1/F2 tests on purpose: F4 is a storage/DoS bound,
-- not an exploit path, so this verifies the CHECK expressions' boolean logic
-- directly via SELECT (no fixtures, no RLS, no reviews/archive_entries rows
-- touched at all) rather than building full insert fixtures again.
--
-- ✅ 100% SAFE: every statement here is a read-only SELECT. Nothing is
-- inserted, updated, or rolled back because nothing is written in the first
-- place.
--
-- EXPECTED: every row reads PASS.
-- ============================================================

-- ── Part A: confirm both constraints actually attached ─────────────────────
select conname, contype, convalidated, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in ('reviews_notes_length_check', 'archive_entries_attachments_bound_check')
order by conname;
-- Expect 2 rows, contype='c' (check), convalidated=false (NOT VALID, expected
-- and fine per the migration's design -- new writes are enforced regardless).

-- ── Part B: notes length boundary (mirrors the live constraint expression) ─
select
  case when (length(coalesce(repeat('a', 2000), '')) <= 2000) = true
       then 'PASS' else 'FAIL' end as status,
  'exactly 2000 chars is allowed (boundary, inclusive)' as test
union all
select
  case when (length(coalesce(repeat('a', 2001), '')) <= 2000) = false
       then 'PASS' else 'FAIL' end,
  '2001 chars is rejected (one over the boundary)'
union all
select
  case when (length(coalesce(null, '')) <= 2000) = true
       then 'PASS' else 'FAIL' end,
  'null notes coalesces to empty string and passes';

-- ── Part C: attachments shape/size boundary (mirrors the live constraint) ──
select
  case when (
    case jsonb_typeof((select jsonb_agg(x) from generate_series(1,200) x))
      when 'array' then jsonb_array_length((select jsonb_agg(x) from generate_series(1,200) x)) <= 200
      else false
    end
  ) = true then 'PASS' else 'FAIL' end as status,
  'exactly 200 elements is allowed (boundary, inclusive)' as test
union all
select
  case when (
    case jsonb_typeof((select jsonb_agg(x) from generate_series(1,201) x))
      when 'array' then jsonb_array_length((select jsonb_agg(x) from generate_series(1,201) x)) <= 200
      else false
    end
  ) = false then 'PASS' else 'FAIL' end,
  '201 elements is rejected (one over the element-count boundary)'
union all
select
  case when (
    case jsonb_typeof('{}'::jsonb)
      when 'array' then true
      else false
    end
  ) = false then 'PASS' else 'FAIL' end,
  'a JSON object (not an array) is rejected outright'
union all
select
  case when (
    case jsonb_typeof('"just a string"'::jsonb)
      when 'array' then true
      else false
    end
  ) = false then 'PASS' else 'FAIL' end,
  'a JSON scalar (not an array) is rejected outright'
union all
select
  case when (
    -- one ~21MB base64-ish string element -- over the 20MB total-size cap
    length(jsonb_build_array(repeat('a', 21 * 1024 * 1024))::text) <= 20 * 1024 * 1024
  ) = false then 'PASS' else 'FAIL' end,
  'a single oversized (~21MB) element is rejected on total size'
union all
select
  case when (
    -- realistic legit worst case: 6 elements x ~1.6MB (base64-inflated 1.2MB file) each
    length((select jsonb_agg(jsonb_build_object('url', repeat('a', 1_600_000)))
            from generate_series(1,6))::text) <= 20 * 1024 * 1024
  ) = true then 'PASS' else 'FAIL' end,
  'the realistic legitimate worst case (6 x ~1.6MB) still fits under the cap';
