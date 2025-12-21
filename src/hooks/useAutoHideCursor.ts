import { useEffect, useCallback, useState } from 'react';

interface UseAutoHideCursorOptions {
  timeout?: number; // ms before hiding cursor
  enabled?: boolean;
}

export function useAutoHideCursor({ timeout = 3000, enabled = true }: UseAutoHideCursorOptions = {}) {
  const [isCursorHidden, setIsCursorHidden] = useState(false);

  const showCursor = useCallback(() => {
    setIsCursorHidden(false);
  }, []);

  const hideCursor = useCallback(() => {
    setIsCursorHidden(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsCursorHidden(false);
      return;
    }

    let hideTimeout: NodeJS.Timeout;

    const resetTimer = () => {
      showCursor();
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(hideCursor, timeout);
    };

    // Events that indicate user activity
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // Initial timer
    hideTimeout = setTimeout(hideCursor, timeout);

    return () => {
      clearTimeout(hideTimeout);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [timeout, enabled, showCursor, hideCursor]);

  return { isCursorHidden };
}
