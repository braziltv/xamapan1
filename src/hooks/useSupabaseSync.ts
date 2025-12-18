import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type CallType = 'triage' | 'doctor' | 'ecg' | 'curativos' | 'raiox' | 'enfermaria';

interface CallEvent {
  patient_name: string;
  call_type: CallType;
  destination?: string;
  unit_name: string;
}

export function useSupabaseSync(unitName: string) {
  const lastSyncRef = useRef<number>(0);

  const createCall = useCallback(async (
    patientName: string,
    callType: CallType,
    destination?: string
  ) => {
    console.log('📞 Creating call:', { patientName, callType, destination, unitName });
    
    // First, mark any existing active call of this type as completed
    const { error: updateError } = await supabase
      .from('patient_calls')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('unit_name', unitName)
      .eq('call_type', callType)
      .eq('status', 'active');

    if (updateError) {
      console.error('Error marking previous call as completed:', updateError);
    }

    // Create new active call
    const { data: callData, error: callError } = await supabase
      .from('patient_calls')
      .insert({
        unit_name: unitName,
        call_type: callType,
        patient_name: patientName,
        destination: destination || null,
        status: 'active',
      })
      .select()
      .single();

    if (callError) {
      console.error('❌ Error creating call:', callError);
    } else {
      console.log('✅ Call created successfully:', callData);
    }

    // Add to history
    const { error: historyError } = await supabase
      .from('call_history')
      .insert({
        unit_name: unitName,
        call_type: callType,
        patient_name: patientName,
        destination: destination || null,
        completion_type: 'pending', // Will be updated when call is completed
      });

    if (historyError) {
      console.error('Error adding to history:', historyError);
    }
  }, [unitName]);

  const completeCall = useCallback(async (
    callType: CallType,
    completionType: 'completed' | 'withdrawal' = 'completed'
  ) => {
    // Get the active call to find the patient name
    const { data: activeCall } = await supabase
      .from('patient_calls')
      .select('patient_name')
      .eq('unit_name', unitName)
      .eq('call_type', callType)
      .eq('status', 'active')
      .single();

    // Complete the patient_calls record
    const { error } = await supabase
      .from('patient_calls')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('unit_name', unitName)
      .eq('call_type', callType)
      .eq('status', 'active');

    if (error) {
      console.error('Error completing call:', error);
    }

    // Update the most recent history record for this patient with the completion type
    if (activeCall?.patient_name) {
      const { error: historyError } = await supabase
        .from('call_history')
        .update({ completion_type: completionType })
        .eq('unit_name', unitName)
        .eq('patient_name', activeCall.patient_name)
        .eq('completion_type', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (historyError) {
        console.error('Error updating history completion type:', historyError);
      }
    }
  }, [unitName]);

  return {
    createCall,
    completeCall,
  };
}

export function useRealtimeCalls(
  unitName: string,
  onNewCall: (call: CallEvent) => void
) {
  const processedCallsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!unitName) return;

    // Subscribe to new patient calls
    const channel = supabase
      .channel('patient-calls-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patient_calls',
          filter: `unit_name=eq.${unitName}`,
        },
        (payload) => {
          const call = payload.new as any;
          
          // Prevent duplicate processing
          if (processedCallsRef.current.has(call.id)) return;
          processedCallsRef.current.add(call.id);

          if (call.status === 'active') {
            onNewCall({
              patient_name: call.patient_name,
              call_type: call.call_type,
              destination: call.destination,
              unit_name: call.unit_name,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitName, onNewCall]);
}

export async function fetchActiveCalls(unitName: string) {
  const { data, error } = await supabase
    .from('patient_calls')
    .select('*')
    .eq('unit_name', unitName)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching calls:', error);
    return { triageCall: null, doctorCall: null };
  }

  const triageCall = data?.find(c => c.call_type === 'triage') || null;
  const doctorCall = data?.find(c => c.call_type === 'doctor') || null;

  return { triageCall, doctorCall };
}

export async function fetchCallHistory(unitName: string, limit = 20) {
  const { data, error } = await supabase
    .from('call_history')
    .select('*')
    .eq('unit_name', unitName)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching history:', error);
    return [];
  }

  return data || [];
}
