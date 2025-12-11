-- Create table for active patient calls
CREATE TABLE public.patient_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name TEXT NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('triage', 'doctor')),
  patient_name TEXT NOT NULL,
  destination TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create table for call history
CREATE TABLE public.call_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name TEXT NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('triage', 'doctor')),
  patient_name TEXT NOT NULL,
  destination TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.patient_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Public access policies for patient_calls (local network use, no auth)
CREATE POLICY "Anyone can view patient calls" 
ON public.patient_calls 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert patient calls" 
ON public.patient_calls 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update patient calls" 
ON public.patient_calls 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete patient calls" 
ON public.patient_calls 
FOR DELETE 
USING (true);

-- Public access policies for call_history
CREATE POLICY "Anyone can view call history" 
ON public.call_history 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert call history" 
ON public.call_history 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history;