import { useId } from 'react';

interface Modern3DClockProps {
  time: Date | null;
  className?: string;
}

export function Modern3DClock({ time, className = '' }: Modern3DClockProps) {
  const uniqueId = useId().replace(/:/g, '');
  
  if (!time) return null;

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Main container with 3D effect */}
      <div 
        className="relative flex items-center gap-1"
        style={{
          background: 'linear-gradient(145deg, rgba(10, 15, 30, 0.98), rgba(20, 30, 50, 0.95))',
          borderRadius: '14px',
          padding: '10px 18px',
          boxShadow: `
            0 0 0 1px rgba(6, 182, 212, 0.3),
            0 0 30px rgba(6, 182, 212, 0.2),
            0 10px 40px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 rgba(0, 0, 0, 0.3)
          `,
          transform: 'rotateX(5deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Animated glow ring */}
        <div 
          className="absolute -inset-0.5 rounded-2xl opacity-60 animate-pulse"
          style={{
            background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.4), rgba(139, 92, 246, 0.4), rgba(6, 182, 212, 0.4))',
            filter: 'blur(4px)',
            zIndex: -1,
          }}
        />

        {/* Top reflection */}
        <div 
          className="absolute top-0 left-2 right-2 h-px rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
          }}
        />

        {/* Hour digits */}
        <DigitDisplay digit={hours[0]} uniqueId={`${uniqueId}-h1`} />
        <DigitDisplay digit={hours[1]} uniqueId={`${uniqueId}-h2`} />
        
        {/* Separator */}
        <div className="flex flex-col gap-1.5 mx-1">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
              boxShadow: '0 0 10px rgba(6, 182, 212, 0.8), 0 0 20px rgba(6, 182, 212, 0.4)',
            }}
          />
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
              boxShadow: '0 0 10px rgba(6, 182, 212, 0.8), 0 0 20px rgba(6, 182, 212, 0.4)',
              animationDelay: '0.5s',
            }}
          />
        </div>
        
        {/* Minute digits */}
        <DigitDisplay digit={minutes[0]} uniqueId={`${uniqueId}-m1`} />
        <DigitDisplay digit={minutes[1]} uniqueId={`${uniqueId}-m2`} />

        {/* Bottom shadow for 3D depth */}
        <div 
          className="absolute -bottom-2 left-4 right-4 h-4 rounded-full"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)',
            filter: 'blur(4px)',
            zIndex: -2,
          }}
        />
      </div>
    </div>
  );
}

// Segmentos para cada dígito (a-g) no formato de 7 segmentos
const digitSegments: { [key: string]: boolean[] } = {
  '0': [true, true, true, true, true, true, false],
  '1': [false, true, true, false, false, false, false],
  '2': [true, true, false, true, true, false, true],
  '3': [true, true, true, true, false, false, true],
  '4': [false, true, true, false, false, true, true],
  '5': [true, false, true, true, false, true, true],
  '6': [true, false, true, true, true, true, true],
  '7': [true, true, true, false, false, false, false],
  '8': [true, true, true, true, true, true, true],
  '9': [true, true, true, true, false, true, true],
};

