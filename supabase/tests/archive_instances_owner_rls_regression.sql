-- ============================================================
-- Regression tests — archive_instances owner-scoped RLS
-- (migration 20260721020000)
--
-- HOW TO RUN: paste into Supabase SQL editor. Results = one row per test.
-- SAFE ON PRODUCTION: BEGIN … ROLLBACK — nothing persists.
--
-- EXPECTED: every row reads PASS.
-- ============================================================

begin;

create temp table _test_results (
  seq    int,
  test   text,
  status text,
  detail text
) on commit drop;

alter table _test_results enable row level security;
grant select, insert on _test_results to authenticated;
create policy _test_results_test_write on _test_results
  for all to authenticated using (true) with check (true);

insert into public.users_profile (id, clerk_id, username, email, points, role) values
  ('00000000-0000-4000-8000-00000000aa01', 'clerk_test_owner_a', 'test_owner_a', 'a@test.local', 0, 'student'),
  ('00000000-0000-4000-8000-00000000bb02', 'clerk_test_owner_b', 'test_owner_b', 'b@test.local', 0, 'student');

-- Owner A's instance
insert into public.archive_instances
  (hub_id, grid_width, grid_height, instance_title, owner_id, updated_at)
values
  ('test-hub-a', 3840, 2160, 'A Archive', '00000000-0000-4000-8000-00000000aa01', now());

-- Orphan row (owner_id null) — seeded as superuser before RLS simulation
insert into public.archive_instances
  (hub_id, grid_width, grid_height, instance_title, owner_id, updated_at)
values
  ('test-hub-orphan', 3840, 2160, 'orphan', null, now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"clerk_test_owner_b"}';

do $$
declare
  v_ok  boolean;
  v_err text;
begin
  -- TEST 1: User B cannot UPDATE user A's instance (RLS silently affects 0 rows)
  begin
    update public.archive_instances
       set instance_title = 'Hijacked by B'
     where hub_id = 'test-hub-a';
    v_ok := (select instance_title from public.archive_instances where hub_id = 'test-hub-a') = 'A Archive';
    v_err := '';
  exception when others then
    v_ok := true;
    v_err := left(sqlerrm, 120);
  end;
  insert into _test_results values (1, 'user B cannot update user A instance',
    case when v_ok then 'PASS' else 'FAIL — CROSS-USER UPDATE ALLOWED' end, v_err);

  -- TEST 2: User B cannot INSERT with owner_id = A
  begin
    insert into public.archive_instances
      (hub_id, grid_width, grid_height, instance_title, owner_id, updated_at)
    values ('test-hub-b', 3840, 2160, 'B tries A id', '00000000-0000-4000-8000-00000000aa01', now());
    v_ok := false;
    v_err := 'INSERT with foreign owner_id succeeded';
  exception when others then
    v_ok := true;
    v_err := left(sqlerrm, 120);
  end;
  insert into _test_results values (2, 'user B cannot insert with owner_id = A',
    case when v_ok then 'PASS' else 'FAIL' end, v_err);

  -- TEST 3: User B CAN insert own instance
  begin
    insert into public.archive_instances
      (hub_id, grid_width, grid_height, instance_title, owner_id, updated_at)
    values ('test-hub-b', 3840, 2160, 'B Archive', '00000000-0000-4000-8000-00000000bb02', now());
    v_ok := true;
    v_err := '';
  exception when others then
    v_ok := false;
    v_err := sqlerrm;
  end;
  insert into _test_results values (3, 'user B can insert own instance',
    case when v_ok then 'PASS' else 'FAIL' end, v_err);

  -- TEST 4: User B CAN claim orphan row (owner_id IS NULL)
  begin
    update public.archive_instances
       set instance_title = 'Claimed by B',
           owner_id = '00000000-0000-4000-8000-00000000bb02'
     where hub_id = 'test-hub-orphan';
    v_ok := (select instance_title from public.archive_instances where hub_id = 'test-hub-orphan') = 'Claimed by B';
    v_err := '';
  exception when others then
    v_ok := false;
    v_err := sqlerrm;
  end;
  insert into _test_results values (4, 'user B can claim orphan instance (owner_id null)',
    case when v_ok then 'PASS' else 'FAIL' end, v_err);
end;
$$;

select seq, test, status, detail from _test_results order by seq;

rollback;
