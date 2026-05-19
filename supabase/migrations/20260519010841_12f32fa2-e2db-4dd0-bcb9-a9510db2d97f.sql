
-- Tabela de imagens de marketing
CREATE TABLE public.marketing_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_images_unit_month ON public.marketing_images(unit_name, month, display_order);

ALTER TABLE public.marketing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view marketing images"
ON public.marketing_images FOR SELECT USING (true);

CREATE POLICY "Anyone can manage marketing images"
ON public.marketing_images FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_marketing_images_updated_at
BEFORE UPDATE ON public.marketing_images
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_images;

-- Bucket público
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-images', 'marketing-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read marketing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketing-images');

CREATE POLICY "Public upload marketing images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'marketing-images');

CREATE POLICY "Public update marketing images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'marketing-images');

CREATE POLICY "Public delete marketing images"
ON storage.objects FOR DELETE
USING (bucket_id = 'marketing-images');
