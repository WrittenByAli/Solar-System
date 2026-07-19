-- Production hardening (finding SA-14): constrain the public `avatars`
-- bucket at the storage layer.
--
-- The strict RLS policy (supabase_rls.sql) already pins each object's NAME
-- to `<profile_id>.jpg` (no traversal / no overwriting another user), but
-- places no limit on WHAT bytes land there. A hostile client that bypasses
-- the JS allowedTypes/size check in src/pages/Profile.jsx could upload
-- arbitrary content or a very large file to its own key. These bucket-level
-- constraints are enforced server-side regardless of the client:
--   • allowed_mime_types — only real images are accepted;
--   • file_size_limit    — 2 MiB is generous for the 200×200 JPEG the app
--                          produces after its center-crop resize.
--
-- Idempotent: a plain UPDATE of the existing bucket row. Does NOT recreate
-- the bucket (it was created out-of-band and is public-read).

update storage.buckets
set
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'],
  file_size_limit = 2097152  -- 2 MiB
where id = 'avatars';
