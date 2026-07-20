-- ============================================================
-- LAYER 7 (F2, final) — functional verification of the LIVE, AUTHORITATIVE
-- enforce_rate_limit() implementation, exercised through the REAL
-- production code path: an actual client-shaped INSERT into
-- segment_reports / archive_entries / reviews -> the real BEFORE INSERT
-- trigger -> rl_*_insert() -> enforce_rate_limit(). Nothing here calls
-- enforce_rate_limit() directly -- every check goes through the same
-- surface a real signed-in user's request would.
--
-- Supersedes rate_limit_functional_check.sql (tested assert_rate_limit(),
-- retired by migration 20260719080000).
--
-- ✅ SAFE ON PRODUCTION: everything runs inside BEGIN … ROLLBACK. Nothing
-- persists -- not the fixture profiles/entries, not the real inserts this
-- test makes into segment_reports/archive_entries/reviews, not the
-- rate_limits counters, and not the app_settings override below (an UPDATE/
-- INSERT to a shared table is only visible to THIS uncommitted transaction;
-- concurrent readers see the pre-test values via normal MVCC until/unless
-- this commits, which it never does).
--
-- WHY app_settings IS TEMPORARILY OVERRIDDEN (still a REAL code path, not a
-- mock): enforce_rate_limit() reads its max/window from app_settings with a
-- hardcoded fallback (10, or 50 for reviews_insert). Rather than adapt this
-- test's loop counts to whatever may or may not already be configured live,
-- this sets rl_<action>_max=3 / _window_min=60 for all three actions,
-- transaction-locally, before testing. The function does not know or care
-- who set that value or why -- reading it dynamically from app_settings is
-- its actual, real behavior; this is a legitimate exercise of that
-- mechanism, not a substitute for it.
--
-- SELF-CALIBRATING BY DESIGN (post-critical-review fix): nothing below
-- hardcodes "3". After attempting the override, the script reads back
-- whatever enforce_rate_limit() would ACTUALLY use right now (the same
-- coalesce-with-fallback it runs internally) and calibrates every loop count
-- and "expected" assertion to that discovered value. If the override
-- silently failed for a reason its own exception handler didn't catch, the
-- suite still tests the REAL effective threshold (10) correctly, instead of
-- producing a misleading "PASS" (test 3) or a wrongly-diagnosed "FAIL --
-- LIMIT NOT ENFORCED" (test 4) against a threshold that was never actually
-- active. Same reasoning applied to the admin-bypass test (14): it always
-- sends effective_max + 5 requests, never a hardcoded number that could
-- accidentally sit UNDER the real threshold and produce a false "bypass
-- works" pass.
--
-- GRACEFUL DEGRADATION: the archive_entries/reviews per-action tests (6-9)
-- need a free, in-bounds coordinate near earth's grid corner. If none is
-- found after 40 attempts (this does not raise uncaught -- an earlier
-- version of this script did, which would have aborted the whole script with
-- a raw error and NO results grid at all), those four tests report SKIPPED
-- with a clear reason instead, and everything else still runs and reports
-- normally.
--
-- WHAT THIS DOES NOT PROVE: true concurrent contention (two simultaneous
-- transactions racing on the same first-ever request for a (user, action)
-- pair) cannot be exercised from one SQL session. The advisory lock's
-- correctness under that scenario remains structurally unverified here, same
-- caveat as F1's row-lock (TEST 12 in review_eligibility_regression.sql).
-- What THIS script does prove: every sequential real-insert operation below
-- completes correctly with no hang, no deadlock, no unexpected error -- which
-- is the strongest evidence single-session testing CAN offer that the lock
-- doesn't break normal (non-concurrent) operation.
-- ============================================================

begin;

create temp table _rl2_results (seq int, test text, status text, detail text) on commit drop;

