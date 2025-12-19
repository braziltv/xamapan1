-- Create table for scheduled commercial phrases
CREATE TABLE public.scheduled_commercial_phrases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name TEXT NOT NULL,
  phrase_content TEXT NOT NULL,
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}'::integer[],
  start_time TIME WITHOUT TIME ZONE NOT NULL DEFAULT '08:00:00'::time,
  end_time TIME WITHOUT TIME ZONE NOT NULL DEFAULT '18:00:00'::time,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '365 days'),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.scheduled_commercial_phrases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view scheduled commercial phrases"
ON public.scheduled_commercial_phrases
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert scheduled commercial phrases"
ON public.scheduled_commercial_phrases
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update scheduled commercial phrases"
ON public.scheduled_commercial_phrases
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete scheduled commercial phrases"
ON public.scheduled_commercial_phrases
FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scheduled_commercial_phrases_updated_at
BEFORE UPDATE ON public.scheduled_commercial_phrases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_commercial_phrases;