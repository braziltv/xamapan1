import { useId } from 'react';

interface AnalogClockProps {
  time: Date | null;
  size?: number;
  className?: string;
}

export function AnalogClock({ time, size = 120, className = '' }: AnalogClockProps) {
  const uniqueId = useId().replace(/:/g, '');
  
  if (!time) return null;

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Calculate rotation angles
  const hourAngle = (hours * 30) + (minutes * 0.5); // 30 degrees per hour + adjustment for minutes
  const minuteAngle = minutes * 6; // 6 degrees per minute
  const secondAngle = seconds * 6; // 6 degrees per second

  const center = size / 2;
  const hourHandLength = size * 0.25;
  const minuteHandLength = size * 0.35;
  const secondHandLength = size * 0.4;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`${className}`}
    >
      <defs>
        {/* Outer glow */}
        <filter id={`clock-glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Gradient for clock face */}
        <radialGradient id={`clock-face-${uniqueId}`} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(30, 41, 59, 0.95)" />
          <stop offset="100%" stopColor="rgba(15, 23, 42, 0.98)" />
        </radialGradient>
        
        {/* Glass reflection */}
        <linearGradient id={`clock-glass-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
          <stop offset="50%" stopColor="rgba(255, 255, 255, 0.05)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </linearGradient>
      </defs>

      {/* Outer ring with glow */}
      <circle
        cx={center}
        cy={center}
        r={center - 2}
        fill="none"
        stroke="rgba(99, 102, 241, 0.5)"
        strokeWidth="2"
        filter={`url(#clock-glow-${uniqueId})`}
      />

      {/* Clock face */}
      <circle
        cx={center}
        cy={center}
        r={center - 4}
        fill={`url(#clock-face-${uniqueId})`}
        stroke="rgba(148, 163, 184, 0.3)"
        strokeWidth="1"
      />

      {/* Glass effect overlay */}
      <ellipse
        cx={center * 0.7}
        cy={center * 0.7}
        rx={center * 0.4}
        ry={center * 0.25}
        fill={`url(#clock-glass-${uniqueId})`}
      />

      {/* Hour markers */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const isMainHour = i % 3 === 0;
        const innerRadius = center - (isMainHour ? 15 : 12);
        const outerRadius = center - 6;
        
        return (
          <line
            key={i}
            x1={center + Math.cos(angle) * innerRadius}
            y1={center + Math.sin(angle) * innerRadius}
            x2={center + Math.cos(angle) * outerRadius}
            y2={center + Math.sin(angle) * outerRadius}
            stroke={isMainHour ? 'rgba(253, 224, 71, 0.9)' : 'rgba(148, 163, 184, 0.6)'}
            strokeWidth={isMainHour ? 2 : 1}
            strokeLinecap="round"
          />
        );
      })}

      {/* Hour hand */}
      <line
        x1={center}
        y1={center}
        x2={center + Math.sin((hourAngle * Math.PI) / 180) * hourHandLength}
        y2={center - Math.cos((hourAngle * Math.PI) / 180) * hourHandLength}
        stroke="rgba(253, 224, 71, 0.95)"
        strokeWidth="4"
        strokeLinecap="round"
        style={{ transition: 'all 0.5s ease-out' }}
      />

      {/* Minute hand */}
      <line
        x1={center}
        y1={center}
        x2={center + Math.sin((minuteAngle * Math.PI) / 180) * minuteHandLength}
        y2={center - Math.cos((minuteAngle * Math.PI) / 180) * minuteHandLength}
        stroke="rgba(226, 232, 240, 0.9)"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ transition: 'all 0.3s ease-out' }}
      />

      {/* Second hand */}
      <line
        x1={center}
        y1={center + 8}
        x2={center + Math.sin((secondAngle * Math.PI) / 180) * secondHandLength}
        y2={center - Math.cos((secondAngle * Math.PI) / 180) * secondHandLength}
        stroke="rgba(239, 68, 68, 0.9)"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ transition: 'transform 0.1s linear' }}
      />

      {/* Center dot */}
      <circle
        cx={center}
        cy={center}
        r="5"
        fill="rgba(253, 224, 71, 1)"
        stroke="rgba(251, 191, 36, 0.8)"
        strokeWidth="1"
      />
      
      {/* Inner center dot */}
      <circle
        cx={center}
        cy={center}
        r="2"
        fill="rgba(15, 23, 42, 1)"
      />
    </svg>
  );
}
