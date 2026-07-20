-- Dedupe the review-queue policies superseded by 20260719020000, and close
-- the "write/overwrite as literally anyone" gap on the shared-write tables
-- flagged in the 2026-07-19 pg_policies audit (archive_instances,
-- archive_registry, segment_reports).
--
-- Self-review note: process_review_consensus is AFTER INSERT and does
-- `raise exception 'cannot review own submission'`, which rolls back the
-- whole statement regardless of which RLS policy let the INSERT through —
-- so dropping reviews_insert_as_reviewer here is a correctness/clarity
-- dedupe (it was already a strict subset of reviews_insert_as_member, which
-- ships its own self-review check), not a live-exploit fix.

-- entries_read_pending_as_member (20260719020000) has no role condition, so
-- it is already a strict superset of the role-gated policy below.
drop policy if exists "entries_read_pending_as_reviewer" on public.archive_entries;

-- reviews_insert_as_member (20260719020000) allows any role AND enforces the
-- self-review check in WITH CHECK, so it's already a strict superset here too.
drop policy if exists "reviews_insert_as_reviewer" on public.reviews;

-- archive_instances: 10 fixed shared per-hub rows (config keyed by hub_id,
-- e.g. "earth", "mars"), not user-owned, so per-row ownership doesn't apply —
-- but `for all` also silently grants DELETE, which CreateArchive.jsx never
-- calls. Narrow to just the two operations the app actually performs.
drop policy if exists "instances_write_authenticated" on public.archive_instances;

create policy "instances_insert_authenticated"
  on public.archive_instances for insert
  to authenticated
  with check (true);

create policy "instances_update_authenticated"
  on public.archive_instances for update
  to authenticated
  using (true)
  with check (true);

-- archive_registry + segment_reports have no owner/reporter uuid column yet
-- (real fix is a schema migration — tracked, not done here). username has no
-- uniqueness constraint, so this isn't airtight identity binding, but it
-- closes the "insert/update AS ANYONE" hole: the text value written to
-- owner/author_username must match the CALLER's own users_profile.username.
drop policy if exists "registry_write_authenticated" on public.archive_registry;
drop policy if exists "registry_update_authenticated" on public.archive_registry;

create policy "registry_insert_own_username"
  on public.archive_registry for insert
  to authenticated
  with check (
    owner = (
      select username from users_profile
      where clerk_id = (select auth.jwt()->>'sub')
    )
  );

create policy "registry_update_own_username"
  on public.archive_registry for update
  to authenticated
  using (
    owner = (
      select username from users_profile
      where clerk_id = (select auth.jwt()->>'sub')
    )
  )
  with check (
    owner = (
      select username from users_profile
      where clerk_id = (select auth.jwt()->>'sub')
    )
  );

drop policy if exists "segment_reports_insert_authenticated" on public.segment_reports;

create policy "segment_reports_insert_own_username"
  on public.segment_reports for insert
  to authenticated
  with check (
    author_username = (
      select username from users_profile
      where clerk_id = (select auth.jwt()->>'sub')
    )
  );
