import { Volume2, Clock, Stethoscope, Activity, Newspaper, Megaphone, VolumeX } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeatherWidget } from './WeatherWidget';
import { useBrazilTime, formatBrazilTime } from '@/hooks/useBrazilTime';

interface PublicDisplayProps {
  currentTriageCall?: any;
  currentDoctorCall?: any;
  history?: any[];
}

interface NewsItem {
  title: string;
  link: string;
  source: string;
}

export function PublicDisplay(_props: PublicDisplayProps) {
  const currentTime = useBrazilTime();
  const [currentTriageCall, setCurrentTriageCall] = useState<{ name: string; destination?: string } | null>(null);
  const [currentDoctorCall, setCurrentDoctorCall] = useState<{ name: string; destination?: string } | null>(null);
  const [announcingType, setAnnouncingType] = useState<'triage' | 'doctor' | null>(null);
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; name: string; type: string; time: Date }>>([]);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const [unitName, setUnitName] = useState(() => localStorage.getItem('selectedUnitName') || '');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [lastNewsUpdate, setLastNewsUpdate] = useState<Date | null>(null);
  const [newsCountdown, setNewsCountdown] = useState(5 * 60); // 5 minutes in seconds
  const containerRef = useRef<HTMLDivElement>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(() => localStorage.getItem('audioUnlocked') === 'true');
  const audioContextRef = useRef<AudioContext | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch news from multiple sources
  useEffect(() => {
    const feeds = [
      // G1 - Geral
      { url: 'https://g1.globo.com/dynamo/rss2.xml', source: 'Brasil' },
      { url: 'https://g1.globo.com/dynamo/brasil/rss2.xml', source: 'Brasil' },
      { url: 'https://g1.globo.com/dynamo/ciencia-e-saude/rss2.xml', source: 'Saúde' },
      { url: 'https://g1.globo.com/dynamo/economia/rss2.xml', source: 'Economia' },
      { url: 'https://g1.globo.com/dynamo/educacao/rss2.xml', source: 'Educação' },
      { url: 'https://g1.globo.com/dynamo/mundo/rss2.xml', source: 'Mundo' },
      { url: 'https://g1.globo.com/dynamo/tecnologia/rss2.xml', source: 'Tech' },
      { url: 'https://g1.globo.com/dynamo/politica/rss2.xml', source: 'Política' },
      { url: 'https://g1.globo.com/dynamo/pop-arte/rss2.xml', source: 'Pop' },
      { url: 'https://g1.globo.com/dynamo/natureza/rss2.xml', source: 'Natureza' },
      { url: 'https://g1.globo.com/dynamo/carros/rss2.xml', source: 'Carros' },
      { url: 'https://g1.globo.com/dynamo/concursos-e-emprego/rss2.xml', source: 'Emprego' },
      { url: 'https://g1.globo.com/dynamo/turismo-e-viagem/rss2.xml', source: 'Turismo' },
      { url: 'https://g1.globo.com/dynamo/agro/rss2.xml', source: 'Agro' },
      // G1 - Minas Gerais
      { url: 'https://g1.globo.com/dynamo/minas-gerais/rss2.xml', source: 'MG' },
      { url: 'https://g1.globo.com/dynamo/mg/centro-oeste/rss2.xml', source: 'MG' },
      { url: 'https://g1.globo.com/dynamo/mg/grande-minas/rss2.xml', source: 'MG' },
      { url: 'https://g1.globo.com/dynamo/mg/sul-de-minas/rss2.xml', source: 'MG' },
      { url: 'https://g1.globo.com/dynamo/minas-gerais/triangulo-mineiro/rss2.xml', source: 'MG' },
      { url: 'https://g1.globo.com/dynamo/mg/zona-da-mata/rss2.xml', source: 'MG' },
      { url: 'https://g1.globo.com/dynamo/mg/vales-de-minas-gerais/rss2.xml', source: 'MG' },
      // UOL
      { url: 'https://rss.uol.com.br/feed/noticias.xml', source: 'UOL' },
      { url: 'https://rss.uol.com.br/feed/economia.xml', source: 'UOL' },
      { url: 'https://rss.uol.com.br/feed/esporte.xml', source: 'Esporte' },
      { url: 'https://rss.uol.com.br/feed/tecnologia.xml', source: 'Tech' },
      // Folha
      { url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', source: 'Folha' },
      { url: 'https://feeds.folha.uol.com.br/cotidiano/rss091.xml', source: 'Folha' },
      { url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml', source: 'Folha' },
      { url: 'https://feeds.folha.uol.com.br/mundo/rss091.xml', source: 'Folha' },
      { url: 'https://feeds.folha.uol.com.br/equilibrioesaude/rss091.xml', source: 'Saúde' },
      // Estadão
      { url: 'https://www.estadao.com.br/pf/api/v1/rss/site/estadao/?outputType=xml', source: 'Estadão' },
      // CNN Brasil
      { url: 'https://www.cnnbrasil.com.br/feed/', source: 'CNN' },
      // R7
      { url: 'https://noticias.r7.com/feed.xml', source: 'R7' },
      // Band
      { url: 'https://www.band.uol.com.br/rss/noticias.xml', source: 'Band' },
    ];
    
    let currentFeedIndex = 0;

    const fetchNews = async () => {
      try {
        const allNews: NewsItem[] = [];
        
        // Rotate through feeds - fetch from current index and next ones
        const feedsToFetch = [
          feeds[currentFeedIndex % feeds.length],
          feeds[(currentFeedIndex + 1) % feeds.length],
          feeds[(currentFeedIndex + 2) % feeds.length],
          feeds[(currentFeedIndex + 3) % feeds.length],
        ];
        
        // Move to next feed for next update cycle
        currentFeedIndex = (currentFeedIndex + 1) % feeds.length;

        // Try multiple CORS proxies
        const corsProxies = [
          (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
          (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
          (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
        ];

        for (const feed of feedsToFetch) {
          let fetched = false;
          for (const getProxyUrl of corsProxies) {
            if (fetched) break;
            try {
              const response = await fetch(getProxyUrl(feed.url), {
                headers: {
                  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                },
              });
              if (response.ok) {
                const text = await response.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'text/xml');
                const items = xml.querySelectorAll('item');
                if (items.length > 0) {
                  fetched = true;
                  items.forEach((item, index) => {
                    if (index < 6) {
                      const title = item.querySelector('title')?.textContent || '';
                      if (title) {
                        allNews.push({ title, link: '', source: feed.source });
                      }
                    }
                  });
                }
              }
            } catch (feedError) {
              console.log(`Proxy failed for ${feed.source}, trying next...`);
            }
          }
        }

        // If no news fetched, show static fallback news
        if (allNews.length === 0) {
          const fallbackNews: NewsItem[] = [
            { title: 'Mantenha-se hidratado: beba pelo menos 2 litros de água por dia', link: '', source: 'Saúde' },
            { title: 'Vacinas salvam vidas - mantenha sua carteira de vacinação em dia', link: '', source: 'Saúde' },
            { title: 'Pratique exercícios físicos regularmente para uma vida mais saudável', link: '', source: 'Saúde' },
            { title: 'Lave as mãos com frequência para prevenir doenças', link: '', source: 'Saúde' },
            { title: 'Durma bem: adultos precisam de 7 a 9 horas de sono por noite', link: '', source: 'Saúde' },
            { title: 'Alimentação balanceada é essencial para a saúde', link: '', source: 'Saúde' },
          ];
          setNewsItems(fallbackNews);
        } else {
          // Shuffle news to mix sources
          const shuffled = allNews.sort(() => Math.random() - 0.5);
          setNewsItems(shuffled);
          setLastNewsUpdate(new Date());
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        // Fallback to health tips
        setNewsItems([
          { title: 'Cuide da sua saúde: faça check-ups regulares', link: '', source: 'Saúde' },
          { title: 'Mantenha-se hidratado durante todo o dia', link: '', source: 'Saúde' },
        ]);
      }
    };

    fetchNews();
    setNewsCountdown(5 * 60); // Reset countdown
    // Update every 5 minutes
    const interval = setInterval(() => {
      fetchNews();
      setNewsCountdown(5 * 60); // Reset countdown after fetch
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for next news update
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setNewsCountdown(prev => (prev > 0 ? prev - 1 : 5 * 60));
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, []);

  // Re-check localStorage periodically for unit name
  useEffect(() => {
    const checkUnitName = () => {
      const current = localStorage.getItem('selectedUnitName') || '';
      if (current !== unitName) {
        setUnitName(current);
      }
    };
    const interval = setInterval(checkUnitName, 1000);
    return () => clearInterval(interval);
  }, [unitName]);

  // Initialize audio context on mount if already unlocked
  useEffect(() => {
    if (audioUnlocked && !audioContextRef.current) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      console.log('AudioContext initialized on mount (was previously unlocked)');

      // Resume if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('AudioContext resumed on mount');
        });
      }
    }
  }, [audioUnlocked]);

  // Preload notification sound on mount for faster playback
  useEffect(() => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.preload = 'auto';
    audio.volume = 1.0;
    audio.load();
    notificationAudioRef.current = audio;
    console.log('Notification sound preloaded');
  }, []);

  // Keep the TTS engine awake (kiosk/TV browsers may suspend it after inactivity)
  // NOTE: avoid calling cancel() here, because it can interrupt real announcements.
  useEffect(() => {
    if (!audioUnlocked) return;

    const interval = window.setInterval(() => {
      try {
        window.speechSynthesis?.resume?.();
      } catch {
        // ignore
      }

      try {
        (window as any).responsiveVoice?.resume?.();
      } catch {
        // ignore
      }

      if (audioContextRef.current?.state === 'suspended') {
        void audioContextRef.current.resume();
      }
    }, 120000); // every 2 minutes

    return () => window.clearInterval(interval);
  }, [audioUnlocked]);

  // Unlock audio on first user interaction
  const unlockAudio = useCallback(() => {
    if (audioUnlocked) return;

    // Create and play a silent audio context to unlock audio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    // Unlock browser speech engine
    try {
      window.speechSynthesis?.cancel?.();
      const utterance = new SpeechSynthesisUtterance(' ');
      utterance.volume = 0.01;
      utterance.rate = 10;
      window.speechSynthesis?.speak?.(utterance);
      window.speechSynthesis?.resume?.();
    } catch {
      // ignore
    }

    // Prime ResponsiveVoice (some browsers only allow its audio after a user gesture)
    try {
      const responsiveVoice = (window as any).responsiveVoice;
      if (responsiveVoice?.voiceSupport?.()) {
        responsiveVoice.cancel?.();
        responsiveVoice.speak(' ', 'Brazilian Portuguese Female', { volume: 0, rate: 1, pitch: 1 });
        window.setTimeout(() => responsiveVoice?.cancel?.(), 200);
      }
    } catch {
      // ignore
    }

    localStorage.setItem('audioUnlocked', 'true');
    setAudioUnlocked(true);
    console.log('Audio unlocked and saved to localStorage');
  }, [audioUnlocked]);

  // Play audio with amplification using Web Audio API (2.5x volume = 150% increase)
  const playAmplifiedAudio = useCallback((audioElement: HTMLAudioElement, gain: number = 2.5): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioContextRef.current) audioContextRef.current = audioContext;
        
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        
        const source = audioContext.createMediaElementSource(audioElement);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = gain; // 2.0 = 100% volume increase
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        audioElement.onended = () => {
          source.disconnect();
          gainNode.disconnect();
          resolve();
        };
        audioElement.onerror = (e) => {
          source.disconnect();
          gainNode.disconnect();
          reject(e);
        };
        
        audioElement.play().catch(reject);
      } catch (e) {
        // Fallback to normal playback if Web Audio API fails
        console.warn('Web Audio API amplification failed, using normal volume:', e);
        audioElement.volume = 1.0;
        audioElement.onended = () => resolve();
        audioElement.onerror = (e) => reject(e);
        audioElement.play().catch(reject);
      }
    });
  }, []);

  // Play notification sound effect (uses preloaded audio for faster playback)
  const playNotificationSound = useCallback(() => {
    console.log('playNotificationSound called');
    
    return new Promise<void>((resolve, reject) => {
      // Create new audio element each time to allow Web Audio API connection
      const audio = new Audio('/sounds/notification.mp3');
      audio.currentTime = 0;
      
      playAmplifiedAudio(audio, 2.5)
        .then(() => {
          console.log('Notification sound finished');
          resolve();
        })
        .catch((err) => {
          console.error('Failed to play notification sound:', err);
          reject(err);
        });
    });
  }, [playAmplifiedAudio]);

  const speakWithWebSpeech = useCallback(
    (text: string, opts?: { rate?: number; pitch?: number; volume?: number }) => {
      return new Promise<void>((resolve, reject) => {
        try {
          const synth = window.speechSynthesis;
          if (!synth) {
            reject(new Error('speechSynthesis indisponível'));
            return;
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'pt-BR';
          utterance.rate = opts?.rate ?? 0.9;
          utterance.pitch = opts?.pitch ?? 1.1;
          utterance.volume = opts?.volume ?? 1;

          // Try to choose a Portuguese voice when available
          const voices = synth.getVoices?.() ?? [];
          const ptVoice =
            voices.find((v) => (v.lang || '').toLowerCase().startsWith('pt')) ||
            voices.find((v) => (v.lang || '').toLowerCase().includes('pt-br'));
          if (ptVoice) utterance.voice = ptVoice;

          utterance.onend = () => resolve();
          utterance.onerror = (e) => reject(e as any);

          try {
            synth.cancel();
            synth.resume?.();
          } catch {
            // ignore
          }

          synth.speak(utterance);
        } catch (e) {
          reject(e);
        }
      });
    },
    []
  );

  // ElevenLabs TTS via edge function - plays MP3 audio (works on any device)
  const speakWithElevenLabs = useCallback(
    async (text: string): Promise<void> => {
      console.log('Speaking with ElevenLabs:', text);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, unitName }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `ElevenLabs error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      try {
        await playAmplifiedAudio(audio, 2.5);
      } finally {
        URL.revokeObjectURL(audioUrl);
      }
    },
    [playAmplifiedAudio]
  );

  // Test audio function
  const testAudio = useCallback(async () => {
    console.log('Testing audio...');
    try {
      // Play notification sound first
      await playNotificationSound();

      const testText = 'Teste de áudio. Som funcionando corretamente.';

      // Try ElevenLabs first (most reliable on Android TV)
      try {
        await speakWithElevenLabs(testText);
        console.log('Audio test completed (ElevenLabs)');
        return;
      } catch (e) {
        console.warn('ElevenLabs failed, trying Web Speech API...', e);
      }

      // Fallback to Web Speech API
      try {
        await speakWithWebSpeech(testText, { rate: 0.9, pitch: 1.1, volume: 1 });
        console.log('Audio test completed (Web Speech API)');
        return;
      } catch (e) {
        console.warn('Web Speech API failed, trying ResponsiveVoice...', e);
      }

      // Last resort: ResponsiveVoice
      const responsiveVoice = (window as any).responsiveVoice;
      if (responsiveVoice?.voiceSupport?.()) {
        responsiveVoice.cancel?.();
        responsiveVoice.speak(testText, 'Brazilian Portuguese Female', {
          pitch: 1.1,
          rate: 0.9,
          volume: 1,
          onend: () => console.log('Audio test completed (ResponsiveVoice)'),
          onerror: () => console.warn('ResponsiveVoice failed in testAudio'),
        });
      } else {
        console.warn('Nenhum motor de TTS disponível para o teste.');
      }
    } catch (error) {
      console.error('Audio test failed:', error);
    }
  }, [playNotificationSound, speakWithElevenLabs, speakWithWebSpeech]);

  // Mapeamento de frases de destino gramaticalmente corretas (artigos à/ao)
  const getDestinationPhrase = useCallback((destination: string): string => {
    // Mapeamento de destinos para frases corretas
    const destinationPhrases: Record<string, string> = {
      'Triagem': 'Por favor, dirija-se à Triagem',
      'Sala de Eletrocardiograma': 'Por favor, dirija-se à Sala de Eletrocardiograma',
      'Sala de Curativos': 'Por favor, dirija-se à Sala de Curativos',
      'Sala do Raio X': 'Por favor, dirija-se à Sala do Raio X',
      'Enfermaria': 'Por favor, dirija-se à Enfermaria',
      'Consultório 1': 'Por favor, dirija-se ao Consultório 1',
      'Consultório 2': 'Por favor, dirija-se ao Consultório 2',
      'Consultório Médico': 'Por favor, dirija-se ao Consultório Médico',
      'Consultório Médico 1': 'Por favor, dirija-se ao Consultório Médico 1',
      'Consultório Médico 2': 'Por favor, dirija-se ao Consultório Médico 2',
    };
    
    // Retorna frase mapeada ou gera uma frase genérica
    if (destinationPhrases[destination]) {
      return destinationPhrases[destination];
    }
    
    // Lógica genérica para destinos não mapeados
    const useFeminineArticle = 
      destination.toLowerCase().startsWith('sala') ||
      destination.toLowerCase().startsWith('triagem') ||
      destination.toLowerCase().startsWith('enfermaria');
    
    return `Por favor, dirija-se ${useFeminineArticle ? 'à' : 'ao'} ${destination}`;
  }, []);

  // Gerar TTS para frase de destino (usa cache permanente com prefixo "phrase_")
  const speakDestinationPhrase = useCallback(
    async (phrase: string): Promise<void> => {
      console.log('Speaking destination phrase:', phrase);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: phrase, unitName, isPermanentCache: true }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `ElevenLabs error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      try {
        await playAmplifiedAudio(audio, 2.5);
      } finally {
        URL.revokeObjectURL(audioUrl);
      }
    },
    [unitName, playAmplifiedAudio]
  );

  const speakName = useCallback(
    async (name: string, caller: 'triage' | 'doctor', destination?: string) => {
      console.log('speakName called with:', { name, caller, destination });

      // Start visual alert; it will auto-stop after 10s in the effect below
      setAnnouncingType(caller);

      const location = destination || (caller === 'triage' ? 'Triagem' : 'Consultório Médico');
      const destinationPhrase = getDestinationPhrase(location);
      console.log('TTS - Name:', name, 'Destination phrase:', destinationPhrase);

      try {
        // Play notification sound first (mandatory)
        await playNotificationSound();

        // Try ElevenLabs first (most reliable on Android TV)
        // Play name first, then destination phrase (uses permanent cache)
        try {
          await speakWithElevenLabs(name);
          await speakDestinationPhrase(destinationPhrase);
          console.log('TTS completed (ElevenLabs - name + destination phrase)');
          return;
        } catch (e) {
          console.warn('ElevenLabs failed in speakName, trying Web Speech API...', e);
        }

        // Fallback to Web Speech API (combined text)
        const fullText = `${name}. ${destinationPhrase}.`;
        try {
          await speakWithWebSpeech(fullText, { rate: 0.85, pitch: 1.2, volume: 1 });
          console.log('TTS completed (Web Speech API)');
          return;
        } catch (e) {
          console.warn('Web Speech API failed in speakName, trying ResponsiveVoice...', e);
        }

        // Last resort: ResponsiveVoice
        const responsiveVoice = (window as any).responsiveVoice;
        if (responsiveVoice?.voiceSupport?.()) {
          try {
            responsiveVoice.cancel?.();
          } catch {
            // ignore
          }

          responsiveVoice.speak(fullText, 'Brazilian Portuguese Female', {
            pitch: 1.1,
            rate: 0.9,
            volume: 1,
            onstart: () => console.log('ResponsiveVoice TTS started'),
            onend: () => console.log('ResponsiveVoice TTS ended'),
            onerror: (err: any) => console.error('ResponsiveVoice TTS error:', err),
          });
        }
      } catch (e) {
        console.error('speakName failed:', e);
      }
    },
    [playNotificationSound, speakWithElevenLabs, speakWithWebSpeech, getDestinationPhrase, speakDestinationPhrase]
  );

  // Stop the flashing alert after exactly 10 seconds
  useEffect(() => {
    if (!announcingType) return;
    const t = window.setTimeout(() => setAnnouncingType(null), 10000);
    return () => window.clearTimeout(t);
  }, [announcingType]);

  // Load initial data from Supabase
  useEffect(() => {
    const loadData = async () => {
      // Fetch active calls - filter by unit if set, otherwise get all
      let callsQuery = supabase
        .from('patient_calls')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (unitName) {
        callsQuery = callsQuery.eq('unit_name', unitName);
      } else {
        // If no unit selected, get calls with non-empty unit_name
        callsQuery = callsQuery.neq('unit_name', '');
      }

      const { data: calls } = await callsQuery;

      if (calls) {
        const triage = calls.find(c => c.call_type === 'triage');
        const doctor = calls.find(c => c.call_type === 'doctor');
        
        setCurrentTriageCall(triage ? { name: triage.patient_name, destination: triage.destination || undefined } : null);
        setCurrentDoctorCall(doctor ? { name: doctor.patient_name, destination: doctor.destination || undefined } : null);
      }

      // Fetch history - same filtering logic (limit to last 10)
      let historyQuery = supabase
        .from('call_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (unitName) {
        historyQuery = historyQuery.eq('unit_name', unitName);
      } else {
        historyQuery = historyQuery.neq('unit_name', '');
      }

      const { data: history } = await historyQuery;

      if (history) {
        setHistoryItems(history.map(h => ({
          id: h.id,
          name: h.patient_name,
          type: h.call_type,
          time: new Date(h.created_at),
        })));
      }
    };

    loadData();
  }, [unitName]);

  // Subscribe to realtime updates
  useEffect(() => {
    console.log('Setting up realtime subscription for unit:', unitName);
    
    const channel = supabase
      .channel('public-display-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patient_calls',
        },
        (payload) => {
          console.log('Received INSERT event:', payload);
          const call = payload.new as any;
          
          // Skip empty unit_name calls
          if (!call.unit_name) {
            console.log('Skipping call with empty unit_name');
            return;
          }
          // If we have a unit filter, only accept matching calls
          if (unitName && call.unit_name !== unitName) {
            console.log('Skipping call for different unit:', call.unit_name, 'vs', unitName);
            return;
          }
          if (processedCallsRef.current.has(call.id)) {
            console.log('Skipping already processed call:', call.id);
            return;
          }
          processedCallsRef.current.add(call.id);

          console.log('Processing call:', call.patient_name, call.call_type, call.status);
          
          if (call.status === 'active') {
            if (call.call_type === 'triage') {
              setCurrentTriageCall({ name: call.patient_name, destination: call.destination || undefined });
            } else {
              setCurrentDoctorCall({ name: call.patient_name, destination: call.destination || undefined });
            }
            
            // Play audio announcement
            console.log('About to call speakName...');
            speakName(call.patient_name, call.call_type, call.destination || undefined);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patient_calls',
        },
        (payload) => {
          const call = payload.new as any;
          
          if (!call.unit_name) return;
          if (unitName && call.unit_name !== unitName) return;

          if (call.status === 'completed') {
            if (call.call_type === 'triage') {
              setCurrentTriageCall(null);
            } else {
              setCurrentDoctorCall(null);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_history',
        },
        (payload) => {
          const historyItem = payload.new as any;
          
          if (!historyItem.unit_name) return;
          if (unitName && historyItem.unit_name !== unitName) return;

          setHistoryItems(prev => [{
            id: historyItem.id,
            name: historyItem.patient_name,
            type: historyItem.call_type,
            time: new Date(historyItem.created_at),
          }, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitName, speakName]);

  // Clock is managed by useBrazilTime hook

  // Show unlock overlay if audio not yet unlocked
  if (!audioUnlocked) {
    return (
      <div 
        onClick={unlockAudio}
        className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center cursor-pointer"
      >
        <div className="text-center space-y-6 animate-pulse">
          <Volume2 className="w-24 h-24 text-primary mx-auto" />
          <h1 className="text-4xl font-bold text-white">Clique para Ativar Áudio</h1>
          <p className="text-xl text-slate-400">Toque na tela para habilitar as chamadas de pacientes</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-3 lg:p-4 relative overflow-hidden flex flex-col"
    >
      {/* Flash overlay during announcement */}
      {announcingType && (
        <div className="absolute inset-0 z-50 pointer-events-none animate-flash">
          <div className={`absolute inset-0 ${
            announcingType === 'triage' 
              ? 'bg-blue-500/30' 
              : 'bg-emerald-500/30'
          }`} />
        </div>
      )}

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-48 md:w-72 lg:w-96 h-48 md:h-72 lg:h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-40 md:w-60 lg:w-80 h-40 md:h-60 lg:h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Header - Compact */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white leading-tight">
              Painel de Chamadas
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm lg:text-base leading-tight">{unitName || 'Unidade de Saúde'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Weather Widget */}
          <WeatherWidget />
          
          {/* Clock */}
          <div className="text-center bg-slate-800/50 rounded-xl px-3 py-2 sm:px-4 lg:px-6 lg:py-3 border border-slate-700">
            <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-mono font-bold text-white leading-none">
              {formatBrazilTime(currentTime, 'HH:mm')}
            </p>
            <p className="text-sm sm:text-base lg:text-lg text-yellow-400 font-bold">
              {formatBrazilTime(currentTime, "EEEE").charAt(0).toUpperCase() + formatBrazilTime(currentTime, "EEEE").slice(1)}
            </p>
            <p className="text-xs sm:text-sm lg:text-base text-slate-300 font-medium">
              {formatBrazilTime(currentTime, "dd 'de' MMMM 'de' yyyy")}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Landscape optimized: horizontal layout on wide screens */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 min-h-0">
        {/* Current Calls - Side by side on landscape */}
        <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {/* Triage Call */}
          <div className={`bg-slate-800/50 rounded-xl lg:rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col transition-all duration-300 ${
            announcingType === 'triage' 
              ? 'border-4 border-yellow-400 animate-border-pulse shadow-[0_0_30px_rgba(250,204,21,0.5)]' 
              : 'border border-slate-700'
          }`}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 lg:px-6 lg:py-4 shrink-0">
              <p className="text-white text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold flex items-center gap-3">
                <Activity className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12" />
                TRIAGEM
                {announcingType === 'triage' && (
                  <Megaphone className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-yellow-300 animate-bounce ml-auto" />
                )}
              </p>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center flex-1">
              {currentTriageCall ? (
                <div className={`text-center w-full transition-all duration-300 ${announcingType === 'triage' ? 'scale-110' : ''}`}>
                  <h2 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black tracking-wide leading-tight break-words px-2 transition-all duration-300 ${
                    announcingType === 'triage' 
                      ? 'text-yellow-300 animate-pulse drop-shadow-[0_0_30px_rgba(253,224,71,0.8)]' 
                      : 'text-white'
                  }`}>
                    {currentTriageCall.name}
                  </h2>
                  <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl text-blue-400 mt-3 sm:mt-4 font-semibold">
                    Por favor, dirija-se à {currentTriageCall.destination || 'Triagem'}
                  </p>
                </div>
              ) : (
                <p className="text-lg sm:text-xl lg:text-2xl text-slate-500">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>

          {/* Doctor Call */}
          <div className={`bg-slate-800/50 rounded-xl lg:rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col transition-all duration-300 ${
            announcingType === 'doctor' 
              ? 'border-4 border-yellow-400 animate-border-pulse shadow-[0_0_30px_rgba(250,204,21,0.5)]' 
              : 'border border-slate-700'
          }`}>
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 lg:px-6 lg:py-4 shrink-0">
              <p className="text-white text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold flex items-center gap-3">
                <Stethoscope className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12" />
                CONSULTÓRIO MÉDICO
                {announcingType === 'doctor' && (
                  <Megaphone className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 text-yellow-300 animate-bounce ml-auto" />
                )}
              </p>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center flex-1">
              {currentDoctorCall ? (
                <div className={`text-center w-full transition-all duration-300 ${announcingType === 'doctor' ? 'scale-110' : ''}`}>
                  <h2 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black tracking-wide leading-tight break-words px-2 transition-all duration-300 ${
                    announcingType === 'doctor' 
                      ? 'text-yellow-300 animate-pulse drop-shadow-[0_0_30px_rgba(253,224,71,0.8)]' 
                      : 'text-white'
                  }`}>
                    {currentDoctorCall.name}
                  </h2>
                  <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl text-emerald-400 mt-3 sm:mt-4 font-semibold">
                    Por favor, dirija-se ao {currentDoctorCall.destination || 'Consultório'}
                  </p>
                </div>
              ) : (
                <p className="text-lg sm:text-xl lg:text-2xl text-slate-500">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* History Panel - Narrower on landscape */}
        <div className="lg:col-span-3 bg-slate-800/50 rounded-xl lg:rounded-2xl border border-slate-700 p-2 sm:p-3 backdrop-blur-sm flex flex-col min-h-0 max-h-[200px] sm:max-h-none">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 flex items-center gap-2 shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Últimas Chamadas
          </h3>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {historyItems.length === 0 ? (
              <p className="text-slate-500 text-center py-4 text-sm sm:text-base">
                Nenhuma chamada ainda
              </p>
            ) : (
              historyItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-2 lg:p-3 rounded-lg ${
                    index === 0 
                      ? 'bg-primary/20 border-2 border-primary/40 ring-2 ring-primary/20' 
                      : 'bg-slate-700/50'
                  } transition-all`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center shrink-0 ${
                      item.type === 'triage' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}>
                      {item.type === 'triage' ? (
                        <Activity className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                      ) : (
                        <Stethoscope className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm lg:text-base truncate">
                        {item.name}
                      </p>
                      <p className="text-xs lg:text-sm text-slate-400">
                        {item.type === 'triage' ? 'Triagem' : 'Médico'}
                      </p>
                    </div>
                    <span className="text-xs lg:text-sm text-slate-400 font-mono shrink-0">
                      {formatBrazilTime(item.time, 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* News Ticker - Compact for landscape */}
      {newsItems.length > 0 && (
        <div className="relative z-10 mt-2 bg-gradient-to-r from-red-700 via-red-600 to-red-700 rounded-lg overflow-hidden border border-red-500/50 shrink-0">
          <div className="flex items-center">
            <div className="bg-red-800 px-3 py-1.5 sm:px-4 sm:py-2 lg:px-5 lg:py-2 flex items-center gap-2 shrink-0 z-10">
              <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
              <div className="flex flex-col">
                <span className="text-white font-bold text-xs sm:text-sm lg:text-base">NOTÍCIAS</span>
                <span className="text-red-200 text-[9px] sm:text-[10px]">
                  Irá atualizar em: {Math.floor(newsCountdown / 60)}:{(newsCountdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden py-1.5 sm:py-2 lg:py-2.5">
              <div className="animate-marquee whitespace-nowrap inline-flex">
                {newsItems.map((item, index) => (
                  <span key={index} className="text-sm sm:text-base lg:text-lg xl:text-xl mx-3 sm:mx-4 lg:mx-6 inline-block text-white">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs lg:text-sm font-bold mr-1.5 sm:mr-2 inline-block ${
                      item.source === 'MG' ? 'bg-yellow-500 text-yellow-900' : 
                      item.source === 'Saúde' ? 'bg-pink-500 text-pink-900' :
                      item.source === 'Mundo' ? 'bg-blue-500 text-blue-900' :
                      item.source === 'Tech' ? 'bg-purple-500 text-purple-900' :
                      item.source === 'Economia' ? 'bg-orange-500 text-orange-900' :
                      item.source === 'Política' ? 'bg-red-400 text-red-900' :
                      item.source === 'Pop' ? 'bg-fuchsia-500 text-fuchsia-900' :
                      item.source === 'Educação' ? 'bg-cyan-500 text-cyan-900' :
                      item.source === 'Natureza' ? 'bg-lime-500 text-lime-900' :
                      item.source === 'Carros' ? 'bg-slate-400 text-slate-900' :
                      item.source === 'Emprego' ? 'bg-teal-500 text-teal-900' :
                      item.source === 'Turismo' ? 'bg-sky-500 text-sky-900' :
                      'bg-green-500 text-green-900'
                    }`}>
                      {item.source}
                    </span>
                    {item.title}
                  </span>
                ))}
                {newsItems.map((item, index) => (
                  <span key={`dup-${index}`} className="text-sm sm:text-base lg:text-lg xl:text-xl mx-3 sm:mx-4 lg:mx-6 inline-block text-white">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs lg:text-sm font-bold mr-1.5 sm:mr-2 inline-block ${
                      item.source === 'MG' ? 'bg-yellow-500 text-yellow-900' : 
                      item.source === 'Saúde' ? 'bg-pink-500 text-pink-900' :
                      item.source === 'Mundo' ? 'bg-blue-500 text-blue-900' :
                      item.source === 'Tech' ? 'bg-purple-500 text-purple-900' :
                      item.source === 'Economia' ? 'bg-orange-500 text-orange-900' :
                      item.source === 'Política' ? 'bg-red-400 text-red-900' :
                      item.source === 'Pop' ? 'bg-fuchsia-500 text-fuchsia-900' :
                      item.source === 'Educação' ? 'bg-cyan-500 text-cyan-900' :
                      item.source === 'Natureza' ? 'bg-lime-500 text-lime-900' :
                      item.source === 'Carros' ? 'bg-slate-400 text-slate-900' :
                      item.source === 'Emprego' ? 'bg-teal-500 text-teal-900' :
                      item.source === 'Turismo' ? 'bg-sky-500 text-sky-900' :
                      'bg-green-500 text-green-900'
                    }`}>
                      {item.source}
                    </span>
                    {item.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credits and Audio Test - Minimal */}
      <div className="relative z-10 mt-1 flex items-center justify-center gap-4 shrink-0">
        <p className="text-slate-500 text-[9px] sm:text-[10px] lg:text-xs">
          Solução criada por Kalebe Gomes
        </p>
        <button
          onClick={testAudio}
          className="flex items-center gap-1 px-2 py-1 text-[9px] sm:text-[10px] lg:text-xs text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-md border border-slate-700 hover:border-slate-600 transition-colors"
          title="Testar áudio"
        >
          <Volume2 className="w-3 h-3" />
          <span>Testar Áudio</span>
        </button>
      </div>
    </div>
  );
}
