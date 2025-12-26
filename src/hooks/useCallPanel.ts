import { useState, useCallback, useEffect, useRef } from 'react';
import { Patient, CallHistory, PatientStatus } from '@/types/patient';
import { useSupabaseSync } from './useSupabaseSync';
import { supabase } from '@/integrations/supabase/client';
import { getBrazilTime } from './useBrazilTime';

const STORAGE_KEYS = {
  PATIENTS: 'callPanel_patients',
  CURRENT_TRIAGE: 'callPanel_currentTriage',
  CURRENT_DOCTOR: 'callPanel_currentDoctor',
  CURRENT_ECG: 'callPanel_currentEcg',
  CURRENT_CURATIVOS: 'callPanel_currentCurativos',
  CURRENT_RAIOX: 'callPanel_currentRaiox',
  CURRENT_ENFERMARIA: 'callPanel_currentEnfermaria',
  HISTORY: 'callPanel_history',
  LAST_CALL_TIMESTAMP: 'callPanel_lastCallTimestamp',
};

const normalizePatientName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

const getStatusRank = (status: PatientStatus): number => {
  switch (status) {
    case 'in-triage':
    case 'in-consultation':
    case 'in-ecg':
    case 'in-curativos':
    case 'in-raiox':
    case 'in-enfermaria':
      return 3;
    case 'waiting-triage':
    case 'waiting-doctor':
    case 'waiting-ecg':
    case 'waiting-curativos':
    case 'waiting-raiox':
    case 'waiting-enfermaria':
      return 2;
    case 'waiting':
      return 1;
    case 'attended':
    default:
      return 0;
  }
};