function DigitDisplay({ digit, uniqueId }: { digit: string; uniqueId: string }) {
  const segments = digitSegments[digit] || digitSegments['0'];
  const size = 40; // Reduced by ~10%
  const w = size * 0.65;
  const h = size;
  const segmentWidth = size * 0.14;
  const gap = size * 0.03;
  
  const activeColor = '#22d3ee';
  const glowColor = 'rgba(34, 211, 238, 0.9)';
  const inactiveColor = 'rgba(30, 41, 59, 0.4)';
  
  // Segment paths for 7-segment display with rounded edges
  const segmentPaths = [
    // a - top horizontal
    `M ${gap + segmentWidth * 0.6} ${gap + segmentWidth * 0.2} 
     L ${w - gap - segmentWidth * 0.6} ${gap + segmentWidth * 0.2} 
     L ${w - gap - segmentWidth * 0.3} ${gap + segmentWidth * 0.5} 
     L ${w - gap - segmentWidth * 0.6} ${gap + segmentWidth * 0.8} 
     L ${gap + segmentWidth * 0.6} ${gap + segmentWidth * 0.8} 
     L ${gap + segmentWidth * 0.3} ${gap + segmentWidth * 0.5} Z`,
    // b - top right vertical
    `M ${w - gap - segmentWidth * 0.2} ${gap + segmentWidth * 0.6} 
     L ${w - gap - segmentWidth * 0.2} ${h * 0.5 - segmentWidth * 0.4} 
     L ${w - gap - segmentWidth * 0.5} ${h * 0.5} 
     L ${w - gap - segmentWidth * 0.8} ${h * 0.5 - segmentWidth * 0.4} 
     L ${w - gap - segmentWidth * 0.8} ${gap + segmentWidth * 0.6} 
     L ${w - gap - segmentWidth * 0.5} ${gap + segmentWidth * 0.3} Z`,
    // c - bottom right vertical
    `M ${w - gap - segmentWidth * 0.2} ${h * 0.5 + segmentWidth * 0.4} 
     L ${w - gap - segmentWidth * 0.2} ${h - gap - segmentWidth * 0.6} 
     L ${w - gap - segmentWidth * 0.5} ${h - gap - segmentWidth * 0.3} 
     L ${w - gap - segmentWidth * 0.8} ${h - gap - segmentWidth * 0.6} 
     L ${w - gap - segmentWidth * 0.8} ${h * 0.5 + segmentWidth * 0.4} 
     L ${w - gap - segmentWidth * 0.5} ${h * 0.5} Z`,
    // d - bottom horizontal
    `M ${gap + segmentWidth * 0.6} ${h - gap - segmentWidth * 0.2} 
     L ${w - gap - segmentWidth * 0.6} ${h - gap - segmentWidth * 0.2} 
     L ${w - gap - segmentWidth * 0.3} ${h - gap - segmentWidth * 0.5} 
     L ${w - gap - segmentWidth * 0.6} ${h - gap - segmentWidth * 0.8} 
     L ${gap + segmentWidth * 0.6} ${h - gap - segmentWidth * 0.8} 
     L ${gap + segmentWidth * 0.3} ${h - gap - segmentWidth * 0.5} Z`,
    // e - bottom left vertical
    `M ${gap + segmentWidth * 0.2} ${h * 0.5 + segmentWidth * 0.4} 
     L ${gap + segmentWidth * 0.2} ${h - gap - segmentWidth * 0.6} 
     L ${gap + segmentWidth * 0.5} ${h - gap - segmentWidth * 0.3} 
     L ${gap + segmentWidth * 0.8} ${h - gap - segmentWidth * 0.6} 
     L ${gap + segmentWidth * 0.8} ${h * 0.5 + segmentWidth * 0.4} 
     L ${gap + segmentWidth * 0.5} ${h * 0.5} Z`,
    // f - top left vertical
    `M ${gap + segmentWidth * 0.2} ${gap + segmentWidth * 0.6} 
     L ${gap + segmentWidth * 0.2} ${h * 0.5 - segmentWidth * 0.4} 
     L ${gap + segmentWidth * 0.5} ${h * 0.5} 
     L ${gap + segmentWidth * 0.8} ${h * 0.5 - segmentWidth * 0.4} 
     L ${gap + segmentWidth * 0.8} ${gap + segmentWidth * 0.6} 
     L ${gap + segmentWidth * 0.5} ${gap + segmentWidth * 0.3} Z`,
    // g - middle horizontal
    `M ${gap + segmentWidth * 0.6} ${h * 0.5 - segmentWidth * 0.3} 
     L ${w - gap - segmentWidth * 0.6} ${h * 0.5 - segmentWidth * 0.3} 
     L ${w - gap - segmentWidth * 0.3} ${h * 0.5} 
     L ${w - gap - segmentWidth * 0.6} ${h * 0.5 + segmentWidth * 0.3} 
     L ${gap + segmentWidth * 0.6} ${h * 0.5 + segmentWidth * 0.3} 
     L ${gap + segmentWidth * 0.3} ${h * 0.5} Z`,
  ];

  return (
    <div 
      className="relative"
      style={{
        transform: 'translateZ(2px)',
        transformStyle: 'preserve-3d',
      }}
    >
      <svg 
        width={w} 
        height={h} 
        viewBox={`0 0 ${w} ${h}`}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      >
        <defs>
          <filter id={`glow-${uniqueId}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`segment-gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        
        {segmentPaths.map((path, index) => (
          <path
            key={index}
            d={path}
            fill={segments[index] ? `url(#segment-gradient-${uniqueId})` : inactiveColor}
            filter={segments[index] ? `url(#glow-${uniqueId})` : undefined}
            style={{
              transition: 'fill 0.2s ease-out, filter 0.2s ease-out',
            }}
          />
        ))}
      </svg>
    </div>
  );
}
