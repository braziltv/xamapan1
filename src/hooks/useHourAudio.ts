/**
 * Hook para reprodução de áudios de hora usando arquivos OFFLINE locais
 * NÃO usa API do Google - totalmente offline
 * 
 * Arquivos esperados em public/sounds/hours/:
 * - HRS00.mp3 a HRS23.mp3 - horas com minutos
 * - HRS00_O.mp3 a HRS23_O.mp3 - horas inteiras (em ponto)
 * - MIN01.mp3 a MIN59.mp3 - minutos
 */

import { useOfflineHourAudio } from './useOfflineHourAudio';

export const useHourAudio = () => {
  const offlineAudio = useOfflineHourAudio();

  /**
   * Gerar saudação baseada no horário (mantido para compatibilidade)
   */
  const getGreeting = (hour: number): string => {
    if (hour >= 6 && hour < 12) return 'bom dia';
    if (hour >= 12 && hour < 18) return 'boa tarde';
    return 'boa noite';
  };

  /**
   * Gerar texto da hora em português (mantido para compatibilidade)
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
      return `e ${m} minutos`;
    };

    const greeting = getGreeting(hour);
    const hourText = hourTexts[hour] || `${hour} horas`;
    const minuteText = getMinuteText(minute);

    if (minute === 0) {
      return `Olá, ${greeting}. Hora certa, são ${hourText}.`;
    } else if (minute === 30) {
      return `Olá, ${greeting}. Hora certa, são ${hourText} ${minuteText}.`;
    } else {
      return `Olá, ${greeting}. Hora certa, são ${hourText} ${minuteText}.`;
    }
  };

  /**
   * Reproduzir anúncio de hora usando arquivos OFFLINE
   * NÃO usa som de notificação - reproduz apenas os arquivos de hora/minuto
   */
  const playHourAudio = async (hour: number, minute: number): Promise<boolean> => {
    console.log(`[useHourAudio] Iniciando anúncio OFFLINE: ${hour}:${minute.toString().padStart(2, '0')}`);
    
    // Usar hook offline para reproduzir
    const success = await offlineAudio.playHourAudio(hour, minute);
    
    if (success) {
      console.log('[useHourAudio] ✅ Anúncio offline finalizado');
    } else {
      console.error('[useHourAudio] ❌ Falha no anúncio offline');
    }
    
    return success;
  };

  /**
   * Verificar status dos arquivos de áudio
   */
  const checkAudiosExist = async (): Promise<{ 
    hours: number; 
    minutes: number;
    hasMinutosWord: boolean;
    missingHours: number[];
    missingMinutes: number[];
    usingApi: boolean;
  }> => {
    const status = await offlineAudio.checkAudiosExist();
    
    return { 
      hours: status.hours, 
      minutes: status.minutes, 
      hasMinutosWord: true,
      missingHours: status.missingHours,
      missingMinutes: status.missingMinutes,
      usingApi: false, // Agora usa arquivos offline, não API
    };
  };

  return {
    getHourText,
    getGreeting,
    playHourAudio,
    checkAudiosExist,
  };
};
