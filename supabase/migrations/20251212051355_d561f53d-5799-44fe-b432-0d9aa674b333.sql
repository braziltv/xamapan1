-- Tabela para estatísticas diárias agregadas (compactadas)
CREATE TABLE public.statistics_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name TEXT NOT NULL,
  date DATE NOT NULL,
  total_calls INTEGER NOT NULL DEFAULT 0,
  triage_calls INTEGER NOT NULL DEFAULT 0,
  doctor_calls INTEGER NOT NULL DEFAULT 0,
  calls_by_hour JSONB DEFAULT '{}',
  calls_by_destination JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unit_name, date)
);

-- Habilitar RLS
ALTER TABLE public.statistics_daily ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Anyone can view statistics" 
ON public.statistics_daily 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert statistics" 
ON public.statistics_daily 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update statistics" 
ON public.statistics_daily 
FOR UPDATE 
USING (true);

-- Índices para performance
CREATE INDEX idx_statistics_daily_unit_date ON public.statistics_daily(unit_name, date);
CREATE INDEX idx_statistics_daily_date ON public.statistics_daily(date);

-- Função para agregar dados do histórico em estatísticas diárias
CREATE OR REPLACE FUNCTION public.aggregate_daily_statistics(target_date DATE, target_unit TEXT)
RETURNS void AS $$
DECLARE
  total_count INTEGER;
  triage_count INTEGER;
  doctor_count INTEGER;
  hourly_data JSONB;
  dest_data JSONB;
BEGIN
  -- Contar chamadas totais
  SELECT COUNT(*) INTO total_count
  FROM public.call_history
  WHERE DATE(created_at) = target_date
    AND unit_name = target_unit;

  -- Contar chamadas de triagem
  SELECT COUNT(*) INTO triage_count
  FROM public.call_history
  WHERE DATE(created_at) = target_date
    AND unit_name = target_unit
    AND call_type = 'triage';

  -- Contar chamadas de médico
  SELECT COUNT(*) INTO doctor_count
  FROM public.call_history
  WHERE DATE(created_at) = target_date
    AND unit_name = target_unit
    AND call_type = 'doctor';

  -- Agregar por hora
  SELECT COALESCE(jsonb_object_agg(hour, count), '{}') INTO hourly_data
  FROM (
    SELECT EXTRACT(HOUR FROM created_at)::TEXT AS hour, COUNT(*) AS count
    FROM public.call_history
    WHERE DATE(created_at) = target_date
      AND unit_name = target_unit
    GROUP BY EXTRACT(HOUR FROM created_at)
  ) h;

  -- Agregar por destino
  SELECT COALESCE(jsonb_object_agg(COALESCE(dest, 'N/A'), count), '{}') INTO dest_data
  FROM (
    SELECT COALESCE(destination, 'Padrão') AS dest, COUNT(*) AS count
    FROM public.call_history
    WHERE DATE(created_at) = target_date
      AND unit_name = target_unit
    GROUP BY destination
  ) d;

  -- Inserir ou atualizar estatísticas
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para compactar dados antigos (agregar e deletar registros detalhados com mais de 7 dias)
CREATE OR REPLACE FUNCTION public.compact_old_statistics(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;