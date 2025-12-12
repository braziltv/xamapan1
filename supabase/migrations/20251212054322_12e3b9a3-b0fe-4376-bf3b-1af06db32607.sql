-- Adicionar política para permitir deletar registros do call_history
CREATE POLICY "Anyone can delete call history"
ON public.call_history
FOR DELETE
USING (true);

-- Adicionar política para permitir deletar registros do statistics_daily
CREATE POLICY "Anyone can delete statistics"
ON public.statistics_daily
FOR DELETE
USING (true);