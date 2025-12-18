import { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle2, UserCheck, Stethoscope, UserX } from 'lucide-react';

type ActionType = 'triage' | 'consultation' | 'withdrawal' | 'default';

interface SuccessAnimationProps {
  show: boolean;
  message: string;
  type?: ActionType;
  onComplete?: () => void;
}

export function SuccessAnimation({ show, message, type = 'default', onComplete }: SuccessAnimationProps) {
  const [visible, setVisible] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSuccessSound = useCallback((actionType: ActionType) => {
    try {
      const volume = parseFloat(localStorage.getItem('notificationVolume') || '0.3');
      if (volume === 0) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Different sounds based on action type
      if (actionType === 'triage') {
        // Triage: Bright ascending arpeggio (F-A-C)
        const notes = [349.23, 440, 523.25]; // F4, A4, C5
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.07);
          gain.gain.setValueAtTime(0, now + i * 0.07);
          gain.gain.linearRampToValueAtTime(volume * 0.35, now + i * 0.07 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.35);
        });
      } else if (actionType === 'consultation') {
        // Consultation: Warm major chord (C-E-G-C)
        const notes = [261.63, 329.63, 392, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);
          gain.gain.setValueAtTime(0, now + i * 0.05);
          gain.gain.linearRampToValueAtTime(volume * 0.25, now + i * 0.05 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.5);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.5);
        });
        // Add shimmer
        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmer.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(1046.5, now + 0.15);
        shimmerGain.gain.setValueAtTime(0, now + 0.15);
        shimmerGain.gain.linearRampToValueAtTime(volume * 0.12, now + 0.2);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        shimmer.start(now + 0.15);
        shimmer.stop(now + 0.6);
      } else if (actionType === 'withdrawal') {
        // Withdrawal: Soft descending tone (gentle, not negative)
        const notes = [392, 329.63, 293.66]; // G4, E4, D4
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0, now + i * 0.1);
          gain.gain.linearRampToValueAtTime(volume * 0.2, now + i * 0.1 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.3);
        });
      } else {
        // Default: Simple pleasant chord (C-E-G)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(volume * 0.3, now + i * 0.08 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.4);
        });
      }
    } catch (error) {
      console.log('Could not play success sound:', error);
    }
  }, []);

  useEffect(() => {
    if (show) {
      setVisible(true);
      playSuccessSound(type);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete, playSuccessSound, type]);

  // Icon and color based on type
  const getIconAndColor = () => {
    switch (type) {
      case 'triage':
        return { Icon: UserCheck, gradient: 'from-blue-400 to-blue-600', shadow: 'shadow-blue-500/50' };
      case 'consultation':
        return { Icon: Stethoscope, gradient: 'from-green-400 to-green-600', shadow: 'shadow-green-500/50' };
      case 'withdrawal':
        return { Icon: UserX, gradient: 'from-amber-400 to-amber-600', shadow: 'shadow-amber-500/50' };
      default:
        return { Icon: CheckCircle2, gradient: 'from-green-400 to-green-600', shadow: 'shadow-green-500/50' };
    }
  };

  const { Icon, gradient, shadow } = getIconAndColor();
  const bgColor = type === 'triage' ? 'bg-blue-500/20' : type === 'withdrawal' ? 'bg-amber-500/20' : 'bg-green-500/20';
  const borderColor = type === 'triage' ? 'border-blue-500/50' : type === 'withdrawal' ? 'border-amber-500/50' : 'border-green-500/50';
  const textColor = type === 'triage' ? 'text-blue-600 dark:text-blue-400' : type === 'withdrawal' ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400';
  const particleColors = type === 'triage' 
    ? ['#3b82f6', '#93c5fd', '#60a5fa', '#2563eb'] 
    : type === 'withdrawal'
    ? ['#f59e0b', '#fcd34d', '#fbbf24', '#d97706']
    : ['#22c55e', '#86efac', '#4ade80', '#16a34a'];

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className={`absolute inset-0 ${bgColor} animate-fade-in`} />
      
      {/* Content */}
      <div className="relative flex flex-col items-center gap-4 animate-scale-in">
        {/* Animated circle */}
        <div className="relative">
          <div className={`absolute inset-0 ${bgColor} rounded-full animate-ping`} />
          <div className={`relative w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center shadow-2xl ${shadow}`}>
            <Icon className="w-12 h-12 sm:w-16 sm:h-16 text-white animate-bounce" style={{ animationDuration: '0.5s' }} />
          </div>
        </div>
        
        {/* Message */}
        <div className={`bg-card/95 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border ${borderColor}`}>
          <p className={`text-lg sm:text-xl font-bold ${textColor} text-center`}>
            {message}
          </p>
        </div>

        {/* Confetti-like particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                backgroundColor: particleColors[i % 4],
                animation: `confetti-${i % 4} 1s ease-out forwards`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes confetti-0 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(calc(-50% + 80px), calc(-50% - 100px)) scale(1); opacity: 0; }
        }
        @keyframes confetti-1 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(calc(-50% - 80px), calc(-50% - 80px)) scale(1); opacity: 0; }
        }
        @keyframes confetti-2 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(calc(-50% + 100px), calc(-50% + 40px)) scale(1); opacity: 0; }
        }
        @keyframes confetti-3 {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(calc(-50% - 100px), calc(-50% + 60px)) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
