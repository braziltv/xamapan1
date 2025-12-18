-- Function to clean up duplicate patient_calls records
-- Keeps only the most recent/active record for each patient_name per unit_name
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_patients()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER := 0;
  dup RECORD;
BEGIN
  -- Find and delete duplicates, keeping the one with highest priority status or most recent
  FOR dup IN
    WITH ranked AS (
      SELECT 
        id,
        patient_name,
        unit_name,
        status,
        call_type,
        created_at,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(patient_name)), unit_name
          ORDER BY 
            -- Prioritize by status: active > waiting > completed
            CASE status 
              WHEN 'active' THEN 1 
              WHEN 'waiting' THEN 2 
              ELSE 3 
            END,
            -- Then by call_type progression
            CASE call_type
              WHEN 'enfermaria' THEN 1
              WHEN 'raiox' THEN 2
              WHEN 'curativos' THEN 3
              WHEN 'ecg' THEN 4
              WHEN 'doctor' THEN 5
              WHEN 'triage' THEN 6
              WHEN 'registration' THEN 7
              ELSE 8
            END,
            -- Finally by most recent
            created_at DESC
        ) AS rn
      FROM patient_calls
      WHERE status IN ('waiting', 'active')
    )
    SELECT id FROM ranked WHERE rn > 1
  LOOP
    DELETE FROM patient_calls WHERE id = dup.id;
    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN deleted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_patients() TO anon, authenticated, service_role;