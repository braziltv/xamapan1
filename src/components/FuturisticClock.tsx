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
      {/* Time Display */}
      <div 
        className="flex items-center justify-center"
        style={{
          textShadow: '0 0 20px rgba(56, 189, 248, 0.8), 0 0 40px rgba(56, 189, 248, 0.4)',
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
            }}
          >
            :{seconds}
          </span>
        </span>
      </div>
    </div>
  );
}
