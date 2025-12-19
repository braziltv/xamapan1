import { useMemo } from 'react';

interface Particle {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

export function FloatingParticles() {
  const particles = useMemo<Particle[]>(() => {
    const colors = [
      'rgba(6, 182, 212, 0.4)',   // cyan
      'rgba(16, 185, 129, 0.4)',  // emerald
      'rgba(139, 92, 246, 0.3)',  // violet
      'rgba(59, 130, 246, 0.3)',  // blue
      'rgba(236, 72, 153, 0.2)',  // pink
    ];
    
    return Array.from({ length: 35 }, (_, i) => ({
      id: i,
      size: Math.random() * 6 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * -20,
      opacity: Math.random() * 0.5 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-float-particle"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            opacity: particle.opacity,
          }}
        />
      ))}
      
      {/* Larger glowing orbs */}
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={`orb-${i}`}
          className="absolute rounded-full animate-float-orb"
          style={{
            width: `${20 + i * 10}px`,
            height: `${20 + i * 10}px`,
            left: `${10 + i * 20}%`,
            top: `${20 + (i % 3) * 25}%`,
            background: `radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)`,
            filter: 'blur(8px)',
            animationDuration: `${25 + i * 5}s`,
            animationDelay: `${-i * 3}s`,
          }}
        />
      ))}
    </div>
  );
}
