/**
 * Hook para gerenciar configurações de voz TTS
 * Vozes disponíveis para anúncios de hora e chamadas de pacientes
 * Configurações salvas por unidade de saúde
 */

// Vozes disponíveis
export const AVAILABLE_VOICES = {
  alice: { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'female', flag: '🇧🇷' },
  sarah: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', flag: '🇺🇸' },
  laura: { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', flag: '🇺🇸' },
  jessica: { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'female', flag: '🇺🇸' },
  lily: { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'female', flag: '🇬🇧' },
  matilda: { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'female', flag: '🇺🇸' },
  daniel: { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', flag: '🇬🇧' },
  roger: { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'male', flag: '🇺🇸' },
  charlie: { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'male', flag: '🇦🇺' },
  george: { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', flag: '🇬🇧' },
  liam: { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', flag: '🇺🇸' },
  brian: { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'male', flag: '🇺🇸' },
  chris: { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'male', flag: '🇺🇸' },
  eric: { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'male', flag: '🇺🇸' },
  will: { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'male', flag: '🇺🇸' },
} as const;

export type VoiceKey = keyof typeof AVAILABLE_VOICES;

// Categorias de voz
export const FEMALE_VOICES: VoiceKey[] = ['alice', 'sarah', 'laura', 'jessica', 'lily', 'matilda'];
export const MALE_VOICES: VoiceKey[] = ['daniel', 'roger', 'charlie', 'george', 'liam', 'brian', 'chris', 'eric', 'will'];

// Função para obter chave de localStorage por unidade
const getUnitKey = (baseKey: string): string => {
  const unitName = localStorage.getItem('selectedUnitName') || 'default';
  // Criar hash simples do nome da unidade para evitar caracteres especiais
  const unitHash = unitName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `${baseKey}_unit_${unitHash}`;
};

export const useVoiceSettings = () => {
  /**
   * Obter voz selecionada para anúncios de hora (por unidade)
   */
  const getHourVoice = (): VoiceKey => {
    const key = getUnitKey('hour-announcement-voice');
    const stored = localStorage.getItem(key);
    if (stored && stored in AVAILABLE_VOICES) {
      return stored as VoiceKey;
    }
    return 'alice'; // Default
  };

  /**
   * Definir voz para anúncios de hora (por unidade)
   */
  const setHourVoice = (voice: VoiceKey): void => {
    const key = getUnitKey('hour-announcement-voice');
    localStorage.setItem(key, voice);
  };

  /**
   * Obter voz selecionada para chamadas de pacientes (por unidade)
   */
  const getPatientVoice = (): VoiceKey => {
    const key = getUnitKey('patient-announcement-voice');
    const stored = localStorage.getItem(key);
    if (stored && stored in AVAILABLE_VOICES) {
      return stored as VoiceKey;
    }
    return 'alice'; // Default
  };

  /**
   * Definir voz para chamadas de pacientes (por unidade)
   */
  const setPatientVoice = (voice: VoiceKey): void => {
    const key = getUnitKey('patient-announcement-voice');
    localStorage.setItem(key, voice);
  };

  /**
   * Obter ID da voz para hora
   */
  const getHourVoiceId = (): string => {
    return AVAILABLE_VOICES[getHourVoice()].id;
  };

  /**
   * Obter ID da voz para pacientes
   */
  const getPatientVoiceId = (): string => {
    return AVAILABLE_VOICES[getPatientVoice()].id;
  };

  /**
   * Testar uma voz específica
   */
  const testVoice = async (voiceKey: VoiceKey, testText?: string): Promise<boolean> => {
    const voice = AVAILABLE_VOICES[voiceKey];
    const text = testText || `Olá, meu nome é ${voice.name}. Esta é uma demonstração da minha voz.`;
    
    try {
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
            voiceId: voice.id,
            skipCache: true,
            unitName: 'VoiceTest'
          }),
        }
      );

      if (!response.ok) {
        console.error('Voice test failed:', response.status);
        return false;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      
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
      console.error('Voice test error:', error);
      return false;
    }
  };

  return {
    AVAILABLE_VOICES,
    FEMALE_VOICES,
    MALE_VOICES,
    getHourVoice,
    setHourVoice,
    getPatientVoice,
    setPatientVoice,
    getHourVoiceId,
    getPatientVoiceId,
    testVoice,
  };
};
