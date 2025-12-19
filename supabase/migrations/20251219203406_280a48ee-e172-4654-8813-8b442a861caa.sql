-- Store per-unit configuration that must sync across devices (e.g. TV + operator)
CREATE TABLE IF NOT EXISTS public.unit_settings (
  unit_name TEXT PRIMARY KEY,
  patient_call_voice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.unit_settings ENABLE ROW LEVEL SECURITY;

-- Minimal, non-sensitive settings: allow all clients to read/write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'unit_settings' AND policyname = 'Unit settings are readable by everyone'
  ) THEN
    CREATE POLICY "Unit settings are readable by everyone"
    ON public.unit_settings
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'unit_settings' AND policyname = 'Unit settings are writable by everyone'
  ) THEN
    CREATE POLICY "Unit settings are writable by everyone"
    ON public.unit_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Timestamp trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_unit_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_unit_settings_updated_at
    BEFORE UPDATE ON public.unit_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Realtime support
ALTER TABLE public.unit_settings REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.unit_settings;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;