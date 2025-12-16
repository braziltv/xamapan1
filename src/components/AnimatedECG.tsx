import { useEffect, useState } from 'react';

interface AnimatedECGProps {
  className?: string;
  size?: number;
}

export function AnimatedECG({ className = '', size = 24 }: AnimatedECGProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prev => (prev + 1) % 100);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* Background glow effect */}
      <defs>
        <filter id="ecg-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="ecg-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
        </linearGradient>
        <clipPath id="ecg-clip">
          <rect x="10" y="10" width="80" height="80" rx="8" />
        </clipPath>
      </defs>

      {/* ECG Line - repeating pattern that scrolls */}
      <g clipPath="url(#ecg-clip)">
        {/* First ECG wave */}
        <polyline
          fill="none"
          stroke="#ef4444"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#ecg-glow)"
          points={generateECGPoints(offset)}
          style={{
            transition: 'none',
          }}
        />
        {/* Second ECG wave (continuous loop) */}
        <polyline
          fill="none"
          stroke="#ef4444"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#ecg-glow)"
          points={generateECGPoints(offset + 100)}
          style={{
            transition: 'none',
          }}
        />
      </g>

      {/* Pulsing dot at the leading edge */}
      <circle
        cx={85}
        cy={50}
        r="3"
        fill="#ef4444"
        filter="url(#ecg-glow)"
        className="animate-pulse"
      />
    </svg>
  );
}

// Generate ECG-like waveform points
function generateECGPoints(offset: number): string {
  const points: string[] = [];
  const baseY = 50;
  const width = 200; // Extended width for seamless looping
  
  // ECG pattern segments (normalized 0-100)
  const ecgPattern = [
    { x: 0, y: 0 },      // Start flat
    { x: 10, y: 0 },     // Flat line
    { x: 15, y: -5 },    // Small P wave up
    { x: 20, y: 0 },     // Back to baseline
    { x: 25, y: 0 },     // Flat
    { x: 28, y: 5 },     // Small Q dip
    { x: 32, y: -35 },   // Sharp R peak up
    { x: 36, y: 15 },    // S dip down
    { x: 40, y: 0 },     // Back to baseline
    { x: 50, y: 0 },     // Flat ST segment
    { x: 55, y: -8 },    // T wave up
    { x: 65, y: 0 },     // Back to baseline
    { x: 100, y: 0 },    // Flat until next beat
  ];

  // Generate points across the width
  for (let x = -width; x <= width; x += 2) {
    const adjustedX = ((x + offset * 2) % 200 + 200) % 200 - 100;
    
    // Find where we are in the ECG pattern
    const patternX = ((x + offset * 2) % 100 + 100) % 100;
    
    // Interpolate Y value from pattern
    let y = 0;
    for (let i = 0; i < ecgPattern.length - 1; i++) {
      if (patternX >= ecgPattern[i].x && patternX < ecgPattern[i + 1].x) {
        const t = (patternX - ecgPattern[i].x) / (ecgPattern[i + 1].x - ecgPattern[i].x);
        y = ecgPattern[i].y + t * (ecgPattern[i + 1].y - ecgPattern[i].y);
        break;
      }
    }
    
    const screenX = 10 + ((adjustedX + 100) / 200) * 80;
    const screenY = baseY + y;
    
    if (screenX >= 10 && screenX <= 90) {
      points.push(`${screenX},${screenY}`);
    }
  }

  return points.join(' ');
}
