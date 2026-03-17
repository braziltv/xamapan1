import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook para prevenir modo de espera em Android TV
 * Usa múltiplas técnicas para manter a tela ativa:
 * 1. Wake Lock API (navegadores modernos)
 * 2. Video invisível em loop (fallback)
 * 3. Simulação de atividade periódica
 */
export const usePreventSleep = (enabled: boolean = true) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tenta adquirir Wake Lock API
  const requestWakeLock = useCallback(async () => {
    if (!enabled) return;
    
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('🔒 Wake Lock adquirido com sucesso');
        
        wakeLockRef.current?.addEventListener('release', () => {
          console.log('🔓 Wake Lock liberado');
        });
      }
    } catch (err) {
      console.log('⚠️ Wake Lock não disponível, usando fallback:', err);
    }
  }, [enabled]);

  // Cria video invisível como fallback (técnica NoSleep)
  const createFallbackVideo = useCallback(() => {
    if (!enabled || videoRef.current) return;

    try {
      // Cria um vídeo base64 mínimo (1x1 pixel, transparente, em loop)
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
      
      // Vídeo WebM mínimo (1x1 pixel transparente)
      const webmBase64 = 'data:video/webm;base64,GkXfowEAAAAAAAAfQoaBAUL3gQFC8oEEQvOBCEKChHdlYm1Ch4EEQoWBAhhTgGcBAAAAAAAVkhFNm3RALE27i1OrhBVJqWZTrIHfTbuMU6uEFlSua1OsggEwTbuMU6uEHFO7a1OsggI47AEAAAAAAAAAAAAAnQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmAQAAAAAAAEUq17GDD0JATYCNTGF2ZjU3LjgzLjEwMFdBjUxhdmY1Ny44My4xMDBEiYhARAAAAAAAABZUrmsBAAAAAAAAR6uEEUmpZlOwggE1TbuMU6uEElSua1OsggJN7AEAAAAAAAAAACdBLm1AAAAAAABLYXJtYQAAAAAAAAAAAAAAAABTYW1wbGVJRAAAAAAAAABJbmNyZWFzZQAAAAAAAABBbGJ1bQAAAAAAAAAAAExvdmFibGUAV6uEEUmpZlOwggE4TbuMU6uEElSua1OsggJQ7AEAAAAAAAAAAAAnQS5tQAAAAAAAS2FybWEAAAAAAAAAAAAAAAAAU2FtcGxlSUQAAAAAAAAAU2FtcGxlSUQAAAAAAAAAAExvdmFibGUA';
      
      // Fallback MP4 se WebM não funcionar
      const mp4Base64 = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAs1tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1MiByMjg1NCBlOWE1OTAzIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTMgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEwIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAgGWIhAAz//727L4FNf2f0JcRLMXaSnA+KqSAgHc0wAAAAwAAAwAAM+WJxkE/OKAAAAACU0AI/+M4APwZZAAAC7gAFzAAABbICAgIAAADhAAAAK4AAAAHAAAD4AD+AwAAAdoCBAgIAADhAAAAGOAAAAMAAAADAAAAAAAAAhAAAAGgIAAAAwAAAAMAAAADAIA=';

      video.src = webmBase64;
      
      video.onerror = () => {
        console.log('⚠️ WebM falhou, tentando MP4');
        video.src = mp4Base64;
      };

      document.body.appendChild(video);
      videoRef.current = video;

      // Tenta reproduzir o vídeo
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🎬 Vídeo anti-sleep iniciado');
          })
          .catch((err) => {
            console.log('⚠️ Auto-play bloqueado:', err);
          });
      }
    } catch (err) {
      console.log('⚠️ Erro ao criar vídeo fallback:', err);
    }
  }, [enabled]);

  // Simula movimento do mouse ou toque virtual
  const simulateMouseMove = useCallback(() => {
    if (!enabled) return;

    try {
      // Gera posição aleatória na tela
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;

      // Técnica 1: Dispara evento de movimento do mouse
      const mouseEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        screenX: x,
        screenY: y,
      });
      document.dispatchEvent(mouseEvent);

      // Técnica 2: Dispara evento de toque virtual (para Android TV)
      if ('TouchEvent' in window) {
        try {
          const touch = new Touch({
            identifier: Date.now(),
            target: document.body,
            clientX: x,
            clientY: y,
            screenX: x,
            screenY: y,
            pageX: x,
            pageY: y,
          });
          
          const touchEvent = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [touch],
            targetTouches: [touch],
            changedTouches: [touch],
          });
          document.dispatchEvent(touchEvent);

          // Touch end imediato
          const touchEndEvent = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            touches: [],
            targetTouches: [],
            changedTouches: [touch],
          });
          document.dispatchEvent(touchEndEvent);
        } catch (touchErr) {
          // TouchEvent pode não ser suportado em alguns navegadores
        }
      }

      // Técnica 3: Dispara evento de pointermove (mais moderno)
      const pointerEvent = new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        screenX: x,
        screenY: y,
        pointerType: 'mouse',
      });
      document.dispatchEvent(pointerEvent);

      console.log('🖱️ Movimento virtual simulado');
    } catch (err) {
      console.log('⚠️ Erro ao simular movimento:', err);
    }
  }, [enabled]);

  // Simulação de atividade leve (não trava o navegador)
  const simulateActivity = useCallback(() => {
    if (!enabled) return;

    // Técnica 1: Modifica um atributo invisível
    const html = document.documentElement;
    const currentValue = html.getAttribute('data-keepalive') || '0';
    html.setAttribute('data-keepalive', String((parseInt(currentValue) + 1) % 1000));

    // Técnica 2: Força um micro-reflow (muito leve)
    void document.body.offsetHeight;

    // Técnica 3: Atualiza timestamp no localStorage
    try {
      localStorage.setItem('tv-keepalive', Date.now().toString());
    } catch (e) {
      // Ignora erros de localStorage
    }

    // Técnica 4: Simula movimento do mouse/toque
    simulateMouseMove();
  }, [enabled, simulateMouseMove]);

  // Inicia tudo
  useEffect(() => {
    if (!enabled) return;

    console.log('🛡️ Iniciando prevenção de modo de espera...');

    // Tenta Wake Lock primeiro
    requestWakeLock();

    // Cria vídeo como fallback
    createFallbackVideo();

    // Inicia simulação de atividade a cada 15 segundos (para TVs mais agressivas)
    intervalRef.current = setInterval(() => {
      simulateActivity();
      
      // Re-adquire Wake Lock se foi perdido
      if (!wakeLockRef.current) {
        requestWakeLock();
      }
      
      // Garante que o vídeo está rodando
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }, 15000);

    // Re-adquire Wake Lock quando a página volta a ser visível
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📺 Página visível, re-adquirindo Wake Lock...');
        requestWakeLock();
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('🧹 Limpando prevenção de modo de espera...');
      
      // Libera Wake Lock
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }

      // Remove vídeo
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.remove();
        videoRef.current = null;
      }

      // Limpa intervalo
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, requestWakeLock, createFallbackVideo, simulateActivity]);

  return {
    isActive: enabled,
    hasWakeLock: !!wakeLockRef.current
  };
};
