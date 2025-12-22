-- Atualizar função de compactação para usar 60 dias como padrão
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
BEGIN
  -- Para cada unidade e data antiga, agregar antes de deletar
  FOR unit_record IN 
    SELECT DISTINCT unit_name FROM public.call_history 
    WHERE DATE(created_at) < CURRENT_DATE - days_to_keep
  LOOP
    FOR date_record IN 
      SELECT DISTINCT DATE(created_at) AS call_date 
      FROM public.call_history 
      WHERE unit_name = unit_record.unit_name 
        AND DATE(created_at) < CURRENT_DATE - days_to_keep
    LOOP
      -- Agregar os dados antes de deletar
      PERFORM public.aggregate_daily_statistics(date_record.call_date, unit_record.unit_name);
    END LOOP;
  END LOOP;

  -- Deletar registros antigos do histórico detalhado
  DELETE FROM public.call_history 
  WHERE DATE(created_at) < CURRENT_DATE - days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$;