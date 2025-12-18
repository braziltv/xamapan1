/**
 * Hook para reprodução de áudios de hora via ElevenLabs TTS
 * Gera frase completa do horário em português brasileiro natural
 */
export const useHourAudio = () => {
  
  /**
   * Gerar texto da hora em português brasileiro natural
   */
  const getHourText = (hour: number, minute: number): string => {
    // Determinar saudação baseada no horário
    const getGreeting = (h: number): string => {
      if (h >= 6 && h < 12) return 'Bom dia!';
      if (h >= 12 && h < 18) return 'Boa tarde!';
      return 'Boa noite!';
    };

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

    // Construir frase completa com saudação
    if (minute === 0) {
      // Hora cheia - não adiciona "minutos"
      return `${greeting} São ${hourText}.`;
    } else if (minute === 1) {
      // Um minuto - singular
      return `${greeting} São ${hourText} ${minuteText} minuto.`;
    } else {
      // Outros minutos (incluindo 30) - adiciona "minutos" no final (plural)
      return `${greeting} São ${hourText} ${minuteText} minutos.`;
    }
  };

  /**
   * Reproduzir hora via ElevenLabs TTS (frase completa)
   */
  const playHourAudio = async (hour: number, minute: number): Promise<boolean> => {
    try {
      const timeAnnouncementVolume = parseFloat(localStorage.getItem('volume-time-announcement') || '1');
      const text = getHourText(hour, minute);
      
      console.log(`[useHourAudio] Gerando TTS para: "${text}"`);

      // Matilda voice - voz feminina calorosa otimizada para português brasileiro
      const MATILDA_VOICE_ID = 'XrExE9yKIg1WjnnlVkGX';
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text, 
            voiceId: MATILDA_VOICE_ID,
            skipCache: true,
            unitName: 'TimeAnnouncement'
          }),
        }
      );

      if (!response.ok) {
        console.error('[useHourAudio] Erro na resposta TTS:', response.status);
        return false;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.volume = timeAnnouncementVolume;
      
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch(reject);
      });

      return true;
    } catch (error) {
      console.error('[useHourAudio] Erro ao reproduzir hora:', error);
      return false;
    }
  };

  /**
   * Verificar status (mantido para compatibilidade, mas agora indica uso de API)
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
      usingApi: true, // Indica que está usando API
    };
  };

  return {
    getHourText,
    playHourAudio,
    checkAudiosExist,
  };
};
