-- ============================================================
-- LAYER 7 (functional smoke test) — does assert_rate_limit() actually reject
-- once the limit is hit, and re-allow once the window resets?
-- (migration 20260719060000_server_side_rate_limiting.sql)
--
-- HOW TO RUN: paste the whole file into the Supabase SQL editor and Run.
-- Results come back as a RESULT GRID (not notices).
--
-- ✅ SAFE ON PRODUCTION: wrapped in BEGIN … ROLLBACK. Nothing persists.
-- Uses a synthetic action name ('unit_test_action') and a random uuid that
-- doesn't correspond to any real user, so it can never collide with or affect
-- a real user's actual review/entry/report rate limits.
--
-- WHY THIS CAN BE TESTED DIRECTLY (unlike F1's eligibility trigger): this
-- calls assert_rate_limit() itself, not the reviews/archive_entries insert
-- path — so it needs no fixture rows, no FK-satisfying entries, no JWT
-- simulation. It runs as the SQL editor's own role, which still has EXECUTE
-- on this function despite the REVOKE (that revoke only strips it from
-- public/anon/authenticated; the owning/superuser role is unaffected).
-- ============================================================

begin;

create temp table _rl_results (seq int, test text, status text, detail text) on commit drop;

-- rate_limits.user_id has a foreign key to users_profile(id) (discovered via
-- this very test failing on it -- the earlier pg_constraint check that would
-- have caught this was requested but its output was never returned/reviewed
-- before writing the migration). A gen_random_uuid() with no matching profile
-- row fails at the FK before the rate-limit logic ever runs. Every REAL call
-- site is unaffected (reviewer_id/submitted_by/the segment_reports lookup are
-- all guaranteed-real profile ids already) -- this fixture row exists only so
-- THIS test can satisfy the same constraint production traffic always does.
insert into public.users_profile (id, clerk_id, username, email, points, role)
values ('00000000-0000-4000-8000-00000000f00d', 'clerk_test_ratelimit', 'test_ratelimit_user', 'rl@test.local', 0, 'student');

do $$
declare
  test_user constant uuid := '00000000-0000-4000-8000-00000000f00d';
  i int;
  v_ok boolean;
  v_err text;
begin
  -- ── TEST 1: first 3 calls within a max-of-3 limit all succeed ───────────
  begin
    for i in 1..3 loop
      perform public.assert_rate_limit(test_user, 'unit_test_action', 3, interval '1 hour');
    end loop;
    v_ok := true; v_err := '';
  exception when others then
    v_ok := false; v_err := sqlerrm;
  end;
  insert into _rl_results values (1, '3 calls within a max-of-3 limit all succeed',
    case when v_ok then 'PASS' else 'FAIL — LEGITIMATE CALLS BLOCKED' end, v_err);

  -- ── TEST 2: the 4th call in the same window is rejected ─────────────────
  begin
    perform public.assert_rate_limit(test_user, 'unit_test_action', 3, interval '1 hour');
    v_ok := false; v_err := '4th call was allowed -- limit not enforced';
  exception when others then
    v_ok := true; v_err := left(sqlerrm, 120);
  end;
  insert into _rl_results values (2, '4th call over the limit is rejected',
    case when v_ok then 'PASS' else 'FAIL — LIMIT NOT ENFORCED' end, v_err);

  -- ── TEST 3: still blocked on a 5th immediate attempt (cooldown holds) ───
  begin
    perform public.assert_rate_limit(test_user, 'unit_test_action', 3, interval '1 hour');
    v_ok := false; v_err := '5th call was allowed -- cooldown not holding';
  exception when others then
    v_ok := true; v_err := left(sqlerrm, 120);
  end;
  insert into _rl_results values (3, 'still blocked on next attempt (blocked_until cooldown holds)',
    case when v_ok then 'PASS' else 'FAIL — COOLDOWN NOT HOLDING' end, v_err);

  -- ── TEST 4: a DIFFERENT action for the SAME user is not affected ────────
  begin
    perform public.assert_rate_limit(test_user, 'unit_test_action_2', 3, interval '1 hour');
    v_ok := true; v_err := '';
  exception when others then
    v_ok := false; v_err := sqlerrm;
  end;
  insert into _rl_results values (4, 'a different action for the same user is unaffected',
    case when v_ok then 'PASS' else 'FAIL — CROSS-ACTION LEAKAGE' end, v_err);

  -- ── TEST 5: window reset -- simulate time passing by rewriting window_start
  -- into the past (this is what "the window naturally expires" looks like;
  -- we fast-forward it here instead of waiting an hour for real).
  update public.rate_limits
    set window_start = now() - interval '2 hours', blocked_until = null
    where user_id = test_user and action = 'unit_test_action';

  begin
    perform public.assert_rate_limit(test_user, 'unit_test_action', 3, interval '1 hour');
    v_ok := true; v_err := '';
  exception when others then
    v_ok := false; v_err := sqlerrm;
  end;
  insert into _rl_results values (5, 'after window expiry, a fresh request succeeds (window resets)',
    case when v_ok then 'PASS' else 'FAIL — WINDOW DID NOT RESET' end, v_err);

  -- ── TEST 6: exactly one live row per (user, action) -- reused, not accumulated
  insert into _rl_results values (6, 'exactly one row per (user, action) -- no row growth',
    case when (
      select count(*) from public.rate_limits
      where user_id = test_user and action = 'unit_test_action'
    ) = 1 then 'PASS' else 'FAIL — ROW ACCUMULATING PER WINDOW' end,
    format('row_count=%s', (select count(*) from public.rate_limits
                             where user_id = test_user and action = 'unit_test_action')));
end;
$$;

select seq, test, status, detail from _rl_results order by seq;

rollback;   -- MANDATORY: discards every synthetic row and counter change above
