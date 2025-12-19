-- Add commercial phrases columns to unit_settings
ALTER TABLE public.unit_settings
ADD COLUMN commercial_phrase_1 text DEFAULT NULL,
ADD COLUMN commercial_phrase_2 text DEFAULT NULL,
ADD COLUMN commercial_phrase_3 text DEFAULT NULL;