import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseAutoLogoutOptions {
  isTvMode: boolean;
  onLogout: () => void;
}

/**
 * Auto-logout hook that triggers logout at 07:04 and 19:04
 * AND checks for force-logout from the database (force_logout_at in unit_settings).
 * IMPORTANT: TV mode is ALWAYS exempted from auto-logout to ensure
 * continuous display operation without interruption.
 */
export function useAutoLogout({ isTvMode, onLogout }: UseAutoLogoutOptions) {
  const lastCheckRef = useRef<string>('');
  const warningShownRef = useRef<string>('');
  const forceLogoutExecutedRef = useRef<string>('');

  const checkAutoLogout = useCallback(() => {
    // CRITICAL: NEVER auto-logout TV mode - must stay active 24/7
    if (isTvMode || localStorage.getItem('isTvMode') === 'true') return;

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
      
      setTimeout(() => {
        onLogout();
      }, 1500);
    }
  }, [isTvMode, onLogout]);

  // Check for force-logout from database
  const checkForceLogout = useCallback(async () => {
    if (isTvMode || localStorage.getItem('isTvMode') === 'true') return;

    const unitName = localStorage.getItem('selectedUnitName');
    if (!unitName) return;

    try {
      const { data } = await supabase
        .from('unit_settings')
        .select('force_logout_at')
        .eq('unit_name', unitName)
        .maybeSingle();

      if (!data?.force_logout_at) return;

      const forceLogoutAt = data.force_logout_at as string;
      
      // Already executed this force logout
      if (forceLogoutExecutedRef.current === forceLogoutAt) return;

      // Check if force_logout_at is after the user's login time
      const loginTime = localStorage.getItem('loginTimestamp');
      if (loginTime && new Date(forceLogoutAt) > new Date(loginTime)) {
        forceLogoutExecutedRef.current = forceLogoutAt;
        
        toast.info('🔐 Logout Forçado pelo Administrador', {
          description: 'O administrador solicitou que todos os usuários façam login novamente.',
          duration: 8000,
        });

        setTimeout(() => {
          onLogout();
        }, 2000);
      }
    } catch (err) {
      // Silently ignore errors
    }
  }, [isTvMode, onLogout]);

  useEffect(() => {
    checkAutoLogout();
    checkForceLogout();
    
    const interval = setInterval(() => {
      checkAutoLogout();
      checkForceLogout();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [checkAutoLogout, checkForceLogout]);
}
