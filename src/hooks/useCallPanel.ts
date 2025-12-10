import { useState, useCallback } from 'react';
import { Patient, CallHistory } from '@/types/patient';

export function useCallPanel() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentTriageCall, setCurrentTriageCall] = useState<Patient | null>(null);
  const [currentDoctorCall, setCurrentDoctorCall] = useState<Patient | null>(null);
  const [history, setHistory] = useState<CallHistory[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const speakName = useCallback((name: string, caller: 'triage' | 'doctor', destination?: string) => {
    if (!isAudioEnabled) return;
    
    const location = destination || (caller === 'triage' ? 'Triagem' : 'Consultório Médico');
    const utterance = new SpeechSynthesisUtterance(
      `${name}. Por favor, dirija-se ao ${location}.`
    );
    utterance.lang = 'pt-BR';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [isAudioEnabled]);

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

      return prev.map(p => p.id === patientId ? updatedPatient : p);
    });
  }, [speakName]);

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

      return prev.map(p => p.id === patientId ? updatedPatient : p);
    });
  }, [speakName]);

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
    }
  }, [currentTriageCall, speakName]);

  const recallDoctor = useCallback((destination?: string) => {
    if (currentDoctorCall) {
      speakName(currentDoctorCall.name, 'doctor', destination);
    }
  }, [currentDoctorCall, speakName]);

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
  };
}
