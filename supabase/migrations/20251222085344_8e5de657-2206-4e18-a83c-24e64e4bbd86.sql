-- Create table for test history
CREATE TABLE public.test_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  failed_tests INTEGER NOT NULL DEFAULT 0,
  warning_tests INTEGER NOT NULL DEFAULT 0,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view test history" 
ON public.test_history 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert test history" 
ON public.test_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete test history" 
ON public.test_history 
FOR DELETE 
USING (true);