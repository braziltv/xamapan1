-- Create table for system error logs
CREATE TABLE public.system_error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  label TEXT NOT NULL,
  error_message TEXT NOT NULL,
  unit_name TEXT DEFAULT 'sistema',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view error logs" 
ON public.system_error_logs 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert error logs" 
ON public.system_error_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete error logs" 
ON public.system_error_logs 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_system_error_logs_created_at ON public.system_error_logs(created_at DESC);
CREATE INDEX idx_system_error_logs_module ON public.system_error_logs(module);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_error_logs;