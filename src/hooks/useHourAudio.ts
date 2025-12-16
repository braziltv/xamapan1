import { supabase } from "@/integrations/supabase/client";

export const useHourAudio = () => {
  // URLs diretas do storage
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

  // Reproduzir hora concatenando os dois áudios
  const playHourAudio = async (hour: number, minute: number): Promise<boolean> => {
    try {
      // Get volume from localStorage
      const timeAnnouncementVolume = parseFloat(localStorage.getItem('volume-time-announcement') || '1');
      
      const hourUrl = getHourUrl(hour);
      const minuteUrl = getMinuteUrl(minute);

      // Reproduzir áudio da hora
      const hourAudio = new Audio(hourUrl);
      hourAudio.volume = timeAnnouncementVolume;
      
      await new Promise<void>((resolve, reject) => {
        hourAudio.onended = () => resolve();
        hourAudio.onerror = () => reject(new Error('Hour audio failed'));
        hourAudio.play().catch(reject);
      });

      // Se tiver minutos, reproduzir o áudio dos minutos em sequência
      if (minuteUrl) {
        const minuteAudio = new Audio(minuteUrl);
        minuteAudio.volume = timeAnnouncementVolume;
        
        await new Promise<void>((resolve, reject) => {
          minuteAudio.onended = () => resolve();
          minuteAudio.onerror = () => reject(new Error('Minute audio failed'));
          minuteAudio.play().catch(reject);
        });
      }

      return true;
    } catch (error) {
      console.error('Error playing hour audio:', error);
      return false;
    }
  };

  // Gerar todos os áudios de horas (24 arquivos)
  const generateHours = async (): Promise<{ success: number; failed: number; errors: string[] }> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-hour-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: 'generate-hours' }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating hours:', error);
      return { success: 0, failed: 1, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  };

  // Gerar todos os áudios de minutos (59 arquivos)
  const generateMinutes = async (): Promise<{ success: number; failed: number; errors: string[] }> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-hour-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: 'generate-minutes' }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating minutes:', error);
      return { success: 0, failed: 1, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  };

  // Gerar todos (horas + minutos = 83 arquivos)
  const generateAllTimeAudios = async (
    onProgress?: (stage: 'hours' | 'minutes', done: boolean) => void
  ): Promise<{ hours: number; minutes: number; failed: number; errors: string[] }> => {
    const results = { hours: 0, minutes: 0, failed: 0, errors: [] as string[] };

    // Gerar horas
    onProgress?.('hours', false);
    const hoursResult = await generateHours();
    results.hours = hoursResult.success;
    results.failed += hoursResult.failed;
    results.errors.push(...hoursResult.errors);
    onProgress?.('hours', true);

    // Gerar minutos
    onProgress?.('minutes', false);
    const minutesResult = await generateMinutes();
    results.minutes = minutesResult.success;
    results.failed += minutesResult.failed;
    results.errors.push(...minutesResult.errors);
    onProgress?.('minutes', true);

    return results;
  };

  // Verificar se os áudios existem
  const checkAudiosExist = async (): Promise<{ hours: number; minutes: number }> => {
    try {
      const { data: files } = await supabase.storage
        .from('tts-cache')
        .list('time');
      
      if (!files) return { hours: 0, minutes: 0 };

      const hours = files.filter(f => f.name.startsWith('h_')).length;
      const minutes = files.filter(f => f.name.startsWith('m_')).length;
      
      return { hours, minutes };
    } catch {
      return { hours: 0, minutes: 0 };
    }
  };

  return {
    getHourUrl,
    getMinuteUrl,
    playHourAudio,
    generateHours,
    generateMinutes,
    generateAllTimeAudios,
    checkAudiosExist,
  };
};
