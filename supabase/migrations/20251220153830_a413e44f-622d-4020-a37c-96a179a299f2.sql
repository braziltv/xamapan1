-- Table to track user sessions and activity
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name TEXT NOT NULL,
  station TEXT NOT NULL DEFAULT 'unknown',
  ip_address TEXT,
  user_agent TEXT,
  is_tv_mode BOOLEAN DEFAULT false,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  logout_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  voice_calls_count INTEGER DEFAULT 0,
  tts_calls_count INTEGER DEFAULT 0,
  registrations_count INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view sessions (internal app, no auth)
CREATE POLICY "Anyone can view user sessions" 
ON public.user_sessions 
FOR SELECT 
USING (true);

-- Allow anyone to insert sessions
CREATE POLICY "Anyone can insert user sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update sessions
CREATE POLICY "Anyone can update user sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (true);

-- Allow anyone to delete sessions
CREATE POLICY "Anyone can delete user sessions" 
ON public.user_sessions 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_user_sessions_unit ON public.user_sessions(unit_name);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX idx_user_sessions_login ON public.user_sessions(login_at DESC);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;