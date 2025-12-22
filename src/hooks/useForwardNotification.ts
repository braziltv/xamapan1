import { useEffect, useRef, useState, useCallback } from 'react';
import { Patient, PatientPriority } from '@/types/patient';

const STORAGE_KEY_PREFIX = 'forwardNotificationEnabled_';

// Play a distinctive "forwarded patient arrived" sound
const playForwardSound = (priority: PatientPriority) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);

    // Get volume from localStorage
    const volume = parseFloat(localStorage.getItem('notificationVolume') || '0.3');
    if (volume === 0) return;

    const now = audioContext.currentTime;

    if (priority === 'emergency') {
      // EMERGENCY: Urgent triple ascending beep
      const osc = audioContext.createOscillator();
      osc.connect(gainNode);
      osc.type = 'square';
      
      // Three ascending urgent beeps
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1000, now + 0.12);
      osc.frequency.setValueAtTime(1200, now + 0.24);
      
      gainNode.gain.setValueAtTime(volume * 0.5, now);
      gainNode.gain.setValueAtTime(0, now + 0.1);
      gainNode.gain.setValueAtTime(volume * 0.5, now + 0.12);
      gainNode.gain.setValueAtTime(0, now + 0.22);
      gainNode.gain.setValueAtTime(volume * 0.5, now + 0.24);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.4);
      
    } else if (priority === 'priority') {
      // PRIORITY: Two-tone doorbell-like chime
      const osc1 = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator();
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // Doorbell ding-dong
      osc1.frequency.setValueAtTime(659, now); // E5
      osc2.frequency.setValueAtTime(523, now + 0.2); // C5
      
      gainNode.gain.setValueAtTime(volume * 0.35, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.18);
      gainNode.gain.setValueAtTime(volume * 0.35, now + 0.2);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.45);
      
      osc1.start(now);
      osc1.stop(now + 0.18);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.45);
      
    } else {
      // NORMAL: Pleasant ascending chime (different from new patient)
      const osc = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator();
      osc.connect(gainNode);
      osc2.connect(gainNode);
      
      osc.type = 'sine';
      osc2.type = 'triangle';
      
      // Ascending major third - pleasant "arrival" sound
      osc.frequency.setValueAtTime(523, now); // C5
      osc.frequency.setValueAtTime(659, now + 0.1); // E5
      osc.frequency.setValueAtTime(784, now + 0.2); // G5
      
      osc2.frequency.setValueAtTime(523 * 2, now); // C6 harmonic
      osc2.frequency.setValueAtTime(659 * 2, now + 0.1);
      osc2.frequency.setValueAtTime(784 * 2, now + 0.2);
      
      gainNode.gain.setValueAtTime(volume * 0.25, now);
      gainNode.gain.setValueAtTime(volume * 0.3, now + 0.1);
      gainNode.gain.setValueAtTime(volume * 0.25, now + 0.2);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.4);
      osc2.start(now);
      osc2.stop(now + 0.4);
    }
  } catch (error) {
    console.log('Could not play forward notification sound:', error);
  }
};

interface ForwardedPatient {
  name: string;
  priority: PatientPriority;
  fromModule: string;
}

export function useForwardNotification(
  panelType: string,
  patients: Patient[],
  expectedStatus: string // e.g., 'waiting-doctor', 'waiting-ecg'
) {
  const storageKey = `${STORAGE_KEY_PREFIX}${panelType}`;
  
  const [notificationEnabled, setNotificationEnabled] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : true; // Default enabled
  });
  
  const [forwardAlert, setForwardAlert] = useState<{ 
    active: boolean; 
    patient: ForwardedPatient | null 
  }>({
    active: false,
    patient: null
  });
  
  // Track patients by their status
  const prevPatientStatusRef = useRef<Map<string, string>>(new Map());
  const isInitialMount = useRef(true);

  // Persist setting to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, String(notificationEnabled));
  }, [notificationEnabled, storageKey]);

  // Detect when a patient is forwarded to this module
  useEffect(() => {
    // Skip on initial mount - just capture initial state
    if (isInitialMount.current) {
      isInitialMount.current = false;
      patients.forEach(p => {
        prevPatientStatusRef.current.set(p.name, p.status);
      });
      return;
    }

    // Find patients who just arrived in expected status
    const forwardedPatients: ForwardedPatient[] = [];
    
    patients.forEach(patient => {
      const prevStatus = prevPatientStatusRef.current.get(patient.name);
      
      // Patient just arrived in this queue (status changed TO expectedStatus)
      if (patient.status === expectedStatus && prevStatus !== expectedStatus) {
        // Determine origin based on calledBy
        let fromModule = 'outro módulo';
        if (patient.calledBy === 'cadastro') fromModule = 'Cadastro';
        else if (patient.calledBy === 'triage') fromModule = 'Triagem';
        else if (patient.calledBy === 'doctor') fromModule = 'Médico';
        else if (patient.calledBy === 'ecg') fromModule = 'ECG';
        else if (patient.calledBy === 'curativos') fromModule = 'Curativos';
        else if (patient.calledBy === 'raiox') fromModule = 'Raio X';
        else if (patient.calledBy === 'enfermaria') fromModule = 'Enfermaria';
        
        forwardedPatients.push({
          name: patient.name,
          priority: patient.priority,
          fromModule
        });
      }
    });

    if (forwardedPatients.length > 0) {
      // Get highest priority among forwarded patients
      const priorityOrder = { emergency: 0, priority: 1, normal: 2 };
      const highestPriorityPatient = forwardedPatients.reduce((highest, patient) => {
        return priorityOrder[patient.priority] < priorityOrder[highest.priority] ? patient : highest;
      }, forwardedPatients[0]);

      // Play notification sound if enabled
      if (notificationEnabled) {
        playForwardSound(highestPriorityPatient.priority);
      }

      // Show visual alert
      const duration = highestPriorityPatient.priority === 'emergency' ? 5000 : 
                       highestPriorityPatient.priority === 'priority' ? 4000 : 3000;
      
      setForwardAlert({ 
        active: true, 
        patient: highestPriorityPatient 
      });
      
      setTimeout(() => {
        setForwardAlert({ active: false, patient: null });
      }, duration);
    }
    
    // Update tracked statuses
    const newMap = new Map<string, string>();
    patients.forEach(p => {
      newMap.set(p.name, p.status);
    });
    prevPatientStatusRef.current = newMap;
  }, [patients, expectedStatus, notificationEnabled]);

  const toggleNotification = useCallback(() => {
    setNotificationEnabled(prev => !prev);
  }, []);

  const dismissAlert = useCallback(() => {
    setForwardAlert({ active: false, patient: null });
  }, []);

  return { 
    notificationEnabled, 
    toggleNotification, 
    forwardAlert,
    dismissAlert
  };
}
