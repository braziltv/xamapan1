-- Drop the existing constraint and recreate with 'registration' included
ALTER TABLE public.call_history DROP CONSTRAINT IF EXISTS call_history_call_type_check;

ALTER TABLE public.call_history ADD CONSTRAINT call_history_call_type_check 
CHECK (call_type = ANY (ARRAY['triage'::text, 'doctor'::text, 'ecg'::text, 'curativos'::text, 'raiox'::text, 'enfermaria'::text, 'custom'::text, 'registration'::text]));

-- Also check and update patient_calls table if it has same constraint
ALTER TABLE public.patient_calls DROP CONSTRAINT IF EXISTS patient_calls_call_type_check;

ALTER TABLE public.patient_calls ADD CONSTRAINT patient_calls_call_type_check 
CHECK (call_type = ANY (ARRAY['triage'::text, 'doctor'::text, 'ecg'::text, 'curativos'::text, 'raiox'::text, 'enfermaria'::text, 'custom'::text, 'registration'::text]));