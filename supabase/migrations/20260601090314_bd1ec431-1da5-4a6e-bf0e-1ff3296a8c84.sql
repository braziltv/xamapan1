DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='scheduled_announcements') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.scheduled_announcements';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='weather_cache') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.weather_cache';
  END IF;
END $$;