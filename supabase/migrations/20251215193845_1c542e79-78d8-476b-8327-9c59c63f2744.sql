-- Create storage bucket for TTS audio cache
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-cache', 'tts-cache', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to TTS cache
CREATE POLICY "Public read access for TTS cache"
ON storage.objects FOR SELECT
USING (bucket_id = 'tts-cache');

-- Allow service role to insert/delete TTS cache
CREATE POLICY "Service role can manage TTS cache"
ON storage.objects FOR ALL
USING (bucket_id = 'tts-cache')
WITH CHECK (bucket_id = 'tts-cache');