-- ============================================================
-- LAYER 7 — regression tests for the review point-farming fix
-- (migration 20260719050000_fix_review_point_farming.sql)
--
-- HOW TO RUN: paste this whole file into the Supabase SQL editor and Run.
-- Results come back as a RESULT GRID (not notices), one row per test.
--
-- ✅ SAFE ON PRODUCTION: everything runs inside BEGIN … ROLLBACK. No fixture,
--    review, point change, or promotion survives. The final ROLLBACK is
--    MANDATORY — never change it to COMMIT.
--
-- WHAT IT PROVES: the DATABASE itself rejects ineligible reviews, independent
-- of the frontend. Real authenticated callers are simulated via RLS's JWT claim
-- (`request.jwt.claims`), which is what auth.jwt() reads — the same RLS
-- simulation technique used to verify this project's earlier policy work.
--
-- EXPECTED: every row reads PASS. Any FAIL means the fix is not effective.
-- ============================================================

begin;

create temp table _test_results (
  seq    int,
  test   text,
  status text,
  detail text
) on commit drop;

-- Made explicit here (not left to the editor's auto-injected "Run with RLS")
-- so this file is self-contained and reproducible on any re-run. RLS on this
-- session-private, rolled-back scratch table has no real security benefit
-- (see header) -- this exists ONLY because the script switches to the
-- `authenticated` role below to simulate the attacker, and every subsequent
-- statement -- including writes to THIS table -- then runs as that role.
-- `authenticated` doesn't own this table and starts with zero privilege on
-- it, independent of RLS, so both an explicit GRANT and a permissive policy
-- are required or every insert into _test_results fails with 42501.
alter table _test_results enable row level security;
grant select, insert on _test_results to authenticated;
create policy _test_results_test_write on _test_results
  for all to authenticated using (true) with check (true);

-- ── fixtures (created as the editor's superuser role, before we downgrade) ──
insert into public.users_profile (id, clerk_id, username, email, points, role) values
  ('00000000-0000-4000-8000-00000000a11c', 'clerk_test_attacker', 'test_attacker', 'a@test.local', 0, 'student'),
  ('00000000-0000-4000-8000-00000000b0b0', 'clerk_test_author',   'test_author',   'b@test.local', 0, 'student');

-- One entry per lifecycle state (all authored by AUTHOR), plus one owned by
-- ATTACKER to exercise the self-review guard. All ids are valid hex UUIDs.
--
-- coord_x/coord_y are EXPLICIT and distinct: production enforces a unique
-- index on (planet_id, coord_x, coord_y) -- `idx_archive_entries_unique_base_topic`
-- -- that is in NO repo .sql file (another repo-vs-prod drift instance found
-- while running this test). Every fixture row below defaulted to (0,0) and
-- collided both with each other and with real seeded content at that cell.
-- Large negative sentinels keep these test rows far outside any real grid
-- range (grids are positive, ~3840x2160) so they can never collide.
insert into public.archive_entries
  (id, title, planet_id, layer, status, submitted_by, is_draft, deleted_at, coord_x, coord_y) values
  ('00000000-0000-4000-8000-0000000000e1', 'pending entry',  'earth', 4, 'pending',  '00000000-0000-4000-8000-00000000b0b0', false, null,   -999901, -999901),
  ('00000000-0000-4000-8000-0000000000a1', 'approved entry', 'earth', 4, 'approved', '00000000-0000-4000-8000-00000000b0b0', false, null,   -999902, -999902),
  ('00000000-0000-4000-8000-0000000000e3', 'rejected entry', 'earth', 4, 'rejected', '00000000-0000-4000-8000-00000000b0b0', false, null,   -999903, -999903),
  ('00000000-0000-4000-8000-0000000000d1', 'draft entry',    'earth', 4, 'pending',  '00000000-0000-4000-8000-00000000b0b0', true,  null,   -999904, -999904),
  ('00000000-0000-4000-8000-0000000000e5', 'deleted entry',  'earth', 4, 'pending',  '00000000-0000-4000-8000-00000000b0b0', false, now(), -999905, -999905),
  ('00000000-0000-4000-8000-0000000000e6', 'own entry',      'earth', 4, 'pending',  '00000000-0000-4000-8000-00000000a11c', false, null,   -999906, -999906);

-- Become the ATTACKER for every test below.
set local role authenticated;
set local request.jwt.claims = '{"sub":"clerk_test_attacker"}';

do $$
declare
  ATTACKER constant uuid := '00000000-0000-4000-8000-00000000a11c';
  PENDING  constant uuid := '00000000-0000-4000-8000-0000000000e1';
  v_before  integer;
  v_after   integer;
  v_ok      boolean;
  v_err     text;
  v_count   integer;
  v_role    text;
  v_thresh  integer;
  c         record;
begin
  select points into v_before from public.users_profile where id = ATTACKER;

  -- ── TEST 1: the LEGITIMATE path must still work (no regression) ──────────
  begin
    insert into public.reviews (entry_id, reviewer_id, fact_check_pass, difficulty, notes)
    values (PENDING, ATTACKER, true, 3, 'legitimate review');
    v_ok := true; v_err := '';
  exception when others then
    v_ok := false; v_err := sqlerrm;
  end;
  insert into _test_results values (1, 'pending entry review SUCCEEDS (legit flow intact)',
    case when v_ok then 'PASS' else 'FAIL — LEGITIMATE REVIEW BLOCKED' end, v_err);

  -- ── TESTS 2-7: every ineligible target must be REJECTED ──────────────────
  for c in
    select * from (values
      (2, 'approved entry rejected',    '00000000-0000-4000-8000-0000000000a1'::uuid),
      (3, 'rejected entry rejected',    '00000000-0000-4000-8000-0000000000e3'::uuid),
      (4, 'draft entry rejected',       '00000000-0000-4000-8000-0000000000d1'::uuid),
      (5, 'soft-deleted entry rejected','00000000-0000-4000-8000-0000000000e5'::uuid),
      (6, 'self-review rejected',       '00000000-0000-4000-8000-0000000000e6'::uuid),
      (7, 'nonexistent entry rejected', '00000000-0000-4000-8000-00000000dead'::uuid)
    ) as t(seq, label, entry_id)
  loop
    begin
      insert into public.reviews (entry_id, reviewer_id, fact_check_pass, difficulty, notes)
      values (c.entry_id, ATTACKER, true, 3, 'farming attempt');
      v_ok := false; v_err := 'INSERT SUCCEEDED — this must not happen';
    exception when others then
      v_ok := true;  v_err := left(sqlerrm, 120);
    end;
    insert into _test_results values (c.seq, c.label,
      case when v_ok then 'PASS' else 'FAIL — INSERT WAS ALLOWED' end, v_err);
  end loop;

  -- ── TEST 8: duplicate / replay of the SAME valid review is rejected ──────
  begin
    insert into public.reviews (entry_id, reviewer_id, fact_check_pass, difficulty, notes)
    values (PENDING, ATTACKER, true, 3, 'duplicate replay');
    v_ok := false; v_err := 'duplicate accepted';
  exception when others then
    v_ok := true;  v_err := left(sqlerrm, 120);
  end;
  insert into _test_results values (8, 'duplicate review rejected (replay protection)',
    case when v_ok then 'PASS' else 'FAIL — DUPLICATE ALLOWED' end, v_err);

  -- ── TEST 9: the original farming loop banks nothing ──────────────────────
  v_count := 0;
  for c in
    select id from public.archive_entries
    where status = 'approved' and submitted_by is distinct from ATTACKER
    limit 25
  loop
    begin
      insert into public.reviews (entry_id, reviewer_id, fact_check_pass, difficulty, notes)
      values (c.id, ATTACKER, true, 3, 'farm');
      v_count := v_count + 1;
    exception when others then null;   -- expected: all rejected
    end;
  end loop;
  select points into v_after from public.users_profile where id = ATTACKER;
  insert into _test_results values (9, 'farming loop over approved entries banks nothing',
    case when v_count = 0 then 'PASS' else 'FAIL — FARMING STILL POSSIBLE' end,
    format('rows_inserted=%s points_delta=%s', v_count, v_after - v_before));

  -- ── TEST 10: points moved ONLY for the single legitimate review ──────────
  -- (+85 expected if the consensus trigger is attached; 0 if it is not. Either
  --  way the invalid attempts above must contribute nothing.)
  insert into _test_results values (10, 'points awarded only for the valid review',
    case when (v_after - v_before) in (0, 85) then 'PASS' else 'FAIL — UNEXPECTED POINT GAIN' end,
    format('before=%s after=%s delta=%s (expect 0 or 85)', v_before, v_after, v_after - v_before));

  -- ── TEST 11: promotion cannot be reached by farming ──────────────────────
  select role, points into v_role, v_after from public.users_profile where id = ATTACKER;
  select coalesce(nullif(value, '')::int, 2500) into v_thresh
    from public.app_settings where key = 'reviewer_points_threshold';
  insert into _test_results values (11, 'attacker NOT auto-promoted to reviewer',
    case when v_role = 'student' and v_after < coalesce(v_thresh, 2500) then 'PASS' else 'FAIL' end,
    format('role=%s points=%s threshold=%s', v_role, v_after, v_thresh));
end;
$$;

-- Results grid.
select seq, test, status, detail from _test_results order by seq;

-- ============================================================
-- TEST 12 — CONCURRENCY: UNVERIFIED by this script (single session cannot
-- simulate two simultaneous transactions). Migration 20260719050000 guards it
-- with `select … for update` on the target entry inside
-- enforce_review_eligibility(), serializing concurrent inserts per entry_id.
-- To verify for real, open TWO SQL editor tabs:
--   tab A:  begin;
--           insert into public.reviews (entry_id, reviewer_id, fact_check_pass, difficulty)
--           values ('<same pending entry>', '<reviewer A>', true, 3);
--           -- leave open, do NOT commit
--   tab B:  same insert with '<reviewer B>'  → must BLOCK until A commits/rolls back
-- If tab B returns immediately, the lock is not doing its job.
-- ============================================================

rollback;   -- MANDATORY: discards every fixture, review and point change above
