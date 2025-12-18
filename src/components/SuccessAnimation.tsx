import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessAnimationProps {
  show: boolean;
  message: string;
  onComplete?: () => void;
}

export function SuccessAnimation({ show, message, onComplete }: SuccessAnimationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-green-500/20 animate-fade-in" />
      
      {/* Content */}
      <div className="relative flex flex-col items-center gap-4 animate-scale-in">
        {/* Animated circle */}
        <div className="relative">
          <div className="absolute inset-0 bg-green-500/30 rounded-full animate-ping" />
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50">
            <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-white animate-bounce" style={{ animationDuration: '0.5s' }} />
          </div>
        </div>
        
        {/* Message */}
        <div className="bg-card/95 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-green-500/50">
          <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400 text-center">
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
                backgroundColor: ['#22c55e', '#86efac', '#4ade80', '#16a34a'][i % 4],
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
