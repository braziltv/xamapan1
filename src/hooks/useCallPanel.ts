import { useState, useCallback, useEffect } from 'react';
import { Patient, CallHistory } from '@/types/patient';
import { useSupabaseSync } from './useSupabaseSync';

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

  const addPatient = useCallback((name: string) => {
    const newPatient: Patient = {
      id: `patient-${Date.now()}`,
      name: name.trim(),
      status: 'waiting',
      createdAt: new Date(),
    };
    setPatients(prev => [...prev, newPatient]);
    return newPatient;
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
      completeCall('triage');
    }
  }, [currentTriageCall, completeCall]);

  const finishConsultation = useCallback((patientId: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'attended' as const } : p
    ));
    if (currentDoctorCall?.id === patientId) {
      setCurrentDoctorCall(null);
      completeCall('doctor');
    }
  }, [currentDoctorCall, completeCall]);

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
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'attended' as const } : p
    ));
    // Clear current calls if this patient was being called
    if (currentTriageCall?.id === patientId) {
      setCurrentTriageCall(null);
      completeCall('triage');
    }
    if (currentDoctorCall?.id === patientId) {
      setCurrentDoctorCall(null);
      completeCall('doctor');
    }
  }, [currentTriageCall, currentDoctorCall, completeCall]);

  // Forward to triage with voice call on TV
  const forwardToTriage = useCallback((patientId: string, destination?: string) => {
    setPatients(prev => {
      const patient = prev.find(p => p.id === patientId);
      if (!patient) return prev;

      // Create call to show on TV
      createCall(patient.name, 'triage', destination || 'Triagem');
      triggerCallEvent({ name: patient.name }, 'triage', destination || 'Triagem');

      return prev.map(p => 
        p.id === patientId ? { ...p, status: 'in-triage' as const, calledAt: new Date() } : p
      );
    });
  }, [createCall, triggerCallEvent]);

  // Forward to doctor with voice call on TV
  const forwardToDoctor = useCallback((patientId: string, destination?: string) => {
    setPatients(prev => {
      const patient = prev.find(p => p.id === patientId);
      if (!patient) return prev;

      // Create call to show on TV
      createCall(patient.name, 'doctor', destination || 'Consultório Médico');
      triggerCallEvent({ name: patient.name }, 'doctor', destination || 'Consultório Médico');

      return prev.map(p => 
        p.id === patientId ? { ...p, status: 'waiting-doctor' as const, calledAt: new Date(), destination } : p
      );
    });
  }, [createCall, triggerCallEvent]);

  const waitingForTriage = patients.filter(p => p.status === 'waiting')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const waitingForDoctor = patients.filter(p => p.status === 'waiting-doctor')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

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
  };
}
