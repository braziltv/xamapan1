-- Drop and recreate the compact function with gradual deletion
CREATE OR REPLACE FUNCTION public.compact_old_statistics(days_to_keep integer DEFAULT 60)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
  unit_record RECORD;
  date_record RECORD;
  batch_limit INTEGER := 100; -- Delete in batches for gradual cleanup
BEGIN
  -- Para cada unidade e data antiga, agregar antes de deletar
  FOR unit_record IN 
    SELECT DISTINCT unit_name FROM public.call_history 
    WHERE DATE(created_at) < CURRENT_DATE - days_to_keep
    LIMIT batch_limit
  LOOP
    FOR date_record IN 
      SELECT DISTINCT DATE(created_at) AS call_date 
      FROM public.call_history 
      WHERE unit_name = unit_record.unit_name 
        AND DATE(created_at) < CURRENT_DATE - days_to_keep
      ORDER BY call_date ASC -- Oldest first
      LIMIT 10 -- Process only 10 days per unit per run
    LOOP
      -- Agregar os dados antes de deletar
      PERFORM public.aggregate_daily_statistics(date_record.call_date, unit_record.unit_name);
    END LOOP;
  END LOOP;

  -- Deletar registros antigos do histórico detalhado (em lotes)
  WITH deleted AS (
    DELETE FROM public.call_history 
    WHERE id IN (
      SELECT id FROM public.call_history 
      WHERE DATE(created_at) < CURRENT_DATE - days_to_keep
      ORDER BY created_at ASC
      LIMIT batch_limit
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Também limpar estatísticas diárias muito antigas (mais de 1 ano)
  DELETE FROM public.statistics_daily 
  WHERE date < CURRENT_DATE - 365;
  
  RETURN deleted_count;
END;
$function$;