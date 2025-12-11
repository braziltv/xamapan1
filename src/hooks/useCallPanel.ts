import { useState, useCallback, useEffect } from 'react';
import { Patient, CallHistory } from '@/types/patient';

const STORAGE_KEYS = {
  PATIENTS: 'callPanel_patients',
  CURRENT_TRIAGE: 'callPanel_currentTriage',
  CURRENT_DOCTOR: 'callPanel_currentDoctor',
  HISTORY: 'callPanel_history',
  LAST_CALL_TIMESTAMP: 'callPanel_lastCallTimestamp',
};

export function useCallPanel() {
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

  // Audio is ONLY played on the PublicDisplay (TV screen)
  // This function is kept for compatibility but doesn't play audio locally
  const speakName = useCallback((name: string, caller: 'triage' | 'doctor', destination?: string) => {
    // Audio removed from here - only the PublicDisplay plays audio
  }, []);

  const triggerCallEvent = useCallback((patient: Patient | { name: string }, caller: 'triage' | 'doctor', destination?: string) => {
    // Save call event to trigger audio on the TV/PublicDisplay ONLY
    const callEvent = {
      patient,
      caller,
      destination,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.LAST_CALL_TIMESTAMP, JSON.stringify(callEvent));
  }, []);

  const directPatient = useCallback((patientName: string, destination: string) => {
    // Trigger audio event for the TV to play
    triggerCallEvent({ name: patientName }, 'triage', destination);
  }, [triggerCallEvent]);

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

      speakName(updatedPatient.name, 'triage');
      triggerCallEvent(updatedPatient, 'triage');

      return prev.map(p => p.id === patientId ? updatedPatient : p);
    });
  }, [speakName, triggerCallEvent]);

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

      speakName(updatedPatient.name, 'doctor', destination);
      triggerCallEvent(updatedPatient, 'doctor', destination);

      return prev.map(p => p.id === patientId ? updatedPatient : p);
    });
  }, [speakName, triggerCallEvent]);

  const finishTriage = useCallback((patientId: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'waiting-doctor' as const } : p
    ));
    if (currentTriageCall?.id === patientId) {
      setCurrentTriageCall(null);
    }
  }, [currentTriageCall]);

  const finishConsultation = useCallback((patientId: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'attended' as const } : p
    ));
    if (currentDoctorCall?.id === patientId) {
      setCurrentDoctorCall(null);
    }
  }, [currentDoctorCall]);

  const recallTriage = useCallback(() => {
    if (currentTriageCall) {
      speakName(currentTriageCall.name, 'triage');
      triggerCallEvent(currentTriageCall, 'triage');
    }
  }, [currentTriageCall, speakName, triggerCallEvent]);

  const recallDoctor = useCallback((destination?: string) => {
    if (currentDoctorCall) {
      speakName(currentDoctorCall.name, 'doctor', destination);
      triggerCallEvent(currentDoctorCall, 'doctor', destination);
    }
  }, [currentDoctorCall, speakName, triggerCallEvent]);

  const removePatient = useCallback((patientId: string) => {
    setPatients(prev => prev.filter(p => p.id !== patientId));
  }, []);

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
  };
}