-- ── TEST 0: preflight -- confirm the assumed segment_reports shape is real ──
-- Run as the OWNER role (bypasses RLS entirely and the rate-limit trigger's
-- own anon/authenticated gate, since owner is neither) -- success/failure
-- here is PURELY about whether this column list matches the live table,
-- decoupled from every RLS/rate-limit question the rest of this script asks.
-- Shape mirrors src/utils/segmentReports.js's appendSegmentReport() payload
-- exactly -- the actual, currently-working production write path.
do $$
begin
  insert into segment_reports
    (planet, coord_x, coord_y, archive_layer, segment_index, segment_label,
     excerpt_at_open, subject, summary, detail, author_username, attachments)
  values
    ('earth', '0', '0', '4', 'preflight', 'rl2 preflight', '', 'preflight', 'preflight', 'preflight',
     'rl2_preflight', '[]'::jsonb);
  insert into _rl2_results values (0,
    'preflight: assumed segment_reports column shape matches the live table',
    'PASS', 'insert succeeded with the exact appendSegmentReport() field set');
exception when others then
  insert into _rl2_results values (0,
    'preflight: assumed segment_reports column shape matches the live table',
    'FAIL -- STOP, DISREGARD EVERY RESULT BELOW', sqlerrm);
end $$;

-- ── Fixtures ─────────────────────────────────────────────────────────────
-- Two ordinary members (A, B) for isolation tests, one admin for the bypass
-- test, one author whose entry gets reviewed for the reviews_insert check.
insert into public.users_profile (id, clerk_id, username, email, points, role) values
  ('00000000-0000-4000-9000-0000000000a1', 'clerk_rl2_usera',  'rl2_user_a',  'rl2a@test.local',  0, 'student'),
  ('00000000-0000-4000-9000-0000000000a2', 'clerk_rl2_userb',  'rl2_user_b',  'rl2b@test.local',  0, 'student'),
  ('00000000-0000-4000-9000-0000000000ad', 'clerk_rl2_admin',  'rl2_admin',   'rl2ad@test.local', 0, 'admin'),
  ('00000000-0000-4000-9000-0000000000af', 'clerk_rl2_author', 'rl2_author',  'rl2au@test.local', 0, 'student');

-- ── TEST 1: transaction-local threshold override attempt ────────────────
do $$
declare
  k text;
  keys text[] := array[
    'rl_segment_reports_insert_max','rl_segment_reports_insert_window_min',
    'rl_archive_entries_insert_max','rl_archive_entries_insert_window_min',
    'rl_reviews_insert_max','rl_reviews_insert_window_min'
  ];
  vals text[] := array['3','60','3','60','3','60'];
  i int;
begin
  for i in 1..array_length(keys,1) loop
    k := keys[i];
    if exists (select 1 from app_settings where key = k) then
      update app_settings set value = vals[i] where key = k;
    else
      insert into app_settings (key, value) values (k, vals[i]);
    end if;
  end loop;
  insert into _rl2_results values (1,
    'transaction-local override attempt: max=3 / window=60min for all 3 actions',
    'INFO', 'invisible outside this rolled-back transaction; real app_settings lookup mechanism, not a mock');
exception when others then
  insert into _rl2_results values (1,
    'transaction-local override attempt: max=3 / window=60min for all 3 actions',
    'FAIL -- app_settings shape assumption (key,value columns) is wrong', sqlerrm);
end $$;

-- ── TEST 2: read back the ACTUAL effective threshold (self-calibrating) ──
-- Do NOT hardcode "3" downstream: if TEST 1 silently failed for a reason its
-- own handler didn't catch, enforce_rate_limit() falls back to its real
-- default (10). Mirroring that EXACT coalesce here means every test below
-- is correctly interpreted either way.
do $$
declare v_max int;
begin
  v_max := coalesce((select nullif(value,'')::int from app_settings where key = 'rl_segment_reports_insert_max'), 10);
  perform set_config('rl2.seg_max_effective', v_max::text, true);
  insert into _rl2_results values (2,
    'effective segment_reports_insert threshold as enforce_rate_limit() would read it right now',
    'INFO', format('effective_max=%s (3 if TEST 1''s override took effect, 10 if it silently fell back)', v_max));
end $$;

-- ── TEST 3/4/5: threshold enforcement, exact boundary, via REAL inserts ──
-- Loop bound and all "expected" values below use the discovered
-- effective_max, not a literal, so this section is correct regardless of
-- whether TEST 1's override actually took effect.
set local role authenticated;
set local request.jwt.claims = '{"sub":"clerk_rl2_usera"}';

