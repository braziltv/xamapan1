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
      {/* Time Display with gentle fade animation */}
      <div 
        className="flex items-center justify-center"
        style={{
          animation: 'clock-fade 4s ease-in-out infinite',
        }}
      >
        <span 
          className="text-white tabular-nums"
          style={{ 
            fontFamily: "'Orbitron', 'SF Pro Display', sans-serif",
            fontSize: 'clamp(1.75rem, 3vw, 2.75rem)',
            fontWeight: 900,
            letterSpacing: '0.08em',
            textShadow: '0 0 20px rgba(56, 189, 248, 1), 0 0 40px rgba(56, 189, 248, 0.7), 0 0 60px rgba(56, 189, 248, 0.4)',
            WebkitTextStroke: '0.5px rgba(255, 255, 255, 0.3)',
          }}
        >
          {hours}:{minutes}
          <span 
            className="text-amber-400"
            style={{
              fontWeight: 900,
              textShadow: '0 0 20px rgba(251, 146, 60, 1), 0 0 40px rgba(251, 146, 60, 0.7)',
            }}
          >
            :{seconds}
          </span>
        </span>
      </div>

      {/* CSS Animations - Slow and subtle fade only */}
      <style>{`
        @keyframes clock-fade {
          0%, 100% { 
            opacity: 1; 
          }
          50% { 
            opacity: 0.85; 
          }
        }
      `}</style>
    </div>
  );
}
