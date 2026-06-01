
CREATE OR REPLACE FUNCTION public.get_header_stats(target_unit text)
RETURNS TABLE (
  waiting_count integer,
  today_calls integer,
  yesterday_calls integer,
  avg_wait_time integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_start timestamptz;
  yesterday_start timestamptz;
BEGIN
  today_start := date_trunc('day', (now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo';
  yesterday_start := today_start - interval '1 day';

  RETURN QUERY
  SELECT
    COALESCE((
      SELECT COUNT(*)::int
      FROM patient_calls
      WHERE unit_name = target_unit AND status = 'waiting'
    ), 0),
    COALESCE((
      SELECT COUNT(*)::int
      FROM call_history
      WHERE unit_name = target_unit AND created_at >= today_start
    ), 0),
    COALESCE((
      SELECT COUNT(*)::int
      FROM call_history
      WHERE unit_name = target_unit
        AND created_at >= yesterday_start
        AND created_at < today_start
    ), 0),
    COALESCE((
      SELECT AVG(EXTRACT(EPOCH FROM (now() - created_at)) / 60)::int
      FROM patient_calls
      WHERE unit_name = target_unit AND status = 'waiting'
    ), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_header_stats(text) TO anon, authenticated, service_role;
