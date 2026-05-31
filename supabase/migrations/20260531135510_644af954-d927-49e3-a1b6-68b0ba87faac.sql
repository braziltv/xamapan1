ALTER TABLE public.marketing_images
  ADD COLUMN IF NOT EXISTS is_fixed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_marketing_images_unit_active_fixed_month
  ON public.marketing_images (unit_name, is_active, is_fixed, month);