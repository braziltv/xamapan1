import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para reprodução de áudios de hora - 100% OFFLINE
 * Todos os áudios estão pré-cacheados no Supabase Storage (bucket: tts-cache/time/)
 * Não há dependência de API externa (ElevenLabs)
 */
export const useHourAudio = () => {
  // URLs diretas do storage público
  const getHourUrl = (hour: number): string => {
    const cacheKey = `time/h_${hour.toString().padStart(2, '0')}.mp3`;
    const { data } = supabase.storage.from('tts-cache').getPublicUrl(cacheKey);
    return data.publicUrl;
  };

  const getMinuteUrl = (minute: number): string | null => {
    if (minute === 0) return null;
    const cacheKey = `time/m_${minute.toString().padStart(2, '0')}.mp3`;
    const { data } = supabase.storage.from('tts-cache').getPublicUrl(cacheKey);
    return data.publicUrl;
  };

  const getMinutosWordUrl = (): string => {
    const { data } = supabase.storage.from('tts-cache').getPublicUrl('time/minutos.mp3');
    return data.publicUrl;
  };

  // Pré-carregar áudio e retornar promise quando estiver pronto
  const preloadAudio = (url: string, volume: number): Promise<HTMLAudioElement> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.volume = volume;
      audio.preload = 'auto';
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = () => reject(new Error(`Failed to preload: ${url}`));
      audio.src = url;
    });
  };

  /**
   * Reproduzir hora concatenando os áudios do cache
   * Formato: [hora] [e X minutos] (exceto hora cheia ou e meia)
   */
  const playHourAudio = async (hour: number, minute: number): Promise<boolean> => {
    try {
      const timeAnnouncementVolume = parseFloat(localStorage.getItem('volume-time-announcement') || '1');

      const hourUrl = getHourUrl(hour);
      const minuteUrl = getMinuteUrl(minute);
      const minutosWordUrl = getMinutosWordUrl();

      // Pré-carregar todos os áudios em paralelo para eliminar delay
      const audioPromises: Promise<HTMLAudioElement>[] = [preloadAudio(hourUrl, timeAnnouncementVolume)];
      
      if (minuteUrl) {
        audioPromises.push(preloadAudio(minuteUrl, timeAnnouncementVolume));
        // Não fala "minutos" quando minute === 30 (e meia)
        if (minute !== 30) {
          audioPromises.push(preloadAudio(minutosWordUrl, timeAnnouncementVolume));
        }
      }

      const audios = await Promise.all(audioPromises);

      // Reproduzir em sequência (já pré-carregados, sem delay de loading)
      for (const audio of audios) {
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('Audio playback failed'));
          audio.play().catch(reject);
        });
      }

      return true;
    } catch (error) {
      console.error('Error playing hour audio:', error);
      return false;
    }
  };

  /**
   * Verificar quais áudios existem no cache (para diagnóstico)
   */
  const checkAudiosExist = async (): Promise<{ 
    hours: number; 
    minutes: number;
    hasMinutosWord: boolean;
    missingHours: number[];
    missingMinutes: number[];
  }> => {
    try {
      const { data: files } = await supabase.storage
        .from('tts-cache')
        .list('time');
      
      if (!files) return { 
        hours: 0, 
        minutes: 0, 
        hasMinutosWord: false,
        missingHours: Array.from({length: 24}, (_, i) => i), 
        missingMinutes: Array.from({length: 59}, (_, i) => i + 1) 
      };

      const existingHours = new Set(
        files.filter(f => f.name.startsWith('h_')).map(f => parseInt(f.name.replace('h_', '').replace('.mp3', '')))
      );
      const existingMinutes = new Set(
        files.filter(f => f.name.startsWith('m_')).map(f => parseInt(f.name.replace('m_', '').replace('.mp3', '')))
      );
      const hasMinutosWord = files.some(f => f.name === 'minutos.mp3');

      const missingHours = Array.from({length: 24}, (_, i) => i).filter(h => !existingHours.has(h));
      const missingMinutes = Array.from({length: 59}, (_, i) => i + 1).filter(m => !existingMinutes.has(m));
      
      return { 
        hours: existingHours.size, 
        minutes: existingMinutes.size,
        hasMinutosWord,
        missingHours,
        missingMinutes
      };
    } catch {
      return { 
        hours: 0, 
        minutes: 0, 
        hasMinutosWord: false,
        missingHours: Array.from({length: 24}, (_, i) => i), 
        missingMinutes: Array.from({length: 59}, (_, i) => i + 1) 
      };
    }
  };

  return {
    getHourUrl,
    getMinuteUrl,
    getMinutosWordUrl,
    playHourAudio,
    checkAudiosExist,
  };
};