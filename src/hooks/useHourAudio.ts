/**
 * Hook para reprodução de áudios de hora via Google Cloud TTS
 * Gera anúncio completo com som de notificação, repetição e voz masculina
 */

import { toast } from "@/hooks/use-toast";

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
   * Gerar texto da hora em português brasileiro natural
   */
  const getHourText = (hour: number, minute: number): string => {
    // Converter hora para texto
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

    // Converter minuto para texto
    const getMinuteText = (m: number): string => {
      if (m === 0) return '';
      if (m === 30) return 'e meia';
      if (m === 15) return 'e quinze';
      if (m === 45) return 'e quarenta e cinco';
      
      const minuteTexts: Record<number, string> = {
        1: 'e um',
        2: 'e dois',
        3: 'e três',
        4: 'e quatro',
        5: 'e cinco',
        6: 'e seis',
        7: 'e sete',
        8: 'e oito',
        9: 'e nove',
        10: 'e dez',
        11: 'e onze',
        12: 'e doze',
        13: 'e treze',
        14: 'e quatorze',
        15: 'e quinze',
        16: 'e dezesseis',
        17: 'e dezessete',
        18: 'e dezoito',
        19: 'e dezenove',
        20: 'e vinte',
        21: 'e vinte e um',
        22: 'e vinte e dois',
        23: 'e vinte e três',
        24: 'e vinte e quatro',
        25: 'e vinte e cinco',
        26: 'e vinte e seis',
        27: 'e vinte e sete',
        28: 'e vinte e oito',
        29: 'e vinte e nove',
        30: 'e trinta',
        31: 'e trinta e um',
        32: 'e trinta e dois',
        33: 'e trinta e três',
        34: 'e trinta e quatro',
        35: 'e trinta e cinco',
        36: 'e trinta e seis',
        37: 'e trinta e sete',
        38: 'e trinta e oito',
        39: 'e trinta e nove',
        40: 'e quarenta',
        41: 'e quarenta e um',
        42: 'e quarenta e dois',
        43: 'e quarenta e três',
        44: 'e quarenta e quatro',
        45: 'e quarenta e cinco',
        46: 'e quarenta e seis',
        47: 'e quarenta e sete',
        48: 'e quarenta e oito',
        49: 'e quarenta e nove',
        50: 'e cinquenta',
        51: 'e cinquenta e um',
        52: 'e cinquenta e dois',
        53: 'e cinquenta e três',
        54: 'e cinquenta e quatro',
        55: 'e cinquenta e cinco',
        56: 'e cinquenta e seis',
        57: 'e cinquenta e sete',
        58: 'e cinquenta e oito',
        59: 'e cinquenta e nove',
      };
      
      return minuteTexts[m] || `e ${m}`;
    };

    const greeting = getGreeting(hour);
    const hourText = hourTexts[hour] || `${hour} horas`;
    const minuteText = getMinuteText(minute);

    // Construir frase: "Olá, boa noite. Hora certa, são XX horas e X minuto(s)."
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
   * Reproduzir áudio via Google Cloud TTS
   * Usa as vozes configuradas pelo usuário ou fallback para padrão
   */
  const generateTTSAudio = async (text: string, voice: 'female' | 'male'): Promise<ArrayBuffer> => {
    // Obter vozes configuradas pelo usuário
    const configuredFemaleVoice = localStorage.getItem('googleVoiceFemale') || 'pt-BR-Journey-F';
    const configuredMaleVoice = localStorage.getItem('googleVoiceMale') || 'pt-BR-Journey-D';
    
    const voiceName = voice === 'female' ? configuredFemaleVoice : configuredMaleVoice;
    
    console.log(`[useHourAudio] Gerando TTS Google Cloud para: "${text}" com voz ${voiceName}`);

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          text, 
          voiceName,
          speakingRate: 1.0
        }),
      }
    );

    if (!response.ok) {
      let errorMessage = `Google Cloud TTS error: ${response.status}`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody?.error || errorMessage;
        
        // Verificar se é erro de quota/autenticação
        if (response.status === 401 || response.status === 403 || 
            errorMessage.includes('quota') || errorMessage.includes('limit')) {
          throw new Error('QUOTA_EXCEEDED');
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message === 'QUOTA_EXCEEDED') {
          throw parseError;
        }
      }
      throw new Error(errorMessage);
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
   * Reproduzir anúncio de hora:
   * 1. Som de notificação
   * 2. Anúncio: "Olá, boa noite. Hora certa, são XX horas e X minutos."
   */
  const playHourAudio = async (hour: number, minute: number): Promise<boolean> => {
    try {
      const timeAnnouncementVolume = parseFloat(localStorage.getItem('volume-time-announcement') || '1');
      const timeText = getHourText(hour, minute);
      
      console.log(`[useHourAudio] Iniciando anúncio de hora via Google Cloud TTS: "${timeText}"`);

      // Gerar áudio da hora
      const timeAudioBuffer = await generateTTSAudio(timeText, 'female');

      // 1. Som de notificação
      console.log('[useHourAudio] Passo 1: Som de notificação');
      await playNotificationSound(timeAnnouncementVolume);
      
      // Pequena pausa após notificação
      await wait(300);

      // 2. Anúncio da hora (voz feminina)
      console.log('[useHourAudio] Passo 2: Anúncio da hora');
      await playAudioBuffer(timeAudioBuffer, timeAnnouncementVolume);

      console.log('[useHourAudio] Anúncio finalizado via Google Cloud TTS');
      return true;
    } catch (error) {
      console.error('[useHourAudio] Erro ao reproduzir anúncio de hora:', error);
      
      // Verificar se é erro de quota exceeded
      if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
        toast({
          title: "Créditos TTS esgotados",
          description: "A cota de texto-para-voz do Google Cloud foi excedida.",
          variant: "destructive",
          duration: 5000,
        });
      }
      
      return false;
    }
  };

  /**
   * Verificar status (mantido para compatibilidade)
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
      usingApi: true,
    };
  };

  return {
    getHourText,
    getGreeting,
    playHourAudio,
    checkAudiosExist,
  };
};
