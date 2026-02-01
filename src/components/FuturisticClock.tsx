interface FuturisticClockProps {
  time: Date | null;
  className?: string;
}

export function FuturisticClock({ time, className = '' }: FuturisticClockProps) {
  if (!time) return null;

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
    >
      {/* Time Display with gentle pulse animation */}
      <div 
        className="flex items-center justify-center"
        style={{
          textShadow: '0 0 20px rgba(56, 189, 248, 0.8), 0 0 40px rgba(56, 189, 248, 0.4)',
          animation: 'clock-breathe 3s ease-in-out infinite',
        }}
      >
        <span 
          className="font-bold text-white tabular-nums"
          style={{ 
            fontFamily: "'Orbitron', 'SF Pro Display', sans-serif",
            fontSize: 'clamp(1.5rem, 2.5vw, 2.25rem)',
            letterSpacing: '0.05em',
            textShadow: '0 0 15px rgba(56, 189, 248, 0.9), 0 0 30px rgba(56, 189, 248, 0.5), 0 0 45px rgba(56, 189, 248, 0.3)',
          }}
        >
          {hours}:{minutes}
          <span 
            className="text-amber-400"
            style={{
              textShadow: '0 0 15px rgba(251, 146, 60, 0.9), 0 0 30px rgba(251, 146, 60, 0.5)',
              animation: 'seconds-pulse 1s ease-in-out infinite',
            }}
          >
            :{seconds}
          </span>
        </span>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes clock-breathe {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
            filter: brightness(1);
          }
          50% { 
            opacity: 0.7; 
            transform: scale(0.98);
            filter: brightness(0.85);
          }
        }
        @keyframes seconds-pulse {
          0%, 100% { 
            opacity: 1; 
          }
          50% { 
            opacity: 0.5; 
          }
        }
      `}</style>
    </div>
  );
}
