ALTER TABLE public.unit_settings
ADD COLUMN IF NOT EXISTS tv_video_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tv_video_resume_delay_seconds integer NOT NULL DEFAULT 20;

-- Backfill array from existing single URL when present
UPDATE public.unit_settings
SET tv_video_urls = jsonb_build_array(tv_video_url)
WHERE (tv_video_urls IS NULL OR tv_video_urls = '[]'::jsonb)
  AND tv_video_url IS NOT NULL
  AND length(trim(tv_video_url)) > 0;