do $$
declare
  i int;
  v_max int := current_setting('rl2.seg_max_effective')::int;
  v_success_count int := 0;
begin
  for i in 1..v_max loop
    begin
      insert into segment_reports
        (planet, coord_x, coord_y, archive_layer, segment_index, segment_label,
         excerpt_at_open, subject, summary, detail, author_username, attachments)
      values
        ('earth', '0', '0', '4', 'userA-' || i::text, 'rl2 threshold test', '', 'x', 'x', 'x',
         'rl2_user_a', '[]'::jsonb);
      v_success_count := v_success_count + 1;
    exception when others then
      null;
    end;
  end loop;
  perform set_config('rl2.userA_within_limit', v_success_count::text, true);
end $$;

reset role;

insert into _rl2_results
select 3, format('%s sequential segment_reports inserts within the effective max all succeed', current_setting('rl2.seg_max_effective')),
  case when current_setting('rl2.userA_within_limit')::int = current_setting('rl2.seg_max_effective')::int then 'PASS' else 'FAIL' end,
  format('succeeded=%s expected=%s', current_setting('rl2.userA_within_limit'), current_setting('rl2.seg_max_effective'));

set local role authenticated;
set local request.jwt.claims = '{"sub":"clerk_rl2_usera"}';

do $$
declare v_ok boolean := false; v_err text := '';
begin
  begin
    insert into segment_reports
      (planet, coord_x, coord_y, archive_layer, segment_index, segment_label,
       excerpt_at_open, subject, summary, detail, author_username, attachments)
    values
      ('earth', '0', '0', '4', 'userA-over-limit', 'rl2 over limit', '', 'x', 'x', 'x',
       'rl2_user_a', '[]'::jsonb);
  exception when others then
    v_ok := true; v_err := left(sqlerrm, 150);
  end;
  perform set_config('rl2.userA_over_limit_rejected', v_ok::text, true);
  perform set_config('rl2.userA_over_limit_err', v_err, true);
end $$;

reset role;

insert into _rl2_results
select 4, format('request #%s (one over the effective max of %s) is rejected', current_setting('rl2.seg_max_effective')::int + 1, current_setting('rl2.seg_max_effective')),
  case when current_setting('rl2.userA_over_limit_rejected')::boolean then 'PASS' else 'FAIL -- LIMIT NOT ENFORCED' end,
  current_setting('rl2.userA_over_limit_err');

insert into _rl2_results
select 5, 'rejected attempt did not increment the counter past the effective max',
  case when (select request_count from rate_limits
             where user_id = '00000000-0000-4000-9000-0000000000a1' and action = 'segment_reports_insert') = current_setting('rl2.seg_max_effective')::int
       then 'PASS' else 'FAIL' end,
  format('request_count=%s expected=%s',
    (select request_count from rate_limits
     where user_id = '00000000-0000-4000-9000-0000000000a1' and action = 'segment_reports_insert'),
    current_setting('rl2.seg_max_effective'));

-- ── TEST 6/7: per-action isolation (archive_entries_insert) ──────────────
-- User A is currently exhausted on segment_reports_insert. Find two
-- guaranteed-free, in-bounds coordinates (trg_validate_archive_entry_coords
-- and idx_archive_entries_unique_base_topic both apply live) near earth's
-- grid corner -- one for this test, one for the reviews-fixture entry below.
-- Does NOT raise uncaught on failure (see header) -- sets rl2.coords_ok
-- instead, which tests 6-9 check before attempting anything.
do $$
declare
  v_gw int; v_gh int; v_halfw int; v_halfh int;
  v_cx1 int; v_cy1 int; v_cx2 int; v_cy2 int;
  i int; v_found1 boolean := false; v_found2 boolean := false;
  v_ok boolean := false;
