import { useEffect, useState, useId } from 'react';

interface AnimatedECGProps {
  className?: string;
  size?: number;
}

export function AnimatedECG({ className = '', size = 24 }: AnimatedECGProps) {
  const [dashOffset, setDashOffset] = useState(0);
  const uniqueId = useId().replace(/:/g, '');

  useEffect(() => {
    const interval = setInterval(() => {
      setDashOffset(prev => (prev - 3) % 100);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
    >
      <defs>
        {/* Glow filter */}
        <filter id={`ecg-glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main path: dot -> line -> ECG wave -> heart */}
      <g filter={`url(#ecg-glow-${uniqueId})`}>
        {/* Starting dot with pulse */}
        <circle
          cx="5"
          cy="60"
          r="4"
          fill="#ef4444"
        >
          <animate
            attributeName="r"
            values="3;5;3"
            dur="1s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="1;0.6;1"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* ECG line path that connects to heart */}
        <path
          d="M 9 60 
             L 18 60 
             L 22 60 
             L 26 72 
             L 30 48 
             L 34 60 
             L 38 60
             L 42 60
             L 50 40
             C 50 20, 80 20, 80 40
             C 80 55, 65 75, 50 88
             C 35 75, 20 55, 20 40
             C 20 28, 35 22, 50 40"
          fill="none"
          stroke="#ef4444"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="10 5"
          strokeDashoffset={dashOffset}
        />

        {/* Heart shape filled with slight transparency */}
        <path
          d="M 50 40
             C 50 20, 80 20, 80 40
             C 80 55, 65 75, 50 88
             C 35 75, 20 55, 20 40
             C 20 28, 35 22, 50 40"
          fill="rgba(239, 68, 68, 0.2)"
          stroke="none"
        >
          <animate
            attributeName="opacity"
            values="0.2;0.4;0.2"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </svg>
  );
}
