/**
 * Hook para reprodução de áudios de hora OFFLINE usando arquivos locais
 * Sem dependência de API do Google - totalmente offline
 * 
 * Estrutura de arquivos esperada em public/sounds/hours/:
 * - HRS00.mp3 a HRS23.mp3 - horas com minutos (ex: "São 14 horas")
 * - HRS00_O.mp3 a HRS23_O.mp3 - horas inteiras/cheias (ex: "São 14 horas em ponto")
 * - MIN01.mp3 a MIN59.mp3 - minutos (ex: "e 30 minutos")
 */

export const useOfflineHourAudio = () => {
  const AUDIO_BASE_PATH = '/sounds/hours';

  /**
   * Formatar número com zero à esquerda
   */
  const padNumber = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  /**
   * Obter caminho do arquivo de hora
   */
  const getHourAudioPath = (hour: number, isFullHour: boolean): string => {
    const paddedHour = padNumber(hour);
    if (isFullHour) {
      return `${AUDIO_BASE_PATH}/HRS${paddedHour}_O.mp3`;
    }
    return `${AUDIO_BASE_PATH}/HRS${paddedHour}.mp3`;
  };

  /**
   * Obter caminho do arquivo de minuto
   */
  const getMinuteAudioPath = (minute: number): string => {
    const paddedMinute = padNumber(minute);
    return `${AUDIO_BASE_PATH}/MIN${paddedMinute}.mp3`;
  };

  /**
   * Verificar se um arquivo de áudio existe
   */
  const checkAudioExists = async (path: string): Promise<boolean> => {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  /**
   * Reproduzir um arquivo de áudio e aguardar término
   */
  const playAudioFile = (path: string, volume: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(path);
      audio.volume = Math.min(1.0, Math.max(0, volume));
      
      audio.onended = () => {
        console.log(`[OfflineHour] ✅ Áudio finalizado: ${path}`);
        resolve();
      };
      
      audio.onerror = (err) => {
        console.error(`[OfflineHour] ❌ Erro ao reproduzir: ${path}`, err);
        reject(new Error(`Falha ao reproduzir áudio: ${path}`));
      };
      
      audio.play().catch((err) => {
        console.error(`[OfflineHour] ❌ Falha no play(): ${path}`, err);
        reject(err);
      });
    });
  };

  /**
   * Aguardar um intervalo em ms
   */
  const wait = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  /**
   * Reproduzir anúncio de hora offline
   * Para hora cheia (minuto 0): reproduz apenas HRS##_O.mp3
   * Para outros horários: reproduz HRS##.mp3 + MIN##.mp3
   */
  const playHourAudio = async (hour: number, minute: number): Promise<boolean> => {
    try {
      const volume = parseFloat(localStorage.getItem('volume-time-announcement') || '1');
      const isFullHour = minute === 0;
      
      console.log(`[OfflineHour] 🕐 Iniciando anúncio offline: ${padNumber(hour)}:${padNumber(minute)}`);

      if (isFullHour) {
        // Hora cheia - apenas o arquivo _O
        const hourPath = getHourAudioPath(hour, true);
        console.log(`[OfflineHour] Reproduzindo hora cheia: ${hourPath}`);
        await playAudioFile(hourPath, volume);
      } else {
        // Hora com minutos - reproduzir hora + minuto
        const hourPath = getHourAudioPath(hour, false);
        const minutePath = getMinuteAudioPath(minute);
        
        console.log(`[OfflineHour] Reproduzindo hora: ${hourPath}`);
        await playAudioFile(hourPath, volume);
        
        // Pequena pausa entre hora e minuto
        await wait(100);
        
        console.log(`[OfflineHour] Reproduzindo minuto: ${minutePath}`);
        await playAudioFile(minutePath, volume);
      }

      console.log('[OfflineHour] ✅ Anúncio finalizado com sucesso');
      return true;
    } catch (error) {
      console.error('[OfflineHour] ❌ Erro ao reproduzir anúncio de hora:', error);
      return false;
    }
  };

  /**
   * Verificar quais arquivos de áudio existem
   */
  const checkAudiosExist = async (): Promise<{ 
    hours: number; 
    minutes: number;
    hasFullHours: boolean;
    missingHours: number[];
    missingFullHours: number[];
    missingMinutes: number[];
    usingOffline: boolean;
  }> => {
    const missingHours: number[] = [];
    const missingFullHours: number[] = [];
    const missingMinutes: number[] = [];

    // Verificar horas (0-23)
    for (let h = 0; h <= 23; h++) {
      const hourPath = getHourAudioPath(h, false);
      const exists = await checkAudioExists(hourPath);
      if (!exists) missingHours.push(h);
    }

    // Verificar horas cheias (0-23 com _O)
    for (let h = 0; h <= 23; h++) {
      const hourPath = getHourAudioPath(h, true);
      const exists = await checkAudioExists(hourPath);
      if (!exists) missingFullHours.push(h);
    }

    // Verificar minutos (1-59)
    for (let m = 1; m <= 59; m++) {
      const minutePath = getMinuteAudioPath(m);
      const exists = await checkAudioExists(minutePath);
      if (!exists) missingMinutes.push(m);
    }

    const hoursFound = 24 - missingHours.length;
    const fullHoursFound = 24 - missingFullHours.length;
    const minutesFound = 59 - missingMinutes.length;

    console.log(`[OfflineHour] Status dos arquivos:`);
    console.log(`  - Horas: ${hoursFound}/24 encontradas`);
    console.log(`  - Horas cheias (_O): ${fullHoursFound}/24 encontradas`);
    console.log(`  - Minutos: ${minutesFound}/59 encontrados`);

    if (missingHours.length > 0) {
      console.log(`  - Horas faltando: ${missingHours.join(', ')}`);
    }
    if (missingFullHours.length > 0) {
      console.log(`  - Horas cheias faltando: ${missingFullHours.join(', ')}`);
    }
    if (missingMinutes.length > 0) {
      console.log(`  - Minutos faltando: ${missingMinutes.join(', ')}`);
    }

    return { 
      hours: hoursFound, 
      minutes: minutesFound,
      hasFullHours: fullHoursFound > 0,
      missingHours,
      missingFullHours,
      missingMinutes,
      usingOffline: true,
    };
  };

  return {
    playHourAudio,
    checkAudiosExist,
    getHourAudioPath,
    getMinuteAudioPath,
  };
};
