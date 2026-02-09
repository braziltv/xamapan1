
-- Tabela de log de áudios avulsos enviados para a TV
CREATE TABLE public.custom_announcement_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name TEXT NOT NULL,
  sender_station TEXT NOT NULL DEFAULT 'unknown',
  sender_name TEXT,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_announcement_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: qualquer um pode inserir e visualizar (mesmo padrão das outras tabelas operacionais)
CREATE POLICY "Anyone can insert announcement logs"
  ON public.custom_announcement_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view announcement logs"
  ON public.custom_announcement_logs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can delete announcement logs"
  ON public.custom_announcement_logs FOR DELETE
  USING (true);

-- Índice para consultas por unidade e data
CREATE INDEX idx_custom_announcement_logs_unit_date 
  ON public.custom_announcement_logs (unit_name, created_at DESC);
