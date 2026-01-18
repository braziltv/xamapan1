import { useEffect, useState, useId } from 'react';
import { ParticleBackground } from './ParticleBackground';

interface SpotlightOverlayProps {
  active: boolean;
  color?: 'blue' | 'green' | 'gold';
  className?: string;
}

export function SpotlightOverlay({ active, color = 'blue', className = '' }: SpotlightOverlayProps) {
  const uniqueId = useId().replace(/:/g, '');
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (!active) return;

    // Animate spotlight position subtly
    const interval = setInterval(() => {
      setSpotlightPos({
        x: 50 + Math.sin(Date.now() / 1000) * 5,
        y: 50 + Math.cos(Date.now() / 800) * 3,
      });
    }, 50);

    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const colorMap = {
    blue: {
      primary: 'rgba(59, 130, 246, 0.4)',
      secondary: 'rgba(147, 197, 253, 0.2)',
      particle: 'cyan',
    },
    green: {
      primary: 'rgba(16, 185, 129, 0.4)',
      secondary: 'rgba(167, 243, 208, 0.2)',
      particle: 'green',
    },
    gold: {
      primary: 'rgba(251, 191, 36, 0.4)',
      secondary: 'rgba(253, 224, 71, 0.2)',
      particle: 'gold',
    },
  };

  const colors = colorMap[color];

  return (
    <div className={`fixed inset-0 pointer-events-none z-[90] ${className}`}>
      {/* Spotlight gradient */}
      <div 
        className="absolute inset-0 animate-spotlight-pulse"
        style={{
          background: `radial-gradient(ellipse 80% 60% at ${spotlightPos.x}% ${spotlightPos.y}%, ${colors.primary} 0%, ${colors.secondary} 40%, transparent 70%)`,
        }}
      />

      {/* Volumetric light beams */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`beam-${uniqueId}`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.6" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Light beams from top */}
        {[...Array(5)].map((_, i) => {
          const baseX = 20 + i * 15;
          const offset = Math.sin(Date.now() / 1000 + i) * 2;
          return (
            <polygon
              key={i}
              points={`${baseX + offset},0 ${baseX + 10 + offset},0 ${baseX + 25 + offset},100% ${baseX - 15 + offset},100%`}
              fill={`url(#beam-${uniqueId})`}
              className="animate-beam-sway"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          );
        })}
      </svg>

      {/* Particles */}
      <ParticleBackground count={50} color={colors.particle} active={active} />

      {/* Lens flare effect */}
      <div 
        className="absolute w-32 h-32 rounded-full blur-3xl animate-pulse"
        style={{
          left: `${spotlightPos.x}%`,
          top: `${spotlightPos.y - 20}%`,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
