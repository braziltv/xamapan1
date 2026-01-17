import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAutoLogoutOptions {
  isTvMode: boolean;
  onLogout: () => void;
}

/**
 * Auto-logout hook that triggers logout at 07:04 and 19:04
 * IMPORTANT: TV mode is ALWAYS exempted from auto-logout to ensure
 * continuous display operation without interruption.
 */
export function useAutoLogout({ isTvMode, onLogout }: UseAutoLogoutOptions) {
  const lastCheckRef = useRef<string>('');
  const warningShownRef = useRef<string>('');

  const checkAutoLogout = useCallback(() => {
    // CRITICAL: NEVER auto-logout TV mode - must stay active 24/7
    if (isTvMode) return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = `${hours}:${minutes}`;
    
    // Target times: 07:04 and 19:04
    const isLogoutTime = (hours === 7 && minutes === 4) || (hours === 19 && minutes === 4);
    const isWarningTime = (hours === 7 && minutes === 3) || (hours === 19 && minutes === 3);
    
    // Show warning 1 minute before
    if (isWarningTime && warningShownRef.current !== currentTime) {
      warningShownRef.current = currentTime;
      toast.warning('⏰ Logout Automático em 1 minuto', {
        description: 'Por motivos de segurança e atualização do sistema, você será desconectado automaticamente às ' + 
          (hours === 7 ? '07:04' : '19:04') + '.',
        duration: 55000,
      });
    }
    
    // Execute logout at target time
    if (isLogoutTime && lastCheckRef.current !== currentTime) {
      lastCheckRef.current = currentTime;
      
      toast.info('🔐 Logout Automático Realizado', {
        description: 'Por motivos de segurança e atualização do aplicativo, sua sessão foi encerrada. Por favor, faça login novamente.',
        duration: 10000,
      });
      
      // Small delay to show toast before logout
      setTimeout(() => {
        onLogout();
      }, 1500);
    }
  }, [isTvMode, onLogout]);

  useEffect(() => {
    // Check immediately on mount
    checkAutoLogout();
    
    // Check every 30 seconds (more efficient than every second)
    const interval = setInterval(checkAutoLogout, 30000);
    
    return () => clearInterval(interval);
  }, [checkAutoLogout]);
}
