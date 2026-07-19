-- Open peer review to every authenticated member (not just role='reviewer').
--
-- Verified against the live project (2026-07-19, via Clerk-JWT REST probes):
-- strict per-user RLS is active, and BOTH of these were blocked for a
-- student session before this migration:
--   * SELECT on pending archive_entries returned [] (only
--     entries_read_pending_as_reviewer existed), and
--   * INSERT into reviews returned 403 "new row violates row-level
--     security policy".
-- Without these policies the client-side change (review:grade granted to
-- every member) shows an empty queue and rejected grades for students.
--
-- Abuse protections are intentionally NOT relaxed:
--  * reviewer_id must be the CALLER's own profile (clerk_id = jwt sub) —
--    nobody can file a review under someone else's identity,
--  * self-review is blocked in WITH CHECK (entry author ≠ reviewer),
--  * duplicate reviews stay blocked by the unique (entry_id, reviewer_id)
--    constraint,
--  * the 3-review consensus trigger, points, and notifications are untouched.

DO $$
BEGIN
  -- Any authenticated session may read review-eligible pending entries.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'archive_entries'
      AND policyname = 'entries_read_pending_as_member'
  ) THEN
    CREATE POLICY entries_read_pending_as_member
      ON public.archive_entries
      FOR SELECT
      TO authenticated
      USING (
        status = 'pending'
        AND is_draft = false
        AND deleted_at IS NULL
      );
  END IF;

  -- Any authenticated session may insert a review AS THEMSELVES, but never
  -- for an entry they authored.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
      AND policyname = 'reviews_insert_as_member'
  ) THEN
    CREATE POLICY reviews_insert_as_member
      ON public.reviews
      FOR INSERT
      TO authenticated
      WITH CHECK (
        reviewer_id = (
          SELECT up.id
          FROM public.users_profile up
          WHERE up.clerk_id = (SELECT auth.jwt() ->> 'sub')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.archive_entries e
          WHERE e.id = reviews.entry_id
            AND e.submitted_by = reviews.reviewer_id
        )
      );
  END IF;
END $$;
