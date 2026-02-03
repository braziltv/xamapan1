import { memo } from 'react';

interface FuturisticClockProps {
  time: Date | null;
  className?: string;
}

// Memoized clock component - only re-renders when time changes
export const FuturisticClock = memo(function FuturisticClock({ time, className = '' }: FuturisticClockProps) {
  if (!time) return null;

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Time Display - simplified, no animation for better performance */}
      <div className="flex items-center justify-center">
        <span 
          className="text-white tabular-nums"
          style={{ 
            fontFamily: "'Orbitron', 'SF Pro Display', sans-serif",
            fontSize: 'clamp(1.75rem, 3vw, 2.75rem)',
            fontWeight: 900,
            letterSpacing: '0.08em',
            textShadow: '0 0 15px rgba(56, 189, 248, 0.8), 0 0 30px rgba(56, 189, 248, 0.5)',
          }}
        >
          {hours}:{minutes}
          <span 
            className="text-amber-400"
            style={{
              fontWeight: 900,
              textShadow: '0 0 15px rgba(251, 146, 60, 0.8), 0 0 30px rgba(251, 146, 60, 0.5)',
            }}
          >
            :{seconds}
          </span>
        </span>
      </div>
    </div>
  );
});
