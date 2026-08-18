ALTER TABLE public.capsules
  ADD COLUMN weather_condition TEXT,
  ADD COLUMN weather_temp NUMERIC,
  ADD COLUMN weather_humidity INTEGER;
