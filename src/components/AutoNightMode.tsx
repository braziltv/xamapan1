import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useBrazilTime } from '@/hooks/useBrazilTime';

const STORAGE_KEY = 'autoNightModeEnabled';

export function AutoNightMode() {
  const { setTheme, theme } = useTheme();
  const { currentTime } = useBrazilTime();

  // Check if auto night mode is enabled (default: true)
  const isEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';

  useEffect(() => {
    if (!isEnabled) return;
    
    const hour = currentTime.getHours();
    
    // Night mode: 19:00 - 06:00
    const isNightTime = hour >= 19 || hour < 6;
    
    const targetTheme = isNightTime ? 'dark' : 'light';
    
    if (theme !== targetTheme) {
      setTheme(targetTheme);
      console.log(`Auto night mode: switched to ${targetTheme} mode (hour: ${hour})`);
    }
  }, [currentTime, isEnabled, setTheme, theme]);

  // This component doesn't render anything
  return null;
}

// Hook to toggle auto night mode
export function useAutoNightModeToggle() {
  const toggleAutoNightMode = () => {
    const currentValue = localStorage.getItem(STORAGE_KEY) !== 'false';
    localStorage.setItem(STORAGE_KEY, String(!currentValue));
    // Reload to apply changes
    window.location.reload();
  };

  const isAutoNightModeEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';

  return { isAutoNightModeEnabled, toggleAutoNightMode };
}
