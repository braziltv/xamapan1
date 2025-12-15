import { useState, useCallback, useEffect, useRef } from 'react';
import { Patient, CallHistory } from '@/types/patient';
import { useSupabaseSync } from './useSupabaseSync';
import { supabase } from '@/integrations/supabase/client';

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

  // Realtime sync for patient_calls - when a patient is forwarded to triage, add them to local state
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
          const patientExists = patients.some(p => p.name === call.patient_name && p.status !== 'attended');
          
          if (!patientExists && call.status === 'active') {
            // Add patient from another device
            const newPatient: Patient = {
              id: `patient-${call.id}`,
              name: call.patient_name,
              status: call.call_type === 'triage' ? 'in-triage' : 'in-consultation',
              priority: call.priority || 'normal',
              createdAt: new Date(call.created_at),
              calledAt: new Date(call.created_at),
              calledBy: call.call_type,
              destination: call.destination,
            };
            
            setPatients(prev => {
              // Double-check to avoid duplicates
              if (prev.some(p => p.name === call.patient_name && p.status !== 'attended')) {
                return prev;
              }
              return [...prev, newPatient];
            });
            
            // Set as current call
            if (call.call_type === 'triage') {
              setCurrentTriageCall(newPatient);
            } else if (call.call_type === 'doctor') {
              setCurrentDoctorCall(newPatient);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitName, patients]);

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

  const addPatient = useCallback((name: string, priority: 'normal' | 'priority' | 'emergency' = 'normal') => {
    const newPatient: Patient = {
      id: `patient-${Date.now()}`,
      name: name.trim(),
      status: 'waiting',
      priority,
      createdAt: new Date(),
    };
    setPatients(prev => [...prev, newPatient]);
    return newPatient;
  }, []);

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
    const patient = patients.find(p => p.id === patientId);
    
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-doctor' as const } : p
    ));
    if (currentTriageCall?.id === patientId) {
      setCurrentTriageCall(null);
      completeCall('triage');
      // Clear TTS cache for this patient (will be defined below)
      if (patient) {
        // Inline cache clearing since clearTtsCache is defined after
        const text = `${patient.name}. Por favor, dirija-se ao Triagem.`;
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ clearCache: text }),
          }
        ).catch(err => console.error('Error clearing TTS cache:', err));
      }
    }
  }, [patients, currentTriageCall, completeCall]);

  // Clear TTS cache for a patient name
  const clearTtsCache = useCallback(async (patientName: string, destination?: string) => {
    try {
      const location = destination || 'Triagem';
      const text = `${patientName}. Por favor, dirija-se ao ${location}.`;
      
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ clearCache: text }),
        }
      );
      console.log('TTS cache cleared for:', patientName);
    } catch (error) {
      console.error('Error clearing TTS cache:', error);
    }
  }, []);

  const finishConsultation = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'attended' as const } : p
    ));
    if (currentDoctorCall?.id === patientId) {
      setCurrentDoctorCall(null);
      completeCall('doctor');
      // Clear TTS cache for this patient
      if (patient) {
        clearTtsCache(patient.name, 'Consultório Médico');
      }
    }
  }, [patients, currentDoctorCall, completeCall, clearTtsCache]);

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

  const removePatient = useCallback((patientId: string) => {
    setPatients(prev => prev.filter(p => p.id !== patientId));
  }, []);

  const finishWithoutCall = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'attended' as const } : p
    ));
    // Clear current calls if this patient was being called
    if (currentTriageCall?.id === patientId) {
      setCurrentTriageCall(null);
      completeCall('triage');
      // Clear TTS cache
      if (patient) clearTtsCache(patient.name, 'Triagem');
    }
    if (currentDoctorCall?.id === patientId) {
      setCurrentDoctorCall(null);
      completeCall('doctor');
      // Clear TTS cache
      if (patient) clearTtsCache(patient.name, 'Consultório Médico');
    }
  }, [patients, currentTriageCall, currentDoctorCall, completeCall, clearTtsCache]);

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
      completeCall('triage');
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
