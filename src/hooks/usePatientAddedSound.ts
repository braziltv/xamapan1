import { useCallback, useRef } from 'react';

export function usePatientAddedSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playAddedSound = useCallback(() => {
    try {
      // Get volume from localStorage
      const volume = parseFloat(localStorage.getItem('notificationVolume') || '0.3');
      if (volume === 0) return;

      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;

      // Resume context if suspended
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      // Create a pleasant, subtle "pop" sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Use a soft sine wave
      oscillator.type = 'sine';
      
      // Quick ascending note (subtle "pop")
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.08);
      oscillator.frequency.exponentialRampToValueAtTime(1100, now + 0.15);
      
      // Quick fade in and out for softness
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.02);
      gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      oscillator.start(now);
      oscillator.stop(now + 0.25);

      // Add a soft high harmonic for "sparkle"
      const harmonic = ctx.createOscillator();
      const harmonicGain = ctx.createGain();
      
      harmonic.connect(harmonicGain);
      harmonicGain.connect(ctx.destination);
      
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(1200, now + 0.05);
      harmonic.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
      
      harmonicGain.gain.setValueAtTime(0, now + 0.05);
      harmonicGain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.08);
      harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      harmonic.start(now + 0.05);
      harmonic.stop(now + 0.2);

    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, []);

  return { playAddedSound };
}