begin
  begin
    select grid_width, grid_height into v_gw, v_gh from planets where id = 'earth';
    v_halfw := floor(v_gw / 2);
    v_halfh := floor(v_gh / 2);

    for i in 0..40 loop
      if not v_found1 then
        v_cx1 := v_halfw - i; v_cy1 := v_halfh - i;
        if not exists (select 1 from archive_entries where planet_id = 'earth'
          and coord_x = v_cx1 and coord_y = v_cy1 and updates_entry_id is null
          and status in ('pending','approved') and deleted_at is null and is_draft = false)
        then v_found1 := true; end if;
      elsif not v_found2 then
        v_cx2 := v_halfw - i; v_cy2 := v_halfh - i;
        if not exists (select 1 from archive_entries where planet_id = 'earth'
          and coord_x = v_cx2 and coord_y = v_cy2 and updates_entry_id is null
          and status in ('pending','approved') and deleted_at is null and is_draft = false)
        then v_found2 := true; exit; end if;
      end if;
    end loop;

    if v_found1 and v_found2 then
      v_ok := true;
      perform set_config('rl2.ae_test_cx', v_cx1::text, true);
      perform set_config('rl2.ae_test_cy', v_cy1::text, true);
      perform set_config('rl2.rev_fixture_cx', v_cx2::text, true);
      perform set_config('rl2.rev_fixture_cy', v_cy2::text, true);
    end if;
  exception when others then
    v_ok := false;
  end;

  perform set_config('rl2.coords_ok', v_ok::text, true);
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"clerk_rl2_usera"}';

do $$
declare v_ok boolean := false; v_err text := '';
begin
  if current_setting('rl2.coords_ok')::boolean then
    begin
      insert into archive_entries (title, planet_id, layer, status, submitted_by, coord_x, coord_y)
      values ('rl2 per-action isolation entry', 'earth', 4, 'pending',
              '00000000-0000-4000-9000-0000000000a1',
              current_setting('rl2.ae_test_cx')::int, current_setting('rl2.ae_test_cy')::int);
      v_ok := true;
    exception when others then
      v_err := left(sqlerrm, 150);
    end;
  end if;
  perform set_config('rl2.userA_ae_ok', v_ok::text, true);
  perform set_config('rl2.userA_ae_err', v_err, true);
end $$;

reset role;

insert into _rl2_results
select 6, 'per-action isolation: user A (exhausted on segment_reports_insert) still succeeds on archive_entries_insert',
  case
    when not current_setting('rl2.coords_ok')::boolean then 'SKIPPED'
    when current_setting('rl2.userA_ae_ok')::boolean then 'PASS'
    else 'FAIL -- CROSS-ACTION LEAKAGE OR UNEXPECTED REJECTION'
  end,
  case when not current_setting('rl2.coords_ok')::boolean
    then 'no free in-bounds coordinate found near earth''s grid corner after 40 attempts -- unrelated to rate-limiting correctness'
    else current_setting('rl2.userA_ae_err') end;

insert into _rl2_results
select 7, 'archive_entries_insert has its own isolated counter (=1) for user A',
  case
    when not current_setting('rl2.coords_ok')::boolean then 'SKIPPED'
    when (select request_count from rate_limits
          where user_id = '00000000-0000-4000-9000-0000000000a1' and action = 'archive_entries_insert') = 1
    then 'PASS' else 'FAIL'
  end,
  case when not current_setting('rl2.coords_ok')::boolean then 'see test 6'
    else format('request_count=%s',
      (select request_count from rate_limits
       where user_id = '00000000-0000-4000-9000-0000000000a1' and action = 'archive_entries_insert'))
  end;

-- ── TEST 8/9: per-action isolation (reviews_insert) ───────────────────────
do $$
begin
  if current_setting('rl2.coords_ok')::boolean then
    insert into archive_entries (id, title, planet_id, layer, status, submitted_by, coord_x, coord_y)
    values ('00000000-0000-4000-9000-00000000fee1', 'rl2 review-fixture entry', 'earth', 4, 'pending',
            '00000000-0000-4000-9000-0000000000af',
            current_setting('rl2.rev_fixture_cx')::int, current_setting('rl2.rev_fixture_cy')::int);
  end if;
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"clerk_rl2_usera"}';

