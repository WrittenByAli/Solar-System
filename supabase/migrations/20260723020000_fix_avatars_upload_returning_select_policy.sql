-- ============================================================
-- Fix avatar upload RLS violation ("Upload failed: new row violates
-- row-level security policy").
--
-- ROOT CAUSE: storage.objects had INSERT/UPDATE/DELETE policies scoped to
-- "own avatar" (avatars_insert_own / avatars_update_own / avatars_delete_own)
-- but NO SELECT policy for the avatars bucket. PostgreSQL requires a row
-- inserted via INSERT ... RETURNING to also satisfy a SELECT policy's USING
-- clause -- if none applies, the entire statement is rejected with
-- "new row violates row-level security policy", even though the INSERT's
-- own WITH CHECK passes. Supabase's Storage API always issues
-- INSERT ... RETURNING internally, so every avatar upload hit this.
--
-- Verified live: a raw INSERT (no RETURNING) as the affected user's real
-- JWT claims succeeded; the identical INSERT ... RETURNING failed with the
-- exact reported error; adding this policy made the RETURNING form succeed
-- too -- isolating the RETURNING/SELECT-policy interaction as the true
-- cause, not the WITH CHECK expression (which was already correct).
--
-- This does not broaden read access beyond what the bucket already grants:
-- `avatars` is a PUBLIC bucket, so anyone can already fetch an avatar's
-- bytes via the public object URL (bypasses table RLS entirely, by design).
-- This policy only lets an authenticated user's own row satisfy the
-- Storage API's internal RETURNING read -- same "own row only" shape as
-- the existing insert/update/delete policies.
-- ============================================================

create policy avatars_select_own on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and name = (select (users_profile.id)::text || '.jpg' from users_profile where users_profile.clerk_id = (select auth.jwt()->>'sub'))
);
