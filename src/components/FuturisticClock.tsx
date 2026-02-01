import { useId } from 'react';

interface FuturisticClockProps {
  time: Date | null;
  className?: string;
}

export function FuturisticClock({ time, className = '' }: FuturisticClockProps) {
  const uniqueId = useId().replace(/:/g, '');
  
  if (!time) return null;

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  const size = 50;
  const center = size / 2;

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* SVG Rings and Effects */}
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Blue glow gradient */}
          <linearGradient id={`blue-glow-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
          </linearGradient>
          
          {/* Orange glow gradient */}
          <linearGradient id={`orange-glow-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#fb923c" stopOpacity="1" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0.8" />
          </linearGradient>

          {/* Cyan gradient */}
          <linearGradient id={`cyan-glow-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.8" />
          </linearGradient>

          {/* Glow filters */}
          <filter id={`blur-blue-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <filter id={`blur-orange-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={`text-glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer ring - Blue, rotating clockwise */}
        <g style={{ transformOrigin: 'center', animation: 'spin-slow 20s linear infinite' }}>
          <circle
            cx={center}
            cy={center}
            r={center - 3}
            fill="none"
            stroke={`url(#blue-glow-${uniqueId})`}
            strokeWidth="1"
            strokeDasharray="30 15 10 20"
            filter={`url(#blur-blue-${uniqueId})`}
            opacity="0.9"
          />
        </g>

        {/* Second outer ring - Orange, rotating counter-clockwise */}
        <g style={{ transformOrigin: 'center', animation: 'spin-reverse 15s linear infinite' }}>
          <circle
            cx={center}
            cy={center}
            r={center - 7}
            fill="none"
            stroke={`url(#orange-glow-${uniqueId})`}
            strokeWidth="1.5"
            strokeDasharray="20 30 15 10"
            filter={`url(#blur-orange-${uniqueId})`}
            opacity="0.85"
          />
        </g>

        {/* Inner ring - Cyan, slow rotation */}
        <g style={{ transformOrigin: 'center', animation: 'spin-slow 25s linear infinite reverse' }}>
          <circle
            cx={center}
            cy={center}
            r={center - 11}
            fill="none"
            stroke={`url(#cyan-glow-${uniqueId})`}
            strokeWidth="1"
            strokeDasharray="8 5 12 8 18"
            filter={`url(#blur-blue-${uniqueId})`}
            opacity="0.7"
          />
        </g>

        {/* Accent arcs - Blue left side */}
        <g style={{ transformOrigin: 'center', animation: 'spin-slow 30s linear infinite' }}>
          <path
            d={`M ${center - 20} ${center} A 20 20 0 0 1 ${center} ${center - 20}`}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeLinecap="round"
            filter={`url(#blur-blue-${uniqueId})`}
            opacity="0.8"
          />
        </g>

        {/* Accent arcs - Orange right side */}
        <g style={{ transformOrigin: 'center', animation: 'spin-reverse 25s linear infinite' }}>
          <path
            d={`M ${center + 20} ${center} A 20 20 0 0 1 ${center} ${center + 20}`}
            fill="none"
            stroke="#fb923c"
            strokeWidth="1.5"
            strokeLinecap="round"
            filter={`url(#blur-orange-${uniqueId})`}
            opacity="0.8"
          />
        </g>

        {/* Light flares - Left blue */}
        <circle
          cx={center - 22}
          cy={center}
          r="2"
          fill="#38bdf8"
          filter={`url(#blur-blue-${uniqueId})`}
          style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
        />
        
        {/* Light flares - Right orange */}
        <circle
          cx={center + 22}
          cy={center}
          r="2"
          fill="#fb923c"
          filter={`url(#blur-orange-${uniqueId})`}
          style={{ animation: 'pulse-glow 2s ease-in-out infinite', animationDelay: '1s' }}
        />

        {/* Particle effects */}
        {[...Array(6)].map((_, i) => {
          const angle = (i * 60) * (Math.PI / 180);
          const radius = center - 4;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1"
              fill={i % 2 === 0 ? '#38bdf8' : '#fb923c'}
              opacity="0.6"
              style={{ 
                animation: `twinkle ${1.5 + i * 0.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`
              }}
            />
          );
        })}
      </svg>

      {/* Time Display */}
      <div 
        className="relative z-10 flex items-center justify-center"
        style={{
          textShadow: '0 0 20px rgba(56, 189, 248, 0.8), 0 0 40px rgba(56, 189, 248, 0.4)',
        }}
      >
        <span 
          className="font-bold text-white tabular-nums"
          style={{ 
            fontFamily: "'Orbitron', 'SF Pro Display', sans-serif",
            fontSize: '0.6rem',
            letterSpacing: '0.03em',
            textShadow: '0 0 8px rgba(56, 189, 248, 0.9), 0 0 16px rgba(56, 189, 248, 0.5)',
          }}
        >
          {hours}:{minutes}
          <span 
            className="text-amber-400"
            style={{
              textShadow: '0 0 8px rgba(251, 146, 60, 0.9), 0 0 16px rgba(251, 146, 60, 0.5)',
            }}
          >
            :{seconds}
          </span>
        </span>
      </div>

      {/* Bottom reflection */}
      <div 
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2 rounded-full opacity-40"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.5) 0%, rgba(251, 146, 60, 0.3) 50%, transparent 80%)',
          filter: 'blur(2px)',
        }}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
