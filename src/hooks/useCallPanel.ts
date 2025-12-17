import { useState, useCallback, useEffect, useRef } from 'react';
import { Patient, CallHistory } from '@/types/patient';
import { useSupabaseSync } from './useSupabaseSync';
import { supabase } from '@/integrations/supabase/client';
import { getBrazilTime } from './useBrazilTime';

const STORAGE_KEYS = {
  PATIENTS: 'callPanel_patients',
  CURRENT_TRIAGE: 'callPanel_currentTriage',
  CURRENT_DOCTOR: 'callPanel_currentDoctor',
  HISTORY: 'callPanel_history',
  LAST_CALL_TIMESTAMP: 'callPanel_lastCallTimestamp',
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
          // Merge: add DB patients that don't exist locally
          const existingNames = new Set(prev.map(p => p.name));
          const newPatients = dbPatients.filter(p => !existingNames.has(p.name));
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
  
  useEffect(() => {
    if (!unitName) return;

    const channel = supabase
      .channel('patients-sync')
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
          
          // Skip if already processed
          if (processedCallIdsRef.current.has(call.id)) return;
          processedCallIdsRef.current.add(call.id);
          
          // Check if this patient already exists locally
          const patientExists = patientsRef.current.some(p => p.name === call.patient_name && p.status !== 'attended');
          
          if (!patientExists) {
            // Determine status based on call_type
            let status: Patient['status'] = 'waiting';
            if (call.call_type === 'triage' && call.status === 'active') {
              status = 'in-triage';
            } else if (call.call_type === 'doctor' && call.status === 'active') {
              status = 'in-consultation';
            } else if (call.status === 'waiting') {
              status = 'waiting';
            }
            
            // Add patient from another device
            const newPatient: Patient = {
              id: `patient-${call.id}`,
              name: call.patient_name,
              status,
              priority: call.priority || 'normal',
              createdAt: new Date(call.created_at),
              calledAt: call.status === 'active' ? new Date(call.created_at) : undefined,
              calledBy: call.call_type === 'registration' ? undefined : call.call_type,
              destination: call.destination,
            };
            
            setPatients(prev => {
              // Double-check to avoid duplicates
              if (prev.some(p => p.name === call.patient_name && p.status !== 'attended')) {
                return prev;
              }
              return [...prev, newPatient];
            });
            
            // Set as current call if active
            if (call.status === 'active') {
              if (call.call_type === 'triage') {
                setCurrentTriageCall(newPatient);
              } else if (call.call_type === 'doctor') {
                setCurrentDoctorCall(newPatient);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patient_calls',
          filter: `unit_name=eq.${unitName}`,
        },
        (payload) => {
          const call = payload.new as any;
          
          // If status changed to completed, remove patient from local state
          if (call.status === 'completed') {
            setPatients(prev => prev.filter(p => p.name !== call.patient_name));
            
            // Also clear current calls if this patient was being called
            setCurrentTriageCall(prev => prev?.name === call.patient_name ? null : prev);
            setCurrentDoctorCall(prev => prev?.name === call.patient_name ? null : prev);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitName]);

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
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);

  const triggerCallEvent = useCallback((patient: Patient | { name: string }, caller: 'triage' | 'doctor', destination?: string) => {
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

  const addPatient = useCallback(async (name: string, priority: 'normal' | 'priority' | 'emergency' = 'normal') => {
    const newPatient: Patient = {
      id: `patient-${Date.now()}`,
      name: name.trim(),
      status: 'waiting',
      priority,
      createdAt: getBrazilTime(),
    };
    setPatients(prev => [...prev, newPatient]);
    
    // Sync to database for multi-device synchronization
    if (unitName) {
      await supabase
        .from('patient_calls')
        .insert({
          unit_name: unitName,
          call_type: 'registration',
          patient_name: name.trim(),
          priority,
          status: 'waiting',
        });
    }
    
    return newPatient;
  }, [unitName]);

  const updatePatientPriority = useCallback((patientId: string, priority: 'normal' | 'priority' | 'emergency') => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, priority } : p
    ));
  }, []);

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

  const finishTriage = useCallback((patientId: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-doctor' as const } : p
    ));
    if (currentTriageCall?.id === patientId) {
      setCurrentTriageCall(null);
      completeCall('triage', 'completed');
      // TTS cache is preserved for 72 hours and cleaned automatically
    }
  }, [currentTriageCall, completeCall]);

  const finishConsultation = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    
    // Remove patient completely from all modules - consultation completed successfully
    setPatients(prev => prev.filter(p => p.id !== patientId));
    if (currentDoctorCall?.id === patientId) {
      setCurrentDoctorCall(null);
      completeCall('doctor', 'completed');
    }
    if (currentTriageCall?.id === patientId) {
      setCurrentTriageCall(null);
      completeCall('triage', 'completed');
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
  }, [currentDoctorCall, currentTriageCall, completeCall, unitName]);

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
    
    // Sync removal to database
    if (unitName && patient) {
      await supabase
        .from('patient_calls')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('unit_name', unitName)
        .eq('patient_name', patient.name)
        .in('status', ['waiting', 'active']);
    }
  }, [unitName]);

  const finishWithoutCall = useCallback(async (patientId: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    
    // Remove patient completely from all modules - patient withdrawal/no-show
    setPatients(prev => prev.filter(p => p.id !== patientId));
    // Clear current calls if this patient was being called
    if (currentTriageCall?.id === patientId) {
      setCurrentTriageCall(null);
      completeCall('triage', 'withdrawal');
    }
    if (currentDoctorCall?.id === patientId) {
      setCurrentDoctorCall(null);
      completeCall('doctor', 'withdrawal');
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
  }, [currentTriageCall, currentDoctorCall, completeCall, unitName]);

  // Forward to triage with voice call on TV
  const forwardToTriage = useCallback((patientId: string, destination?: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;

    // Create call to show on TV
    createCall(patient.name, 'triage', destination || 'Triagem');
    triggerCallEvent({ name: patient.name }, 'triage', destination || 'Triagem');

    const updatedPatient: Patient = {
      ...patient,
      status: 'waiting' as const, // Keep as waiting so it shows in triage queue
      calledAt: new Date(),
    };
    
    // Set as current triage call so it appears in "Chamada Atual"
    setCurrentTriageCall(updatedPatient);

    // Update patient in list
    setPatients(prev => prev.map(p => 
      p.id === patientId ? updatedPatient : p
    ));
  }, [createCall, triggerCallEvent]);

  // Send to doctor queue WITHOUT TV announcement (triage uses this)
  const sendToDoctorQueue = useCallback((patientId: string, destination?: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-doctor' as const, destination } : p
    ));
    // Clear current triage call if this patient was being triaged
    if (currentTriageCall?.id === patientId) {
      setCurrentTriageCall(null);
      completeCall('triage', 'completed');
    }
  }, [currentTriageCall, completeCall]);

  // Forward to doctor WITH voice call on TV (doctor panel uses this)
  const forwardToDoctor = useCallback((patientId: string, destination?: string) => {
    const patient = patientsRef.current.find(p => p.id === patientId);
    if (!patient) return;

    // Create call to show on TV
    createCall(patient.name, 'doctor', destination || 'Consultório Médico');
    triggerCallEvent({ name: patient.name }, 'doctor', destination || 'Consultório Médico');

    // Update patient in list
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-doctor' as const, calledAt: new Date(), destination } : p
    ));
  }, [createCall, triggerCallEvent]);

  // Sort by priority first (emergency > priority > normal), then by time
  const priorityOrder = { emergency: 0, priority: 1, normal: 2 };
  
  const waitingForTriage = patients.filter(p => p.status === 'waiting')
    .sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  const waitingForDoctor = patients.filter(p => p.status === 'waiting-doctor')
    .sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  return {
    patients,
    waitingForTriage,
    waitingForDoctor,
    currentTriageCall,
    currentDoctorCall,
    history,
    isAudioEnabled,
    setIsAudioEnabled,
    addPatient,
    removePatient,
    callPatientToTriage,
    callPatientToDoctor,
    finishTriage,
    finishConsultation,
    recallTriage,
    recallDoctor,
    directPatient,
    finishWithoutCall,
    forwardToTriage,
    forwardToDoctor,
    sendToDoctorQueue,
    updatePatientPriority,
  };
}
