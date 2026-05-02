ALTER TABLE public.unit_settings
  ADD COLUMN IF NOT EXISTS tv_video_url text,
  ADD COLUMN IF NOT EXISTS tv_video_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tv_video_volume integer NOT NULL DEFAULT 50;