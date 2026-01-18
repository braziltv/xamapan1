import { useEffect, useState, useId } from 'react';

interface AnimatedECGProps {
  className?: string;
  size?: number;
  intensity?: 'calm' | 'normal' | 'excited';
}

export function AnimatedECG({ className = '', size = 24, intensity = 'normal' }: AnimatedECGProps) {
  const [dashOffset, setDashOffset] = useState(0);
  const [heartScale, setHeartScale] = useState(1);
  const [beatPhase, setBeatPhase] = useState(0);
  const uniqueId = useId().replace(/:/g, '');

  // Realistic heartbeat rhythm with variable timing
  useEffect(() => {
    const speeds = {
      calm: { dashSpeed: 2, beatInterval: 1200 },
      normal: { dashSpeed: 3, beatInterval: 800 },
      excited: { dashSpeed: 5, beatInterval: 500 },
    };
    
    const { dashSpeed, beatInterval } = speeds[intensity];

    // ECG line animation
    const dashInterval = setInterval(() => {
      setDashOffset(prev => (prev - dashSpeed) % 200);
    }, 30);

    // Realistic heartbeat with two-phase beat (lub-dub)
    const beatSequence = () => {
      // First beat (lub)
      setBeatPhase(1);
      setHeartScale(1.15);
      
      setTimeout(() => {
        setHeartScale(1);
        setBeatPhase(0);
      }, 100);

      // Second beat (dub) - slightly smaller
      setTimeout(() => {
        setBeatPhase(2);
        setHeartScale(1.08);
      }, 200);

      setTimeout(() => {
        setHeartScale(1);
        setBeatPhase(0);
      }, 300);
    };

    beatSequence();
    const beatTimer = setInterval(beatSequence, beatInterval);

    return () => {
      clearInterval(dashInterval);
      clearInterval(beatTimer);
    };
  }, [intensity]);

  // Calculate colors based on beat phase
  const heartColor = beatPhase === 1 ? '#ff3333' : beatPhase === 2 ? '#ef4444' : '#ef4444';
  const heartGlow = beatPhase > 0 ? 0.6 : 0.2;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`transition-transform duration-100 ${className}`}
      style={{ transform: `scale(${heartScale})` }}
    >
      <defs>
        {/* Enhanced glow filter */}
        <filter id={`ecg-glow-${uniqueId}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Pulse glow for heartbeat */}
        <filter id={`heart-pulse-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={beatPhase > 0 ? 4 : 2} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradient for ECG line */}
        <linearGradient id={`ecg-gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Main ECG group */}
      <g filter={`url(#ecg-glow-${uniqueId})`}>
        {/* Starting pulse dot with realistic pulsing */}
        <circle
          cx="5"
          cy="60"
          r={beatPhase > 0 ? 5 : 3.5}
          fill={heartColor}
          style={{ transition: 'all 0.1s ease-out' }}
        >
          <animate
            attributeName="opacity"
            values="1;0.5;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* ECG waveform path - more realistic pattern */}
        <path
          d="M 9 60 
             L 16 60 
             L 19 60 
             L 21 58 
             L 23 62 
             L 25 60 
             L 28 60 
             L 30 48 
             L 32 75 
             L 34 42 
             L 36 60 
             L 38 60
             L 42 60
             L 50 40
             C 50 20, 80 20, 80 40
             C 80 55, 65 75, 50 88
             C 35 75, 20 55, 20 40
             C 20 28, 35 22, 50 40"
          fill="none"
          stroke={`url(#ecg-gradient-${uniqueId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 4"
          strokeDashoffset={dashOffset}
        />

        {/* Heart shape with dynamic glow */}
        <g filter={`url(#heart-pulse-${uniqueId})`}>
          <path
            d="M 50 40
               C 50 20, 80 20, 80 40
               C 80 55, 65 75, 50 88
               C 35 75, 20 55, 20 40
               C 20 28, 35 22, 50 40"
            fill={`rgba(239, 68, 68, ${heartGlow})`}
            stroke="none"
            style={{ transition: 'fill 0.1s ease-out' }}
          />
        </g>

        {/* Inner heart highlight */}
        <path
          d="M 50 45
             C 50 32, 70 32, 70 45
             C 70 52, 60 62, 50 70
             C 40 62, 30 52, 30 45
             C 30 38, 40 35, 50 45"
          fill="rgba(255, 255, 255, 0.1)"
          stroke="none"
        />
      </g>
    </svg>
  );
}
