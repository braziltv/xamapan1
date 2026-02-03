import { useEffect, useState, memo } from 'react';

interface ColorCycleOverlayProps {
  active?: boolean;
  intervalSeconds?: number;
  className?: string;
}

const colorSchemes = [
  {
    primary: 'rgba(59, 130, 246, 0.12)',    // Blue - slightly reduced opacity
    secondary: 'rgba(99, 102, 241, 0.08)',   // Indigo
  },
  {
    primary: 'rgba(16, 185, 129, 0.12)',    // Emerald
    secondary: 'rgba(20, 184, 166, 0.08)',   // Teal
  },
  {
    primary: 'rgba(139, 92, 246, 0.12)',    // Violet
    secondary: 'rgba(168, 85, 247, 0.08)',   // Purple
  },
  {
    primary: 'rgba(6, 182, 212, 0.12)',     // Cyan
    secondary: 'rgba(34, 211, 238, 0.08)',   // Light Cyan
  },
];

// Optimized with memo and simplified DOM structure
export const ColorCycleOverlay = memo(function ColorCycleOverlay({ 
  active = true, 
  intervalSeconds = 20, // Increased default interval from 15s to 20s
  className = '' 
}: ColorCycleOverlayProps) {
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % colorSchemes.length);
    }, intervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [active, intervalSeconds]);

  if (!active) return null;

  const currentColors = colorSchemes[colorIndex];

  // Simplified overlay with CSS transitions (no extra DOM elements for ambient glow)
  return (
    <div className={`fixed inset-0 pointer-events-none z-[5] ${className}`}>
      {/* Single gradient overlay - optimized */}
      <div 
        className="absolute inset-0 will-change-auto"
        style={{
          background: `
            radial-gradient(ellipse 100% 70% at 15% 15%, ${currentColors.primary} 0%, transparent 45%),
            radial-gradient(ellipse 80% 50% at 85% 85%, ${currentColors.secondary} 0%, transparent 40%)
          `,
          transition: 'background 2s ease-in-out',
          transform: 'translateZ(0)', // GPU layer
        }}
      />
    </div>
  );
});
