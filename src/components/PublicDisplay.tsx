import { Clock, Stethoscope, Activity, Newspaper, Megaphone, VolumeX, LogOut, Minimize2 } from 'lucide-react';
import { HealthCrossIcon } from './HealthCrossIcon';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeatherWidget } from './WeatherWidget';
import { useBrazilTime, formatBrazilTime } from '@/hooks/useBrazilTime';
import { useHourAudio } from '@/hooks/useHourAudio';

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
  const { playHourAudio } = useHourAudio();
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
  const [cursorVisible, setCursorVisible] = useState(false);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const lastTimeAnnouncementRef = useRef<number>(0); // timestamp da última chamada de hora
  const scheduledAnnouncementsRef = useRef<number[]>([]); // minutos agendados para anunciar
  const currentScheduleHourRef = useRef<number>(-1); // hora atual do agendamento
  const isSpeakingRef = useRef<boolean>(false); // prevent duplicate TTS calls
  const lastSpeakCallRef = useRef<number>(0); // timestamp of last speakName call for debounce

  // Fetch news from database cache
  useEffect(() => {
    const loadNewsFromDB = async () => {
      try {
        const { data, error } = await supabase
          .from('news_cache')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading news cache:', error);
          return;
        }

        if (data && data.length > 0) {
          const news = data.map((item: { source: string; title: string; link: string }) => ({
            source: item.source,
            title: item.title,
            link: item.link,
          }));
          // Shuffle for variety
          const shuffled = [...news].sort(() => Math.random() - 0.5);
          setNewsItems(shuffled);
          setLastNewsUpdate(new Date());
          console.log('News loaded from DB cache:', news.length, 'items');
        } else {
          // No news in cache, trigger update
          console.log('No news cache, triggering update...');
          await supabase.functions.invoke('update-cache');
          // Reload after a few seconds
          setTimeout(loadNewsFromDB, 5000);
        }
      } catch (error) {
        console.error('Error loading news:', error);
        // Fallback to health tips
        setNewsItems([
          { title: 'Cuide da sua saúde: faça check-ups regulares', link: '', source: 'Saúde' },
          { title: 'Mantenha-se hidratado durante todo o dia', link: '', source: 'Saúde' },
        ]);
      }
    };

    loadNewsFromDB();
    setNewsCountdown(3 * 60);
    // Reload from DB every 3 minutes to get fresh shuffled data
    const interval = setInterval(() => {
      loadNewsFromDB();
      setNewsCountdown(3 * 60);
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

  // Anti-standby: Prevent TV from entering standby mode when idle
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    let activityInterval: NodeJS.Timeout | null = null;
    let reloadTimeout: NodeJS.Timeout | null = null;
    const lastActivityRef = { current: Date.now() };
    const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes before reload
    const ACTIVITY_INTERVAL = 30 * 1000; // Simulate activity every 30 seconds

    // Request Wake Lock to prevent screen from sleeping
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('🔒 Wake Lock ativado - TV não entrará em standby');
          
          wakeLock.addEventListener('release', () => {
            console.log('🔓 Wake Lock liberado');
            // Try to re-acquire wake lock
            setTimeout(requestWakeLock, 1000);
          });
        }
      } catch (err) {
        console.log('Wake Lock não disponível:', err);
      }
    };

    // Simulate user activity to prevent standby on older TVs
    const simulateActivity = () => {
      // Dispatch synthetic mouse move event with a special flag to avoid showing cursor
      const event = new MouseEvent('mousemove', {
        bubbles: false, // Don't bubble to avoid triggering cursor show
        cancelable: true,
        clientX: Math.random() * window.innerWidth,
        clientY: Math.random() * window.innerHeight,
      });
      // Dispatch to document body instead of window to avoid cursor handler
      document.body.dispatchEvent(event);

      // Also dispatch a video play event if there's a video
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (video.paused && video.readyState >= 2) {
          video.play().catch(() => {});
        }
      });

      console.log('📺 Atividade simulada para evitar standby');
    };

    // Check for prolonged inactivity and reload if needed
    const checkIdleAndReload = () => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= IDLE_THRESHOLD) {
        console.log('⏰ Recarregando página após inatividade prolongada...');
        window.location.reload();
      }
    };

    // Update last activity time when patient calls happen
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Listen to patient call changes to reset idle timer
    window.addEventListener('patientCallActivity', updateActivity);
    
    // Also reset on any user interaction
    window.addEventListener('click', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('keydown', updateActivity);

    // Start wake lock
    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
        updateActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start activity simulation interval
    activityInterval = setInterval(simulateActivity, ACTIVITY_INTERVAL);

    // Start idle check interval (check every minute)
    reloadTimeout = setInterval(checkIdleAndReload, 60 * 1000);

    // Initial activity simulation
    simulateActivity();

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
      if (activityInterval) {
        clearInterval(activityInterval);
      }
      if (reloadTimeout) {
        clearInterval(reloadTimeout);
      }
      window.removeEventListener('patientCallActivity', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

    // Play a silent tone to fully unlock audio on mobile/TV browsers
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.001; // Nearly silent
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // ignore
    }

    localStorage.setItem('audioUnlocked', 'true');
    setAudioUnlocked(true);
    console.log('Audio unlocked (ElevenLabs only mode)');
  }, [audioUnlocked]);

  // Play audio with amplification using Web Audio API (2.5x volume = 150% increase)
  const playAmplifiedAudio = useCallback(
    (audioElement: HTMLAudioElement, gain: number = 2.5): Promise<void> => {
      return new Promise((resolve, reject) => {
        try {
          const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
          const audioContext = audioContextRef.current || new AudioContextCtor();
          if (!audioContextRef.current) audioContextRef.current = audioContext;

          const startPlayback = async () => {
            try {
              if (audioContext.state === 'suspended') {
                await audioContext.resume();
              }

              const source = audioContext.createMediaElementSource(audioElement);
              const gainNode = audioContext.createGain();
              gainNode.gain.value = gain;

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

              await audioElement.play();
            } catch (err) {
              reject(err);
            }
          };

          void startPlayback();
        } catch (e) {
          // Fallback to normal playback if Web Audio API fails
          console.warn('Web Audio API amplification failed, using normal volume:', e);
          audioElement.volume = 1.0;
          audioElement.onended = () => resolve();
          audioElement.onerror = (ev) => reject(ev);
          audioElement.play().catch(reject);
        }
      });
    },
    []
  );
  // Play notification sound effect (uses preloaded audio for faster playback)
  const playNotificationSound = useCallback(() => {
    console.log('playNotificationSound called');
    
    return new Promise<void>((resolve, reject) => {
      // Get volume from localStorage
      const notificationVolume = parseFloat(localStorage.getItem('volume-notification') || '1');
      const gain = 2.5 * notificationVolume;
      
      // Create new audio element each time to allow Web Audio API connection
      const audio = new Audio('/sounds/notification.mp3');
      audio.currentTime = 0;
      
      playAmplifiedAudio(audio, gain)
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

          // Get TTS volume from localStorage if not provided in opts
          const ttsVolume = parseFloat(localStorage.getItem('volume-tts') || '1');

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'pt-BR';
          utterance.rate = opts?.rate ?? 0.9;
          utterance.pitch = opts?.pitch ?? 1.1;
          utterance.volume = opts?.volume ?? ttsVolume;

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

  // ElevenLabs TTS via backend function - plays MP3 audio (works on any device)
  // Calls API directly without relying on cache for reliability
  const speakWithConcatenatedTTS = useCallback(
    async (name: string, destinationPhrase: string): Promise<void> => {
      const cleanName = name.trim();
      const cleanDestination = destinationPhrase.trim();
      console.log('Speaking with unified TTS (single API call):', { name: cleanName, destinationPhrase: cleanDestination });

      // Get TTS volume from localStorage
      const ttsVolume = parseFloat(localStorage.getItem('volume-tts') || '1');
      const gain = 2.5 * ttsVolume;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
      const headers = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      } as const;

      // Generate unified audio with name + destination in a single API call
      // This produces more natural speech with proper prosody and pauses
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          concatenate: {
            name: cleanName,
            prefix: '',
            destination: cleanDestination,
          },
          unitName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Unified TTS error:', errorData);
        throw new Error(errorData.error || `ElevenLabs unified TTS error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      console.log('Unified audio blob received:', { size: audioBlob.size });

      const audioUrl = URL.createObjectURL(audioBlob);

      try {
        // Play the unified audio (name + destination in one natural speech)
        console.log('Playing unified audio...');
        await playAmplifiedAudio(new Audio(audioUrl), gain);
        console.log('Unified audio finished');
      } finally {
        URL.revokeObjectURL(audioUrl);
      }
    },
    [unitName, playAmplifiedAudio]
  );

  const speakWithElevenLabs = useCallback(
    async (text: string): Promise<void> => {
      console.log('Speaking with ElevenLabs:', text);
      
      // Get TTS volume from localStorage
      const ttsVolume = parseFloat(localStorage.getItem('volume-tts') || '1');
      const gain = 2.5 * ttsVolume;
      
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
        await playAmplifiedAudio(audio, gain);
      } finally {
        URL.revokeObjectURL(audioUrl);
      }
    },
    [unitName, playAmplifiedAudio]
  );

  // Test audio function
  const testAudio = useCallback(async () => {
    console.log('Testing audio...');
    try {
      // Play notification sound first
      await playNotificationSound();

      const testText = 'Teste de áudio. Som funcionando corretamente.';

      // Use only ElevenLabs API with local cache
      try {
        await speakWithElevenLabs(testText);
        console.log('Audio test completed (ElevenLabs)');
      } catch (e) {
        console.error('ElevenLabs audio test failed:', e);
      }
    } catch (error) {
      console.error('Audio test failed:', error);
    }
  }, [playNotificationSound, speakWithElevenLabs]);

  // Play time notification sound (different from patient call notification - softer tone)
  const playTimeNotificationSound = useCallback(() => {
    console.log('playTimeNotificationSound called');
    
    return new Promise<void>((resolve) => {
      try {
        // Get volume from localStorage
        const timeNotificationVolume = parseFloat(localStorage.getItem('volume-time-notification') || '1');
        
        const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioContextRef.current) audioContextRef.current = audioContext;
        
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        
        // Create a softer, distinct chime for time announcements (two ascending tones)
        const playTone = (frequency: number, startTime: number, duration: number) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.type = 'sine'; // Softer sine wave instead of triangle
          oscillator.frequency.value = frequency;
          
          // Gentle envelope with volume control
          const maxGain = 0.3 * timeNotificationVolume;
          gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
          gainNode.gain.linearRampToValueAtTime(maxGain, audioContext.currentTime + startTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.start(audioContext.currentTime + startTime);
          oscillator.stop(audioContext.currentTime + startTime + duration);
        };
        
        // Two soft ascending tones (G5 -> C6) - different from patient notification
        playTone(784, 0, 0.3);      // G5
        playTone(1047, 0.25, 0.4);  // C6
        
        setTimeout(resolve, 700);
      } catch (e) {
        console.warn('Failed to play time notification:', e);
        resolve();
      }
    });
  }, []);

  // Play hour announcement using pre-cached audio (concatenating hour + minute) - repeats 2x with notification before each
  const playHourAnnouncement = useCallback(async (hour: number, minute: number) => {
    if (!audioUnlocked) {
      console.log('Audio not unlocked, skipping hour announcement');
      return;
    }

    // Never overlap with patient calls
    if (announcingType || isSpeakingRef.current) {
      console.log('Patient announcement in progress, skipping hour announcement');
      return;
    }

    try {
      console.log(`Playing hour announcement for ${hour}:${minute.toString().padStart(2, '0')} (will repeat 2x)`);

      // Repeat the announcement 2 times, each with notification sound before
      for (let i = 0; i < 2; i++) {
        // Abort if a patient call starts mid-way
        if (announcingType || isSpeakingRef.current) {
          console.log('Patient announcement started, aborting hour announcement');
          return;
        }

        console.log(`Hour announcement iteration ${i + 1}/2`);

        // Play distinct notification sound before hour announcement
        await playTimeNotificationSound();

        // Abort again after notification
        if (announcingType || isSpeakingRef.current) {
          console.log('Patient announcement started, aborting hour announcement after notification');
          return;
        }

        const success = await playHourAudio(hour, minute);
        if (success) {
          console.log(`Hour announcement iteration ${i + 1} completed`);
        } else {
          console.warn(`Hour announcement iteration ${i + 1} failed`);
        }

        // Small pause between repetitions (only if not the last iteration)
        if (i < 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log('Hour announcement fully completed (2x)');
    } catch (error) {
      console.error('Failed to play hour announcement:', error);
    }
  }, [audioUnlocked, playHourAudio, playTimeNotificationSound, announcingType]);

  // Generate 3 random announcement times per hour with minimum 10 min between them
  const generateRandomAnnouncements = useCallback((hour: number): number[] => {
    const announcements: number[] = [];
    const minGap = 10; // mínimo de 10 minutos entre anúncios
    
    // Gerar 3 momentos aleatórios
    for (let i = 0; i < 3; i++) {
      let attempts = 0;
      let minute: number;
      
      do {
        minute = Math.floor(Math.random() * 60); // 0-59
        attempts++;
        
        // Verificar se há pelo menos 10 min de distância dos outros
        const isValid = announcements.every(m => Math.abs(minute - m) >= minGap);
        
        if (isValid || attempts > 50) {
          if (isValid) announcements.push(minute);
          break;
        }
      } while (attempts <= 50);
    }
    
    console.log(`Hour ${hour} scheduled announcements at minutes:`, announcements.sort((a, b) => a - b));
    return announcements.sort((a, b) => a - b);
  }, []);

  // Expose test function on window for manual testing
  useEffect(() => {
    const testAnnouncement = () => {
      if (!currentTime) {
        console.log('currentTime not available');
        return;
      }
      const hour = currentTime.getHours();
      const minute = currentTime.getMinutes();
      console.log(`Manual test: announcing time ${hour}:${minute.toString().padStart(2, '0')}`);
      playHourAnnouncement(hour, minute);
    };
    
    (window as any).testarHora = testAnnouncement;
    
    return () => {
      delete (window as any).testarHora;
    };
  }, [currentTime, playHourAnnouncement]);

  // Announce time 3 times per hour at random moments (quiet hours: 23h-05h)
  useEffect(() => {
    if (!currentTime || !audioUnlocked || !isSynced) return;

    // Never overlap hour announcements with patient calls
    if (announcingType || isSpeakingRef.current) {
      return;
    }

    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const second = currentTime.getSeconds();
    const now = Date.now();

    // Horário de silêncio: não anunciar entre 22h e 6h (inclusive)
    const isQuietHours = hour >= 22 || hour < 6;
    if (isQuietHours) {
      return; // Não anunciar durante horário de silêncio
    }

    // Regenerar agendamento quando mudar de hora
    if (currentScheduleHourRef.current !== hour) {
      currentScheduleHourRef.current = hour;
      scheduledAnnouncementsRef.current = generateRandomAnnouncements(hour);
    }

    // Verificar se é momento de anunciar
    const shouldAnnounce = scheduledAnnouncementsRef.current.includes(minute) && second < 5;
    const timeSinceLastAnnouncement = now - lastTimeAnnouncementRef.current;
    const minGapMs = 10 * 60 * 1000; // 10 minutos em ms

    if (shouldAnnounce && timeSinceLastAnnouncement >= minGapMs) {
      lastTimeAnnouncementRef.current = now;

      // Remover este minuto do agendamento para não repetir
      scheduledAnnouncementsRef.current = scheduledAnnouncementsRef.current.filter((m) => m !== minute);

      // Pequeno delay para evitar conflitos com outros áudios
      setTimeout(() => {
        // Double-check we are still not in a patient announcement
        if (announcingType || isSpeakingRef.current) return;
        playHourAnnouncement(hour, minute);
      }, 1000);
    }
  }, [currentTime, audioUnlocked, isSynced, playHourAnnouncement, generateRandomAnnouncements, announcingType]);

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
      const now = Date.now();
      console.log('speakName called with:', { name, caller, destination, timestamp: now });

      // Debounce: ignore calls within 2 seconds of each other
      if (now - lastSpeakCallRef.current < 2000) {
        console.log('Debounce: ignoring duplicate call within 2s window');
        return;
      }
      
      // Prevent duplicate TTS calls
      if (isSpeakingRef.current) {
        console.log('Already speaking, skipping duplicate call');
        return;
      }
      
      lastSpeakCallRef.current = now;
      isSpeakingRef.current = true;

      // Start visual alert; it will auto-stop after 10s in the effect below
      setAnnouncingType(caller);

      const location = destination || (caller === 'triage' ? 'Triagem' : 'Consultório Médico');
      const destinationPhrase = getDestinationPhrase(location);
      console.log('TTS - Name:', name, 'Destination phrase:', destinationPhrase);

      try {
        // Play notification sound first (mandatory)
        await playNotificationSound();

        // Use ElevenLabs API with concatenated mode (Brazilian Portuguese)
        // Audio is cached locally in Supabase Storage for reuse
        await speakWithConcatenatedTTS(name, destinationPhrase);
        console.log('TTS completed (ElevenLabs - Brazilian Portuguese with local cache)');
      } catch (e) {
        console.error('ElevenLabs TTS failed:', e);
      } finally {
        isSpeakingRef.current = false;
      }
    },
    [playNotificationSound, speakWithConcatenatedTTS, getDestinationPhrase]
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
            
            // Dispatch activity event to reset idle timer (anti-standby)
            window.dispatchEvent(new CustomEvent('patientCallActivity'));
            
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
          <HealthCrossIcon size={96} className="mx-auto" />
          <h1 className="text-4xl font-bold text-white">Clique para Ativar Áudio</h1>
          <p className="text-xl text-slate-400">Toque na tela para habilitar as chamadas de pacientes</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`h-[100dvh] w-[100dvw] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-[1vw] relative overflow-hidden flex flex-col ${!cursorVisible ? 'cursor-none' : ''}`}
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
        <div className="absolute top-[2vh] left-[2vw] w-[15vw] h-[15vw] bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[2vh] right-[2vw] w-[12vw] h-[12vw] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Header - Compact for TV Landscape */}
      <div className="relative z-10 flex items-center justify-between gap-[1vw] mb-[0.5vh] shrink-0">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-[0.8vw]">
          <div className="w-[3.5vw] h-[3.5vw] min-w-[40px] min-h-[40px] rounded-xl bg-white/90 flex items-center justify-center shadow-lg shrink-0">
            <HealthCrossIcon size={32} className="w-[2.5vw] h-[2.5vw] min-w-[28px] min-h-[28px]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[1.8vw] min-text-lg font-bold text-white leading-tight" style={{ fontSize: 'clamp(1rem, 1.8vw, 2rem)' }}>
              Painel de Chamadas
            </h1>
            <p className="text-slate-400 leading-tight truncate" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 1rem)' }}>{unitName || 'Unidade de Saúde'}</p>
          </div>
        </div>
        
        {/* Right: Weather + Clock together - moved left */}
        <div className="flex items-center overflow-visible min-w-0 mr-auto ml-[2vw]">
          <div className="shrink-0">
            <WeatherWidget currentTime={currentTime} formatTime={formatBrazilTime} />
          </div>
        </div>
      </div>

      {/* Main Content - Landscape optimized with viewport units */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-[0.8vw] min-h-0 pb-[5vh]">
        {/* Current Calls - Side by side */}
        <div className="col-span-9 grid grid-cols-2 gap-[0.8vw]">
          {/* Triage Call */}
          <div className={`bg-slate-800/50 rounded-[1vw] overflow-hidden backdrop-blur-sm flex flex-col transition-all duration-300 ${
            announcingType === 'triage' 
              ? 'border-4 border-red-500 animate-border-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
              : 'border border-slate-700'
          } ${currentTriageCall ? 'animate-card-pop' : ''}`}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-[1vw] py-[0.8vh] shrink-0">
              <p className="text-white font-bold flex items-center gap-[0.5vw]" style={{ fontSize: 'clamp(1rem, 1.8vw, 2rem)' }}>
                <Activity className="w-[2vw] h-[2vw] min-w-[24px] min-h-[24px] shrink-0" />
                <span>TRIAGEM</span>
                {announcingType === 'triage' && (
                  <Megaphone className="w-[2vw] h-[2vw] min-w-[24px] min-h-[24px] text-red-400 animate-bounce ml-auto shrink-0" />
                )}
              </p>
            </div>
            <div className="p-[1vw] flex items-center justify-center flex-1 min-h-0">
              {currentTriageCall ? (
                <div className={`text-center w-full transition-all duration-300 ${announcingType === 'triage' ? 'scale-105' : ''}`}>
                  <h2 className={`font-black tracking-wide leading-tight break-words transition-all duration-300 animate-text-reveal ${
                    announcingType === 'triage' 
                      ? 'text-red-400 animate-pulse drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]' 
                      : 'text-white'
                  }`} style={{ fontSize: 'clamp(2rem, 5vw, 6rem)', wordBreak: 'break-word' }} key={currentTriageCall.name}>
                    {currentTriageCall.name}
                  </h2>
                  <p className="text-blue-400 mt-[0.5vh] font-semibold" style={{ fontSize: 'clamp(0.8rem, 1.3vw, 1.5rem)' }}>
                    Por favor, dirija-se à {currentTriageCall.destination || 'Triagem'}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-center" style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1.2rem)' }}>
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>

          {/* Doctor Call */}
          <div className={`bg-slate-800/50 rounded-[1vw] overflow-hidden backdrop-blur-sm flex flex-col transition-all duration-300 ${
            announcingType === 'doctor' 
              ? 'border-4 border-red-500 animate-border-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
              : 'border border-slate-700'
          } ${currentDoctorCall ? 'animate-card-pop' : ''}`}>
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-[1vw] py-[0.8vh] shrink-0">
              <p className="text-white font-bold flex items-center gap-[0.5vw]" style={{ fontSize: 'clamp(1rem, 1.8vw, 2rem)' }}>
                <Stethoscope className="w-[2vw] h-[2vw] min-w-[24px] min-h-[24px] shrink-0" />
                <span>CONSULTÓRIO</span>
                {announcingType === 'doctor' && (
                  <Megaphone className="w-[2vw] h-[2vw] min-w-[24px] min-h-[24px] text-red-400 animate-bounce ml-auto shrink-0" />
                )}
              </p>
            </div>
            <div className="p-[1vw] flex items-center justify-center flex-1 min-h-0">
              {currentDoctorCall ? (
                <div className={`text-center w-full transition-all duration-300 ${announcingType === 'doctor' ? 'scale-105' : ''}`}>
                  <h2 className={`font-black tracking-wide leading-tight break-words transition-all duration-300 animate-text-reveal ${
                    announcingType === 'doctor' 
                      ? 'text-red-400 animate-pulse drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]' 
                      : 'text-white'
                  }`} style={{ fontSize: 'clamp(2rem, 5vw, 6rem)', wordBreak: 'break-word' }} key={currentDoctorCall.name}>
                    {currentDoctorCall.name}
                  </h2>
                  <p className="text-emerald-400 mt-[0.5vh] font-semibold" style={{ fontSize: 'clamp(0.8rem, 1.3vw, 1.5rem)' }}>
                    Por favor, dirija-se ao {currentDoctorCall.destination || 'Consultório'}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-center" style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1.2rem)' }}>
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: History Panel */}
        <div className="col-span-3 bg-slate-800/50 rounded-[1vw] border border-slate-700 p-[0.8vw] backdrop-blur-sm flex flex-col min-h-0">
          <h3 className="font-bold text-white mb-[0.5vh] flex items-center gap-[0.4vw] shrink-0" style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1.2rem)' }}>
            <Clock className="w-[1.2vw] h-[1.2vw] min-w-[16px] min-h-[16px] text-primary shrink-0" />
            <span>Últimas Chamadas</span>
          </h3>
          <div className="space-y-[0.5vh] flex-1 overflow-y-auto">
            {historyItems.length === 0 ? (
              <p className="text-slate-500 text-center py-[1vh]" style={{ fontSize: 'clamp(0.7rem, 0.9vw, 1rem)' }}>
                Nenhuma chamada ainda
              </p>
            ) : (
              historyItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-[0.6vw] rounded-lg ${
                    index === 0 
                      ? 'bg-primary/20 border-2 border-primary/40 ring-2 ring-primary/20 animate-call-entrance' 
                      : 'bg-slate-700/50'
                  } transition-all`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-[0.4vw]">
                    <div className={`w-[2vw] h-[2vw] min-w-[24px] min-h-[24px] rounded-full flex items-center justify-center shrink-0 ${
                      item.type === 'triage' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}>
                      {item.type === 'triage' ? (
                        <Activity className="w-[1vw] h-[1vw] min-w-[12px] min-h-[12px] text-white" />
                      ) : (
                        <Stethoscope className="w-[1vw] h-[1vw] min-w-[12px] min-h-[12px] text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate" style={{ fontSize: 'clamp(0.7rem, 1vw, 1rem)' }}>
                        {item.name}
                      </p>
                      <p className="text-slate-400" style={{ fontSize: 'clamp(0.6rem, 0.8vw, 0.8rem)' }}>
                        {item.type === 'triage' ? 'Triagem' : 'Médico'}
                      </p>
                    </div>
                    <span className="text-slate-400 font-mono shrink-0" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.9rem)' }}>
                      {formatBrazilTime(item.time, 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* News Ticker - Fixed at bottom like TV news breaking news style */}
      {newsItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 shrink-0">
          <div className="flex items-stretch h-[5vh] min-h-[40px]">
            {/* Left Red Section - Logo */}
            <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 px-[1.5vw] flex items-center justify-center shrink-0 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-800/50 to-transparent" />
              <div className="flex flex-col items-center relative z-10">
                <span className="text-white font-black tracking-wider" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.5rem)' }}>TV</span>
                <span className="text-rose-200 font-semibold" style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.7rem)', marginTop: '-2px' }}>SAÚDE</span>
              </div>
            </div>
            
            {/* Blue Section - Breaking News Title */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-[1vw] flex items-center gap-[0.5vw] shrink-0 relative">
              <div className="absolute top-0 right-0 bg-red-600 px-[0.5vw] py-[0.1vh] flex items-center gap-[0.3vw]" style={{ fontSize: 'clamp(0.45rem, 0.6vw, 0.6rem)' }}>
                <span className="w-[0.5vw] h-[0.5vw] min-w-[5px] min-h-[5px] bg-white rounded-full animate-pulse" />
                <span className="text-white font-bold">AO VIVO</span>
                <span className="text-white/80 ml-[0.3vw]">{formatBrazilTime(new Date(), 'HH:mm')}</span>
              </div>
              <Newspaper className="w-[1.8vw] h-[1.8vw] min-w-[18px] min-h-[18px] text-white shrink-0" />
              <div className="flex flex-col">
                <span className="text-white font-black tracking-wide" style={{ fontSize: 'clamp(0.7rem, 1.2vw, 1.2rem)' }}>
                  NOTÍCIAS
                </span>
                <span className="text-blue-200" style={{ fontSize: 'clamp(0.45rem, 0.65vw, 0.65rem)', marginTop: '-1px' }}>
                  Atualiza: {Math.floor(newsCountdown / 60)}:{(newsCountdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
            
            {/* Scrolling News Section - Dark background */}
            <div className="flex-1 bg-slate-900 overflow-hidden flex items-center relative">
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10" />
              <div className="animate-marquee whitespace-nowrap inline-flex py-[0.3vh]">
                {(() => {
                  const creditItem = { title: 'Solução criada e cedida gratuitamente por Kalebe Gomes', source: 'Créditos', link: '' };
                  const itemsWithCredits: typeof newsItems = [];
                  newsItems.forEach((item, index) => {
                    itemsWithCredits.push(item);
                    if ((index + 1) % 3 === 0) {
                      itemsWithCredits.push(creditItem);
                    }
                  });
                  
                  return itemsWithCredits.map((item, index) => (
                    <span key={index} className="mx-[0.8vw] inline-flex items-center gap-[0.4vw] text-white" style={{ fontSize: 'clamp(0.85rem, 1.3vw, 1.4rem)' }}>
                      <span className={`px-[0.4vw] py-[0.2vh] rounded font-bold inline-block ${
                        item.source === 'Créditos' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-900' :
                        item.source === 'G1' ? 'bg-red-500' : 
                        item.source === 'O Globo' ? 'bg-blue-600' :
                        item.source === 'Itatiaia' ? 'bg-yellow-500 text-yellow-900' :
                        item.source === 'UOL' ? 'bg-orange-500' :
                        item.source === 'Folha' ? 'bg-blue-500' :
                        item.source === 'Estadão' ? 'bg-slate-600' :
                        item.source === 'CNN' ? 'bg-red-600' :
                        item.source === 'Band' ? 'bg-green-600' :
                        item.source === 'Terra' ? 'bg-emerald-500' :
                        item.source === 'IG' ? 'bg-pink-500' :
                        item.source === 'Correio' ? 'bg-sky-600' :
                        item.source === 'Metrópoles' ? 'bg-purple-600' :
                        item.source === 'Gazeta' ? 'bg-teal-600' :
                        item.source === 'Poder360' ? 'bg-indigo-600' :
                        item.source === 'Nexo' ? 'bg-rose-600' :
                        item.source === 'Ag. Brasil' ? 'bg-cyan-600' :
                        item.source === 'InfoMoney' ? 'bg-lime-600' :
                        item.source === 'Exame' ? 'bg-amber-600' :
                        item.source === 'Época' ? 'bg-fuchsia-600' :
                        item.source === 'Valor' ? 'bg-violet-600' :
                        item.source === 'O Tempo' ? 'bg-orange-600' :
                        item.source === 'Hoje em Dia' ? 'bg-blue-700' :
                        item.source === 'EM' ? 'bg-red-700' :
                        item.source === 'Super' ? 'bg-yellow-600' :
                        item.source === 'Tecmundo' ? 'bg-purple-500' :
                        item.source === 'Olhar Digital' ? 'bg-green-500' :
                        item.source === 'Canaltech' ? 'bg-blue-400' :
                        item.source === 'GE' ? 'bg-green-700' :
                        item.source === 'Lance' ? 'bg-red-500' :
                        item.source === 'ESPN' ? 'bg-red-800' :
                        'bg-gray-500'
                      } ${item.source !== 'Créditos' && item.source !== 'Itatiaia' ? 'text-white' : ''}`} style={{ fontSize: 'clamp(0.55rem, 0.85vw, 0.85rem)' }}>
                        {item.source === 'Créditos' ? '⭐' : item.source}
                      </span>
                      <span className="text-slate-100">
                        {item.title}
                      </span>
                      <span className="text-slate-500 mx-[0.3vw]">•</span>
                    </span>
                  ));
                })()}
                {(() => {
                  const creditItem = { title: 'Solução criada e cedida gratuitamente por Kalebe Gomes', source: 'Créditos', link: '' };
                  const itemsWithCredits: typeof newsItems = [];
                  newsItems.forEach((item, index) => {
                    itemsWithCredits.push(item);
                    if ((index + 1) % 3 === 0) {
                      itemsWithCredits.push(creditItem);
                    }
                  });
                  
                  return itemsWithCredits.map((item, index) => (
                    <span key={`dup-${index}`} className="mx-[0.8vw] inline-flex items-center gap-[0.4vw] text-white" style={{ fontSize: 'clamp(0.85rem, 1.3vw, 1.4rem)' }}>
                      <span className={`px-[0.4vw] py-[0.2vh] rounded font-bold inline-block ${
                        item.source === 'Créditos' ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-900' :
                        item.source === 'G1' ? 'bg-red-500' : 
                        item.source === 'O Globo' ? 'bg-blue-600' :
                        item.source === 'Itatiaia' ? 'bg-yellow-500 text-yellow-900' :
                        item.source === 'UOL' ? 'bg-orange-500' :
                        item.source === 'Folha' ? 'bg-blue-500' :
                        item.source === 'Estadão' ? 'bg-slate-600' :
                        item.source === 'CNN' ? 'bg-red-600' :
                        item.source === 'Band' ? 'bg-green-600' :
                        item.source === 'Terra' ? 'bg-emerald-500' :
                        item.source === 'IG' ? 'bg-pink-500' :
                        item.source === 'Correio' ? 'bg-sky-600' :
                        item.source === 'Metrópoles' ? 'bg-purple-600' :
                        item.source === 'Gazeta' ? 'bg-teal-600' :
                        item.source === 'Poder360' ? 'bg-indigo-600' :
                        item.source === 'Nexo' ? 'bg-rose-600' :
                        item.source === 'Ag. Brasil' ? 'bg-cyan-600' :
                        item.source === 'InfoMoney' ? 'bg-lime-600' :
                        item.source === 'Exame' ? 'bg-amber-600' :
                        item.source === 'Época' ? 'bg-fuchsia-600' :
                        item.source === 'Valor' ? 'bg-violet-600' :
                        item.source === 'O Tempo' ? 'bg-orange-600' :
                        item.source === 'Hoje em Dia' ? 'bg-blue-700' :
                        item.source === 'EM' ? 'bg-red-700' :
                        item.source === 'Super' ? 'bg-yellow-600' :
                        item.source === 'Tecmundo' ? 'bg-purple-500' :
                        item.source === 'Olhar Digital' ? 'bg-green-500' :
                        item.source === 'Canaltech' ? 'bg-blue-400' :
                        item.source === 'GE' ? 'bg-green-700' :
                        item.source === 'Lance' ? 'bg-red-500' :
                        item.source === 'ESPN' ? 'bg-red-800' :
                        'bg-gray-500'
                      } ${item.source !== 'Créditos' && item.source !== 'Itatiaia' ? 'text-white' : ''}`} style={{ fontSize: 'clamp(0.55rem, 0.85vw, 0.85rem)' }}>
                        {item.source === 'Créditos' ? '⭐' : item.source}
                      </span>
                      <span className="text-slate-100">
                        {item.title}
                      </span>
                      <span className="text-slate-500 mx-[0.3vw]">•</span>
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
