ALTER TABLE public.capsules
  ADD COLUMN mood_line TEXT,
  ADD COLUMN keywords TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN capsule_form TEXT,
  ADD COLUMN capsule_primary TEXT,
  ADD COLUMN capsule_secondary TEXT,
  ADD COLUMN capsule_accent TEXT;
