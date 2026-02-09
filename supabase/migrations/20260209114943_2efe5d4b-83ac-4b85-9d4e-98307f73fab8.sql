
-- Adicionar coluna force_logout_at na tabela unit_settings para forçar logout de usuários
ALTER TABLE public.unit_settings ADD COLUMN IF NOT EXISTS force_logout_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
