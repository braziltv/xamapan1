import { useState, useEffect, useCallback } from 'react';

export type TVResolutionTier = 
  | 'small'     // < 640px (small monitors)
  | 'medium'    // 640-1023px (32" monitors)
  | 'large'     // 1024-1279px (42" TVs)
  | 'xlarge'    // 1280-1535px (50" TVs)
  | 'xxlarge'   // 1536-1919px (55" TVs)
  | 'fullhd'    // 1920px+ (Full HD+ TVs)
  ;

export interface TVResolution {
  width: number;
  height: number;
  tier: TVResolutionTier;
  isLandscape: boolean;
  aspectRatio: number;
  scale: number; // Scale factor for dynamic sizing (0.5 to 1.5)
}

// Calculate resolution tier based on viewport width
function getResolutionTier(width: number): TVResolutionTier {
  if (width < 640) return 'small';
  if (width < 1024) return 'medium';
  if (width < 1280) return 'large';
  if (width < 1536) return 'xlarge';
  if (width < 1920) return 'xxlarge';
  return 'fullhd';
}

// Calculate scale factor for proportional sizing
function getScaleFactor(width: number): number {
  // Base scale on 1920px being 1.0
  const baseWidth = 1920;
  const scale = width / baseWidth;
  
  // Clamp between 0.4 (very small) and 1.2 (very large)
  return Math.max(0.4, Math.min(1.2, scale));
}

export function useTVResolution(): TVResolution {
  const [resolution, setResolution] = useState<TVResolution>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1920,
        height: 1080,
        tier: 'fullhd',
        isLandscape: true,
        aspectRatio: 16/9,
        scale: 1
      };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      width,
      height,
      tier: getResolutionTier(width),
      isLandscape: width > height,
      aspectRatio: width / height,
      scale: getScaleFactor(width)
    };
  });

  const updateResolution = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setResolution({
      width,
      height,
      tier: getResolutionTier(width),
      isLandscape: width > height,
      aspectRatio: width / height,
      scale: getScaleFactor(width)
    });
  }, []);

  useEffect(() => {
    // Update on mount
    updateResolution();
    
    // Listen to resize events with debounce
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateResolution, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Also listen to fullscreen changes
    document.addEventListener('fullscreenchange', handleResize);
    document.addEventListener('webkitfullscreenchange', handleResize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      document.removeEventListener('webkitfullscreenchange', handleResize);
    };
  }, [updateResolution]);

  return resolution;
}

// Utility function to get responsive class based on resolution
export function getResponsiveClass(
  resolution: TVResolution,
  classes: Partial<Record<TVResolutionTier, string>>
): string {
  return classes[resolution.tier] || classes.fullhd || '';
}

// Utility function to calculate responsive size
export function getResponsiveSize(
  resolution: TVResolution,
  baseSize: number,
  unit: 'px' | 'rem' | 'vw' = 'px'
): string {
  const scaledSize = baseSize * resolution.scale;
  return `${scaledSize}${unit}`;
}
