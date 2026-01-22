-- Create a security definer function to validate unit access
CREATE OR REPLACE FUNCTION public.validate_unit_access(target_unit_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Allow if user has a profile for this unit OR if no auth context (for service role)
    EXISTS (
      SELECT 1 FROM public.auth_operator_profiles aop
      JOIN public.units u ON u.id = aop.unit_id
      WHERE aop.user_id = auth.uid() 
        AND aop.is_active = true
        AND u.name = target_unit_name
    )
    OR auth.uid() IS NULL  -- Service role bypass
$$;

-- Create trigger function to validate unit_name on insert/update
CREATE OR REPLACE FUNCTION public.validate_unit_name_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip validation for service role (when auth.uid() is null)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if user has access to this unit
  IF NOT public.validate_unit_access(NEW.unit_name) THEN
    RAISE EXCEPTION 'Acesso negado: você não tem permissão para operar na unidade "%"', NEW.unit_name;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add validation triggers to critical tables

-- patient_calls trigger
DROP TRIGGER IF EXISTS validate_patient_calls_unit ON public.patient_calls;
CREATE TRIGGER validate_patient_calls_unit
  BEFORE INSERT OR UPDATE ON public.patient_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_unit_name_trigger();

-- call_history trigger  
DROP TRIGGER IF EXISTS validate_call_history_unit ON public.call_history;
CREATE TRIGGER validate_call_history_unit
  BEFORE INSERT ON public.call_history
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_unit_name_trigger();

-- chat_messages trigger
DROP TRIGGER IF EXISTS validate_chat_messages_unit ON public.chat_messages;
CREATE TRIGGER validate_chat_messages_unit
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_unit_name_trigger();

-- user_sessions trigger
DROP TRIGGER IF EXISTS validate_user_sessions_unit ON public.user_sessions;
CREATE TRIGGER validate_user_sessions_unit
  BEFORE INSERT OR UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_unit_name_trigger();

-- appointments trigger
DROP TRIGGER IF EXISTS validate_appointments_unit ON public.appointments;
CREATE TRIGGER validate_appointments_unit
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_unit_name_trigger();