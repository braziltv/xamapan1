-- Remove the old check constraint and add a new one with all valid call types
ALTER TABLE public.patient_calls DROP CONSTRAINT IF EXISTS patient_calls_call_type_check;

-- Add new constraint with all valid call types
ALTER TABLE public.patient_calls ADD CONSTRAINT patient_calls_call_type_check 
CHECK (call_type IN ('triage', 'doctor', 'ecg', 'curativos', 'raiox', 'enfermaria', 'custom'));