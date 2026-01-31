import { useEffect, useRef, useCallback } from 'react';

const AUTO_RELOAD_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Hook para recarregar a TV automaticamente a cada 10 minutos de ociosidade
 * Só recarrega se não houver chamadas durante esse período
 */
export function useTVAutoReload(enabled: boolean = true) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<Date>(new Date());

  // Reset timer when a call happens
  const onCallMade = useCallback(() => {
    lastCallTimeRef.current = new Date();
    console.log('⏰ Timer de auto-reload resetado - chamada detectada');
    
    // Reset the timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (enabled) {
      timeoutRef.current = setTimeout(triggerReload, AUTO_RELOAD_INTERVAL);
    }
  }, [enabled]);

  const triggerReload = () => {
    const now = new Date();
    const timeSinceLastCall = now.getTime() - lastCallTimeRef.current.getTime();
    
    // Only reload if no calls for 10 minutes
    if (timeSinceLastCall >= AUTO_RELOAD_INTERVAL) {
      console.log('⏰ 10 minutos sem chamadas. Recarregando TV...');
      
      // Show notification before reload
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.95);
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
      `;
      notification.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 1.5rem;">🔄</div>
        <div style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">Só um momentinho 😊</div>
        <div style="font-size: 1.5rem; color: #a0aec0; line-height: 1.6;">
          Estamos atualizando o aplicativo.<br>
          Em instantes, as chamadas serão exibidas novamente.
        </div>
      `;
      document.body.appendChild(notification);
      
      // Reload after 5 seconds
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } else {
      // Schedule next check
      const remainingTime = AUTO_RELOAD_INTERVAL - timeSinceLastCall;
      console.log(`⏰ Última chamada há ${Math.round(timeSinceLastCall / 1000 / 60)} min. Próxima verificação em ${Math.round(remainingTime / 1000 / 60)} min.`);
      timeoutRef.current = setTimeout(triggerReload, remainingTime);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    console.log('⏰ Auto-reload da TV configurado: recarrega após 10 minutos sem chamadas');
    lastCallTimeRef.current = new Date();

    // Start initial timeout
    timeoutRef.current = setTimeout(triggerReload, AUTO_RELOAD_INTERVAL);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled]);

  return { onCallMade };
}
