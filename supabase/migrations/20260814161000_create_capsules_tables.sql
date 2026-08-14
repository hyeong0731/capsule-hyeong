-- capsules + capsule_images (storage mapping)

CREATE TABLE public.capsules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_uid TEXT NOT NULL,
  recipient TEXT NOT NULL,
  letter TEXT NOT NULL,
  open_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.capsule_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id UUID NOT NULL REFERENCES public.capsules(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX capsule_images_capsule_id_idx ON public.capsule_images(capsule_id);

ALTER TABLE public.capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capsule_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capsules_anon_insert"
ON public.capsules
FOR INSERT
TO anon, authenticated
WITH CHECK (creator_uid IS NOT NULL AND length(trim(creator_uid)) > 0);

CREATE POLICY "capsules_public_read"
ON public.capsules
FOR SELECT
TO public
USING (true);

CREATE POLICY "capsule_images_anon_insert"
ON public.capsule_images
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.capsules c WHERE c.id = capsule_id)
);

CREATE POLICY "capsule_images_public_read"
ON public.capsule_images
FOR SELECT
TO public
USING (true);
