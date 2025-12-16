-- Add completion_type column to call_history table
ALTER TABLE public.call_history 
ADD COLUMN completion_type text DEFAULT 'completed';

-- Add comment for documentation
COMMENT ON COLUMN public.call_history.completion_type IS 'Type of completion: completed (consultation done) or withdrawal (patient no-show/desistência)';