do $$
declare v_ok boolean := false; v_err text := '';
begin
  if current_setting('rl2.coords_ok')::boolean then
    begin
      insert into reviews (entry_id, reviewer_id, fact_check_pass, difficulty, notes)
      values ('00000000-0000-4000-9000-00000000fee1', '00000000-0000-4000-9000-0000000000a1',
              true, 3, 'rl2 wiring-proof review');
      v_ok := true;
    exception when others then
      v_err := left(sqlerrm, 150);
    end;
  end if;
  perform set_config('rl2.userA_rev_ok', v_ok::text, true);
  perform set_config('rl2.userA_rev_err', v_err, true);
end $$;

reset role;

insert into _rl2_results
select 8, 'per-action isolation: user A also succeeds on reviews_insert (3rd independent action)',
  case
    when not current_setting('rl2.coords_ok')::boolean then 'SKIPPED'
    when current_setting('rl2.userA_rev_ok')::boolean then 'PASS' else 'FAIL'
  end,
  case when not current_setting('rl2.coords_ok')::boolean then 'see test 6 (no fixture entry created)'
    else current_setting('rl2.userA_rev_err') end;

insert into _rl2_results
select 9, 'reviews_insert has its own isolated counter (=1) for user A',
  case
    when not current_setting('rl2.coords_ok')::boolean then 'SKIPPED'
    when (select request_count from rate_limits
          where user_id = '00000000-0000-4000-9000-0000000000a1' and action = 'reviews_insert') = 1
    then 'PASS' else 'FAIL'
  end,
  case when not current_setting('rl2.coords_ok')::boolean then 'see test 6'
    else format('request_count=%s',
      (select request_count from rate_limits
       where user_id = '00000000-0000-4000-9000-0000000000a1' and action = 'reviews_insert'))
  end;

-- ── TEST 10/11: per-user isolation ────────────────────────────────────────
-- User A is still exhausted on segment_reports_insert. User B must be
-- completely unaffected -- proves user_id is genuinely part of the key.
set local role authenticated;
set local request.jwt.claims = '{"sub":"clerk_rl2_userb"}';

do $$
declare v_ok boolean := false; v_err text := '';
begin
  begin
    insert into segment_reports
      (planet, coord_x, coord_y, archive_layer, segment_index, segment_label,
       excerpt_at_open, subject, summary, detail, author_username, attachments)
    values
      ('earth', '0', '0', '4', 'userB-1', 'rl2 per-user isolation', '', 'x', 'x', 'x',
       'rl2_user_b', '[]'::jsonb);
    v_ok := true;
  exception when others then
    v_err := left(sqlerrm, 150);
  end;
  perform set_config('rl2.userB_ok', v_ok::text, true);
  perform set_config('rl2.userB_err', v_err, true);
end $$;

reset role;

insert into _rl2_results values (10,
  'per-user isolation: user B succeeds on segment_reports_insert while user A is exhausted on it',
  case when current_setting('rl2.userB_ok')::boolean then 'PASS'
       else 'FAIL -- USERS SHARE A COUNTER (should be impossible, user_id is part of the key)' end,
  current_setting('rl2.userB_err'));

insert into _rl2_results
select 11, 'user B has an independent counter (=1), separate from user A''s exhausted one',
  case when (select request_count from rate_limits
             where user_id = '00000000-0000-4000-9000-0000000000a2' and action = 'segment_reports_insert') = 1
       then 'PASS' else 'FAIL' end,
  format('userB=%s userA=%s (both segment_reports_insert, both bounded by effective_max=%s)',
    (select request_count from rate_limits where user_id = '00000000-0000-4000-9000-0000000000a2' and action = 'segment_reports_insert'),
    (select request_count from rate_limits where user_id = '00000000-0000-4000-9000-0000000000a1' and action = 'segment_reports_insert'),
    current_setting('rl2.seg_max_effective'));

-- ── TEST 12/13: window reset ──────────────────────────────────────────────
update rate_limits set window_start = now() - interval '2 hours'
where user_id = '00000000-0000-4000-9000-0000000000a1' and action = 'segment_reports_insert';

set local role authenticated;
set local request.jwt.claims = '{"sub":"clerk_rl2_usera"}';

