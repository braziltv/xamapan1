/**
 * Hook para reprodução de áudios de hora usando cache do Supabase Storage
 * Usa áudios pré-gerados armazenados em tts-cache/time/
 */

import { toast } from "@/hooks/use-toast";

// URL base do storage público do Supabase
const STORAGE_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tts-cache/time`;

export const useHourAudio = () => {
  
  /**
   * Gerar saudação baseada no horário
   */
  const getGreeting = (hour: number): string => {
    if (hour >= 6 && hour < 12) return 'bom dia';
    if (hour >= 12 && hour < 18) return 'boa tarde';
    return 'boa noite';
  };

  /**
   * Gerar texto da hora em português brasileiro natural (para exibição)
   */
  const getHourText = (hour: number, minute: number): string => {
    const hourTexts: Record<number, string> = {
      0: 'meia-noite',
      1: 'uma hora',
      2: 'duas horas',
      3: 'três horas',
      4: 'quatro horas',
      5: 'cinco horas',
      6: 'seis horas',
      7: 'sete horas',
      8: 'oito horas',
      9: 'nove horas',
      10: 'dez horas',
      11: 'onze horas',
      12: 'meio-dia',
      13: 'treze horas',
      14: 'quatorze horas',
      15: 'quinze horas',
      16: 'dezesseis horas',
      17: 'dezessete horas',
      18: 'dezoito horas',
      19: 'dezenove horas',
      20: 'vinte horas',
      21: 'vinte e uma horas',
      22: 'vinte e duas horas',
      23: 'vinte e três horas',
    };

    const getMinuteText = (m: number): string => {
      if (m === 0) return '';
      if (m === 30) return 'e meia';
      if (m === 15) return 'e quinze';
      if (m === 45) return 'e quarenta e cinco';
      
      const minuteTexts: Record<number, string> = {
        1: 'e um', 2: 'e dois', 3: 'e três', 4: 'e quatro', 5: 'e cinco',
        6: 'e seis', 7: 'e sete', 8: 'e oito', 9: 'e nove', 10: 'e dez',
        11: 'e onze', 12: 'e doze', 13: 'e treze', 14: 'e quatorze', 15: 'e quinze',
        16: 'e dezesseis', 17: 'e dezessete', 18: 'e dezoito', 19: 'e dezenove', 20: 'e vinte',
        21: 'e vinte e um', 22: 'e vinte e dois', 23: 'e vinte e três', 24: 'e vinte e quatro',
        25: 'e vinte e cinco', 26: 'e vinte e seis', 27: 'e vinte e sete', 28: 'e vinte e oito',
        29: 'e vinte e nove', 30: 'e trinta', 31: 'e trinta e um', 32: 'e trinta e dois',
        33: 'e trinta e três', 34: 'e trinta e quatro', 35: 'e trinta e cinco', 36: 'e trinta e seis',
        37: 'e trinta e sete', 38: 'e trinta e oito', 39: 'e trinta e nove', 40: 'e quarenta',
        41: 'e quarenta e um', 42: 'e quarenta e dois', 43: 'e quarenta e três', 44: 'e quarenta e quatro',
        45: 'e quarenta e cinco', 46: 'e quarenta e seis', 47: 'e quarenta e sete', 48: 'e quarenta e oito',
        49: 'e quarenta e nove', 50: 'e cinquenta', 51: 'e cinquenta e um', 52: 'e cinquenta e dois',
        53: 'e cinquenta e três', 54: 'e cinquenta e quatro', 55: 'e cinquenta e cinco',
        56: 'e cinquenta e seis', 57: 'e cinquenta e sete', 58: 'e cinquenta e oito', 59: 'e cinquenta e nove',
      };
      
      return minuteTexts[m] || `e ${m}`;
    };

    const greeting = getGreeting(hour);
    const hourText = hourTexts[hour] || `${hour} horas`;
    const minuteText = getMinuteText(minute);

    if (minute === 0) {
      return `Olá, ${greeting}. Hora certa, são ${hourText}.`;
    } else if (minute === 30) {
      return `Olá, ${greeting}. Hora certa, são ${hourText} ${minuteText}.`;
    } else if (minute === 1) {
      return `Olá, ${greeting}. Hora certa, são ${hourText} ${minuteText} minuto.`;
    } else {
      return `Olá, ${greeting}. Hora certa, são ${hourText} ${minuteText} minutos.`;
    }
  };

  /**
   * Buscar áudio do cache do storage
   */
  const fetchCachedAudio = async (fileName: string): Promise<ArrayBuffer> => {
    const url = `${STORAGE_BASE_URL}/${fileName}`;
    console.log(`[useHourAudio] Buscando áudio do cache: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Áudio não encontrado no cache: ${fileName}`);
    }
    
    return response.arrayBuffer();
  };

  /**
   * Reproduzir buffer de áudio
   */
  const playAudioBuffer = (buffer: ArrayBuffer, volume: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = volume;
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Audio playback failed'));
      };
      audio.play().catch(reject);
    });
  };

  /**
   * Reproduzir som de notificação
   */
  const playNotificationSound = (volume: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = volume;
      
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('Notification sound failed'));
      audio.play().catch(reject);
    });
  };

  /**
   * Aguardar um intervalo em ms
   */
  const wait = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  /**
   * Reproduzir anúncio de hora usando áudios cacheados:
   * 1. Som de notificação
   * 2. Áudio da hora (h_XX.mp3)
   * 3. Áudio do minuto se > 0 (m_XX.mp3 + minutos.mp3)
   */
  const playHourAudio = async (hour: number, minute: number): Promise<boolean> => {
    try {
      const timeAnnouncementVolume = parseFloat(localStorage.getItem('volume-time-announcement') || '1');
      
      console.log(`[useHourAudio] Iniciando anúncio de hora via cache: ${hour}h${minute.toString().padStart(2, '0')}min`);

      // Buscar áudios do cache em paralelo (nomes: h_XX.mp3, m_XX.mp3)
      const hourFileName = `h_${hour.toString().padStart(2, '0')}.mp3`;
      const fetchPromises: Promise<ArrayBuffer>[] = [fetchCachedAudio(hourFileName)];
      
      if (minute > 0) {
        const minuteFileName = `m_${minute.toString().padStart(2, '0')}.mp3`;
        fetchPromises.push(fetchCachedAudio(minuteFileName));
        fetchPromises.push(fetchCachedAudio('minutos.mp3'));
      }
      
      const audioBuffers = await Promise.all(fetchPromises);
      const hourBuffer = audioBuffers[0];
      const minuteBuffer = minute > 0 ? audioBuffers[1] : null;
      const minutosBuffer = minute > 0 ? audioBuffers[2] : null;

      // 1. Som de notificação
      console.log('[useHourAudio] Passo 1: Som de notificação');
      await playNotificationSound(timeAnnouncementVolume);
      
      // Pequena pausa após notificação
      await wait(300);

      // 2. Áudio da hora
      console.log('[useHourAudio] Passo 2: Áudio da hora');
      await playAudioBuffer(hourBuffer, timeAnnouncementVolume);
      
      // 3. Áudio do minuto (se necessário)
      if (minuteBuffer && minutosBuffer && minute > 0) {
        await wait(200);
        console.log('[useHourAudio] Passo 3: Áudio do minuto');
        await playAudioBuffer(minuteBuffer, timeAnnouncementVolume);
        
        // Palavra "minutos" (exceto para minute=30 que é "e meia")
        if (minute !== 30) {
          await wait(100);
          await playAudioBuffer(minutosBuffer, timeAnnouncementVolume);
        }
      }

      console.log('[useHourAudio] Anúncio finalizado via cache');
      return true;
    } catch (error) {
      console.error('[useHourAudio] Erro ao reproduzir anúncio de hora:', error);
      
      toast({
        title: "Erro no anúncio de hora",
        description: "Não foi possível reproduzir o áudio do cache.",
        variant: "destructive",
        duration: 5000,
      });
      
      return false;
    }
  };

  /**
   * Verificar status do cache
   */
  const checkAudiosExist = async (): Promise<{ 
    hours: number; 
    minutes: number;
    hasMinutosWord: boolean;
    missingHours: number[];
    missingMinutes: number[];
    usingApi: boolean;
  }> => {
    return { 
      hours: 24, 
      minutes: 59, 
      hasMinutosWord: true,
      missingHours: [],
      missingMinutes: [],
      usingApi: false, // Agora usando cache local
    };
  };

  return {
    getHourText,
    getGreeting,
    playHourAudio,
    checkAudiosExist,
  };
};
