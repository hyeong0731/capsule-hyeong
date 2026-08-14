-- Run in Supabase Dashboard → SQL Editor
-- Fixes: "new row violates row-level security policy" on storage upload

CREATE POLICY "capsule_hyeong_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'capsule-hyeong');

CREATE POLICY "capsule_hyeong_anon_upload"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'capsule-hyeong'
  AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'))
);
