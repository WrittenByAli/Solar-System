-- ============================================================
-- Regression tests — deepen additive-only merge (migration 20260721010000)
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

-- Fixtures: base author (A), deepen author (B), three reviewers (R1-R3)
insert into public.users_profile (id, clerk_id, username, email, points, role) values
  ('00000000-0000-4000-8000-00000000aa01', 'clerk_test_base_author',   'test_base_author',   'base@test.local', 0, 'student'),
  ('00000000-0000-4000-8000-00000000bb02', 'clerk_test_deepen_author', 'test_deepen_author', 'deep@test.local', 0, 'student'),
  ('00000000-0000-4000-8000-00000000c001', 'clerk_test_reviewer_1',    'test_reviewer_1',    'r1@test.local',   0, 'student'),
  ('00000000-0000-4000-8000-00000000c002', 'clerk_test_reviewer_2',    'test_reviewer_2',    'r2@test.local',   0, 'student'),
  ('00000000-0000-4000-8000-00000000c003', 'clerk_test_reviewer_3',    'test_reviewer_3',    'r3@test.local',   0, 'student');

-- Base approved entry WITH existing content (must NOT be overwritten)
insert into public.archive_entries
  (id, title, planet_id, layer, status, submitted_by, content, short_summary, is_draft, coord_x, coord_y)
values
  ('00000000-0000-4000-8000-0000000000b1', 'base with content', 'earth', 4, 'approved',
   '00000000-0000-4000-8000-00000000aa01',
   'ORIGINAL BASE CONTENT', 'Original summary', false, -888801, -888801);

-- Deepen entry targeting base — malicious content
insert into public.archive_entries
  (id, title, planet_id, layer, status, submitted_by, content, short_summary,
   updates_entry_id, is_draft, coord_x, coord_y)
values
  ('00000000-0000-4000-8000-0000000000d1', 'deepen attack', 'earth', 5, 'pending',
   '00000000-0000-4000-8000-00000000bb02',
   'MALICIOUS OVERWRITE', 'Malicious summary',
   '00000000-0000-4000-8000-0000000000b1', false, -888802, -888802);

-- Base approved entry with EMPTY content (additive fill must work)
insert into public.archive_entries
  (id, title, planet_id, layer, status, submitted_by, content, short_summary, is_draft, coord_x, coord_y)
values
  ('00000000-0000-4000-8000-0000000000b2', 'base empty content', 'earth', 4, 'approved',
   '00000000-0000-4000-8000-00000000aa01',
   '', '', false, -888803, -888803);

insert into public.archive_entries
  (id, title, planet_id, layer, status, submitted_by, content, short_summary,
   updates_entry_id, is_draft, coord_x, coord_y)
values
  ('00000000-0000-4000-8000-0000000000d2', 'deepen fill empty', 'earth', 5, 'pending',
   '00000000-0000-4000-8000-00000000bb02',
   'NEW FILL CONTENT', 'New fill summary',
   '00000000-0000-4000-8000-0000000000b2', false, -888804, -888804);

do $$
declare
  DEEPEN_ATTACK constant uuid := '00000000-0000-4000-8000-0000000000d1';
  DEEPEN_FILL   constant uuid := '00000000-0000-4000-8000-0000000000d2';
  BASE_PROTECT  constant uuid := '00000000-0000-4000-8000-0000000000b1';
  BASE_EMPTY    constant uuid := '00000000-0000-4000-8000-0000000000b2';
  R1 constant uuid := '00000000-0000-4000-8000-00000000c001';
  R2 constant uuid := '00000000-0000-4000-8000-00000000c002';
  R3 constant uuid := '00000000-0000-4000-8000-00000000c003';
  v_content text;
  v_summary text;
  v_layer   int;
begin
  -- Drive 3 passing reviews on the attack deepen entry
  insert into public.reviews (entry_id, reviewer_id, fact_check_pass, difficulty, notes)
  values (DEEPEN_ATTACK, R1, true, 3, 'r1');
  insert into public.reviews (entry_id, reviewer_id, fact_check_pass, difficulty, notes)
  values (DEEPEN_ATTACK, R2, true, 3, 'r2');
  insert into public.reviews (entry_id, reviewer_id, fact_check_pass, difficulty, notes)
  values (DEEPEN_ATTACK, R3, true, 3, 'r3');

  select content, short_summary into v_content, v_summary
    from public.archive_entries where id = BASE_PROTECT;

  insert into _test_results values (
    1, 'base content NOT overwritten by malicious deepen',
    case when v_content = 'ORIGINAL BASE CONTENT'
          and v_summary = 'Original summary'
         then 'PASS' else 'FAIL' end,
    format('content=%s summary=%s', v_content, v_summary)
  );

  select layer into v_layer from public.archive_entries where id = BASE_PROTECT;
  insert into _test_results values (
    2, 'base layer still deepens via greatest()',
    case when v_layer >= 5 then 'PASS' else 'FAIL' end,
    format('layer=%s', v_layer)
  );

  -- Drive consensus on the additive-fill deepen entry
  insert into public.reviews (entry_id, reviewer_id, fact_check_pass, difficulty, notes)
  values (DEEPEN_FILL, R1, true, 3, 'r1b');
  insert into public.reviews (entry_id, reviewer_id, fact_check_pass, difficulty, notes)
  values (DEEPEN_FILL, R2, true, 3, 'r2b');
  insert into public.reviews (entry_id, reviewer_id, fact_check_pass, difficulty, notes)
  values (DEEPEN_FILL, R3, true, 3, 'r3b');

  select content, short_summary into v_content, v_summary
    from public.archive_entries where id = BASE_EMPTY;

  insert into _test_results values (
    3, 'empty base content IS filled by deepen',
    case when v_content = 'NEW FILL CONTENT'
          and v_summary = 'New fill summary'
         then 'PASS' else 'FAIL' end,
    format('content=%s summary=%s', v_content, v_summary)
  );
end;
$$;

select seq, test, status, detail from _test_results order by seq;

rollback;
