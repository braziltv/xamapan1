import { useEffect, useState } from 'react';

interface ColorCycleOverlayProps {
  active?: boolean;
  intervalSeconds?: number;
  className?: string;
}

const colorSchemes = [
  {
    primary: 'rgba(59, 130, 246, 0.15)',    // Blue
    secondary: 'rgba(99, 102, 241, 0.1)',   // Indigo
  },
  {
    primary: 'rgba(16, 185, 129, 0.15)',    // Emerald
    secondary: 'rgba(20, 184, 166, 0.1)',   // Teal
  },
  {
    primary: 'rgba(139, 92, 246, 0.15)',    // Violet
    secondary: 'rgba(168, 85, 247, 0.1)',   // Purple
  },
  {
    primary: 'rgba(236, 72, 153, 0.12)',    // Pink
    secondary: 'rgba(244, 114, 182, 0.08)', // Rose
  },
  {
    primary: 'rgba(245, 158, 11, 0.12)',    // Amber
    secondary: 'rgba(251, 191, 36, 0.08)',  // Yellow
  },
  {
    primary: 'rgba(6, 182, 212, 0.15)',     // Cyan
    secondary: 'rgba(34, 211, 238, 0.1)',   // Light Cyan
  },
];

export function ColorCycleOverlay({ 
  active = true, 
  intervalSeconds = 15,
  className = '' 
}: ColorCycleOverlayProps) {
  const [colorIndex, setColorIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      // Start transition, then change color
      setTimeout(() => {
        setColorIndex((prev) => (prev + 1) % colorSchemes.length);
        setIsTransitioning(false);
      }, 1500); // Transition duration
      
    }, intervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [active, intervalSeconds]);

  if (!active) return null;

  const currentColors = colorSchemes[colorIndex];

  return (
    <div className={`fixed inset-0 pointer-events-none z-[5] ${className}`}>
      {/* Main gradient overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 20% 20%, ${currentColors.primary} 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 80% 80%, ${currentColors.secondary} 0%, transparent 50%),
            radial-gradient(ellipse 80% 100% at 50% 50%, ${currentColors.primary} 0%, transparent 60%)
          `,
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 1.5s ease-in-out',
        }}
      />
      
      {/* Secondary accent layer */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg, ${currentColors.secondary} 0%, transparent 40%),
            linear-gradient(315deg, ${currentColors.primary} 0%, transparent 40%)
          `,
          opacity: isTransitioning ? 0 : 0.5,
          transition: 'opacity 1.5s ease-in-out',
        }}
      />

      {/* Ambient glow spots */}
      <div 
        className="absolute w-96 h-96 rounded-full blur-3xl"
        style={{
          top: '10%',
          left: '5%',
          background: currentColors.primary,
          opacity: isTransitioning ? 0 : 0.6,
          transition: 'opacity 1.5s ease-in-out',
        }}
      />
      <div 
        className="absolute w-80 h-80 rounded-full blur-3xl"
        style={{
          bottom: '15%',
          right: '10%',
          background: currentColors.secondary,
          opacity: isTransitioning ? 0 : 0.5,
          transition: 'opacity 1.5s ease-in-out',
        }}
      />
    </div>
  );
}
