
CREATE OR REPLACE FUNCTION public.aggregate_daily_statistics(target_date date, target_unit text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_count INTEGER;
  triage_count INTEGER;
  doctor_count INTEGER;
  hourly_data JSONB;
  dest_data JSONB;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM public.call_history
  WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date = target_date
    AND unit_name = target_unit;

  SELECT COUNT(*) INTO triage_count
  FROM public.call_history
  WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date = target_date
    AND unit_name = target_unit
    AND call_type = 'triage';

  SELECT COUNT(*) INTO doctor_count
  FROM public.call_history
  WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date = target_date
    AND unit_name = target_unit
    AND call_type = 'doctor';

  SELECT COALESCE(jsonb_object_agg(hour, count), '{}') INTO hourly_data
  FROM (
    SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'America/Sao_Paulo'))::TEXT AS hour, COUNT(*) AS count
    FROM public.call_history
    WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date = target_date
      AND unit_name = target_unit
    GROUP BY EXTRACT(HOUR FROM (created_at AT TIME ZONE 'America/Sao_Paulo'))
  ) h;

  SELECT COALESCE(jsonb_object_agg(COALESCE(dest, 'N/A'), count), '{}') INTO dest_data
  FROM (
    SELECT COALESCE(destination, 'Padrão') AS dest, COUNT(*) AS count
    FROM public.call_history
    WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date = target_date
      AND unit_name = target_unit
    GROUP BY destination
  ) d;

  INSERT INTO public.statistics_daily (unit_name, date, total_calls, triage_calls, doctor_calls, calls_by_hour, calls_by_destination)
  VALUES (target_unit, target_date, total_count, triage_count, doctor_count, hourly_data, dest_data)
  ON CONFLICT (unit_name, date) 
  DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    triage_calls = EXCLUDED.triage_calls,
    doctor_calls = EXCLUDED.doctor_calls,
    calls_by_hour = EXCLUDED.calls_by_hour,
    calls_by_destination = EXCLUDED.calls_by_destination,
    updated_at = now();
END;
$function$;
