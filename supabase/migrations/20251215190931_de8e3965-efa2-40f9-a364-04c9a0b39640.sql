-- Create table to track ElevenLabs API key usage
CREATE TABLE public.api_key_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_index INTEGER NOT NULL,
  unit_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

-- Allow public read access for statistics
CREATE POLICY "Allow public read access" 
ON public.api_key_usage 
FOR SELECT 
USING (true);

-- Allow public insert for edge function
CREATE POLICY "Allow public insert" 
ON public.api_key_usage 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_api_key_usage_created_at ON public.api_key_usage(created_at);
CREATE INDEX idx_api_key_usage_unit_name ON public.api_key_usage(unit_name);