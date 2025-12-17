import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useBrazilTime } from '@/hooks/useBrazilTime';
import { toast } from 'sonner';

const STORAGE_KEY = 'autoNightModeEnabled';
const MANUAL_THEME_KEY = 'manualThemeOverride';
const LAST_AUTO_THEME_KEY = 'lastAutoTheme';

export function AutoNightMode() {
  const { setTheme, theme } = useTheme();
  const { currentTime } = useBrazilTime();
  const lastCheckRef = useRef<string | null>(null);

  // Auto night mode is enabled by default (true)
  const isEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';
  
  // Check if user manually overrode the theme
  const hasManualOverride = localStorage.getItem(MANUAL_THEME_KEY) === 'true';

  useEffect(() => {
    if (!isEnabled || hasManualOverride) return;
    
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    
    // Create a unique key for current minute to check only once per minute
    const checkKey = `${hour}:${minute}`;
    if (lastCheckRef.current === checkKey) return;
    lastCheckRef.current = checkKey;
    
    // Calculate time in minutes since midnight
    const timeInMinutes = hour * 60 + minute;
    
    // Light mode: 06:25 (385 min) to 18:45 (1125 min)
    // Dark mode: 18:45 to 06:25
    const lightStart = 6 * 60 + 25;  // 06:25 = 385 minutes
    const lightEnd = 18 * 60 + 45;   // 18:45 = 1125 minutes
    
    const isDayTime = timeInMinutes >= lightStart && timeInMinutes < lightEnd;
    const targetTheme = isDayTime ? 'light' : 'dark';
    
    // Get last auto-set theme to know if we need to show notification
    const lastAutoTheme = localStorage.getItem(LAST_AUTO_THEME_KEY);
    
    if (theme !== targetTheme) {
      setTheme(targetTheme);
      localStorage.setItem(LAST_AUTO_THEME_KEY, targetTheme);
      
      // Show notification when theme changes
      toast('👁️🌓 Interface adaptada para melhor ergonomia visual!', {
        duration: 4000,
        position: 'top-center',
      });
      
      console.log(`Auto night mode: switched to ${targetTheme} mode (${hour}:${minute.toString().padStart(2, '0')})`);
    } else if (lastAutoTheme !== targetTheme) {
      // Update stored theme even if already correct
      localStorage.setItem(LAST_AUTO_THEME_KEY, targetTheme);
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

  const isAutoNightModeEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';

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
