import { supabase } from "@/integrations/supabase/client";

export const useHourAudio = () => {
  // URLs diretas do storage (públicas) - usa apenas cache local
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

  // Verificar se o arquivo existe no storage
  const checkFileExists = async (path: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.storage
        .from('tts-cache')
        .list('time', { search: path.replace('time/', '') });
      if (error) return false;
      return data?.some(f => f.name === path.replace('time/', '')) ?? false;
    } catch {
      return false;
    }
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

  // Reproduzir hora concatenando os áudios (apenas do cache local)
  // Formato: [hora] [e X] [minutos]
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

  // Gerar um único arquivo de hora
  const generateSingleHour = async (hour: number): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-hour-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: 'get-signed-urls', hour, minute: 0 }),
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  };

  // Gerar um único arquivo de minuto
  const generateSingleMinute = async (minute: number): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-hour-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: 'get-signed-urls', hour: 12, minute }),
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  };

  // Gerar todos os áudios incrementalmente (um por um)
  const generateAllIncremental = async (
    onProgress?: (current: number, total: number, type: 'hour' | 'minute', value: number) => void
  ): Promise<{ hours: number; minutes: number; failed: number }> => {
    const results = { hours: 0, minutes: 0, failed: 0 };
    const total = 24 + 59; // 24 horas + 59 minutos

    // Gerar horas (0-23)
    for (let h = 0; h < 24; h++) {
      onProgress?.(h, total, 'hour', h);
      const success = await generateSingleHour(h);
      if (success) {
        results.hours++;
      } else {
        results.failed++;
      }
      // Pequeno delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Gerar minutos (1-59)
    for (let m = 1; m < 60; m++) {
      onProgress?.(24 + m - 1, total, 'minute', m);
      const success = await generateSingleMinute(m);
      if (success) {
        results.minutes++;
      } else {
        results.failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  };

  // Verificar quais áudios existem no cache
  const checkAudiosExist = async (): Promise<{ 
    hours: number; 
    minutes: number;
    missingHours: number[];
    missingMinutes: number[];
  }> => {
    try {
      const { data: files } = await supabase.storage
        .from('tts-cache')
        .list('time');
      
      if (!files) return { hours: 0, minutes: 0, missingHours: Array.from({length: 24}, (_, i) => i), missingMinutes: Array.from({length: 59}, (_, i) => i + 1) };

      const existingHours = new Set(
        files.filter(f => f.name.startsWith('h_')).map(f => parseInt(f.name.replace('h_', '').replace('.mp3', '')))
      );
      const existingMinutes = new Set(
        files.filter(f => f.name.startsWith('m_')).map(f => parseInt(f.name.replace('m_', '').replace('.mp3', '')))
      );

      const missingHours = Array.from({length: 24}, (_, i) => i).filter(h => !existingHours.has(h));
      const missingMinutes = Array.from({length: 59}, (_, i) => i + 1).filter(m => !existingMinutes.has(m));
      
      return { 
        hours: existingHours.size, 
        minutes: existingMinutes.size,
        missingHours,
        missingMinutes
      };
    } catch {
      return { hours: 0, minutes: 0, missingHours: Array.from({length: 24}, (_, i) => i), missingMinutes: Array.from({length: 59}, (_, i) => i + 1) };
    }
  };

  return {
    getHourUrl,
    getMinuteUrl,
    playHourAudio,
    checkFileExists,
    generateSingleHour,
    generateSingleMinute,
    generateAllIncremental,
    checkAudiosExist,
  };
};
