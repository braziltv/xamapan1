/**
 * Hook para gerenciar configurações de voz TTS
 * Vozes otimizadas para português brasileiro (multilingual model)
 * Configurações salvas por unidade de saúde
 */

// Vozes disponíveis - otimizadas para português brasileiro
// Todas usam eleven_multilingual_v2 que suporta PT-BR nativamente
export const AVAILABLE_VOICES = {
  // Vozes femininas - PT-BR
  alice: { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'female', description: 'Suave e clara' },
  aria: { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', gender: 'female', description: 'Expressiva e amigável' },
  domi: { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', description: 'Forte e confiante' },
  elli: { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female', description: 'Jovem e animada' },
  bella: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', description: 'Madura e elegante' },
  rachel: { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', description: 'Calma e profissional' },
  // Vozes masculinas - PT-BR
  antonio: { id: 'ErXwobaYiN019PkySvjV', name: 'Antonio', gender: 'male', description: 'Grave e autoritário' },
  arnold: { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male', description: 'Robusto e firme' },
  adam: { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', description: 'Natural e versátil' },
  sam: { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'male', description: 'Jovem e dinâmico' },
  josh: { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male', description: 'Amigável e caloroso' },
  clyde: { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', gender: 'male', description: 'Grave e sério' },
} as const;

export type VoiceKey = keyof typeof AVAILABLE_VOICES;

// Categorias de voz
export const FEMALE_VOICES: VoiceKey[] = ['alice', 'aria', 'domi', 'elli', 'bella', 'rachel'];
export const MALE_VOICES: VoiceKey[] = ['antonio', 'arnold', 'adam', 'sam', 'josh', 'clyde'];

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
