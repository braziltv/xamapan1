-- Create table to track TTS name usage frequency
CREATE TABLE public.tts_name_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_hash TEXT NOT NULL,
  name_text TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying by hash and date
CREATE INDEX idx_tts_name_usage_hash_date ON public.tts_name_usage (name_hash, used_at);

-- Enable RLS (public access for edge functions with service role)
ALTER TABLE public.tts_name_usage ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage tts_name_usage"
ON public.tts_name_usage
FOR ALL
USING (true)
WITH CHECK (true);