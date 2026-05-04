import { useMemo, useId, memo } from 'react';

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

// Optimized particle background - uses useMemo instead of useState to avoid re-renders
// Particles are generated once and cached, using pure CSS animations (no JS animation loop)
export const ParticleBackground = memo(function ParticleBackground({ 
  count = 20, // Reduced default from 30 to 20 for better performance
  color = 'cyan', 
  className = '',
  active = true 
}: ParticleBackgroundProps) {
  const uniqueId = useId().replace(/:/g, '');
  
  // Generate particles only once using useMemo (no state = no re-renders)
  const particles = useMemo<Particle[]>(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1.5, // Slightly smaller particles
        opacity: Math.random() * 0.4 + 0.15, // Slightly more transparent
        speed: Math.random() * 25 + 15, // Slower animation = less CPU
        delay: Math.random() * 5,
      });
    }
    return newParticles;
  }, [count]);

  if (!active) return null;

  const colorMap: Record<string, { primary: string; secondary: string }> = {
    cyan: { primary: 'rgba(34, 211, 238, 0.5)', secondary: 'rgba(59, 130, 246, 0.3)' },
    green: { primary: 'rgba(16, 185, 129, 0.5)', secondary: 'rgba(52, 211, 153, 0.3)' },
    purple: { primary: 'rgba(139, 92, 246, 0.5)', secondary: 'rgba(168, 85, 247, 0.3)' },
    gold: { primary: 'rgba(251, 191, 36, 0.5)', secondary: 'rgba(253, 224, 71, 0.3)' },
  };

  const colors = colorMap[color] || colorMap.cyan;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Use simple divs instead of SVG for better performance */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full will-change-transform"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: `radial-gradient(circle, ${colors.primary}, ${colors.secondary})`,
            opacity: particle.opacity,
            animation: `particleFloat ${particle.speed}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            transform: 'translateZ(0)', // GPU acceleration
          }}
        />
      ))}
    </div>
  );
});
