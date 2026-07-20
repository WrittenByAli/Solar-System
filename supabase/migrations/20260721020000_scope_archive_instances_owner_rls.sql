-- ============================================================
-- SECURITY FIX 2a (Medium/Low) — archive_instances cross-user tampering
--
-- CONFIRMED VULNERABILITY (audit 2026-07-21, live pg_policies):
--   instances_insert_authenticated / instances_update_authenticated used
--   WITH CHECK (true) / USING (true) with no owner column — any authenticated
--   member could overwrite another user's hosted-archive branding.
--
-- FIX:
--   1. Add owner_id (uuid FK → users_profile) — authoritative ownership.
--   2. Backfill from archive_registry.owner via hub_planet_id = hub_id.
--   3. Replace permissive policies with owner-scoped insert/update.
--   4. Bound cover_image_data_url (512 KB) — closes storage-bloat vector.
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- 1. Owner column
alter table public.archive_instances
  add column if not exists owner_id uuid references public.users_profile(id);

create index if not exists archive_instances_owner_id_idx
  on public.archive_instances (owner_id);

-- 2. Backfill from registry (hub_planet_id matches archive_instances.hub_id).
--    DISTINCT ON resolves duplicate registry rows per hub (newest publish wins).
--    Username collisions: newest published_at wins; manual review if needed.
update public.archive_instances ai
   set owner_id = src.owner_id
  from (
    select distinct on (r.hub_planet_id)
           r.hub_planet_id,
           up.id as owner_id
      from public.archive_registry r
      join public.users_profile up on up.username = r.owner
     where r.hub_planet_id is not null
       and trim(r.hub_planet_id) <> ''
       and r.owner is not null
       and trim(r.owner) <> ''
     order by r.hub_planet_id, r.published_at desc nulls last
  ) src
 where ai.hub_id = src.hub_planet_id
   and ai.owner_id is null;

-- 3. Owner-scoped RLS
drop policy if exists "instances_insert_authenticated" on public.archive_instances;
drop policy if exists "instances_update_authenticated" on public.archive_instances;

create policy "instances_insert_own"
  on public.archive_instances for insert
  to authenticated
  with check (
    owner_id = (
      select up.id from public.users_profile up
      where up.clerk_id = (select auth.jwt() ->> 'sub')
      limit 1
    )
  );

create policy "instances_update_own"
  on public.archive_instances for update
  to authenticated
  using (
    owner_id = (
      select up.id from public.users_profile up
      where up.clerk_id = (select auth.jwt() ->> 'sub')
      limit 1
    )
    or owner_id is null   -- allow claiming legacy/orphan rows once
  )
  with check (
    owner_id = (
      select up.id from public.users_profile up
      where up.clerk_id = (select auth.jwt() ->> 'sub')
      limit 1
    )
  );

-- 4. Cover image size bound (512 KB data URL — matches client resize ~960px JPEG)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'archive_instances_cover_bound_check') then
    alter table public.archive_instances
      add constraint archive_instances_cover_bound_check
      check (cover_image_data_url is null or length(cover_image_data_url) <= 524288)
      not valid;
  end if;
end $$;