do $$
declare v_ok boolean := false; v_err text := '';
begin
  begin
    insert into segment_reports
      (planet, coord_x, coord_y, archive_layer, segment_index, segment_label,
       excerpt_at_open, subject, summary, detail, author_username, attachments)
    values
      ('earth', '0', '0', '4', 'userA-after-reset', 'rl2 window reset', '', 'x', 'x', 'x',
       'rl2_user_a', '[]'::jsonb);
    v_ok := true;
  exception when others then
    v_err := left(sqlerrm, 150);
  end;
  perform set_config('rl2.userA_after_reset_ok', v_ok::text, true);
  perform set_config('rl2.userA_after_reset_err', v_err, true);
end $$;

reset role;

insert into _rl2_results values (12,
  'after fast-forwarding window_start, user A''s next request succeeds again',
  case when current_setting('rl2.userA_after_reset_ok')::boolean then 'PASS' else 'FAIL -- WINDOW DID NOT RESET' end,
  current_setting('rl2.userA_after_reset_err'));

insert into _rl2_results
select 13, 'window reset: counter resets to 1 (not accumulated on top of the old exhausted count)',
  case when (select request_count from rate_limits
             where user_id = '00000000-0000-4000-9000-0000000000a1' and action = 'segment_reports_insert') = 1
       then 'PASS' else 'FAIL' end,
  format('request_count=%s',
    (select request_count from rate_limits
     where user_id = '00000000-0000-4000-9000-0000000000a1' and action = 'segment_reports_insert'));

-- ── TEST 14/15: admin bypass ───────────────────────────────────────────────
-- Sends effective_max + 5 requests -- NOT a hardcoded number -- so this is
-- guaranteed to exceed whatever the real threshold turns out to be, whether
-- TEST 1's override took effect (3) or silently fell back (10). A hardcoded
-- count here could accidentally sit UNDER a higher real threshold and
-- produce a false "bypass works" pass for the wrong reason.
set local role authenticated;
set local request.jwt.claims = '{"sub":"clerk_rl2_admin"}';

do $$
declare
  i int;
  v_attempts int := current_setting('rl2.seg_max_effective')::int + 5;
  v_success_count int := 0;
begin
  for i in 1..v_attempts loop
    begin
      insert into segment_reports
        (planet, coord_x, coord_y, archive_layer, segment_index, segment_label,
         excerpt_at_open, subject, summary, detail, author_username, attachments)
      values
        ('earth', '0', '0', '4', 'admin-' || i::text, 'rl2 admin bypass', '', 'x', 'x', 'x',
         'rl2_admin', '[]'::jsonb);
      v_success_count := v_success_count + 1;
    exception when others then
      null;
    end;
  end loop;
  perform set_config('rl2.admin_success_count', v_success_count::text, true);
  perform set_config('rl2.admin_attempts', v_attempts::text, true);
end $$;

reset role;

insert into _rl2_results
select 14, format('%s admin inserts (effective_max + 5) ALL succeed', current_setting('rl2.admin_attempts')),
  case when current_setting('rl2.admin_success_count')::int = current_setting('rl2.admin_attempts')::int
       then 'PASS' else 'FAIL -- ADMIN WAS RATE LIMITED' end,
  format('succeeded=%s expected=%s', current_setting('rl2.admin_success_count'), current_setting('rl2.admin_attempts'));

insert into _rl2_results
select 15, 'admin bypass is clean: zero rate_limits rows exist for admin (returns before touching the table)',
  case when not exists (select 1 from rate_limits
                         where user_id = '00000000-0000-4000-9000-0000000000ad' and action = 'segment_reports_insert')
       then 'PASS' else 'FAIL -- ADMIN ACTIVITY WAS RECORDED, BYPASS NOT CLEAN' end,
  format('rows_found=%s',
    (select count(*) from rate_limits
     where user_id = '00000000-0000-4000-9000-0000000000ad' and action = 'segment_reports_insert'));

-- Results grid.
select seq, test, status, detail from _rl2_results order by seq;

rollback;   -- MANDATORY: discards every fixture, override, and inserted row above
