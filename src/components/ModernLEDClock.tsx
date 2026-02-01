import { useId } from 'react';

interface ModernLEDClockProps {
  time: Date | null;
  className?: string;
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

function SevenSegmentDigit({ 
  digit, 
  size = 60,
  glowColor = 'rgba(255, 255, 255, 0.9)',
  uniqueId 
}: { 
  digit: string; 
  size?: number;
  glowColor?: string;
  uniqueId: string;
}) {
  const segments = digitSegments[digit] || digitSegments['0'];
  const w = size * 0.6;
  const h = size;
  const segmentWidth = size * 0.12;
  const gap = size * 0.02;
  
  // Segment paths for 7-segment display
  const segmentPaths = [
    // a - top horizontal
    `M ${gap + segmentWidth * 0.5} ${gap} L ${w - gap - segmentWidth * 0.5} ${gap} L ${w - gap - segmentWidth} ${segmentWidth * 0.7} L ${gap + segmentWidth} ${segmentWidth * 0.7} Z`,
    // b - top right vertical
    `M ${w - gap} ${gap + segmentWidth * 0.5} L ${w - gap} ${h * 0.5 - gap * 0.5} L ${w - segmentWidth * 0.7 - gap} ${h * 0.5 - segmentWidth * 0.3} L ${w - segmentWidth * 0.7 - gap} ${gap + segmentWidth} Z`,
    // c - bottom right vertical
    `M ${w - gap} ${h * 0.5 + gap * 0.5} L ${w - gap} ${h - gap - segmentWidth * 0.5} L ${w - segmentWidth * 0.7 - gap} ${h - gap - segmentWidth} L ${w - segmentWidth * 0.7 - gap} ${h * 0.5 + segmentWidth * 0.3} Z`,
    // d - bottom horizontal
    `M ${gap + segmentWidth * 0.5} ${h - gap} L ${w - gap - segmentWidth * 0.5} ${h - gap} L ${w - gap - segmentWidth} ${h - segmentWidth * 0.7} L ${gap + segmentWidth} ${h - segmentWidth * 0.7} Z`,
    // e - bottom left vertical
    `M ${gap} ${h * 0.5 + gap * 0.5} L ${gap} ${h - gap - segmentWidth * 0.5} L ${gap + segmentWidth * 0.7} ${h - gap - segmentWidth} L ${gap + segmentWidth * 0.7} ${h * 0.5 + segmentWidth * 0.3} Z`,
    // f - top left vertical
    `M ${gap} ${gap + segmentWidth * 0.5} L ${gap} ${h * 0.5 - gap * 0.5} L ${gap + segmentWidth * 0.7} ${h * 0.5 - segmentWidth * 0.3} L ${gap + segmentWidth * 0.7} ${gap + segmentWidth} Z`,
    // g - middle horizontal
    `M ${gap + segmentWidth * 0.5} ${h * 0.5 - segmentWidth * 0.35} L ${w - gap - segmentWidth * 0.5} ${h * 0.5 - segmentWidth * 0.35} L ${w - gap - segmentWidth * 0.3} ${h * 0.5} L ${w - gap - segmentWidth * 0.5} ${h * 0.5 + segmentWidth * 0.35} L ${gap + segmentWidth * 0.5} ${h * 0.5 + segmentWidth * 0.35} L ${gap + segmentWidth * 0.3} ${h * 0.5} Z`,
  ];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <filter id={`glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {segmentPaths.map((path, index) => (
        <path
          key={index}
          d={path}
          fill={segments[index] ? glowColor : 'rgba(30, 41, 59, 0.3)'}
          filter={segments[index] ? `url(#glow-${uniqueId})` : undefined}
          style={{
            transition: 'fill 0.15s ease-out',
          }}
        />
      ))}
    </svg>
  );
}

function ColonSeparator({ size = 60, glowColor = 'rgba(255, 255, 255, 0.9)', blink = true }: { size?: number; glowColor?: string; blink?: boolean }) {
  const w = size * 0.25;
  const h = size;
  const dotSize = size * 0.12;
  
  return (
    <div 
      className="flex flex-col justify-center items-center gap-3"
      style={{ 
        width: w, 
        height: h,
        opacity: blink ? undefined : 1,
      }}
    >
      <div 
        className={blink ? 'animate-pulse' : ''}
        style={{
          width: dotSize,
          height: dotSize,
          backgroundColor: glowColor,
          borderRadius: '20%',
          boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`,
        }}
      />
      <div 
        className={blink ? 'animate-pulse' : ''}
        style={{
          width: dotSize,
          height: dotSize,
          backgroundColor: glowColor,
          borderRadius: '20%',
          boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`,
        }}
      />
    </div>
  );
}

export function ModernLEDClock({ time, className = '' }: ModernLEDClockProps) {
  const uniqueId = useId().replace(/:/g, '');
  
  if (!time) return null;

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  
  const digitSize = 80;

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        borderRadius: '16px',
        padding: '16px 28px',
        boxShadow: `
          0 0 0 1px rgba(255, 255, 255, 0.1),
          0 10px 40px rgba(0, 0, 0, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `,
      }}
    >
      {/* Subtle inner glow */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
        }}
      />
      
      {/* LED Display */}
      <div className="flex items-center gap-1 relative z-10">
        <SevenSegmentDigit 
          digit={hours[0]} 
          size={digitSize} 
          uniqueId={`${uniqueId}-h1`}
        />
        <SevenSegmentDigit 
          digit={hours[1]} 
          size={digitSize} 
          uniqueId={`${uniqueId}-h2`}
        />
        <ColonSeparator size={digitSize} />
        <SevenSegmentDigit 
          digit={minutes[0]} 
          size={digitSize} 
          uniqueId={`${uniqueId}-m1`}
        />
        <SevenSegmentDigit 
          digit={minutes[1]} 
          size={digitSize} 
          uniqueId={`${uniqueId}-m2`}
        />
      </div>
      
      {/* Reflection effect */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/3 rounded-b-2xl pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(255, 255, 255, 0.02), transparent)',
        }}
      />
    </div>
  );
}