export function useCallPanel() {
  const [unitName, setUnitName] = useState(() => {
    return localStorage.getItem('selectedUnitName') || '';
  });

  // Re-check localStorage on every render to catch updates
  const currentUnitName = localStorage.getItem('selectedUnitName') || '';
  if (currentUnitName && currentUnitName !== unitName) {
    setUnitName(currentUnitName);
  }

  const { createCall, completeCall } = useSupabaseSync(unitName);

  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PATIENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          calledAt: p.calledAt ? new Date(p.calledAt) : undefined,
        }));
      } catch { return []; }
    }
    return [];
  });

  // Ref to always have the latest patients for callbacks
  const patientsRef = useRef(patients);
  useEffect(() => {
    patientsRef.current = patients;
  }, [patients]);

  const [currentTriageCall, setCurrentTriageCall] = useState<Patient | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_TRIAGE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed ? {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          calledAt: parsed.calledAt ? new Date(parsed.calledAt) : undefined,
        } : null;
      } catch { return null; }
    }
    return null;
  });

  const [currentDoctorCall, setCurrentDoctorCall] = useState<Patient | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_DOCTOR);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed ? {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          calledAt: parsed.calledAt ? new Date(parsed.calledAt) : undefined,
        } : null;
      } catch { return null; }
    }
    return null;
  });

  // Helper to create current call state from localStorage
  const createCurrentCallState = (storageKey: string) => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed ? {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          calledAt: parsed.calledAt ? new Date(parsed.calledAt) : undefined,
        } : null;
      } catch { return null; }
    }
    return null;
  };

  const [currentEcgCall, setCurrentEcgCall] = useState<Patient | null>(() => createCurrentCallState(STORAGE_KEYS.CURRENT_ECG));
  const [currentCurativosCall, setCurrentCurativosCall] = useState<Patient | null>(() => createCurrentCallState(STORAGE_KEYS.CURRENT_CURATIVOS));
  const [currentRaioxCall, setCurrentRaioxCall] = useState<Patient | null>(() => createCurrentCallState(STORAGE_KEYS.CURRENT_RAIOX));
  const [currentEnfermariaCall, setCurrentEnfermariaCall] = useState<Patient | null>(() => createCurrentCallState(STORAGE_KEYS.CURRENT_ENFERMARIA));

  const [history, setHistory] = useState<CallHistory[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((h: any) => ({
          ...h,
          calledAt: new Date(h.calledAt),
          patient: {
            ...h.patient,
            createdAt: new Date(h.patient.createdAt),
            calledAt: h.patient.calledAt ? new Date(h.patient.calledAt) : undefined,
          },
        }));
      } catch { return []; }
    }
    return [];
  });

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Load existing patients from database on mount
  useEffect(() => {
    if (!unitName) return;
    
    const loadPatientsFromDB = async () => {
      const { data, error } = await supabase
        .from('patient_calls')
        .select('*')
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active'])
        .neq('call_type', 'custom') // Exclude custom announcements from patient list
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error loading patients:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const dbPatients: Patient[] = data.map(call => {
          let status: Patient['status'] = 'waiting';
          if (call.call_type === 'triage' && call.status === 'active') {
            status = 'in-triage';
          } else if (call.call_type === 'doctor' && call.status === 'active') {
            status = 'in-consultation';
          } else if (call.call_type === 'registration' && call.status === 'waiting') {
            status = 'waiting';
          }
          
          return {
            id: `patient-${call.id}`,
            name: call.patient_name,
            status,
            priority: (call.priority as 'normal' | 'priority' | 'emergency') || 'normal',
            createdAt: new Date(call.created_at),
            calledAt: call.status === 'active' ? new Date(call.created_at) : undefined,
            calledBy: call.call_type === 'registration' ? undefined : call.call_type as 'triage' | 'doctor',
            destination: call.destination || undefined,
          };
        });
        
        setPatients(prev => {
          // Merge: add DB patients that don't exist locally (normalized)
          const existingKeys = new Set(prev.map(p => normalizePatientName(p.name)));
          const newPatients = dbPatients.filter(p => !existingKeys.has(normalizePatientName(p.name)));
          return [...prev, ...newPatients];
        });
      }
    };
    
    loadPatientsFromDB();
  }, [unitName]);

  // Listen for unit name changes
  useEffect(() => {
    const handleStorage = () => {
      const newUnitName = localStorage.getItem('selectedUnitName') || '';
      if (newUnitName !== unitName) {
        setUnitName(newUnitName);
      }
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [unitName]);

  // Realtime sync for patient_calls - sync patients across devices
  const processedCallIdsRef = useRef<Set<string>>(new Set());
  
  // Function to refresh patients from database
  const refreshPatientsFromDB = useCallback(async () => {
    if (!unitName) return;
    
    const { data, error } = await supabase
      .from('patient_calls')
      .select('*')
      .eq('unit_name', unitName)
      .in('status', ['waiting', 'active'])
      .neq('call_type', 'custom') // Exclude custom announcements from patient list
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error refreshing patients:', error);
      return;
    }
    
    if (data) {
      const dbPatients: Patient[] = data.map(call => {
        let status: Patient['status'] = 'waiting';
        
        if (call.status === 'active') {
          if (call.call_type === 'triage') status = 'in-triage';
          else if (call.call_type === 'doctor') status = 'in-consultation';
          else if (call.call_type === 'ecg') status = 'in-ecg';
          else if (call.call_type === 'curativos') status = 'in-curativos';
          else if (call.call_type === 'raiox') status = 'in-raiox';
          else if (call.call_type === 'enfermaria') status = 'in-enfermaria';
        } else if (call.status === 'waiting') {
          if (call.call_type === 'triage') status = 'waiting-triage';
          else if (call.call_type === 'doctor') status = 'waiting-doctor';
          else if (call.call_type === 'ecg') status = 'waiting-ecg';
          else if (call.call_type === 'curativos') status = 'waiting-curativos';
          else if (call.call_type === 'raiox') status = 'waiting-raiox';
          else if (call.call_type === 'enfermaria') status = 'waiting-enfermaria';
          else if (call.call_type === 'registration') status = 'waiting';
          else status = 'waiting';
        }
        
        return {
          id: `patient-${call.id}`,
          name: call.patient_name,
          status,
          priority: (call.priority as 'normal' | 'priority' | 'emergency') || 'normal',
          createdAt: new Date(call.created_at),
          calledAt: call.status === 'active' ? new Date(call.created_at) : undefined,
          calledBy: call.call_type === 'registration' ? undefined : call.call_type as any,
          destination: call.destination || undefined,
          observations: call.observations || undefined,
        };
      });
      
      // Replace local state with database state to ensure sync (dedupe by name)
      const byName = new Map<string, Patient>();
      for (const p of dbPatients) {
        const key = normalizePatientName(p.name);
        const existing = byName.get(key);
        if (!existing) {
          byName.set(key, p);
          continue;
        }

        const existingRank = getStatusRank(existing.status);
        const candidateRank = getStatusRank(p.status);

        if (candidateRank > existingRank) {
          byName.set(key, p);
          continue;
        }

        if (candidateRank === existingRank && p.createdAt < existing.createdAt) {
          byName.set(key, p);
        }
      }

      const dedupedPatients = Array.from(byName.values()).sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      setPatients(dedupedPatients);
    }
  }, [unitName]);

  useEffect(() => {
    if (!unitName) return;

    console.log('📡 Setting up patient sync subscription for unit:', unitName);
    
    // Clear processed IDs on new subscription
    processedCallIdsRef.current.clear();
    
    // Use unique channel name to avoid conflicts
    const channelName = `patients-sync-${unitName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

    const handleInsert = (payload: any) => {
      const call = payload.new as any;

      const normalizedUnit = (unitName || '').trim().toLowerCase();
      const callUnit = (call.unit_name || '').trim().toLowerCase();
      if (!normalizedUnit || callUnit !== normalizedUnit) {
        return;
      }

      console.log('🔔 Patient sync - received INSERT:', call.patient_name, call.call_type, call.status);
      
      // Skip custom announcements - they're not real patients
      if (call.call_type === 'custom') {
        console.log('⏭️ Skipping custom announcement (not a patient)');
        return;
      }
      
      // Skip if already processed
      if (processedCallIdsRef.current.has(call.id)) {
        console.log('⏭️ Skipping already processed call');
        return;
      }
      processedCallIdsRef.current.add(call.id);
      
      // IMMEDIATE refresh from database to ensure sync
      refreshPatientsFromDB();
    };

    const handleUpdate = (payload: any) => {
      const call = payload.new as any;

      const normalizedUnit = (unitName || '').trim().toLowerCase();
      const callUnit = (call.unit_name || '').trim().toLowerCase();
      if (!normalizedUnit || callUnit !== normalizedUnit) {
        return;
      }

      console.log('🔄 Patient sync - received UPDATE:', call.patient_name, call.status, call.call_type);
      
      // Skip custom announcements - they're not real patients
      if (call.call_type === 'custom') {
        return;
      }
      
      // IMMEDIATE refresh from database to ensure sync
      refreshPatientsFromDB();
    };

    const handleDelete = (payload: any) => {
      const call = payload.old as any;

      const normalizedUnit = (unitName || '').trim().toLowerCase();
      const callUnit = (call.unit_name || '').trim().toLowerCase();
      if (!normalizedUnit || callUnit !== normalizedUnit) {
        return;
      }

      console.log('🗑️ Patient sync - received DELETE:', call.patient_name);
      
      // IMMEDIATE refresh from database to ensure sync
      refreshPatientsFromDB();
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patient_calls',
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patient_calls',
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'patient_calls',
        },
        handleDelete
      )
      .subscribe((status) => {
        console.log('📡 Patient sync subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Patient sync subscription active for:', unitName);
          // Refresh from database when subscription is active to ensure sync
          refreshPatientsFromDB();
        }
      });

    // Periodic refresh every 800ms for faster real-time sync across modules
    const refreshInterval = setInterval(() => {
      refreshPatientsFromDB();
    }, 800);

    return () => {
      console.log('🔌 Cleaning up patient sync subscription');
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [unitName, refreshPatientsFromDB]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_TRIAGE, JSON.stringify(currentTriageCall));
  }, [currentTriageCall]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_DOCTOR, JSON.stringify(currentDoctorCall));
  }, [currentDoctorCall]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ECG, JSON.stringify(currentEcgCall));
  }, [currentEcgCall]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CURATIVOS, JSON.stringify(currentCurativosCall));
  }, [currentCurativosCall]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_RAIOX, JSON.stringify(currentRaioxCall));
  }, [currentRaioxCall]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ENFERMARIA, JSON.stringify(currentEnfermariaCall));
  }, [currentEnfermariaCall]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);

  const triggerCallEvent = useCallback((patient: Patient | { name: string }, caller: 'triage' | 'doctor' | 'ecg' | 'curativos' | 'raiox' | 'enfermaria', destination?: string) => {
    const callEvent = {
      patient,
      caller,
      destination,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.LAST_CALL_TIMESTAMP, JSON.stringify(callEvent));
  }, []);

  const directPatient = useCallback((patientName: string, destination: string) => {
    createCall(patientName, 'triage', destination);
    triggerCallEvent({ name: patientName }, 'triage', destination);
  }, [createCall, triggerCallEvent]);

  const addPatient = useCallback(async (name: string, priority: 'normal' | 'priority' | 'emergency' = 'normal'): Promise<{ patient: Patient; isDuplicate: boolean }> => {
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    const trimmedKey = normalizePatientName(trimmedName);
    
    // Check if patient already exists (not attended)
    const existingPatient = patientsRef.current.find(p => 
      normalizePatientName(p.name) === trimmedKey && p.status !== 'attended'
    );
    
    if (existingPatient) {
      console.log('⚠️ Patient already exists, skipping duplicate:', trimmedName);
      return { patient: existingPatient, isDuplicate: true };
    }
    
    // Create patient already with waiting-triage status (auto-forward to triage queue)
    const newPatient: Patient = {
      id: `patient-${Date.now()}`,
      name: trimmedName,
      status: 'waiting-triage',
      priority,
      createdAt: getBrazilTime(),
      calledBy: 'cadastro',
    };
    setPatients(prev => {
      // Double-check to avoid race conditions
      if (prev.some(p => normalizePatientName(p.name) === trimmedKey && p.status !== 'attended')) {
        return prev;
      }
      return [...prev, newPatient];
    });
    
    // Sync to database - insert directly into triage queue (auto-forward)
    if (unitName) {
      // Check if patient already exists in database
      const { data: existingInDB } = await supabase
        .from('patient_calls')
        .select('id')
        .eq('unit_name', unitName)
        .ilike('patient_name', trimmedName)
        .in('status', ['waiting', 'active'])
        .limit(1);
      
      if (!existingInDB || existingInDB.length === 0) {
        await supabase
          .from('patient_calls')
          .insert({
            unit_name: unitName,
            call_type: 'triage',
            patient_name: trimmedName,
            priority,
            status: 'waiting',
            destination: 'Triagem',
          });
      }
    }
    
    return { patient: newPatient, isDuplicate: false };
  }, [unitName]);

  const updatePatientPriority = useCallback(async (patientId: string, priority: 'normal' | 'priority' | 'emergency') => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, priority } : p
    ));
    
    // Sync to database for real-time updates across all modules
    if (unitName) {
      const patient = patientsRef.current.find(p => p.id === patientId);
      if (patient) {
        await supabase
          .from('patient_calls')
          .update({ priority })
          .eq('patient_name', patient.name)
          .eq('unit_name', unitName)
          .in('status', ['waiting', 'active']);
      }
    }
  }, [unitName]);

  const updatePatientObservations = useCallback(async (patientId: string, observations: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, observations } : p
    ));
    
    // Update in database
    if (unitName) {
      const patient = patientsRef.current.find(p => p.id === patientId);
      if (patient) {
        await supabase
          .from('patient_calls')
          .update({ observations })
          .eq('patient_name', patient.name)
          .eq('unit_name', unitName)
          .eq('status', 'waiting');
      }
    }
  }, [unitName]);

  const callPatientToTriage = useCallback((patientId: string) => {
    setPatients(prev => {
      const patient = prev.find(p => p.id === patientId);
      if (!patient) return prev;

      const updatedPatient: Patient = {
        ...patient,
        status: 'in-triage',
        calledAt: new Date(),
        calledBy: 'triage',
      };

      setCurrentTriageCall(updatedPatient);
      
      setHistory(prevHistory => [{
        id: `history-${Date.now()}`,
        patient: updatedPatient,
        calledAt: new Date(),
        calledBy: 'triage' as const,
      }, ...prevHistory].slice(0, 20));

      // Sync to Supabase
      createCall(updatedPatient.name, 'triage');
      triggerCallEvent(updatedPatient, 'triage');

      return prev.map(p => p.id === patientId ? updatedPatient : p);
    });
  }, [createCall, triggerCallEvent]);

  const callPatientToDoctor = useCallback((patientId: string, destination?: string) => {
    setPatients(prev => {
      const patient = prev.find(p => p.id === patientId);
      if (!patient) return prev;

      const updatedPatient: Patient = {
        ...patient,
        status: 'in-consultation',
        calledAt: new Date(),
        calledBy: 'doctor',
      };

      setCurrentDoctorCall(updatedPatient);
      
      setHistory(prevHistory => [{
        id: `history-${Date.now()}`,
        patient: updatedPatient,
        calledAt: new Date(),
        calledBy: 'doctor' as const,
      }, ...prevHistory].slice(0, 20));

      // Sync to Supabase
      createCall(updatedPatient.name, 'doctor', destination);
      triggerCallEvent(updatedPatient, 'doctor', destination);

      return prev.map(p => p.id === patientId ? updatedPatient : p);
    });
  }, [createCall, triggerCallEvent]);

  const finishTriage = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;
    
    // FIRST update database, then update local state
    if (unitName) {
      const { error } = await supabase
        .from('patient_calls')
        .update({ 
          status: 'waiting', 
          call_type: 'doctor',
        })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
      
      if (error) {
        console.error('Error finishing triage:', error);
        return;
      }
    }
    
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-doctor' as const, calledBy: 'triage' as const } : p
    ));
    if (currentTriageCall?.id === patientId) {
      setCurrentTriageCall(null);
    }
  }, [currentTriageCall, unitName]);

  const finishConsultation = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    
    // Remove patient completely from all modules - consultation completed successfully
    setPatients(prev => prev.filter(p => p.id !== patientId));
    
    // Clear ALL current calls for this patient
    if (currentDoctorCall?.id === patientId) {
      setCurrentDoctorCall(null);
      completeCall('doctor', 'completed');
    }
    if (currentTriageCall?.id === patientId) {
      setCurrentTriageCall(null);
      completeCall('triage', 'completed');
    }
    if (currentEcgCall?.id === patientId) {
      setCurrentEcgCall(null);
      completeCall('ecg', 'completed');
    }
    if (currentCurativosCall?.id === patientId) {
      setCurrentCurativosCall(null);
      completeCall('curativos', 'completed');
    }
    if (currentRaioxCall?.id === patientId) {
      setCurrentRaioxCall(null);
      completeCall('raiox', 'completed');
    }
    if (currentEnfermariaCall?.id === patientId) {
      setCurrentEnfermariaCall(null);
      completeCall('enfermaria', 'completed');
    }
    
    // Also mark as completed in database for sync
    if (unitName && patient) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('unit_name', unitName)
        .eq('patient_name', patient.name)
        .in('status', ['waiting', 'active']);
    }
  }, [currentDoctorCall, currentTriageCall, currentEcgCall, currentCurativosCall, currentRaioxCall, currentEnfermariaCall, completeCall, unitName]);

  const recallTriage = useCallback(() => {
    if (currentTriageCall) {
      createCall(currentTriageCall.name, 'triage');
      triggerCallEvent(currentTriageCall, 'triage');
    }
  }, [currentTriageCall, createCall, triggerCallEvent]);

  const recallDoctor = useCallback((destination?: string) => {
    if (currentDoctorCall) {
      createCall(currentDoctorCall.name, 'doctor', destination);
      triggerCallEvent(currentDoctorCall, 'doctor', destination);
    }
  }, [currentDoctorCall, createCall, triggerCallEvent]);

  const removePatient = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    setPatients(prev => prev.filter(p => p.id !== patientId));
    
    // Clear from all current calls
    if (currentTriageCall?.id === patientId) setCurrentTriageCall(null);
    if (currentDoctorCall?.id === patientId) setCurrentDoctorCall(null);
    if (currentEcgCall?.id === patientId) setCurrentEcgCall(null);
    if (currentCurativosCall?.id === patientId) setCurrentCurativosCall(null);
    if (currentRaioxCall?.id === patientId) setCurrentRaioxCall(null);
    if (currentEnfermariaCall?.id === patientId) setCurrentEnfermariaCall(null);
    
    // Sync removal to database
    if (unitName && patient) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('unit_name', unitName)
        .eq('patient_name', patient.name)
        .in('status', ['waiting', 'active']);
    }
  }, [unitName, currentTriageCall, currentDoctorCall, currentEcgCall, currentCurativosCall, currentRaioxCall, currentEnfermariaCall]);

  const finishWithoutCall = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    
    // Remove patient completely from all modules - patient withdrawal/no-show
    setPatients(prev => prev.filter(p => p.id !== patientId));
    
    // Clear ALL current calls if this patient was being called
    if (currentTriageCall?.id === patientId) {
      setCurrentTriageCall(null);
      completeCall('triage', 'withdrawal');
    }
    if (currentDoctorCall?.id === patientId) {
      setCurrentDoctorCall(null);
      completeCall('doctor', 'withdrawal');
    }
    if (currentEcgCall?.id === patientId) {
      setCurrentEcgCall(null);
      completeCall('ecg', 'withdrawal');
    }
    if (currentCurativosCall?.id === patientId) {
      setCurrentCurativosCall(null);
      completeCall('curativos', 'withdrawal');
    }
    if (currentRaioxCall?.id === patientId) {
      setCurrentRaioxCall(null);
      completeCall('raiox', 'withdrawal');
    }
    if (currentEnfermariaCall?.id === patientId) {
      setCurrentEnfermariaCall(null);
      completeCall('enfermaria', 'withdrawal');
    }
    
    // Sync removal to database
    if (unitName && patient) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('unit_name', unitName)
        .eq('patient_name', patient.name)
        .in('status', ['waiting', 'active']);
    }
  }, [currentTriageCall, currentDoctorCall, currentEcgCall, currentCurativosCall, currentRaioxCall, currentEnfermariaCall, completeCall, unitName]);

  // Forward to triage with voice call on TV
  const forwardToTriage = useCallback(async (patientId: string, destination?: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;

    // Complete ALL existing records for this patient first
    if (unitName) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
    }

    // Create call to show on TV
    createCall(patient.name, 'triage', destination || 'Triagem');
    triggerCallEvent({ name: patient.name }, 'triage', destination || 'Triagem');

    const updatedPatient: Patient = {
      ...patient,
      status: 'waiting-triage' as const,
      calledAt: new Date(),
    };
    
    // Set as current triage call so it appears in "Chamada Atual"
    setCurrentTriageCall(updatedPatient);

    // Update patient in list
    setPatients(prev => prev.map(p => 
      p.id === patientId ? updatedPatient : p
    ));
    
    // Clear from other current calls
    if (currentDoctorCall?.id === patientId) setCurrentDoctorCall(null);
    if (currentEcgCall?.id === patientId) setCurrentEcgCall(null);
    if (currentCurativosCall?.id === patientId) setCurrentCurativosCall(null);
    if (currentRaioxCall?.id === patientId) setCurrentRaioxCall(null);
    if (currentEnfermariaCall?.id === patientId) setCurrentEnfermariaCall(null);
    
    // Immediate refresh for real-time sync
    refreshPatientsFromDB();
  }, [createCall, triggerCallEvent, unitName, currentDoctorCall, currentEcgCall, currentCurativosCall, currentRaioxCall, currentEnfermariaCall, refreshPatientsFromDB]);

  // Helper to clear patient from all current call states
  const clearPatientFromAllCurrentCalls = useCallback((patientId: string) => {
    if (currentTriageCall?.id === patientId) setCurrentTriageCall(null);
    if (currentDoctorCall?.id === patientId) setCurrentDoctorCall(null);
    if (currentEcgCall?.id === patientId) setCurrentEcgCall(null);
    if (currentCurativosCall?.id === patientId) setCurrentCurativosCall(null);
    if (currentRaioxCall?.id === patientId) setCurrentRaioxCall(null);
    if (currentEnfermariaCall?.id === patientId) setCurrentEnfermariaCall(null);
  }, [currentTriageCall, currentDoctorCall, currentEcgCall, currentCurativosCall, currentRaioxCall, currentEnfermariaCall]);

  // Send to triage queue WITHOUT TV announcement (registration uses this)
  const sendToTriageQueue = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;
    
    if (unitName) {
      // Complete ALL existing records for this patient first
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
      
      // Insert a new record with the new queue
      const { error } = await supabase
        .from('patient_calls')
        .insert({ 
          patient_name: patient.name,
          unit_name: unitName,
          status: 'waiting', 
          call_type: 'triage',
          destination: 'Triagem',
          priority: patient.priority || 'normal',
          observations: patient.observations || null,
        });
      
      if (error) {
        console.error('Error forwarding to Triage:', error);
        return;
      }
      
      // Immediate refresh for real-time sync
      refreshPatientsFromDB();
    }
    
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-triage' as const, calledBy: 'cadastro' as const } : p
    ));
    clearPatientFromAllCurrentCalls(patientId);
  }, [unitName, clearPatientFromAllCurrentCalls, refreshPatientsFromDB]);

  // Send to doctor queue WITHOUT TV announcement (triage uses this)
  const sendToDoctorQueue = useCallback(async (patientId: string, destination?: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;
    
    if (unitName) {
      // Complete ALL existing records for this patient first
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
      
      // Insert a new record with the new queue
      const { error } = await supabase
        .from('patient_calls')
        .insert({ 
          patient_name: patient.name,
          unit_name: unitName,
          status: 'waiting', 
          call_type: 'doctor',
          destination: destination || null,
          priority: patient.priority || 'normal',
          observations: patient.observations || null,
        });
      
      if (error) {
        console.error('Error forwarding to Doctor:', error);
        return;
      }
      
      // Immediate refresh for real-time sync
      refreshPatientsFromDB();
    }
    
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-doctor' as const, destination, calledBy: 'triage' } : p
    ));
    clearPatientFromAllCurrentCalls(patientId);
  }, [unitName, clearPatientFromAllCurrentCalls, refreshPatientsFromDB]);

  // Forward to doctor WITH voice call on TV (doctor panel uses this)
  const forwardToDoctor = useCallback(async (patientId: string, destination?: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;

    // Complete ALL existing records for this patient first
    if (unitName) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
    }

    // Create call to show on TV
    createCall(patient.name, 'doctor', destination || 'Consultório Médico');
    triggerCallEvent({ name: patient.name }, 'doctor', destination || 'Consultório Médico');

    // Update patient in list
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-doctor' as const, calledAt: new Date(), destination, calledBy: 'doctor' } : p
    ));
    
    // Clear from all other current calls
    if (currentTriageCall?.id === patientId) setCurrentTriageCall(null);
    if (currentEcgCall?.id === patientId) setCurrentEcgCall(null);
    if (currentCurativosCall?.id === patientId) setCurrentCurativosCall(null);
    if (currentRaioxCall?.id === patientId) setCurrentRaioxCall(null);
    if (currentEnfermariaCall?.id === patientId) setCurrentEnfermariaCall(null);
    
    // Immediate refresh for real-time sync
    refreshPatientsFromDB();
  }, [createCall, triggerCallEvent, unitName, currentTriageCall, currentEcgCall, currentCurativosCall, currentRaioxCall, currentEnfermariaCall, refreshPatientsFromDB]);

  // Generic function to call patient to a service
  const callPatientToService = useCallback((
    patientId: string, 
    serviceType: 'ecg' | 'curativos' | 'raiox' | 'enfermaria',
    statusWaiting: PatientStatus,
    statusInService: PatientStatus,
    setCurrentCall: React.Dispatch<React.SetStateAction<Patient | null>>,
    destination?: string
  ) => {
    setPatients(prev => {
      const patient = prev.find(p => p.id === patientId);
      if (!patient) return prev;

      const updatedPatient: Patient = {
        ...patient,
        status: statusInService,
        calledAt: new Date(),
        calledBy: serviceType,
        destination,
      };

      setCurrentCall(updatedPatient);
      
      setHistory(prevHistory => [{
        id: `history-${Date.now()}`,
        patient: updatedPatient,
        calledAt: new Date(),
        calledBy: serviceType,
      }, ...prevHistory].slice(0, 20));

      // Sync to Supabase
      createCall(updatedPatient.name, serviceType, destination);
      triggerCallEvent(updatedPatient, serviceType, destination);

      return prev.map(p => p.id === patientId ? updatedPatient : p);
    });
  }, [createCall, triggerCallEvent]);

  // ECG functions
  const callPatientToEcg = useCallback((patientId: string, destination?: string) => {
    callPatientToService(patientId, 'ecg', 'waiting-ecg', 'in-ecg', setCurrentEcgCall, destination || 'Sala de Eletrocardiograma');
  }, [callPatientToService]);

  const finishEcg = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    setPatients(prev => prev.filter(p => p.id !== patientId));
    if (currentEcgCall?.id === patientId) {
      setCurrentEcgCall(null);
      completeCall('ecg', 'completed');
    }
    if (unitName && patient) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('unit_name', unitName)
        .eq('patient_name', patient.name)
        .in('status', ['waiting', 'active']);
    }
  }, [currentEcgCall, completeCall, unitName]);

  const recallEcg = useCallback((destination?: string) => {
    if (currentEcgCall) {
      createCall(currentEcgCall.name, 'ecg', destination || 'Sala de Eletrocardiograma');
      triggerCallEvent(currentEcgCall, 'ecg', destination || 'Sala de Eletrocardiograma');
    }
  }, [currentEcgCall, createCall, triggerCallEvent]);

  // Curativos functions
  const callPatientToCurativos = useCallback((patientId: string, destination?: string) => {
    callPatientToService(patientId, 'curativos', 'waiting-curativos', 'in-curativos', setCurrentCurativosCall, destination || 'Sala de Curativos');
  }, [callPatientToService]);

  const finishCurativos = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    setPatients(prev => prev.filter(p => p.id !== patientId));
    if (currentCurativosCall?.id === patientId) {
      setCurrentCurativosCall(null);
      completeCall('curativos', 'completed');
    }
    if (unitName && patient) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('unit_name', unitName)
        .eq('patient_name', patient.name)
        .in('status', ['waiting', 'active']);
    }
  }, [currentCurativosCall, completeCall, unitName]);

  const recallCurativos = useCallback((destination?: string) => {
    if (currentCurativosCall) {
      createCall(currentCurativosCall.name, 'curativos', destination || 'Sala de Curativos');
      triggerCallEvent(currentCurativosCall, 'curativos', destination || 'Sala de Curativos');
    }
  }, [currentCurativosCall, createCall, triggerCallEvent]);

  // Raio X functions
  const callPatientToRaiox = useCallback((patientId: string, destination?: string) => {
    callPatientToService(patientId, 'raiox', 'waiting-raiox', 'in-raiox', setCurrentRaioxCall, destination || 'Sala de Raio X');
  }, [callPatientToService]);

  const finishRaiox = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    setPatients(prev => prev.filter(p => p.id !== patientId));
    if (currentRaioxCall?.id === patientId) {
      setCurrentRaioxCall(null);
      completeCall('raiox', 'completed');
    }
    if (unitName && patient) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('unit_name', unitName)
        .eq('patient_name', patient.name)
        .in('status', ['waiting', 'active']);
    }
  }, [currentRaioxCall, completeCall, unitName]);

  const recallRaiox = useCallback((destination?: string) => {
    if (currentRaioxCall) {
      createCall(currentRaioxCall.name, 'raiox', destination || 'Sala de Raio X');
      triggerCallEvent(currentRaioxCall, 'raiox', destination || 'Sala de Raio X');
    }
  }, [currentRaioxCall, createCall, triggerCallEvent]);

  // Enfermaria functions
  const callPatientToEnfermaria = useCallback((patientId: string, destination?: string) => {
    callPatientToService(patientId, 'enfermaria', 'waiting-enfermaria', 'in-enfermaria', setCurrentEnfermariaCall, destination || 'Enfermaria');
  }, [callPatientToService]);

  const finishEnfermaria = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    setPatients(prev => prev.filter(p => p.id !== patientId));
    if (currentEnfermariaCall?.id === patientId) {
      setCurrentEnfermariaCall(null);
      completeCall('enfermaria', 'completed');
    }
    if (unitName && patient) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('unit_name', unitName)
        .eq('patient_name', patient.name)
        .in('status', ['waiting', 'active']);
    }
  }, [currentEnfermariaCall, completeCall, unitName]);

  const recallEnfermaria = useCallback((destination?: string) => {
    if (currentEnfermariaCall) {
      createCall(currentEnfermariaCall.name, 'enfermaria', destination || 'Enfermaria');
      triggerCallEvent(currentEnfermariaCall, 'enfermaria', destination || 'Enfermaria');
    }
  }, [currentEnfermariaCall, createCall, triggerCallEvent]);

  // Send to service queues WITHOUT TV announcement - with database sync
  const sendToEcgQueue = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;
    
    if (unitName) {
      // Complete ALL existing records for this patient first
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
      
      // Insert a new record with the new queue
      const { error } = await supabase
        .from('patient_calls')
        .insert({ 
          patient_name: patient.name,
          unit_name: unitName,
          status: 'waiting', 
          call_type: 'ecg',
          destination: 'Sala de Eletrocardiograma',
          priority: patient.priority || 'normal',
          observations: patient.observations || null,
        });
      
      if (error) {
        console.error('Error forwarding to ECG:', error);
        return;
      }
      
      // Immediate refresh for real-time sync
      refreshPatientsFromDB();
    }
    
    // Only update local state after DB success
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-ecg' as PatientStatus, destination: 'Sala de Eletrocardiograma', calledBy: 'ecg' as const } : p
    ));
    clearPatientFromAllCurrentCalls(patientId);
  }, [unitName, clearPatientFromAllCurrentCalls, refreshPatientsFromDB]);

  const sendToCurativosQueue = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;
    
    if (unitName) {
      // Complete ALL existing records for this patient first
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
      
      // Insert a new record with the new queue
      const { error } = await supabase
        .from('patient_calls')
        .insert({ 
          patient_name: patient.name,
          unit_name: unitName,
          status: 'waiting', 
          call_type: 'curativos',
          destination: 'Sala de Curativos',
          priority: patient.priority || 'normal',
          observations: patient.observations || null,
        });
      
      if (error) {
        console.error('Error forwarding to Curativos:', error);
        return;
      }
      
      // Immediate refresh for real-time sync
      refreshPatientsFromDB();
    }
    
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-curativos' as PatientStatus, destination: 'Sala de Curativos', calledBy: 'curativos' as const } : p
    ));
    clearPatientFromAllCurrentCalls(patientId);
  }, [unitName, clearPatientFromAllCurrentCalls, refreshPatientsFromDB]);

  const sendToRaioxQueue = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;
    
    if (unitName) {
      // Complete ALL existing records for this patient first
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
      
      // Insert a new record with the new queue
      const { error } = await supabase
        .from('patient_calls')
        .insert({ 
          patient_name: patient.name,
          unit_name: unitName,
          status: 'waiting', 
          call_type: 'raiox',
          destination: 'Sala de Raio X',
          priority: patient.priority || 'normal',
          observations: patient.observations || null,
        });
      
      if (error) {
        console.error('Error forwarding to Raio X:', error);
        return;
      }
      
      // Immediate refresh for real-time sync
      refreshPatientsFromDB();
    }
    
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-raiox' as PatientStatus, destination: 'Sala de Raio X', calledBy: 'raiox' as const } : p
    ));
    clearPatientFromAllCurrentCalls(patientId);
  }, [unitName, clearPatientFromAllCurrentCalls, refreshPatientsFromDB]);

  const sendToEnfermariaQueue = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;
    
    if (unitName) {
      // Complete ALL existing records for this patient first
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
      
      // Insert a new record with the new queue
      const { error } = await supabase
        .from('patient_calls')
        .insert({ 
          patient_name: patient.name,
          unit_name: unitName,
          status: 'waiting', 
          call_type: 'enfermaria',
          destination: 'Enfermaria',
          priority: patient.priority || 'normal',
          observations: patient.observations || null,
        });
      
      if (error) {
        console.error('Error forwarding to Enfermaria:', error);
        return;
      }
      
      // Immediate refresh for real-time sync
      refreshPatientsFromDB();
    }
    
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-enfermaria' as PatientStatus, destination: 'Enfermaria', calledBy: 'enfermaria' as const } : p
    ));
    clearPatientFromAllCurrentCalls(patientId);
  }, [unitName, clearPatientFromAllCurrentCalls, refreshPatientsFromDB]);

  // Forward to ECG WITH voice call on TV
  const forwardToEcg = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;

    // Complete ALL existing records for this patient first
    if (unitName) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
    }

    // createCall will insert a new active record
    createCall(patient.name, 'ecg', 'Sala de Eletrocardiograma');
    triggerCallEvent({ name: patient.name }, 'ecg', 'Sala de Eletrocardiograma');

    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-ecg' as const, calledAt: new Date(), calledBy: 'ecg' as const, destination: 'Sala de Eletrocardiograma' } : p
    ));
    clearPatientFromAllCurrentCalls(patientId);
    
    // Immediate refresh for real-time sync
    refreshPatientsFromDB();
  }, [createCall, triggerCallEvent, unitName, clearPatientFromAllCurrentCalls, refreshPatientsFromDB]);

  // Forward to Curativos WITH voice call on TV
  const forwardToCurativos = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;

    if (unitName) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
    }

    createCall(patient.name, 'curativos', 'Sala de Curativos');
    triggerCallEvent({ name: patient.name }, 'curativos', 'Sala de Curativos');

    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-curativos' as const, calledAt: new Date(), calledBy: 'curativos' as const, destination: 'Sala de Curativos' } : p
    ));
    clearPatientFromAllCurrentCalls(patientId);
    
    // Immediate refresh for real-time sync
    refreshPatientsFromDB();
  }, [createCall, triggerCallEvent, unitName, clearPatientFromAllCurrentCalls, refreshPatientsFromDB]);

  // Forward to Raio X WITH voice call on TV
  const forwardToRaiox = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;

    if (unitName) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
    }

    createCall(patient.name, 'raiox', 'Sala de Raio X');
    triggerCallEvent({ name: patient.name }, 'raiox', 'Sala de Raio X');

    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-raiox' as const, calledAt: new Date(), calledBy: 'raiox' as const, destination: 'Sala de Raio X' } : p
    ));
    clearPatientFromAllCurrentCalls(patientId);
    
    // Immediate refresh for real-time sync
    refreshPatientsFromDB();
  }, [createCall, triggerCallEvent, unitName, clearPatientFromAllCurrentCalls, refreshPatientsFromDB]);

  // Forward to Enfermaria WITH voice call on TV
  const forwardToEnfermaria = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;

    if (unitName) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('patient_name', patient.name)
        .eq('unit_name', unitName)
        .in('status', ['waiting', 'active']);
    }

    createCall(patient.name, 'enfermaria', 'Enfermaria');
    triggerCallEvent({ name: patient.name }, 'enfermaria', 'Enfermaria');

    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-enfermaria' as const, calledAt: new Date(), calledBy: 'enfermaria' as const, destination: 'Enfermaria' } : p
    ));
    clearPatientFromAllCurrentCalls(patientId);
    
    // Immediate refresh for real-time sync
    refreshPatientsFromDB();
  }, [createCall, triggerCallEvent, unitName, clearPatientFromAllCurrentCalls, refreshPatientsFromDB]);

  // Sort by priority first (emergency > priority > normal), then by time
  const priorityOrder = { emergency: 0, priority: 1, normal: 2 };
  
  const sortByPriority = (a: Patient, b: Patient) => {
    const priorityDiff = priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
    if (priorityDiff !== 0) return priorityDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  };

  const waitingForTriage = patients.filter(p => p.status === 'waiting-triage').sort(sortByPriority);
  const waitingForDoctor = patients.filter(p => p.status === 'waiting-doctor').sort(sortByPriority);
  const waitingForEcg = patients.filter(p => p.status === 'waiting-ecg').sort(sortByPriority);
  const waitingForCurativos = patients.filter(p => p.status === 'waiting-curativos').sort(sortByPriority);
  const waitingForRaiox = patients.filter(p => p.status === 'waiting-raiox').sort(sortByPriority);
  const waitingForEnfermaria = patients.filter(p => p.status === 'waiting-enfermaria').sort(sortByPriority);

  return {
    patients,
    waitingForTriage,
    waitingForDoctor,
    waitingForEcg,
    waitingForCurativos,
    waitingForRaiox,
    waitingForEnfermaria,
    currentTriageCall,
    currentDoctorCall,
    currentEcgCall,
    currentCurativosCall,
    currentRaioxCall,
    currentEnfermariaCall,
    history,
    isAudioEnabled,
    setIsAudioEnabled,
    addPatient,
    removePatient,
    callPatientToTriage,
    callPatientToDoctor,
    callPatientToEcg,
    callPatientToCurativos,
    callPatientToRaiox,
    callPatientToEnfermaria,
    finishTriage,
    finishConsultation,
    finishEcg,
    finishCurativos,
    finishRaiox,
    finishEnfermaria,
    recallTriage,
    recallDoctor,
    recallEcg,
    recallCurativos,
    recallRaiox,
    recallEnfermaria,
    directPatient,
    finishWithoutCall,
    forwardToTriage,
    forwardToDoctor,
    forwardToEcg,
    forwardToCurativos,
    forwardToRaiox,
    forwardToEnfermaria,
    sendToTriageQueue,
    sendToDoctorQueue,
    sendToEcgQueue,
    sendToCurativosQueue,
    sendToRaioxQueue,
    sendToEnfermariaQueue,
    updatePatientPriority,
    updatePatientObservations,
  };
}
