import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBrazilTime } from './useBrazilTime';

const INACTIVE_THRESHOLD_MINUTES = 10;
const CLEANUP_INTERVAL_MS = 60000; // Check every minute

/**
 * Hook to automatically remove patients from queues after 10 minutes of inactivity
 * and filter out patients from previous days
 */
export function useInactivePatientCleanup(unitName: string) {
  const lastCleanupRef = useRef<Date>(new Date());

  const cleanupInactivePatients = useCallback(async () => {
    if (!unitName) return;

    const now = getBrazilTime();
    const thresholdTime = new Date(now.getTime() - INACTIVE_THRESHOLD_MINUTES * 60 * 1000);
    
    // Get today's date in Brazil timezone (YYYY-MM-DD format)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    console.log(`🧹 Running patient cleanup for ${unitName}`);
    console.log(`  - Inactive threshold: ${thresholdTime.toISOString()}`);
    console.log(`  - Today start: ${todayStart.toISOString()}`);

    try {
      // 1. Delete patients from previous days (not today)
      const { data: oldPatients, error: oldError } = await supabase
        .from('patient_calls')
        .delete()
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active'])
        .lt('created_at', todayStart.toISOString())
        .select('id, patient_name');

      if (oldError) {
        console.error('Error deleting old patients:', oldError);
      } else if (oldPatients && oldPatients.length > 0) {
        console.log(`🗑️ Removed ${oldPatients.length} patients from previous days:`, 
          oldPatients.map(p => p.patient_name).join(', '));
      }

      // 2. Delete patients with status 'active' that are inactive for more than 10 minutes
      const { data: inactiveActivePatients, error: inactiveActiveError } = await supabase
        .from('patient_calls')
        .delete()
        .eq('unit_name', unitName)
        .eq('status', 'active')
        .lt('created_at', thresholdTime.toISOString())
        .select('id, patient_name, call_type');

      if (inactiveActiveError) {
        console.error('Error deleting inactive active patients:', inactiveActiveError);
      } else if (inactiveActivePatients && inactiveActivePatients.length > 0) {
        console.log(`⏰ Removed ${inactiveActivePatients.length} inactive 'active' patients (>10 min):`, 
          inactiveActivePatients.map(p => `${p.patient_name} (${p.call_type})`).join(', '));
      }

      // 3. Delete patients with status 'waiting' that have been waiting for more than 10 minutes
      //    These are patients who were called but never attended
      const { data: inactiveWaitingPatients, error: inactiveWaitingError } = await supabase
        .from('patient_calls')
        .delete()
        .eq('unit_name', unitName)
        .eq('status', 'waiting')
        .lt('created_at', thresholdTime.toISOString())
        .select('id, patient_name, call_type');

      if (inactiveWaitingError) {
        console.error('Error deleting inactive waiting patients:', inactiveWaitingError);
      } else if (inactiveWaitingPatients && inactiveWaitingPatients.length > 0) {
        console.log(`⏰ Removed ${inactiveWaitingPatients.length} inactive 'waiting' patients (>10 min):`, 
          inactiveWaitingPatients.map(p => `${p.patient_name} (${p.call_type})`).join(', '));
      }

      lastCleanupRef.current = now;

    } catch (error) {
      console.error('Error in patient cleanup:', error);
    }
  }, [unitName]);

  // Run cleanup on mount and periodically
  useEffect(() => {
    if (!unitName) return;

    // Run immediately on mount
    cleanupInactivePatients();

    // Set up periodic cleanup
    const interval = setInterval(cleanupInactivePatients, CLEANUP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [unitName, cleanupInactivePatients]);

  return { cleanupInactivePatients };
}
