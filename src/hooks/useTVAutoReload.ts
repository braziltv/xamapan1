import { useEffect, useRef } from 'react';

const AUTO_RELOAD_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Hook para recarregar a TV automaticamente a cada 15 minutos
 * Diferente do useInactivityReload, este hook recarrega independente de atividade
 * Útil para manter a TV sempre atualizada e evitar problemas de memória
 */
export function useTVAutoReload(enabled: boolean = true) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date>(new Date());

  useEffect(() => {
    if (!enabled) return;

    console.log('⏰ Auto-reload da TV configurado para 15 minutos');
    startTimeRef.current = new Date();

    intervalRef.current = setInterval(() => {
      const now = new Date();
      const elapsed = Math.round((now.getTime() - startTimeRef.current.getTime()) / 1000 / 60);
      
      console.log(`⏰ Auto-reload da TV: ${elapsed} minutos desde o último reload. Recarregando...`);
      
      // Show notification before reload
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 2rem 3rem;
        border-radius: 1rem;
        font-size: 1.5rem;
        z-index: 99999;
        text-align: center;
      `;
      notification.innerHTML = '🔄 Atualizando...<br><small>Atualização automática programada</small>';
      document.body.appendChild(notification);
      
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }, AUTO_RELOAD_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled]);

  return {
    nextReloadIn: () => {
      const elapsed = Date.now() - startTimeRef.current.getTime();
      const remaining = Math.max(0, AUTO_RELOAD_INTERVAL - elapsed);
      return Math.round(remaining / 1000 / 60); // minutes
    }
  };
}
