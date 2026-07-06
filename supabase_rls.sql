-- ============================================================
-- SOLAR Archive — Row Level Security policies
--
-- ⚠️  DO NOT RUN THIS until Clerk is connected to Supabase as a
--     third-party auth provider, or ALL app reads/writes will
--     start failing (the anon key alone won't satisfy policies).
--
-- Prerequisites (one-time dashboard setup):
--   1. Supabase dashboard → Authentication → Sign In / Up →
--      Third-party auth → Add Clerk → enter the Clerk domain
--      (moved-rabbit-3.clerk.accounts.dev)
--   2. In the app's .env set:  VITE_SUPABASE_THIRD_PARTY_AUTH=true
--      (makes supabaseClient attach the Clerk session token so
--      auth.jwt()->>'sub' resolves to the Clerk user id)
--   3. Redeploy, verify signup/login/submit still work,
--      THEN run this file.
-- ============================================================

-- ── Remove the permissive Phase 2A demo policies first ──────
-- (applied as migration `phase2a_demo_policies` while the app ran
-- on the anon key alone; leaving them in place would OR with the
-- strict policies below and defeat them)
drop policy if exists "p2a_profiles_select" on users_profile;
drop policy if exists "p2a_profiles_insert" on users_profile;
drop policy if exists "p2a_profiles_update" on users_profile;
drop policy if exists "p2a_entries_select" on archive_entries;
drop policy if exists "p2a_entries_insert_pending" on archive_entries;

-- ── users_profile ───────────────────────────────────────────
alter table users_profile enable row level security;

-- Anyone signed in can read profiles (needed for leaderboard/reviews)
drop policy if exists "profiles_read_all" on users_profile;
create policy "profiles_read_all"
  on users_profile for select
  to authenticated
  using (true);

-- Users may create only their own profile row
drop policy if exists "profiles_insert_own" on users_profile;
create policy "profiles_insert_own"
  on users_profile for insert
  to authenticated
  with check (clerk_id = (select auth.jwt()->>'sub'));

-- Users may update only their own profile row
drop policy if exists "profiles_update_own" on users_profile;
create policy "profiles_update_own"
  on users_profile for update
  to authenticated
  using (clerk_id = (select auth.jwt()->>'sub'))
  with check (clerk_id = (select auth.jwt()->>'sub'));

-- ── archive_entries ─────────────────────────────────────────
alter table archive_entries enable row level security;

-- Approved entries are readable by everyone (the public archive),
-- and authors can always see their own pending/rejected entries.
drop policy if exists "entries_read_approved_or_own" on archive_entries;
create policy "entries_read_approved_or_own"
  on archive_entries for select
  to anon, authenticated
  using (
    status = 'approved'
    or submitted_by in (
      select id from users_profile
      where clerk_id = (select auth.jwt()->>'sub')
    )
  );

-- Signed-in users may submit entries only as themselves, only pending
drop policy if exists "entries_insert_own_pending" on archive_entries;
create policy "entries_insert_own_pending"
  on archive_entries for insert
  to authenticated
  with check (
    status = 'pending'
    and submitted_by in (
      select id from users_profile
      where clerk_id = (select auth.jwt()->>'sub')
    )
  );

-- No update/delete policies: entries are immutable from the client.
-- Review/approval transitions happen via the service role
-- (dashboard SQL or a future backend), which bypasses RLS.
