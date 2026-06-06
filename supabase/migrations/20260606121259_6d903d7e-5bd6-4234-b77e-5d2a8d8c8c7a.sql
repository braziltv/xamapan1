
-- ============================================================
-- #3 unit_counters: materializa waiting_count + today_calls
-- ============================================================
CREATE TABLE IF NOT EXISTS public.unit_counters (
  unit_name text PRIMARY KEY,
  waiting_count integer NOT NULL DEFAULT 0,
  today_calls integer NOT NULL DEFAULT 0,
  today_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.unit_counters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_counters TO authenticated;
GRANT ALL ON public.unit_counters TO service_role;

ALTER TABLE public.unit_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read unit_counters"
  ON public.unit_counters FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage unit_counters"
  ON public.unit_counters FOR ALL
  USING (true) WITH CHECK (true);

-- Seed counters from current data
INSERT INTO public.unit_counters (unit_name, waiting_count, today_calls, today_date)
SELECT
  u.name,
  COALESCE((SELECT COUNT(*) FROM patient_calls pc WHERE pc.unit_name = u.name AND pc.status = 'waiting'), 0),
  COALESCE((SELECT COUNT(*) FROM call_history ch
    WHERE ch.unit_name = u.name
      AND ch.created_at >= date_trunc('day', (now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo'), 0),
  (now() AT TIME ZONE 'America/Sao_Paulo')::date
FROM units u
ON CONFLICT (unit_name) DO UPDATE SET
  waiting_count = EXCLUDED.waiting_count,
  today_calls = EXCLUDED.today_calls,
  today_date = EXCLUDED.today_date,
  updated_at = now();

-- Helper: ensure counter row + roll today_calls on day change
CREATE OR REPLACE FUNCTION public.ensure_unit_counter(p_unit_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_brt date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  INSERT INTO public.unit_counters (unit_name, waiting_count, today_calls, today_date)
  VALUES (p_unit_name, 0, 0, today_brt)
  ON CONFLICT (unit_name) DO UPDATE SET
    today_calls = CASE WHEN public.unit_counters.today_date < today_brt THEN 0 ELSE public.unit_counters.today_calls END,
    today_date  = today_brt;
END;
$$;

-- Trigger on patient_calls: maintain waiting_count
CREATE OR REPLACE FUNCTION public.trg_patient_calls_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta integer := 0;
  target_unit text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target_unit := NEW.unit_name;
    PERFORM public.ensure_unit_counter(target_unit);
    IF NEW.status = 'waiting' THEN delta := 1; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    target_unit := OLD.unit_name;
    PERFORM public.ensure_unit_counter(target_unit);
    IF OLD.status = 'waiting' THEN delta := -1; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    target_unit := NEW.unit_name;
    PERFORM public.ensure_unit_counter(target_unit);
    IF OLD.status = 'waiting' AND NEW.status <> 'waiting' THEN delta := -1;
    ELSIF OLD.status <> 'waiting' AND NEW.status = 'waiting' THEN delta := 1;
    END IF;
    IF OLD.unit_name <> NEW.unit_name THEN
      PERFORM public.ensure_unit_counter(OLD.unit_name);
      IF OLD.status = 'waiting' THEN
        UPDATE public.unit_counters SET waiting_count = GREATEST(waiting_count - 1, 0), updated_at = now()
          WHERE unit_name = OLD.unit_name;
      END IF;
      IF NEW.status = 'waiting' THEN
        UPDATE public.unit_counters SET waiting_count = waiting_count + 1, updated_at = now()
          WHERE unit_name = NEW.unit_name;
      END IF;
      RETURN NULL;
    END IF;
  END IF;

  IF delta <> 0 THEN
    UPDATE public.unit_counters
       SET waiting_count = GREATEST(waiting_count + delta, 0), updated_at = now()
     WHERE unit_name = target_unit;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS patient_calls_counters_trg ON public.patient_calls;
CREATE TRIGGER patient_calls_counters_trg
AFTER INSERT OR UPDATE OR DELETE ON public.patient_calls
FOR EACH ROW EXECUTE FUNCTION public.trg_patient_calls_counters();

-- Trigger on call_history: maintain today_calls
CREATE OR REPLACE FUNCTION public.trg_call_history_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_brt date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  row_date date;
BEGIN
  row_date := (NEW.created_at AT TIME ZONE 'America/Sao_Paulo')::date;
  IF row_date = today_brt THEN
    PERFORM public.ensure_unit_counter(NEW.unit_name);
    UPDATE public.unit_counters
       SET today_calls = today_calls + 1, updated_at = now()
     WHERE unit_name = NEW.unit_name;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS call_history_counters_trg ON public.call_history;
CREATE TRIGGER call_history_counters_trg
AFTER INSERT ON public.call_history
FOR EACH ROW EXECUTE FUNCTION public.trg_call_history_counters();

-- Rewrite get_header_stats to read from counters (avg_wait_time still computed but cheap)
CREATE OR REPLACE FUNCTION public.get_header_stats(target_unit text)
RETURNS TABLE(waiting_count integer, today_calls integer, yesterday_calls integer, avg_wait_time integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_brt date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  today_start timestamptz := date_trunc('day', (now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo';
  yesterday_start timestamptz := today_start - interval '1 day';
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT uc.waiting_count FROM unit_counters uc WHERE uc.unit_name = target_unit), 0),
    COALESCE((SELECT CASE WHEN uc.today_date = today_brt THEN uc.today_calls ELSE 0 END
              FROM unit_counters uc WHERE uc.unit_name = target_unit), 0),
    COALESCE((
      SELECT COUNT(*)::int FROM call_history
      WHERE unit_name = target_unit
        AND created_at >= yesterday_start AND created_at < today_start
    ), 0),
    COALESCE((
      SELECT AVG(EXTRACT(EPOCH FROM (now() - created_at)) / 60)::int
      FROM patient_calls
      WHERE unit_name = target_unit AND status = 'waiting'
    ), 0);
END;
$$;

-- ============================================================
-- #4 audit_events: unifica api_key_usage + test_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- 'api_key_usage' | 'system_test'
  unit_name text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_type_created_idx
  ON public.audit_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_unit_created_idx
  ON public.audit_events (unit_name, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.audit_events TO anon, authenticated;
GRANT ALL ON public.audit_events TO service_role;

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read audit_events"
  ON public.audit_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert audit_events"
  ON public.audit_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete audit_events"
  ON public.audit_events FOR DELETE USING (true);

-- TTL cleanup (called by daily-cleanup-all):
CREATE OR REPLACE FUNCTION public.cleanup_audit_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  -- api_key_usage: 30 dias, system_test: 60 dias
  WITH d AS (
    DELETE FROM public.audit_events
     WHERE (event_type = 'api_key_usage' AND created_at < now() - interval '30 days')
        OR (event_type = 'system_test'   AND created_at < now() - interval '60 days')
    RETURNING 1
  ) SELECT COUNT(*) INTO deleted FROM d;
  RETURN deleted;
END;
$$;
