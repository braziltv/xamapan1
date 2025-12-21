-- Create table for Telegram recipients per unit
CREATE TABLE public.telegram_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  receives_daily_report BOOLEAN NOT NULL DEFAULT true,
  receives_weekly_report BOOLEAN NOT NULL DEFAULT true,
  receives_alerts BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unit_id, chat_id)
);

-- Enable RLS
ALTER TABLE public.telegram_recipients ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view telegram recipients"
  ON public.telegram_recipients
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage telegram recipients"
  ON public.telegram_recipients
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_telegram_recipients_updated_at
  BEFORE UPDATE ON public.telegram_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_telegram_recipients_unit_id ON public.telegram_recipients(unit_id);
CREATE INDEX idx_telegram_recipients_active ON public.telegram_recipients(is_active) WHERE is_active = true;