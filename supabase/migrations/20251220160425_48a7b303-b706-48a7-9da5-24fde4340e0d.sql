-- Create table for edge function health check history
CREATE TABLE public.edge_function_health_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  function_label TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline')),
  response_time_ms INTEGER,
  error_message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_health_history_function_name ON public.edge_function_health_history(function_name);
CREATE INDEX idx_health_history_checked_at ON public.edge_function_health_history(checked_at DESC);
CREATE INDEX idx_health_history_status ON public.edge_function_health_history(status);

-- Enable RLS
ALTER TABLE public.edge_function_health_history ENABLE ROW LEVEL SECURITY;

-- Create policies - anyone can read and insert (for monitoring)
CREATE POLICY "Anyone can view health history" 
ON public.edge_function_health_history 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert health history" 
ON public.edge_function_health_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete old health history" 
ON public.edge_function_health_history 
FOR DELETE 
USING (true);

-- Add comment
COMMENT ON TABLE public.edge_function_health_history IS 'Stores health check history for edge functions uptime analysis';