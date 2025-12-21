import { useEffect, useCallback, useRef } from 'react';

interface UseAutoFullscreenOptions {
  enabled?: boolean;
  targetRef?: React.RefObject<HTMLElement>;
}

export function useAutoFullscreen({ enabled = true, targetRef }: UseAutoFullscreenOptions = {}) {
  const hasRequestedRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  const requestFullscreen = useCallback(async () => {
    if (!enabled || hasRequestedRef.current) return;

    const element = targetRef?.current || document.documentElement;
    
    // Check if already in fullscreen
    if (document.fullscreenElement) {
      hasRequestedRef.current = true;
      return;
    }

    try {
      await element.requestFullscreen();
      hasRequestedRef.current = true;
      console.log('🖥️ Fullscreen ativado automaticamente');
    } catch (err) {
      // Fullscreen requires user interaction - this is expected
      console.log('Fullscreen requer interação do usuário');
    }
  }, [enabled, targetRef]);

  // Try fullscreen on any user interaction
  useEffect(() => {
    if (!enabled || hasRequestedRef.current) return;

    const handleInteraction = async () => {
      if (hasRequestedRef.current || retryCountRef.current >= maxRetries) return;
      
      retryCountRef.current++;
      await requestFullscreen();
    };

    // Events that can trigger fullscreen
    const events = ['click', 'touchstart', 'keydown'];
    
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: false, passive: true });
    });

    // Check if launched as PWA (standalone mode) and try fullscreen
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.matchMedia('(display-mode: fullscreen)').matches ||
                  (window.navigator as any).standalone === true;
    
    if (isPWA) {
      // Small delay to let the app initialize
      const timer = setTimeout(requestFullscreen, 500);
      return () => {
        clearTimeout(timer);
        events.forEach(event => {
          document.removeEventListener(event, handleInteraction);
        });
      };
    }

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [enabled, requestFullscreen]);

  // Handle visibility change - re-request fullscreen when page becomes visible
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !document.fullscreenElement) {
        hasRequestedRef.current = false;
        retryCountRef.current = 0;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled]);

  return { requestFullscreen };
}
