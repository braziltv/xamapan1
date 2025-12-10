import { useState, useCallback, useEffect } from 'react';
import { Patient, CallHistory } from '@/types/patient';

// Mock data for demonstration
const generateMockPatients = (): Patient[] => {
  const names = [
    'Maria Silva Santos', 'João Pedro Oliveira', 'Ana Clara Souza',
    'Carlos Eduardo Lima', 'Francisca Rodrigues', 'José Antônio Costa',
    'Mariana Ferreira', 'Pedro Henrique Alves', 'Luciana Martins',
    'Roberto Carlos Dias', 'Fernanda Gomes', 'Lucas Gabriel Pereira'
  ];
  
  const services = ['Clínica Geral', 'Pediatria', 'Enfermagem', 'Vacinação'];
  const priorities: Patient['priority'][] = ['normal', 'normal', 'normal', 'priority', 'emergency'];
  
  return names.slice(0, 8).map((name, index) => ({
    id: `patient-${index + 1}`,
    name,
    ticket: `${String(index + 1).padStart(3, '0')}`,
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    service: services[Math.floor(Math.random() * services.length)],
    room: '',
    status: 'waiting' as const,
    createdAt: new Date(Date.now() - Math.random() * 3600000),
  }));
};

export function useCallPanel() {
  const [patients, setPatients] = useState<Patient[]>(generateMockPatients());
  const [currentCall, setCurrentCall] = useState<Patient | null>(null);
  const [history, setHistory] = useState<CallHistory[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const speakCall = useCallback((patient: Patient, room: string) => {
    if (!isAudioEnabled) return;
    
    const utterance = new SpeechSynthesisUtterance(
      `Senha ${patient.ticket}. ${patient.name}. ${room}. Por favor, dirija-se ao ${room}.`
    );
    utterance.lang = 'pt-BR';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [isAudioEnabled]);

  const callPatient = useCallback((patientId: string, room: string) => {
    setPatients(prev => {
      const patient = prev.find(p => p.id === patientId);
      if (!patient) return prev;

      const updatedPatient: Patient = {
        ...patient,
        status: 'called',
        room,
        calledAt: new Date(),
      };

      setCurrentCall(updatedPatient);
      
      setHistory(prevHistory => [{
        id: `history-${Date.now()}`,
        patient: updatedPatient,
        calledAt: new Date(),
        room,
      }, ...prevHistory].slice(0, 10));

      speakCall(updatedPatient, room);

      return prev.map(p => p.id === patientId ? updatedPatient : p);
    });
  }, [speakCall]);

  const recallPatient = useCallback(() => {
    if (currentCall) {
      speakCall(currentCall, currentCall.room);
    }
  }, [currentCall, speakCall]);

  const markAsAttended = useCallback((patientId: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'attended' as const } : p
    ));
    if (currentCall?.id === patientId) {
      setCurrentCall(null);
    }
  }, [currentCall]);

  const markAsMissed = useCallback((patientId: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'missed' as const } : p
    ));
    if (currentCall?.id === patientId) {
      setCurrentCall(null);
    }
  }, [currentCall]);

  const waitingPatients = patients.filter(p => p.status === 'waiting')
    .sort((a, b) => {
      const priorityOrder = { emergency: 0, priority: 1, normal: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  return {
    patients,
    waitingPatients,
    currentCall,
    history,
    isAudioEnabled,
    setIsAudioEnabled,
    callPatient,
    recallPatient,
    markAsAttended,
    markAsMissed,
  };
}
