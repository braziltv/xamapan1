import { useCallback, useRef } from 'react';

// Lista de todas as frases de destino que devem ser pré-cacheadas permanentemente
const DESTINATION_PHRASES = [
  'Por favor, dirija-se à Triagem',
  'Por favor, dirija-se à Sala de Eletrocardiograma',
  'Por favor, dirija-se à Sala de Curativos',
  'Por favor, dirija-se à Sala do Raio X',
  'Por favor, dirija-se à Enfermaria',
  'Por favor, dirija-se ao Consultório 1',
  'Por favor, dirija-se ao Consultório 2',
  'Por favor, dirija-se ao Consultório Médico',
  'Por favor, dirija-se ao Consultório Médico 1',
  'Por favor, dirija-se ao Consultório Médico 2',
];

const PRECACHE_KEY = 'tts_phrases_precached_google';

export function useTTSPreCache() {
  const isPreCachingRef = useRef(false);

  // Pré-cachear uma frase de destino via Google Cloud TTS
  const preCacheDestinationPhrase = useCallback(async (phrase: string): Promise<boolean> => {
    try {
      const configuredVoice = localStorage.getItem('googleVoiceFemale') || 'pt-BR-Journey-F';
      
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
            text: phrase, 
            voiceName: configuredVoice
          }),
        }
      );

      if (!response.ok) {
        console.error(`Failed to pre-cache phrase: ${phrase}`);
        return false;
      }

      console.log(`Pre-cache phrase "${phrase.substring(0, 30)}...": OK (Google Cloud TTS)`);
      return true;
    } catch (error) {
      console.error(`Error pre-caching phrase: ${phrase}`, error);
      return false;
    }
  }, []);

  // Pré-cachear o nome de um paciente via Google Cloud TTS
  const preCachePatientName = useCallback(async (name: string): Promise<boolean> => {
    try {
      const configuredVoice = localStorage.getItem('googleVoiceFemale') || 'pt-BR-Journey-F';
      
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
            text: name, 
            voiceName: configuredVoice
          }),
        }
      );

      if (!response.ok) {
        console.error(`Failed to pre-cache patient name: ${name}`);
        return false;
      }

      console.log(`Pre-cache patient name "${name}": OK (Google Cloud TTS)`);
      return true;
    } catch (error) {
      console.error(`Error pre-caching patient name: ${name}`, error);
      return false;
    }
  }, []);

  // Pré-cachear todas as frases de destino (executa apenas uma vez)
  const preCacheAllDestinationPhrases = useCallback(async (): Promise<void> => {
    if (isPreCachingRef.current) {
      console.log('Pre-caching already in progress, skipping...');
      return;
    }

    // Verificar se já foi feito o pré-cache
    const alreadyCached = localStorage.getItem(PRECACHE_KEY);
    if (alreadyCached) {
      console.log('Destination phrases already pre-cached (Google Cloud TTS)');
      return;
    }

    isPreCachingRef.current = true;
    console.log('Starting pre-cache of all destination phrases (Google Cloud TTS)...');

    let successCount = 0;
    for (const phrase of DESTINATION_PHRASES) {
      const success = await preCacheDestinationPhrase(phrase);
      if (success) successCount++;
      // Pequeno delay entre requisições para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Pre-cache complete: ${successCount}/${DESTINATION_PHRASES.length} phrases cached`);
    
    // Marcar como pré-cacheado se pelo menos 80% das frases foram cacheadas
    if (successCount >= Math.floor(DESTINATION_PHRASES.length * 0.8)) {
      localStorage.setItem(PRECACHE_KEY, new Date().toISOString());
      console.log('Pre-cache flag set (sufficient phrases cached)');
    } else {
      console.log('Pre-cache incomplete, will retry on next login');
    }

    isPreCachingRef.current = false;
  }, [preCacheDestinationPhrase]);

  // Forçar re-cache de todas as frases (ignora flag de já cacheado)
  const forcePreCacheAllPhrases = useCallback(async (): Promise<void> => {
    localStorage.removeItem(PRECACHE_KEY);
    await preCacheAllDestinationPhrases();
  }, [preCacheAllDestinationPhrases]);

  return {
    preCachePatientName,
    preCacheDestinationPhrase,
    preCacheAllDestinationPhrases,
    forcePreCacheAllPhrases,
    DESTINATION_PHRASES,
  };
}
