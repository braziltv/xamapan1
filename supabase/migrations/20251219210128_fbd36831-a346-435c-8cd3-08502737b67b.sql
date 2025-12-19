-- Create table for scheduled audio announcements
CREATE TABLE public.scheduled_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name TEXT NOT NULL,
  title TEXT NOT NULL,
  text_content TEXT NOT NULL,
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Sunday, 1=Monday, etc.
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  interval_minutes INTEGER NOT NULL DEFAULT 60, -- How often to repeat within the time window
  repeat_count INTEGER NOT NULL DEFAULT 1, -- How many times to play each occurrence
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  last_played_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_announcements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view scheduled announcements"
ON public.scheduled_announcements
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert scheduled announcements"
ON public.scheduled_announcements
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update scheduled announcements"
ON public.scheduled_announcements
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete scheduled announcements"
ON public.scheduled_announcements
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_announcements_updated_at
BEFORE UPDATE ON public.scheduled_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_announcements;