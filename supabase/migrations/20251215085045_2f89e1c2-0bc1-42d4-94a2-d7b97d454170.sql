-- Adicionar coluna de prioridade na tabela patient_calls
ALTER TABLE public.patient_calls 
ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal';

-- Criar índice para ordenação por prioridade
CREATE INDEX idx_patient_calls_priority ON public.patient_calls(priority, created_at);

-- Comentário explicativo
COMMENT ON COLUMN public.patient_calls.priority IS 'Níveis: emergency (vermelho), priority (amarelo), normal (verde)';