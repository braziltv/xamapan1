import { useEffect, useRef, useState, useCallback } from 'react';

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

export function useNewPatientSound(panelType: 'triage' | 'doctor', patientCount: number) {
  const storageKey = panelType === 'triage' ? STORAGE_KEY_TRIAGE : STORAGE_KEY_DOCTOR;
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : true; // Default enabled
  });
  
  const prevCountRef = useRef(patientCount);
  const isInitialMount = useRef(true);

  // Persist setting to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, String(soundEnabled));
  }, [soundEnabled, storageKey]);

  // Detect new patient arrival and play notification sound
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevCountRef.current = patientCount;
      return;
    }

    // Play sound only when count increases and sound is enabled
    if (patientCount > prevCountRef.current && soundEnabled) {
      playNewPatientSound();
    }
    
    prevCountRef.current = patientCount;
  }, [patientCount, soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return { soundEnabled, toggleSound };
}
