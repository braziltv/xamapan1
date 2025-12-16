import { useEffect, useRef, useState, useCallback } from 'react';
import { Patient, PatientPriority } from '@/types/patient';

const STORAGE_KEY_TRIAGE = 'triageNewPatientSoundEnabled';
const STORAGE_KEY_DOCTOR = 'doctorNewPatientSoundEnabled';

// Subtle notification sound for new patient arrival
const playNewPatientSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Short, subtle ascending tone (gentle "ding")
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.08); // C#6
    
    oscillator.type = 'sine';
    
    // Quick fade in and out for subtle sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
};

export function useNewPatientSound(panelType: 'triage' | 'doctor', patients: Patient[]) {
  const storageKey = panelType === 'triage' ? STORAGE_KEY_TRIAGE : STORAGE_KEY_DOCTOR;
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : true; // Default enabled
  });
  
  const [visualAlert, setVisualAlert] = useState<{ active: boolean; priority: PatientPriority | null }>({
    active: false,
    priority: null
  });
  
  const prevCountRef = useRef(patients.length);
  const prevIdsRef = useRef<Set<string>>(new Set(patients.map(p => p.id)));
  const isInitialMount = useRef(true);

  // Persist setting to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, String(soundEnabled));
  }, [soundEnabled, storageKey]);

  // Detect new patient arrival and play notification sound + visual alert
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevCountRef.current = patients.length;
      prevIdsRef.current = new Set(patients.map(p => p.id));
      return;
    }

    // Find new patients by comparing IDs
    const currentIds = new Set(patients.map(p => p.id));
    const newPatients = patients.filter(p => !prevIdsRef.current.has(p.id));

    if (newPatients.length > 0) {
      // Get highest priority among new patients
      const highestPriority = newPatients.reduce((highest, patient) => {
        const priorityOrder = { emergency: 0, priority: 1, normal: 2 };
        return priorityOrder[patient.priority] < priorityOrder[highest] ? patient.priority : highest;
      }, 'normal' as PatientPriority);

      // Play sound if enabled
      if (soundEnabled) {
        playNewPatientSound();
      }

      // Show visual alert with duration based on priority (emergency: 5s, priority: 3s, normal: 2s)
      const duration = highestPriority === 'emergency' ? 5000 : highestPriority === 'priority' ? 3000 : 2000;
      setVisualAlert({ active: true, priority: highestPriority });
      
      setTimeout(() => {
        setVisualAlert({ active: false, priority: null });
      }, duration);
    }
    
    prevCountRef.current = patients.length;
    prevIdsRef.current = currentIds;
  }, [patients, soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return { soundEnabled, toggleSound, visualAlert };
}
