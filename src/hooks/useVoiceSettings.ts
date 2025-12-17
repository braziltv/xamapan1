/**
 * Hook para gerenciar configurações de voz TTS
 * Vozes disponíveis para anúncios de hora e chamadas de pacientes
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

// Chaves de localStorage
const HOUR_VOICE_KEY = 'hour-announcement-voice';
const PATIENT_VOICE_KEY = 'patient-announcement-voice';

export const useVoiceSettings = () => {
  /**
   * Obter voz selecionada para anúncios de hora
   */
  const getHourVoice = (): VoiceKey => {
    const stored = localStorage.getItem(HOUR_VOICE_KEY);
    if (stored && stored in AVAILABLE_VOICES) {
      return stored as VoiceKey;
    }
    return 'alice'; // Default
  };

  /**
   * Definir voz para anúncios de hora
   */
  const setHourVoice = (voice: VoiceKey): void => {
    localStorage.setItem(HOUR_VOICE_KEY, voice);
  };

  /**
   * Obter voz selecionada para chamadas de pacientes
   */
  const getPatientVoice = (): VoiceKey => {
    const stored = localStorage.getItem(PATIENT_VOICE_KEY);
    if (stored && stored in AVAILABLE_VOICES) {
      return stored as VoiceKey;
    }
    return 'alice'; // Default
  };

  /**
   * Definir voz para chamadas de pacientes
   */
  const setPatientVoice = (voice: VoiceKey): void => {
    localStorage.setItem(PATIENT_VOICE_KEY, voice);
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
  };
};
