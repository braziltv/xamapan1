import { useEffect, useState } from 'react';

interface AnalogClockProps {
  size?: number;
}

export function AnalogClock({ size = 80 }: AnalogClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;

  // Calculate angles
  const secondAngle = (seconds / 60) * 360;
  const minuteAngle = ((minutes + seconds / 60) / 60) * 360;
  const hourAngle = ((hours + minutes / 60) / 12) * 360;

  const center = size / 2;
  const radius = size / 2 - 4;

  // Generate hour markers
  const hourMarkers = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const isMainHour = i % 3 === 0;
    const innerRadius = isMainHour ? radius - 8 : radius - 5;
    const outerRadius = radius - 2;
    return {
      x1: center + Math.cos(angle) * innerRadius,
      y1: center + Math.sin(angle) * innerRadius,
      x2: center + Math.cos(angle) * outerRadius,
      y2: center + Math.sin(angle) * outerRadius,
      isMain: isMainHour,
    };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="drop-shadow-lg">
        {/* Clock face */}
        <defs>
          <linearGradient id="clockFace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(30, 41, 59, 0.9)" />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.95)" />
          </linearGradient>
          <linearGradient id="clockRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(148, 163, 184, 0.4)" />
            <stop offset="50%" stopColor="rgba(100, 116, 139, 0.2)" />
            <stop offset="100%" stopColor="rgba(148, 163, 184, 0.4)" />
          </linearGradient>
        </defs>
        
        {/* Outer ring */}
        <circle
          cx={center}
          cy={center}
          r={radius + 2}
          fill="none"
          stroke="url(#clockRim)"
          strokeWidth="2"
        />
        
        {/* Face background */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="url(#clockFace)"
        />

        {/* Hour markers */}
        {hourMarkers.map((marker, i) => (
          <line
            key={i}
            x1={marker.x1}
            y1={marker.y1}
            x2={marker.x2}
            y2={marker.y2}
            stroke={marker.isMain ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.4)"}
            strokeWidth={marker.isMain ? 2 : 1}
            strokeLinecap="round"
          />
        ))}

        {/* Hour hand */}
        <line
          x1={center}
          y1={center}
          x2={center + Math.sin((hourAngle * Math.PI) / 180) * (radius * 0.5)}
          y2={center - Math.cos((hourAngle * Math.PI) / 180) * (radius * 0.5)}
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          className="drop-shadow-md"
        />

        {/* Minute hand */}
        <line
          x1={center}
          y1={center}
          x2={center + Math.sin((minuteAngle * Math.PI) / 180) * (radius * 0.7)}
          y2={center - Math.cos((minuteAngle * Math.PI) / 180) * (radius * 0.7)}
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          className="drop-shadow-md"
        />

        {/* Second hand */}
        <line
          x1={center}
          y1={center}
          x2={center + Math.sin((secondAngle * Math.PI) / 180) * (radius * 0.8)}
          y2={center - Math.cos((secondAngle * Math.PI) / 180) * (radius * 0.8)}
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="transition-transform duration-100"
        />

        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r={4}
          fill="#22d3ee"
          className="drop-shadow-lg"
        />
        <circle
          cx={center}
          cy={center}
          r={2}
          fill="white"
        />
      </svg>
    </div>
  );
}
