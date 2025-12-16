import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useBrazilTime } from '@/hooks/useBrazilTime';

const STORAGE_KEY = 'autoNightModeEnabled';
const MANUAL_THEME_KEY = 'manualThemeOverride';

export function AutoNightMode() {
  const { setTheme, theme } = useTheme();
  const { currentTime } = useBrazilTime();
  const lastHourRef = useRef<number | null>(null);

  // Check if auto night mode is enabled (default: false - disabled)
  const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
  
  // Check if user manually overrode the theme
  const hasManualOverride = localStorage.getItem(MANUAL_THEME_KEY) === 'true';

  useEffect(() => {
    if (!isEnabled || hasManualOverride) return;
    
    const hour = currentTime.getHours();
    
    // Only run when hour changes (not on every render)
    if (lastHourRef.current === hour) return;
    lastHourRef.current = hour;
    
    // Night mode: 19:00 - 06:00
    const isNightTime = hour >= 19 || hour < 6;
    
    const targetTheme = isNightTime ? 'dark' : 'light';
    
    if (theme !== targetTheme) {
      setTheme(targetTheme);
      console.log(`Auto night mode: switched to ${targetTheme} mode (hour: ${hour})`);
    }
  }, [currentTime, isEnabled, hasManualOverride, setTheme, theme]);

  // This component doesn't render anything
  return null;
}

// Hook to toggle auto night mode
export function useAutoNightModeToggle() {
  const toggleAutoNightMode = () => {
    const currentValue = localStorage.getItem(STORAGE_KEY) !== 'false';
    localStorage.setItem(STORAGE_KEY, String(!currentValue));
    // Clear manual override when toggling auto mode
    if (!currentValue) {
      localStorage.removeItem(MANUAL_THEME_KEY);
    }
  };

  const isAutoNightModeEnabled = localStorage.getItem(STORAGE_KEY) === 'true';

  return { isAutoNightModeEnabled, toggleAutoNightMode };
}

// Function to mark that user manually changed the theme
export function setManualThemeOverride(value: boolean) {
  if (value) {
    localStorage.setItem(MANUAL_THEME_KEY, 'true');
  } else {
    localStorage.removeItem(MANUAL_THEME_KEY);
  }
}
