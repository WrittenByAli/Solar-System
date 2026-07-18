-- Public community reviews feed (/reviews)
-- Exposes reviewer feedback only for approved, non-draft, non-deleted entries.
-- Never includes email, clerk_id, or other PII.

CREATE OR REPLACE VIEW public.public_community_reviews
WITH (security_invoker = true)
AS
SELECT
  r.id AS review_id,
  r.entry_id,
  r.reviewer_id,
  r.fact_check_pass,
  r.difficulty,
  NULLIF(TRIM(r.notes), '') AS notes,
  r.created_at AS review_created_at,
  e.title AS entry_title,
  e.planet_id,
  e.layer,
  e.coord_x,
  e.coord_y,
  e.status AS entry_status,
  p.username AS reviewer_username,
  p.avatar_url AS reviewer_avatar_url,
  COALESCE(p.points, 0) AS reviewer_points,
  up.role AS reviewer_role,
  (
    (CASE WHEN r.fact_check_pass THEN 10.0 ELSE 4.0 END)
    + COALESCE(r.difficulty, 3)::numeric
  ) AS quality_score,
  85 AS reviewer_points_earned,
  (
    (
      (CASE WHEN r.fact_check_pass THEN 10.0 ELSE 4.0 END)
      + COALESCE(r.difficulty, 3)::numeric
    )
    * (CASE WHEN r.fact_check_pass THEN 1.2 ELSE 0.85 END)
  ) AS helpful_score,
  (
    (
      (CASE WHEN r.fact_check_pass THEN 10.0 ELSE 4.0 END)
      + COALESCE(r.difficulty, 3)::numeric
    )
    / (1.0 + GREATEST(0.0, EXTRACT(EPOCH FROM (now() - r.created_at)) / 86400.0) * 0.12)
  ) AS trending_score
FROM public.reviews r
INNER JOIN public.archive_entries e ON e.id = r.entry_id
INNER JOIN public.public_profiles p ON p.id = r.reviewer_id
LEFT JOIN public.users_profile up ON up.id = r.reviewer_id
WHERE e.status = 'approved'
  AND e.is_draft = false
  AND e.deleted_at IS NULL;

COMMENT ON VIEW public.public_community_reviews IS
  'Public-safe reviewer feedback for approved archive entries (/reviews feed).';

GRANT SELECT ON public.public_community_reviews TO anon, authenticated;

-- Allow unauthenticated and guest sessions to read reviews on approved entries only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
      AND policyname = 'reviews_read_public_on_approved_entries'
  ) THEN
    CREATE POLICY reviews_read_public_on_approved_entries
      ON public.reviews
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.archive_entries e
          WHERE e.id = reviews.entry_id
            AND e.status = 'approved'
            AND e.is_draft = false
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END $$;
