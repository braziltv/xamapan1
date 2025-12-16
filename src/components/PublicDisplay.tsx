import { Volume2, Clock, Stethoscope, Activity, Newspaper, Megaphone, VolumeX, LogOut, Minimize2 } from 'lucide-react';
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
  const { currentTime, isSynced } = useBrazilTime();
  const [currentTriageCall, setCurrentTriageCall] = useState<{ name: string; destination?: string } | null>(null);
  const [currentDoctorCall, setCurrentDoctorCall] = useState<{ name: string; destination?: string } | null>(null);
  const [announcingType, setAnnouncingType] = useState<'triage' | 'doctor' | null>(null);
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; name: string; type: string; time: Date }>>([]);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const [unitName, setUnitName] = useState(() => localStorage.getItem('selectedUnitName') || '');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [lastNewsUpdate, setLastNewsUpdate] = useState<Date | null>(null);
  const [newsCountdown, setNewsCountdown] = useState(3 * 60); // 3 minutes in seconds
  const containerRef = useRef<HTMLDivElement>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(() => localStorage.getItem('audioUnlocked') === 'true');
  const audioContextRef = useRef<AudioContext | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // Time announcement state - 3 random times per hour
  const timeAnnouncementScheduleRef = useRef<number[]>([]);
  const lastHourCheckedRef = useRef<number>(-1);
  const isAnnouncingTimeRef = useRef(false);

  // Fetch news from multiple sources
  useEffect(() => {
    const feeds = [
      // G1 (funcionando bem)
      { url: 'https://g1.globo.com/dynamo/rss2.xml', source: 'G1' },
      { url: 'https://g1.globo.com/dynamo/brasil/rss2.xml', source: 'G1' },
      { url: 'https://g1.globo.com/dynamo/minas-gerais/rss2.xml', source: 'G1' },
      { url: 'https://g1.globo.com/dynamo/economia/rss2.xml', source: 'G1' },
      { url: 'https://g1.globo.com/dynamo/mundo/rss2.xml', source: 'G1' },
      { url: 'https://g1.globo.com/dynamo/politica/rss2.xml', source: 'G1' },
      { url: 'https://g1.globo.com/dynamo/tecnologia/rss2.xml', source: 'G1' },
      // GE Esportes
      { url: 'https://ge.globo.com/dynamo/rss2.xml', source: 'GE' },
      { url: 'https://ge.globo.com/dynamo/futebol/rss2.xml', source: 'GE' },
      // ESPN Brasil (funcionando bem)
      { url: 'https://www.espn.com.br/rss/', source: 'ESPN' },
      // Folha
      { url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', source: 'Folha' },
      { url: 'https://feeds.folha.uol.com.br/cotidiano/rss091.xml', source: 'Folha' },
      { url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml', source: 'Folha' },
      { url: 'https://feeds.folha.uol.com.br/esporte/rss091.xml', source: 'Folha' },
      // Google News Brasil (confiável)
      { url: 'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419', source: 'Google' },
      { url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FuQjBHZ0pDVWlnQVAB?hl=pt-BR&gl=BR&ceid=BR:pt-419', source: 'Google' },
      // CNN Brasil
      { url: 'https://www.cnnbrasil.com.br/feed/', source: 'CNN' },
      // Metrópoles
      { url: 'https://www.metropoles.com/feed', source: 'Metrópoles' },
      // Tecmundo
      { url: 'https://rss.tecmundo.com.br/feed', source: 'Tecmundo' },
      // Olhar Digital
      { url: 'https://olhardigital.com.br/feed/', source: 'Olhar Digital' },
      // Canaltech
      { url: 'https://canaltech.com.br/rss/', source: 'Canaltech' },
      // InfoMoney
      { url: 'https://www.infomoney.com.br/feed/', source: 'InfoMoney' },
      // Exame
      { url: 'https://exame.com/feed/', source: 'Exame' },
      // R7
      { url: 'https://noticias.r7.com/feed.xml', source: 'R7' },
      // Itatiaia via Google News
      { url: 'https://news.google.com/rss/search?q=site:itatiaia.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419', source: 'Itatiaia' },
    ];
    
    const fetchNews = async () => {
      try {
        const allNews: NewsItem[] = [];
        
        // Group feeds by source to ensure diversity
        const feedsBySource: { [key: string]: typeof feeds } = {};
        feeds.forEach(feed => {
          if (!feedsBySource[feed.source]) {
            feedsBySource[feed.source] = [];
          }
          feedsBySource[feed.source].push(feed);
        });
        
        // Fisher-Yates shuffle function
        const shuffle = <T,>(array: T[]): T[] => {
          const arr = [...array];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        };
        
        // Select ONE feed per source (max 12 different sources)
        const sources = shuffle(Object.keys(feedsBySource));
        const feedsToFetch = sources.slice(0, 12).map(source => {
          const sourceFeeds = feedsBySource[source];
          return sourceFeeds[Math.floor(Math.random() * sourceFeeds.length)];
        });

        // Try multiple CORS proxies
        const corsProxies = [
          (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
          (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        ];

        // Function to fix encoding issues and decode HTML entities
        const fixEncoding = (text: string): string => {
          // Decode HTML entities
          const textarea = document.createElement('textarea');
          textarea.innerHTML = text;
          let decoded = textarea.value;
          
          // Remove replacement character (appears as triangle with ?)
          decoded = decoded.replace(/\uFFFD/g, '');
          
          // Clean up CDATA markers
          decoded = decoded.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
          
          return decoded.trim();
        };

        // Fetch all feeds in parallel for speed
        const fetchPromises = feedsToFetch.map(async (feed) => {
          const feedNews: NewsItem[] = [];
          for (const getProxyUrl of corsProxies) {
            try {
              const response = await fetch(getProxyUrl(feed.url), {
                headers: { 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
              });
              if (response.ok) {
                // Try to get proper encoding from response
                const buffer = await response.arrayBuffer();
                let text: string;
                
                // Try UTF-8 first, then ISO-8859-1 as fallback
                try {
                  text = new TextDecoder('utf-8').decode(buffer);
                  // Check if decoding produced replacement characters
                  if (text.includes('\uFFFD')) {
                    text = new TextDecoder('iso-8859-1').decode(buffer);
                  }
                } catch {
                  text = new TextDecoder('iso-8859-1').decode(buffer);
                }
                
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'text/xml');
                const items = xml.querySelectorAll('item');
                if (items.length > 0) {
                  items.forEach((item, index) => {
                    if (index < 4) { // Max 4 per source
                      const rawTitle = item.querySelector('title')?.textContent || '';
                      const title = fixEncoding(rawTitle);
                      if (title && title.length > 10) {
                        feedNews.push({ title, link: '', source: feed.source });
                      }
                    }
                  });
                  break; // Success, don't try other proxies
                }
              }
            } catch (e) {
              // Try next proxy
            }
          }
          return feedNews;
        });

        const results = await Promise.all(fetchPromises);
        results.forEach(news => allNews.push(...news));

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
          // Shuffle all news with Fisher-Yates for true randomness
          const shuffled = shuffle(allNews);
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
    setNewsCountdown(3 * 60); // Reset countdown
    // Update every 3 minutes
    const interval = setInterval(() => {
      fetchNews();
      setNewsCountdown(3 * 60); // Reset countdown after fetch
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for next news update
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setNewsCountdown(prev => (prev > 0 ? prev - 1 : 3 * 60));
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

  // Auto fullscreen on mount
  useEffect(() => {
    const requestFullscreen = async () => {
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen && !document.fullscreenElement) {
          await elem.requestFullscreen();
          setIsFullscreen(true);
        } else if ((elem as any).webkitRequestFullscreen && !(document as any).webkitFullscreenElement) {
          await (elem as any).webkitRequestFullscreen();
          setIsFullscreen(true);
        } else if ((elem as any).msRequestFullscreen && !(document as any).msFullscreenElement) {
          await (elem as any).msRequestFullscreen();
          setIsFullscreen(true);
        }
      } catch (err) {
        console.log('Fullscreen request failed (requires user interaction):', err);
      }
    };

    // Try fullscreen after a short delay (some browsers need this)
    const timeout = setTimeout(requestFullscreen, 500);

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Hide cursor after inactivity
  useEffect(() => {
    const hideCursor = () => {
      setCursorVisible(false);
    };

    const showCursor = () => {
      setCursorVisible(true);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      cursorTimeoutRef.current = setTimeout(hideCursor, 3000); // Hide after 3 seconds of inactivity
    };

    // Initial timeout to hide cursor
    cursorTimeoutRef.current = setTimeout(hideCursor, 3000);

    // Event listeners for mouse movement
    window.addEventListener('mousemove', showCursor);
    window.addEventListener('mousedown', showCursor);
    window.addEventListener('touchstart', showCursor);

    return () => {
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      window.removeEventListener('mousemove', showCursor);
      window.removeEventListener('mousedown', showCursor);
      window.removeEventListener('touchstart', showCursor);
    };
  }, []);

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

  // Play audio file from Supabase Storage (horaminuto folder)
  const playStorageAudio = useCallback(async (fileName: string): Promise<void> => {
    const storageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tts-cache/horaminuto/${fileName}`;
    console.log('Playing storage audio:', storageUrl);
    
    return new Promise((resolve, reject) => {
      const audio = new Audio(storageUrl);
      audio.volume = 1.0;
      
      audio.onended = () => {
        console.log('Audio finished:', fileName);
        resolve();
      };
      
      audio.onerror = (e) => {
        console.error('Audio load error for:', storageUrl, e);
        reject(new Error(`Failed to load audio: ${fileName}`));
      };
      
      audio.play()
        .then(() => console.log('Audio playing:', fileName))
        .catch((e) => {
          console.error('Audio play error:', e);
          reject(e);
        });
    });
  }, []);

  // Announce current time using audio files from Storage
  const announceTimeRef = useRef<() => Promise<void>>();
  
  announceTimeRef.current = async () => {
    if (!audioUnlocked || isAnnouncingTimeRef.current || announcingType) {
      console.log('Skipping time announcement - audio locked, already announcing, or patient call in progress');
      return;
    }

    isAnnouncingTimeRef.current = true;
    
    try {
      const now = currentTime;
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Format with leading zeros
      const hoursStr = hours.toString().padStart(2, '0');
      const minutesStr = minutes.toString().padStart(2, '0');
      
      console.log(`Announcing time: ${hoursStr}:${minutesStr}`);
      
      // Play notification sound first
      await playNotificationSound();
      
      // Play hour audio (HRS00.mp3 to HRS23.mp3)
      console.log(`Trying to play hour: HRS${hoursStr}.mp3`);
      try {
        await playStorageAudio(`HRS${hoursStr}.mp3`);
      } catch (e) {
        console.error('Failed to play hour audio:', e);
      }
      
      // Small pause between hour and minute
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Play minute audio (MIN00.mp3 to MIN59.mp3)
      console.log(`Trying to play minute: MIN${minutesStr}.mp3`);
      try {
        await playStorageAudio(`MIN${minutesStr}.mp3`);
      } catch (e) {
        console.error('Failed to play minute audio:', e);
      }
      
      console.log('Time announcement completed');
    } catch (error) {
      console.error('Time announcement failed:', error);
    } finally {
      isAnnouncingTimeRef.current = false;
    }
  };
  
  const announceTime = useCallback(() => {
    return announceTimeRef.current?.() ?? Promise.resolve();
  }, []);

  // Generate 3 random minutes for time announcements within an hour
  const generateRandomMinutesForHour = useCallback(() => {
    const minutes: number[] = [];
    while (minutes.length < 3) {
      const randomMinute = Math.floor(Math.random() * 60);
      // Ensure at least 5 minutes apart
      const isFarEnough = minutes.every(m => Math.abs(m - randomMinute) >= 5);
      if (isFarEnough) {
        minutes.push(randomMinute);
      }
    }
    return minutes.sort((a, b) => a - b);
  }, []);

  // Schedule and check time announcements
  useEffect(() => {
    if (!audioUnlocked) return;

    const checkTimeAnnouncement = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // If hour changed, generate new random schedule
      if (currentHour !== lastHourCheckedRef.current) {
        timeAnnouncementScheduleRef.current = generateRandomMinutesForHour();
        lastHourCheckedRef.current = currentHour;
        console.log(`New time announcement schedule for hour ${currentHour}:`, timeAnnouncementScheduleRef.current);
      }

      // Check if current minute matches any scheduled announcement
      const schedule = timeAnnouncementScheduleRef.current;
      if (schedule.includes(currentMinute)) {
        // Remove the minute from schedule to avoid repeating
        timeAnnouncementScheduleRef.current = schedule.filter(m => m !== currentMinute);
        console.log(`Time to announce! (${currentHour}:${currentMinute})`);
        announceTimeRef.current?.();
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkTimeAnnouncement, 30000);
    
    // Initial check after a short delay
    const timeout = setTimeout(checkTimeAnnouncement, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [audioUnlocked, generateRandomMinutesForHour]);

  // Listen for manual time announcement trigger from admin panel
  useEffect(() => {
    if (!audioUnlocked) return;

    const channel = supabase.channel('time-announcement-listener');
    
    channel
      .on('broadcast', { event: 'announce-time' }, (payload) => {
        console.log('Received time announcement command:', payload);
        announceTimeRef.current?.();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Time announcement channel ready');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [audioUnlocked]);

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
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'call_history',
        },
        (payload) => {
          const deletedItem = payload.old as any;
          if (deletedItem?.id) {
            setHistoryItems(prev => prev.filter(item => item.id !== deletedItem.id));
          } else {
            // Se não tiver ID específico, limpar tudo (delete em massa)
            setHistoryItems([]);
          }
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
        className={`h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center cursor-pointer ${!cursorVisible ? 'cursor-none' : ''}`}
        style={{ cursor: cursorVisible ? 'pointer' : 'none' }}
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
      className={`h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 lg:p-3 xl:p-4 relative overflow-hidden flex flex-col ${!cursorVisible ? 'cursor-none' : ''}`}
      style={{ cursor: cursorVisible ? 'auto' : 'none' }}
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
        <div className="absolute top-10 left-10 w-48 lg:w-72 xl:w-96 h-48 lg:h-72 xl:h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-40 lg:w-60 xl:w-80 h-40 lg:h-60 xl:h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Header - Compact for TV Landscape */}
      <div className="relative z-10 flex items-center justify-start gap-3 mb-2 shrink-0">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <Volume2 className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg lg:text-2xl xl:text-3xl font-bold text-white leading-tight">
              Painel de Chamadas
            </h1>
            <p className="text-slate-400 text-xs lg:text-sm leading-tight truncate">{unitName || 'Unidade de Saúde'}</p>
          </div>
        </div>
        
        {/* Center: Weather + Clock together */}
        <div className="mx-auto flex items-center overflow-visible min-w-0">
          <div className="shrink-0">
            <WeatherWidget currentTime={currentTime} formatTime={formatBrazilTime} />
          </div>
        </div>
      </div>

      {/* Main Content - Landscape optimized */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-3 min-h-0 pb-12">
        {/* Current Calls - Side by side */}
        <div className="col-span-9 grid grid-cols-2 gap-3">
          {/* Triage Call */}
          <div className={`bg-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col transition-all duration-300 ${
            announcingType === 'triage' 
              ? 'border-4 border-yellow-400 animate-border-pulse shadow-[0_0_30px_rgba(250,204,21,0.5)]' 
              : 'border border-slate-700'
          }`}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 shrink-0">
              <p className="text-white text-xl lg:text-2xl xl:text-3xl font-bold flex items-center gap-3">
                <Activity className="w-8 h-8 lg:w-10 lg:h-10 shrink-0" />
                <span>TRIAGEM</span>
                {announcingType === 'triage' && (
                  <Megaphone className="w-8 h-8 lg:w-10 lg:h-10 text-yellow-300 animate-bounce ml-auto shrink-0" />
                )}
              </p>
            </div>
            <div className="p-4 lg:p-6 flex items-center justify-center flex-1 min-h-0">
              {currentTriageCall ? (
                <div className={`text-center w-full transition-all duration-300 ${announcingType === 'triage' ? 'scale-105' : ''}`}>
                  <h2 className={`text-4xl lg:text-5xl xl:text-6xl font-black tracking-wide leading-tight break-words transition-all duration-300 ${
                    announcingType === 'triage' 
                      ? 'text-yellow-300 animate-pulse drop-shadow-[0_0_30px_rgba(253,224,71,0.8)]' 
                      : 'text-white'
                  }`} style={{ wordBreak: 'break-word' }}>
                    {currentTriageCall.name}
                  </h2>
                  <p className="text-lg lg:text-xl xl:text-2xl text-blue-400 mt-3 font-semibold">
                    Por favor, dirija-se à {currentTriageCall.destination || 'Triagem'}
                  </p>
                </div>
              ) : (
                <p className="text-lg text-slate-500 text-center">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>

          {/* Doctor Call */}
          <div className={`bg-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col transition-all duration-300 ${
            announcingType === 'doctor' 
              ? 'border-4 border-yellow-400 animate-border-pulse shadow-[0_0_30px_rgba(250,204,21,0.5)]' 
              : 'border border-slate-700'
          }`}>
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 shrink-0">
              <p className="text-white text-xl lg:text-2xl xl:text-3xl font-bold flex items-center gap-3">
                <Stethoscope className="w-8 h-8 lg:w-10 lg:h-10 shrink-0" />
                <span>CONSULTÓRIO</span>
                {announcingType === 'doctor' && (
                  <Megaphone className="w-8 h-8 lg:w-10 lg:h-10 text-yellow-300 animate-bounce ml-auto shrink-0" />
                )}
              </p>
            </div>
            <div className="p-4 lg:p-6 flex items-center justify-center flex-1 min-h-0">
              {currentDoctorCall ? (
                <div className={`text-center w-full transition-all duration-300 ${announcingType === 'doctor' ? 'scale-105' : ''}`}>
                  <h2 className={`text-4xl lg:text-5xl xl:text-6xl font-black tracking-wide leading-tight break-words transition-all duration-300 ${
                    announcingType === 'doctor' 
                      ? 'text-yellow-300 animate-pulse drop-shadow-[0_0_30px_rgba(253,224,71,0.8)]' 
                      : 'text-white'
                  }`} style={{ wordBreak: 'break-word' }}>
                    {currentDoctorCall.name}
                  </h2>
                  <p className="text-lg lg:text-xl xl:text-2xl text-emerald-400 mt-3 font-semibold">
                    Por favor, dirija-se ao {currentDoctorCall.destination || 'Consultório'}
                  </p>
                </div>
              ) : (
                <p className="text-lg text-slate-500 text-center">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: History Panel */}
        <div className="col-span-3 bg-slate-800/50 rounded-2xl border border-slate-700 p-3 backdrop-blur-sm flex flex-col min-h-0">
          <h3 className="text-base lg:text-lg font-bold text-white mb-2 flex items-center gap-2 shrink-0">
            <Clock className="w-5 h-5 text-primary shrink-0" />
            <span>Últimas Chamadas</span>
          </h3>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {historyItems.length === 0 ? (
              <p className="text-slate-500 text-center py-4 text-sm">
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
                      <p className="text-xs text-slate-400">
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

      {/* News Ticker - Fixed at bottom like TV news */}
      {newsItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-red-700 via-red-600 to-red-700 border-t-2 border-red-500/50 shrink-0">
          <div className="flex items-center">
            <div className="bg-red-800 px-2 py-1 lg:px-4 lg:py-1.5 xl:px-5 xl:py-2 flex items-center gap-1 lg:gap-2 shrink-0 z-10">
              <Newspaper className="w-3 h-3 lg:w-5 lg:h-5 xl:w-6 xl:h-6 text-white shrink-0" />
              <div className="flex flex-col">
                <span className="text-white font-bold text-[10px] lg:text-sm xl:text-base">NOTÍCIAS</span>
                <span className="text-red-200 text-[8px] lg:text-[10px]">
                  Atualiza em: {Math.floor(newsCountdown / 60)}:{(newsCountdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden py-1 lg:py-1.5 xl:py-2">
              <div className="animate-marquee whitespace-nowrap inline-flex">
                {(() => {
                  // Insert credits after every 3 news items
                  const creditItem = { title: 'Solução criada e cedida gratuitamente por Kalebe Gomes', source: 'Créditos', link: '' };
                  const itemsWithCredits: typeof newsItems = [];
                  newsItems.forEach((item, index) => {
                    itemsWithCredits.push(item);
                    // After every 3 items, insert credits
                    if ((index + 1) % 3 === 0) {
                      itemsWithCredits.push(creditItem);
                    }
                  });
                  
                  return itemsWithCredits.map((item, index) => (
                    <span key={index} className="text-xs lg:text-base xl:text-lg mx-2 lg:mx-4 xl:mx-6 inline-block text-white">
                      <span className={`px-1 py-0.5 rounded text-[8px] lg:text-xs font-bold mr-1 lg:mr-2 inline-block ${
                        item.source === 'Créditos' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-900' :
                        item.source === 'G1' ? 'bg-red-500 text-white' : 
                        item.source === 'O Globo' ? 'bg-blue-600 text-white' :
                        item.source === 'Itatiaia' ? 'bg-yellow-500 text-yellow-900' :
                        item.source === 'UOL' ? 'bg-orange-500 text-white' :
                        item.source === 'Folha' ? 'bg-blue-500 text-white' :
                        item.source === 'Estadão' ? 'bg-slate-600 text-white' :
                        item.source === 'CNN' ? 'bg-red-600 text-white' :
                        item.source === 'Band' ? 'bg-green-600 text-white' :
                        item.source === 'Terra' ? 'bg-emerald-500 text-white' :
                        item.source === 'IG' ? 'bg-pink-500 text-white' :
                        item.source === 'Correio' ? 'bg-sky-600 text-white' :
                        item.source === 'Metrópoles' ? 'bg-purple-600 text-white' :
                        item.source === 'Gazeta' ? 'bg-teal-600 text-white' :
                        item.source === 'Poder360' ? 'bg-indigo-600 text-white' :
                        item.source === 'Nexo' ? 'bg-rose-600 text-white' :
                        item.source === 'Ag. Brasil' ? 'bg-cyan-600 text-white' :
                        item.source === 'InfoMoney' ? 'bg-lime-600 text-white' :
                        item.source === 'Exame' ? 'bg-amber-600 text-white' :
                        item.source === 'Época' ? 'bg-fuchsia-600 text-white' :
                        item.source === 'Valor' ? 'bg-violet-600 text-white' :
                        item.source === 'O Tempo' ? 'bg-orange-600 text-white' :
                        item.source === 'Hoje em Dia' ? 'bg-blue-700 text-white' :
                        item.source === 'EM' ? 'bg-red-700 text-white' :
                        item.source === 'Super' ? 'bg-yellow-600 text-white' :
                        item.source === 'Tecmundo' ? 'bg-purple-500 text-white' :
                        item.source === 'Olhar Digital' ? 'bg-green-500 text-white' :
                        item.source === 'Canaltech' ? 'bg-blue-400 text-white' :
                        item.source === 'GE' ? 'bg-green-700 text-white' :
                        item.source === 'Lance' ? 'bg-red-500 text-white' :
                        item.source === 'ESPN' ? 'bg-red-800 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {item.source === 'Créditos' ? '⭐' : item.source}
                      </span>
                      <span>
                        {item.title}
                      </span>
                    </span>
                  ));
                })()}
                {(() => {
                  // Duplicate for seamless loop - credits after every 3 items
                  const creditItem = { title: 'Solução criada e cedida gratuitamente por Kalebe Gomes', source: 'Créditos', link: '' };
                  const itemsWithCredits: typeof newsItems = [];
                  newsItems.forEach((item, index) => {
                    itemsWithCredits.push(item);
                    if ((index + 1) % 3 === 0) {
                      itemsWithCredits.push(creditItem);
                    }
                  });
                  
                  return itemsWithCredits.map((item, index) => (
                    <span key={`dup-${index}`} className="text-xs lg:text-base xl:text-lg mx-2 lg:mx-4 xl:mx-6 inline-block text-white">
                      <span className={`px-1 py-0.5 rounded text-[8px] lg:text-xs font-bold mr-1 lg:mr-2 inline-block ${
                        item.source === 'Créditos' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-900' :
                        item.source === 'G1' ? 'bg-red-500 text-white' : 
                        item.source === 'O Globo' ? 'bg-blue-600 text-white' :
                        item.source === 'Itatiaia' ? 'bg-yellow-500 text-yellow-900' :
                        item.source === 'UOL' ? 'bg-orange-500 text-white' :
                        item.source === 'Folha' ? 'bg-blue-500 text-white' :
                        item.source === 'Estadão' ? 'bg-slate-600 text-white' :
                        item.source === 'CNN' ? 'bg-red-600 text-white' :
                        item.source === 'Band' ? 'bg-green-600 text-white' :
                        item.source === 'Terra' ? 'bg-emerald-500 text-white' :
                        item.source === 'IG' ? 'bg-pink-500 text-white' :
                        item.source === 'Correio' ? 'bg-sky-600 text-white' :
                        item.source === 'Metrópoles' ? 'bg-purple-600 text-white' :
                        item.source === 'Gazeta' ? 'bg-teal-600 text-white' :
                        item.source === 'Poder360' ? 'bg-indigo-600 text-white' :
                        item.source === 'Nexo' ? 'bg-rose-600 text-white' :
                        item.source === 'Ag. Brasil' ? 'bg-cyan-600 text-white' :
                        item.source === 'InfoMoney' ? 'bg-lime-600 text-white' :
                        item.source === 'Exame' ? 'bg-amber-600 text-white' :
                        item.source === 'Época' ? 'bg-fuchsia-600 text-white' :
                        item.source === 'Valor' ? 'bg-violet-600 text-white' :
                        item.source === 'O Tempo' ? 'bg-orange-600 text-white' :
                        item.source === 'Hoje em Dia' ? 'bg-blue-700 text-white' :
                        item.source === 'EM' ? 'bg-red-700 text-white' :
                        item.source === 'Super' ? 'bg-yellow-600 text-white' :
                        item.source === 'Tecmundo' ? 'bg-purple-500 text-white' :
                        item.source === 'Olhar Digital' ? 'bg-green-500 text-white' :
                        item.source === 'Canaltech' ? 'bg-blue-400 text-white' :
                        item.source === 'GE' ? 'bg-green-700 text-white' :
                        item.source === 'Lance' ? 'bg-red-500 text-white' :
                        item.source === 'ESPN' ? 'bg-red-800 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {item.source === 'Créditos' ? '⭐' : item.source}
                      </span>
                      <span>
                        {item.title}
                      </span>
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border-4 border-red-500 rounded-3xl p-8 lg:p-12 xl:p-16 max-w-2xl w-full shadow-2xl shadow-red-500/20 animate-scale-in">
            <div className="text-center space-y-6 lg:space-y-8">
              {/* Warning Icon */}
              <div className="w-24 h-24 lg:w-32 lg:h-32 xl:w-40 xl:h-40 mx-auto rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center">
                <LogOut className="w-12 h-12 lg:w-16 lg:h-16 xl:w-20 xl:h-20 text-red-500" />
              </div>
              
              {/* Title */}
              <h2 className="text-3xl lg:text-4xl xl:text-5xl font-black text-white">
                SAIR DO MODO TV?
              </h2>
              
              {/* Description */}
              <p className="text-lg lg:text-xl xl:text-2xl text-slate-300">
                Você será redirecionado para a tela de login.
              </p>
              
              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 pt-4">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-4 lg:py-6 px-8 text-xl lg:text-2xl xl:text-3xl font-bold text-white bg-slate-700 hover:bg-slate-600 border-2 border-slate-500 rounded-2xl transition-all duration-200 hover:scale-105"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => {
                    // Exit fullscreen
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else if ((document as any).webkitFullscreenElement) {
                      (document as any).webkitExitFullscreen();
                    }
                    // Clear audio unlock to show unlock screen next time
                    localStorage.removeItem('audioUnlocked');
                    // Redirect to login
                    window.location.href = '/';
                  }}
                  className="flex-1 py-4 lg:py-6 px-8 text-xl lg:text-2xl xl:text-3xl font-bold text-white bg-red-600 hover:bg-red-500 border-2 border-red-400 rounded-2xl transition-all duration-200 hover:scale-105 flex items-center justify-center gap-3"
                >
                  <LogOut className="w-6 h-6 lg:w-8 lg:h-8" />
                  SAIR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Exit Button - Only visible on hover */}
      <div className="fixed bottom-4 right-4 z-50 group">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-slate-800/0 group-hover:bg-slate-800/90 border-2 border-transparent group-hover:border-red-500/50 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
          title="Sair do modo TV"
        >
          <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <LogOut className="w-6 h-6 lg:w-8 lg:h-8 text-red-400" />
            <span className="text-[8px] lg:text-[10px] text-red-400 font-medium">SAIR</span>
          </div>
        </button>
      </div>

      {/* Audio Test Button - Discrete */}
    </div>
  );
}
