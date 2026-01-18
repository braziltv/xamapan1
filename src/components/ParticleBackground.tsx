import { useEffect, useState, useId } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  delay: number;
}

interface ParticleBackgroundProps {
  count?: number;
  color?: string;
  className?: string;
  active?: boolean;
}

export function ParticleBackground({ 
  count = 30, 
  color = 'cyan', 
  className = '',
  active = true 
}: ParticleBackgroundProps) {
  const uniqueId = useId().replace(/:/g, '');
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        opacity: Math.random() * 0.5 + 0.2,
        speed: Math.random() * 20 + 10,
        delay: Math.random() * 5,
      });
    }
    setParticles(newParticles);
  }, [count]);

  if (!active) return null;

  const colorMap: Record<string, { primary: string; secondary: string }> = {
    cyan: { primary: 'rgba(34, 211, 238, 0.6)', secondary: 'rgba(59, 130, 246, 0.4)' },
    green: { primary: 'rgba(16, 185, 129, 0.6)', secondary: 'rgba(52, 211, 153, 0.4)' },
    purple: { primary: 'rgba(139, 92, 246, 0.6)', secondary: 'rgba(168, 85, 247, 0.4)' },
    gold: { primary: 'rgba(251, 191, 36, 0.6)', secondary: 'rgba(253, 224, 71, 0.4)' },
  };

  const colors = colorMap[color] || colorMap.cyan;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={`particle-glow-${uniqueId}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={`particle-gradient-${uniqueId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.primary} />
            <stop offset="100%" stopColor={colors.secondary} />
          </radialGradient>
        </defs>
        
        {particles.map((particle) => (
          <circle
            key={particle.id}
            cx={`${particle.x}%`}
            cy={`${particle.y}%`}
            r={particle.size}
            fill={`url(#particle-gradient-${uniqueId})`}
            filter={`url(#particle-glow-${uniqueId})`}
            opacity={particle.opacity}
            style={{
              animation: `particleFloat ${particle.speed}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
