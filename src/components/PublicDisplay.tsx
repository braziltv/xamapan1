import { Clock, Stethoscope, Activity, Megaphone, VolumeX, LogOut, Minimize2, AlertTriangle, X } from 'lucide-react';
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

interface TTSError {
  message: string;
  timestamp: Date;
}

interface ScheduledAnnouncement {
  id: string;
  title: string;
  text_content: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  interval_minutes: number;
  repeat_count: number;
  is_active: boolean;
  last_played_at: string | null;
  audio_cache_url?: string | null;
  updated_at?: string;
}

interface CommercialPhrase {
  id: string;
  phrase_content: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_active: boolean;
  display_order: number;
}

export function PublicDisplay(_props: PublicDisplayProps) {
  const { currentTime, isSynced } = useBrazilTime();
  const { playHourAudio } = useHourAudio();
  const [currentTriageCall, setCurrentTriageCall] = useState<{ name: string; destination?: string } | null>(null);
  const [currentDoctorCall, setCurrentDoctorCall] = useState<{ name: string; destination?: string } | null>(null);
  const [announcingType, setAnnouncingType] = useState<'triage' | 'doctor' | null>(null);
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; name: string; type: string; time: Date }>>([]);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const pollInitializedRef = useRef(false);
  const [unitName, setUnitName] = useState(() =>
    localStorage.getItem('selectedUnitName') || localStorage.getItem('tv_permanent_unit_name') || ''
  );
  const [unitId, setUnitId] = useState(() =>
    localStorage.getItem('selectedUnitId') || localStorage.getItem('tv_permanent_unit_id') || ''
  );
  const [marketingUnitName, setMarketingUnitName] = useState<string>('');
  const marketingTimeKey = currentTime
    ? `${currentTime.getFullYear()}-${currentTime.getMonth()}-${currentTime.getDate()}-${currentTime.getHours()}-${currentTime.getMinutes()}`
    : '';
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [lastNewsUpdate, setLastNewsUpdate] = useState<Date | null>(null);
  const [newsCountdown, setNewsCountdown] = useState(5 * 60); // 5 minutes in seconds
  const [commercialPhrases, setCommercialPhrases] = useState<CommercialPhrase[]>([]);
  const [scheduledAnnouncements, setScheduledAnnouncements] = useState<ScheduledAnnouncement[]>([]);
  const lastAnnouncementPlayedRef = useRef<Record<string, number>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(() => localStorage.getItem('audioUnlocked') === 'true');
  const audioContextRef = useRef<AudioContext | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const lastTimeAnnouncementRef = useRef<number>(0);
  const scheduledAnnouncementsRef = useRef<number[]>([]);
  const currentScheduleHourRef = useRef<number>(-1);
  const isSpeakingRef = useRef<boolean>(false);
  const lastSpeakCallRef = useRef<number>(0);
  const [ttsError, setTtsError] = useState<TTSError | null>(null);
  const [pendingImmediateAnnouncement, setPendingImmediateAnnouncement] = useState<ScheduledAnnouncement | null>(null);

  const readVolume = (key: string, fallback = 1) => {
    const raw = localStorage.getItem(key);
    const v = raw == null ? NaN : parseFloat(raw);
    if (!Number.isFinite(v)) return fallback;
    return Math.min(1, Math.max(0, v));
  };

  // Resolve unit_name used by marketing tables (they store the unit "name")
  // Prefer resolving by selectedUnitId (more reliable than matching display text).
  useEffect(() => {
    let alive = true;

    const normalizeKey = (value: string) =>
      (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const resolve = async () => {
      // 1) If we have an ID, resolve directly.
      if (unitId) {
        try {
          const { data, error } = await supabase
            .from('units')
            .select('name, display_name')
            .eq('id', unitId)
            .maybeSingle();

          if (!alive) return;
          if (error) throw error;

          if (data?.name) {
            setMarketingUnitName(data.name);
            // Keep a friendly display name for UI if we don't have one yet.
            if (!unitName) setUnitName(data.display_name || data.name);
            return;
          }
        } catch (e) {
          // fall through to name-based matching
          console.warn('Failed to resolve marketing unit by id; falling back to name matching:', e);
        }
      }

      // 2) Fallback: resolve from stored name (display_name or name).
      if (!unitName) {
        setMarketingUnitName('');
        return;
      }

      try {
        const { data: units, error } = await supabase.from('units').select('name, display_name');

        if (!alive) return;
        if (error) throw error;

        const target = normalizeKey(unitName);
        const match = (units || []).find(
          (u) => normalizeKey(u.display_name) === target || normalizeKey(u.name) === target
        );

        setMarketingUnitName(match?.name ?? '');
      } catch (e) {
        console.warn('Failed to resolve marketing unit name:', e);
        if (alive) setMarketingUnitName('');
      }
    };

    void resolve();
    return () => {
      alive = false;
    };
  }, [unitName, unitId]);

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

    // Update news in background every 5 minutes via edge function
    const updateNewsInBackground = async () => {
      try {
        console.log('🔄 Updating news cache in background...');
        await supabase.functions.invoke('update-cache');
        console.log('✅ News cache updated, reloading...');
        await loadNewsFromDB();
      } catch (error) {
        console.error('Error updating news in background:', error);
      }
    };

    loadNewsFromDB();
    setNewsCountdown(5 * 60);
    
    // Update news every 5 minutes in background
    const interval = setInterval(() => {
      updateNewsInBackground();
      setNewsCountdown(5 * 60);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Load commercial phrases from database (used in TV footer)
  useEffect(() => {
    const loadCommercialPhrases = async () => {
      try {
        if (!marketingUnitName) {
          setCommercialPhrases([]);
          return;
        }

        const now = currentTime ?? new Date();
        const currentTimeStr = formatBrazilTime(now, 'HH:mm:00');
        const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
        const today = formatBrazilTime(now, 'yyyy-MM-dd');

        console.log('📢 Loading commercial phrases:', {
          marketingUnitName,
          today,
          currentTimeStr,
          dayOfWeek,
        });

        const { data, error } = await supabase
          .from('scheduled_commercial_phrases')
          .select('*')
          .eq('unit_name', marketingUnitName)
          .eq('is_active', true)
          .lte('valid_from', today)
          .gte('valid_until', today)
          .lte('start_time', currentTimeStr)
          .gte('end_time', currentTimeStr)
          .contains('days_of_week', [dayOfWeek])
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error loading commercial phrases:', error);
          return;
        }

        if (data && data.length > 0) {
          console.log('✅ Commercial phrases loaded:', data.length);
          setCommercialPhrases(
            data.map((p) => ({
              id: p.id,
              phrase_content: p.phrase_content,
              start_time: p.start_time,
              end_time: p.end_time,
              days_of_week: p.days_of_week,
              is_active: p.is_active,
              display_order: p.display_order,
            }))
          );
        } else {
          console.log('ℹ️ No commercial phrases for current window');
          setCommercialPhrases([]);
        }
      } catch (error) {
        console.error('Error loading commercial phrases:', error);
      }
    };

    void loadCommercialPhrases();
  }, [marketingUnitName, marketingTimeKey]);

  // Load scheduled voice announcements from database
  const loadScheduledAnnouncements = useCallback(async () => {
    try {
      const today = formatBrazilTime(new Date(), 'yyyy-MM-dd');
      let query = supabase
        .from('scheduled_announcements')
        .select('*')
        .eq('is_active', true)
        .lte('valid_from', today)
        .gte('valid_until', today);

      // Filter by unit if set (marketing tables use units.name)
      if (marketingUnitName) {
        query = query.eq('unit_name', marketingUnitName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading scheduled announcements:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log('📢 Scheduled voice announcements loaded:', data.length);
        
        // Sync lastAnnouncementPlayedRef with database last_played_at
        data.forEach(a => {
          if (a.last_played_at) {
            const lastPlayedMs = new Date(a.last_played_at).getTime();
            lastAnnouncementPlayedRef.current[a.id] = lastPlayedMs;
          } else {
            // Se last_played_at é null, limpar do cache para forçar reprodução
            delete lastAnnouncementPlayedRef.current[a.id];
          }
        });
        
        setScheduledAnnouncements(data.map(a => ({
          id: a.id,
          title: a.title,
          text_content: a.text_content,
          start_time: a.start_time,
          end_time: a.end_time,
          days_of_week: a.days_of_week,
          interval_minutes: a.interval_minutes,
          repeat_count: a.repeat_count,
          is_active: a.is_active,
          last_played_at: a.last_played_at,
          audio_cache_url: a.audio_cache_url,
          updated_at: a.updated_at,
        })));
      } else {
        setScheduledAnnouncements([]);
      }
    } catch (error) {
      console.error('Error loading scheduled announcements:', error);
    }
  }, [marketingUnitName]);

  useEffect(() => {
    loadScheduledAnnouncements();
    // Reload every 5 minutes
    const interval = setInterval(loadScheduledAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadScheduledAnnouncements]);

  // Realtime subscription for scheduled announcements (for instant TV playback)
  useEffect(() => {
    if (!marketingUnitName) return;

    console.log('📡 Setting up realtime subscription for scheduled announcements');
    
    const channel = supabase
      .channel('scheduled-announcements-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scheduled_announcements',
          filter: `unit_name=eq.${marketingUnitName}`
        },
        async (payload) => {
          console.log('📢 Realtime update received for scheduled announcement:', payload);
          
          const newRecord = payload.new as any;
          
          // Se last_played_at foi setado para null, significa que é uma requisição de reprodução imediata
          if (newRecord && newRecord.last_played_at === null && newRecord.is_active) {
            console.log('🚀 Immediate playback triggered via realtime!', newRecord.title);
            
            // Criar objeto do anúncio para reprodução imediata
            const immediateAnnouncement: ScheduledAnnouncement = {
              id: newRecord.id,
              title: newRecord.title,
              text_content: newRecord.text_content,
              start_time: newRecord.start_time,
              end_time: newRecord.end_time,
              days_of_week: newRecord.days_of_week,
              interval_minutes: newRecord.interval_minutes,
              repeat_count: newRecord.repeat_count,
              is_active: newRecord.is_active,
              last_played_at: null,
              audio_cache_url: newRecord.audio_cache_url,
              updated_at: newRecord.updated_at,
            };
            
            // Setar para reprodução imediata
            setPendingImmediateAnnouncement(immediateAnnouncement);
          }
          
          // Recarregar anúncios quando houver atualização
          loadScheduledAnnouncements();
        }
      )
      .subscribe();

    return () => {
      console.log('📡 Removing realtime subscription for scheduled announcements');
      supabase.removeChannel(channel);
    };
  }, [marketingUnitName, loadScheduledAnnouncements]);

  // Countdown timer for next news update
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setNewsCountdown(prev => (prev > 0 ? prev - 1 : 5 * 60));
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, []);

  // Re-check localStorage periodically for unit name/id (reduced frequency)
  useEffect(() => {
    const checkUnit = () => {
      const name =
        localStorage.getItem('selectedUnitName') || localStorage.getItem('tv_permanent_unit_name') || '';
      const id =
        localStorage.getItem('selectedUnitId') || localStorage.getItem('tv_permanent_unit_id') || '';

      if (name !== unitName) setUnitName(name);
      if (id !== unitId) setUnitId(id);
    };

    // Check every 5 seconds instead of 1 second to reduce CPU load
    const interval = setInterval(checkUnit, 5000);
    return () => clearInterval(interval);
  }, [unitName, unitId]);

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
    let activityInterval: ReturnType<typeof setInterval> | null = null;
    let reloadCheckInterval: ReturnType<typeof setInterval> | null = null;
    let memoryCleanupInterval: ReturnType<typeof setInterval> | null = null;
    const AUTO_RELOAD_INTERVAL = 30 * 60 * 1000; // 30 minutes auto reload
    const ACTIVITY_INTERVAL = 30 * 1000; // Simulate activity every 30 seconds (reduced from 15s)
    const RELOAD_CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds if we should reload (reduced from 10s)
    const MEMORY_CLEANUP_INTERVAL = 5 * 60 * 1000; // Memory cleanup every 5 minutes
    let pendingReload = false;
    let reloadScheduledAt = Date.now() + AUTO_RELOAD_INTERVAL;

    // Request Wake Lock to prevent screen from sleeping
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('🔒 Wake Lock ativado - TV não entrará em standby');
          
          wakeLock.addEventListener('release', () => {
            console.log('🔓 Wake Lock liberado - tentando reativar...');
            // Try to re-acquire wake lock after a delay (avoid tight loop)
            setTimeout(requestWakeLock, 3000);
          });
        }
      } catch (err) {
        console.log('Wake Lock não disponível:', err);
        // Retry after 10 seconds (increased from 5s)
        setTimeout(requestWakeLock, 10000);
      }
    };

    // Simulate user activity to prevent standby on older TVs - simplified
    const simulateActivity = () => {
      // 1. Dispatch synthetic mouse move event
      const event = new MouseEvent('mousemove', {
        bubbles: false,
        cancelable: true,
        clientX: Math.random() * window.innerWidth,
        clientY: Math.random() * window.innerHeight,
      });
      document.body.dispatchEvent(event);

      // 2. Force a tiny DOM change (forces browser to stay active)
      const antiStandbyEl = document.getElementById('anti-standby-pixel');
      if (antiStandbyEl) {
        antiStandbyEl.style.opacity = antiStandbyEl.style.opacity === '0.01' ? '0.02' : '0.01';
      }

      // 3. Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    };

    // Memory cleanup - clear old processed calls
    const cleanupMemory = () => {
      const maxProcessedCalls = 100;
      if (processedCallsRef.current.size > maxProcessedCalls) {
        const arr = Array.from(processedCallsRef.current);
        processedCallsRef.current = new Set(arr.slice(-50)); // Keep only last 50
        console.log('🧹 Memory cleanup: cleared old processed calls');
      }
    };

    // Check if we should reload now
    const checkReload = () => {
      const now = Date.now();
      
      // If we passed the scheduled reload time
      if (now >= reloadScheduledAt) {
        if (!isSpeakingRef.current && !pendingReload) {
          console.log('⏰ Recarregando página automaticamente (30 minutos)...');
          window.location.reload();
        } else if (!pendingReload) {
          pendingReload = true;
          console.log('⏸️ Reload adiado - reproduzindo anúncio. Aguardando término...');
        }
      }
      
      // If pending reload and not speaking anymore
      if (pendingReload && !isSpeakingRef.current) {
        console.log('▶️ Anúncio terminou - executando reload pendente...');
        window.location.reload();
      }
    };

    // Schedule next reload
    const scheduleNextReload = () => {
      reloadScheduledAt = Date.now() + AUTO_RELOAD_INTERVAL;
      pendingReload = false;
      console.log(`📅 Próximo reload agendado para ${new Date(reloadScheduledAt).toLocaleTimeString('pt-BR')}`);
    };

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Página visível novamente - reativando proteções');
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page focus
    const handleFocus = () => {
      console.log('🎯 Página recebeu foco - reativando proteções');
      requestWakeLock();
    };
    window.addEventListener('focus', handleFocus);

    // Start wake lock
    requestWakeLock();

    // Start activity simulation interval (every 30 seconds - reduced frequency)
    activityInterval = setInterval(simulateActivity, ACTIVITY_INTERVAL);

    // Start reload check interval (every 30 seconds - reduced frequency)
    reloadCheckInterval = setInterval(checkReload, RELOAD_CHECK_INTERVAL);

    // Start memory cleanup interval
    memoryCleanupInterval = setInterval(cleanupMemory, MEMORY_CLEANUP_INTERVAL);

    // Schedule first reload
    scheduleNextReload();

    // Create anti-standby pixel element
    if (!document.getElementById('anti-standby-pixel')) {
      const pixel = document.createElement('div');
      pixel.id = 'anti-standby-pixel';
      pixel.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
      document.body.appendChild(pixel);
    }

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
      if (activityInterval) {
        clearInterval(activityInterval);
      }
      if (reloadCheckInterval) {
        clearInterval(reloadCheckInterval);
      }
      if (memoryCleanupInterval) {
        clearInterval(memoryCleanupInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      const pixel = document.getElementById('anti-standby-pixel');
      if (pixel) pixel.remove();
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
    console.log('Audio unlocked (Google Cloud TTS mode)');
  }, [audioUnlocked]);

  // Play audio with amplification using Web Audio API (2.5x volume = 150% increase)
  const playAmplifiedAudio = useCallback(
    (audioElement: HTMLAudioElement, gain: number = 2.5): Promise<void> => {
      return new Promise((resolve, reject) => {
        const playWithFallback = () => {
          // Fallback to normal playback without Web Audio API
          console.log('Using fallback audio playback (without amplification)');
          audioElement.volume = Math.min(1.0, gain / 2.5); // Scale gain to 0-1 range
          audioElement.onended = () => resolve();
          audioElement.onerror = (ev) => reject(ev);
          audioElement.play().catch(reject);
        };

        try {
          const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextCtor) {
            console.warn('Web Audio API not available, using fallback');
            playWithFallback();
            return;
          }

          // Create new AudioContext for each playback to avoid MediaElementSource issues
          const audioContext = new AudioContextCtor();

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
                try {
                  source.disconnect();
                  gainNode.disconnect();
                  audioContext.close();
                } catch (e) {
                  console.warn('Error cleaning up audio context:', e);
                }
                resolve();
              };
              audioElement.onerror = (e) => {
                try {
                  source.disconnect();
                  gainNode.disconnect();
                  audioContext.close();
                } catch (err) {
                  console.warn('Error cleaning up audio context on error:', err);
                }
                reject(e);
              };

              await audioElement.play();
            } catch (err) {
              console.error('Web Audio API playback error:', err);
              try {
                audioContext.close();
              } catch (e) {
                // ignore
              }
              // Try fallback
              playWithFallback();
            }
          };

          startPlayback();
        } catch (e) {
          console.warn('Web Audio API initialization failed, using fallback:', e);
          playWithFallback();
        }
      });
    },
    []
  );
  // Play notification sound effect - simple method (same as useHourAudio which works on TV)
  const playNotificationSound = useCallback(() => {
    console.log('playNotificationSound called');

    return new Promise<void>((resolve, reject) => {
      try {
        // Get volume from localStorage (safe)
        const notificationVolume = readVolume('volume-notification', 1);
        
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = Math.min(1.0, notificationVolume);
        
        audio.onended = () => {
          console.log('✅ Notification sound finished');
          resolve();
        };
        audio.onerror = (err) => {
          console.error('❌ Notification sound error:', err);
          reject(new Error('Notification sound failed'));
        };
        audio.play().catch((err) => {
          console.error('❌ Notification sound play() failed:', err);
          reject(err);
        });
      } catch (err) {
        console.error('❌ Failed to create notification sound:', err);
        reject(err);
      }
    });
  }, []);


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

  // Google Cloud TTS via backend function - plays MP3 audio (works on any device)
  // Calls API directly for reliability
  // Simple audio playback (same method as useHourAudio which works correctly)
  const playSimpleAudio = useCallback(
    (buffer: ArrayBuffer, volume: number): Promise<void> => {
      return new Promise((resolve, reject) => {
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = Math.min(1.0, volume);
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          console.log('✅ Simple audio playback finished');
          resolve();
        };
        audio.onerror = (err) => {
          URL.revokeObjectURL(url);
          console.error('❌ Simple audio playback error:', err);
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch((err) => {
          URL.revokeObjectURL(url);
          console.error('❌ Simple audio play() failed:', err);
          reject(err);
        });
      });
    },
    []
  );

  const speakWithConcatenatedTTS = useCallback(
    async (name: string, destinationPhrase: string): Promise<void> => {
      const cleanName = name.trim();
      const cleanDestination = destinationPhrase.trim();
      console.log('🔊 Speaking with Google Cloud TTS (concatenated):', { name: cleanName, destinationPhrase: cleanDestination });

      // Clear previous error
      setTtsError(null);

      // Get TTS volume from localStorage
      const ttsVolume = readVolume('volume-tts', 1);
      
      // Get configured voice from localStorage
      const configuredVoice = localStorage.getItem('googleVoiceFemale') || 'pt-BR-Neural2-A';

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`;
      const headers = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      } as const;

      console.log('🌐 Calling TTS API:', { url, name: cleanName, destination: cleanDestination, voice: configuredVoice });

      try {
        // Generate unified audio with name + destination in a single API call
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            concatenate: {
              name: cleanName,
              prefix: '',
              destination: cleanDestination,
            },
            voiceName: configuredVoice,
          }),
        });

        console.log('📡 TTS API response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Google Cloud TTS error:', errorData);
          const errorMessage = errorData.error || `Erro TTS: ${response.status}`;
          setTtsError({ message: errorMessage, timestamp: new Date() });
          throw new Error(errorMessage);
        }

        // Use arrayBuffer() like useHourAudio does (this method works on TV)
        const audioBuffer = await response.arrayBuffer();
        console.log('✅ Google Cloud TTS audio received:', { size: audioBuffer.byteLength });

        if (audioBuffer.byteLength === 0) {
          console.error('❌ Audio buffer is empty!');
          setTtsError({ message: 'Buffer de áudio vazio', timestamp: new Date() });
          throw new Error('Audio buffer is empty');
        }

        // Play using simple method (same as useHourAudio which works)
        console.log('▶️ Playing audio with simple method...');
        await playSimpleAudio(audioBuffer, ttsVolume);
        console.log('✅ Audio playback finished');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no TTS';
        console.error('❌ TTS error:', errorMessage);
        setTtsError({ message: errorMessage, timestamp: new Date() });
        throw error;
      }
    },
    [playSimpleAudio]
  );

  const speakWithGoogleTTS = useCallback(
    async (text: string): Promise<void> => {
      console.log('Speaking with Google Cloud TTS:', text);
      
      // Clear previous error
      setTtsError(null);
      
      // Get TTS volume from localStorage
      const ttsVolume = readVolume('volume-tts', 1);
      
      // Get configured voice from localStorage
      const configuredVoice = localStorage.getItem('googleVoiceFemale') || 'pt-BR-Neural2-A';
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text, voiceName: configuredVoice }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Google Cloud TTS error:', errorData);
          const errorMessage = errorData.error || `Erro TTS: ${response.status}`;
          setTtsError({ message: errorMessage, timestamp: new Date() });
          throw new Error(errorMessage);
        }

        // Use arrayBuffer() like useHourAudio does (works on TV)
        const audioBuffer = await response.arrayBuffer();
        
        if (audioBuffer.byteLength === 0) {
          setTtsError({ message: 'Buffer de áudio vazio', timestamp: new Date() });
          throw new Error('Audio buffer is empty');
        }
        
        await playSimpleAudio(audioBuffer, ttsVolume);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no TTS';
        console.error('❌ TTS error:', errorMessage);
        setTtsError({ message: errorMessage, timestamp: new Date() });
        throw error;
      }
    },
    [playSimpleAudio]
  );

  // Play cached audio from URL (for pre-generated announcement audio)
  const playCachedAudio = useCallback(
    (audioUrl: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const ttsVolume = readVolume('volume-tts', 1);
        const audio = new Audio(audioUrl);
        audio.volume = Math.min(1.0, ttsVolume);
        
        audio.onended = () => {
          console.log('✅ Cached audio playback finished');
          resolve();
        };
        audio.onerror = (err) => {
          console.error('❌ Cached audio playback error:', err);
          reject(new Error('Cached audio playback failed'));
        };
        audio.play().catch((err) => {
          console.error('❌ Cached audio play() failed:', err);
          reject(err);
        });
      });
    },
    []
  );

  const testAudio = useCallback(async () => {
    console.log('Testing audio...');
    try {
      // Play notification sound first
      await playNotificationSound();

      const testText = 'Teste de áudio. Som funcionando corretamente.';

      // Use Google Cloud TTS
      try {
        await speakWithGoogleTTS(testText);
        console.log('Audio test completed (Google Cloud TTS)');
      } catch (e) {
        console.error('Google Cloud TTS audio test failed:', e);
      }
    } catch (error) {
      console.error('Audio test failed:', error);
    }
  }, [playNotificationSound, speakWithGoogleTTS]);

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

  // Generate 3 random announcements per hour (spread across the hour)
  const generateRandomAnnouncements = useCallback((hour: number): number[] => {
    // Dividir a hora em 3 blocos de 20 minutos e escolher 1 minuto aleatório em cada bloco
    // Bloco 1: minutos 0-19, Bloco 2: minutos 20-39, Bloco 3: minutos 40-59
    const block1 = Math.floor(Math.random() * 20);        // 0-19
    const block2 = 20 + Math.floor(Math.random() * 20);   // 20-39
    const block3 = 40 + Math.floor(Math.random() * 20);   // 40-59
    
    const announcements = [block1, block2, block3].sort((a, b) => a - b);
    console.log(`Hora ${hour}: anúncios agendados nos minutos ${announcements.join(', ')}`);
    return announcements;
  }, []);

  // Expose test functions on window for manual testing
  useEffect(() => {
    // Test hour announcement
    const testTimeAnnouncement = () => {
      if (!currentTime) {
        console.log('currentTime not available');
        return;
      }
      const hour = currentTime.getHours();
      const minute = currentTime.getMinutes();
      console.log(`Manual test: announcing time ${hour}:${minute.toString().padStart(2, '0')}`);
      playHourAnnouncement(hour, minute);
    };
    
    // Test voice marketing announcement (plays first active scheduled announcement)
    const testVoiceAnnouncement = async () => {
      if (!audioUnlocked) {
        console.log('❌ Áudio não liberado! Clique na tela primeiro.');
        return;
      }
      
      if (scheduledAnnouncements.length === 0) {
        console.log('❌ Nenhum anúncio de voz programado encontrado.');
        return;
      }
      
      if (isSpeakingRef.current || announcingType) {
        console.log('⏸️ Já está falando, aguarde...');
        return;
      }
      
      const announcement = scheduledAnnouncements[0];
      console.log(`🔊 Testando anúncio de voz: "${announcement.title}"`);
      console.log(`📝 Texto: ${announcement.text_content}`);
      console.log(`🔗 Cache URL: ${announcement.audio_cache_url || 'Não cacheado'}`);
      
      isSpeakingRef.current = true;
      setAnnouncingType('triage');
      
      try {
        // Play notification sound first
        await playNotificationSound();
        
        // Use cached audio if available, otherwise generate via TTS
        if (announcement.audio_cache_url) {
          console.log(`📢 Reproduzindo áudio em cache...`);
          await playCachedAudio(announcement.audio_cache_url);
        } else {
          console.log(`📢 Gerando TTS ao vivo...`);
          await speakWithGoogleTTS(announcement.text_content);
        }
        
        console.log(`✅ Anúncio de voz concluído!`);
      } catch (error) {
        console.error('❌ Erro ao reproduzir anúncio:', error);
      } finally {
        isSpeakingRef.current = false;
        setAnnouncingType(null);
      }
    };
    
    (window as any).testarHora = testTimeAnnouncement;
    (window as any).testarAnuncioVoz = testVoiceAnnouncement;
    
    return () => {
      delete (window as any).testarHora;
      delete (window as any).testarAnuncioVoz;
    };
  }, [currentTime, playHourAnnouncement, audioUnlocked, scheduledAnnouncements, announcingType, playNotificationSound, playCachedAudio, speakWithGoogleTTS]);

  // Announce time once per hour at minute 0 (quiet hours: 22h-06h)
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
    const minGapMs = 5 * 60 * 1000; // 5 minutos em ms (permite 3 anúncios por hora)

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

  // Play scheduled voice announcements (from Marketing panel)
  useEffect(() => {
    // Debug: log every check
    console.log('🔍 Checking announcements:', {
      hasCurrentTime: !!currentTime,
      audioUnlocked,
      announcementsCount: scheduledAnnouncements.length,
      announcingType,
      isSpeaking: isSpeakingRef.current
    });

    if (!currentTime || !audioUnlocked || scheduledAnnouncements.length === 0) {
      console.log('⏸️ Skipping announcements check - conditions not met');
      return;
    }

    // Never overlap with patient calls
    if (announcingType || isSpeakingRef.current) {
      console.log('⏸️ Skipping - already speaking or announcing');
      return;
    }

    // Use Brazil-synced time from useBrazilTime
    const now = currentTime;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`;
    const dayOfWeek = now.getDay();
    const nowMs = now.getTime();

    console.log('🕐 Current check:', { currentTimeStr, dayOfWeek, nowMs });

    // Check each scheduled announcement
    for (const announcement of scheduledAnnouncements) {
      console.log('📋 Checking announcement:', announcement.title, {
        start: announcement.start_time,
        end: announcement.end_time,
        days: announcement.days_of_week,
        currentTimeStr,
        dayOfWeek,
        last_played_at: announcement.last_played_at,
        updated_at: announcement.updated_at
      });

      // Check if this is a forced immediate playback (last_played_at is null and updated recently)
      const isImmediatePlayback = !announcement.last_played_at && announcement.updated_at;
      const updatedRecently = isImmediatePlayback && 
        (nowMs - new Date(announcement.updated_at!).getTime()) < 60000; // Updated in last 60 seconds

      if (updatedRecently) {
        console.log('🚀 Immediate playback triggered for:', announcement.title);
      } else {
        // Normal schedule checks - only apply if not immediate playback
        // Check if within time window
        if (announcement.start_time > currentTimeStr || announcement.end_time < currentTimeStr) {
          console.log('⏭️ Outside time window');
          continue;
        }

        // Check if day of week is valid
        if (!announcement.days_of_week.includes(dayOfWeek)) {
          console.log('⏭️ Wrong day of week');
          continue;
        }

        // Check interval since last played
        const lastPlayed = lastAnnouncementPlayedRef.current[announcement.id] || 0;
        const intervalMs = announcement.interval_minutes * 60 * 1000;

        if (nowMs - lastPlayed < intervalMs) {
          console.log('⏭️ Too soon since last play');
          continue;
        }
      }

      // Time to play this announcement (either scheduled or immediate)
      lastAnnouncementPlayedRef.current[announcement.id] = nowMs;

      console.log(`📢 Playing scheduled voice announcement: ${announcement.title}`);

      // Update last_played_at in database
      supabase
        .from('scheduled_announcements')
        .update({ last_played_at: now.toISOString() })
        .eq('id', announcement.id)
        .then(({ error }) => {
          if (error) console.error('Error updating last_played_at:', error);
        });

      // Play the announcement (with delay to avoid conflicts)
      setTimeout(async () => {
        if (announcingType || isSpeakingRef.current) return;
        
        isSpeakingRef.current = true;
        setAnnouncingType('triage');

        try {
          // Repeat according to repeat_count
          for (let i = 0; i < announcement.repeat_count; i++) {
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 800));
            }
            
            // Play notification sound
            await playNotificationSound();
            
            // Use cached audio if available, otherwise generate via TTS
            if (announcement.audio_cache_url) {
              console.log(`📢 Playing cached audio for "${announcement.title}"`);
              await playCachedAudio(announcement.audio_cache_url);
            } else {
              console.log(`📢 Generating TTS for "${announcement.title}" (no cache)`);
              await speakWithGoogleTTS(announcement.text_content);
            }
            
            console.log(`📢 Announcement "${announcement.title}" iteration ${i + 1}/${announcement.repeat_count} completed`);
          }
        } catch (error) {
          console.error('Error playing scheduled announcement:', error);
        } finally {
          isSpeakingRef.current = false;
          setAnnouncingType(null);
        }
      }, 1500);

      // Only play one announcement at a time
      break;
    }
  }, [currentTime, audioUnlocked, scheduledAnnouncements, announcingType, playNotificationSound, speakWithGoogleTTS, playCachedAudio]);

  // Process immediate announcement triggered via realtime
  useEffect(() => {
    if (!pendingImmediateAnnouncement || !audioUnlocked) return;
    
    // Prevent overlap
    if (announcingType || isSpeakingRef.current) {
      console.log('⏸️ Cannot play immediate announcement - already speaking');
      return;
    }

    const announcement = pendingImmediateAnnouncement;
    console.log(`🚀 Processing immediate announcement: "${announcement.title}"`);
    
    // Clear the pending announcement immediately to prevent re-triggering
    setPendingImmediateAnnouncement(null);
    
    // Update last_played_at in database
    const now = new Date();
    supabase
      .from('scheduled_announcements')
      .update({ last_played_at: now.toISOString() })
      .eq('id', announcement.id)
      .then(({ error }) => {
        if (error) console.error('Error updating last_played_at:', error);
      });

    // Play immediately
    const playImmediateAnnouncement = async () => {
      isSpeakingRef.current = true;
      setAnnouncingType('triage');

      try {
        for (let i = 0; i < announcement.repeat_count; i++) {
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
          
          await playNotificationSound();
          
          if (announcement.audio_cache_url) {
            console.log(`📢 Playing cached audio for "${announcement.title}"`);
            await playCachedAudio(announcement.audio_cache_url);
          } else {
            console.log(`📢 Generating TTS for "${announcement.title}" (no cache)`);
            await speakWithGoogleTTS(announcement.text_content);
          }
          
          console.log(`📢 Immediate announcement "${announcement.title}" iteration ${i + 1}/${announcement.repeat_count} completed`);
        }
      } catch (error) {
        console.error('Error playing immediate announcement:', error);
      } finally {
        isSpeakingRef.current = false;
        setAnnouncingType(null);
      }
    };

    playImmediateAnnouncement();
  }, [pendingImmediateAnnouncement, audioUnlocked, announcingType, playNotificationSound, playCachedAudio, speakWithGoogleTTS]);

  const playCommercialPhraseNow = useCallback(async () => {
    try {
      if (!audioUnlocked) {
        console.log('Audio not unlocked, cannot play commercial phrase');
        setTtsError({
          message: 'Clique na tela para ativar o áudio antes de testar a frase comercial.',
          timestamp: new Date(),
        });
        return;
      }

      if (!currentTime) return;

      // Never overlap with patient calls or other announcements
      if (announcingType || isSpeakingRef.current) return;

      const now = currentTime;
      const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
      const dayOfWeek = now.getDay();

      const eligible = commercialPhrases
        .filter(p => p.is_active)
        .filter(p => p.start_time <= currentTimeStr && p.end_time >= currentTimeStr)
        .filter(p => p.days_of_week.includes(dayOfWeek))
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      const phrase = eligible[0];

      isSpeakingRef.current = true;
      setAnnouncingType('triage');

      await playNotificationSound();
      await speakWithGoogleTTS(
        phrase?.phrase_content || 'Nenhuma frase comercial ativa no momento.'
      );
    } catch (e) {
      console.error('Error playing commercial phrase now:', e);
      setTtsError({
        message: e instanceof Error ? e.message : 'Erro desconhecido ao tocar frase comercial.',
        timestamp: new Date(),
      });
    } finally {
      isSpeakingRef.current = false;
      setAnnouncingType(null);
    }
  }, [audioUnlocked, currentTime, commercialPhrases, announcingType, playNotificationSound, speakWithGoogleTTS]);

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

  // Gerar TTS para frase de destino via Google Cloud TTS
  const speakDestinationPhrase = useCallback(
    async (phrase: string): Promise<void> => {
      console.log('Speaking destination phrase:', phrase);
      
      const ttsVolume = readVolume('volume-tts', 1);
      const configuredVoice = localStorage.getItem('googleVoiceFemale') || 'pt-BR-Neural2-A';
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: phrase, voiceName: configuredVoice }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Google Cloud TTS error: ${response.status}`);
      }

      // Use arrayBuffer() like useHourAudio does (works on TV)
      const audioBuffer = await response.arrayBuffer();
      await playSimpleAudio(audioBuffer, ttsVolume);
    },
    [playSimpleAudio]
  );

  // Speak custom text (no destination, just the raw text)
  const speakCustomText = useCallback(
    async (text: string) => {
      const now = Date.now();
      console.log('speakCustomText called with:', { text, timestamp: now });

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

      // Start visual alert (use triage color for custom announcements)
      setAnnouncingType('triage');

      try {
        // Repeat the announcement 2 times (to ensure it's heard)
        for (let i = 0; i < 2; i++) {
          console.log(`Custom announcement iteration ${i + 1}/2`);
          
          // Play notification sound first (mandatory)
          await playNotificationSound();

          // Use Google Cloud TTS to speak just the custom text
          await speakWithGoogleTTS(text);
          console.log(`Custom TTS iteration ${i + 1} completed`);
          
          // Small pause between repetitions (only if not the last iteration)
          if (i < 1) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
        console.log('Custom TTS completed (2x repetition)');
      } catch (e) {
        console.error('Custom TTS failed:', e);
      } finally {
        isSpeakingRef.current = false;
      }
    },
    [playNotificationSound, speakWithGoogleTTS]
  );

  const speakName = useCallback(
    async (
      name: string,
      caller: 'triage' | 'doctor' | 'ecg' | 'curativos' | 'raiox' | 'enfermaria',
      destination?: string
    ) => {
      const now = Date.now();
      console.log('📢 speakName called with:', { name, caller, destination, timestamp: now, isSpeaking: isSpeakingRef.current, audioUnlocked });

      // Check if audio is unlocked first
      if (!audioUnlocked) {
        console.warn('⚠️ Audio not unlocked, cannot speak. User needs to click the screen first.');
        return;
      }

      // Debounce: ignore calls within 2 seconds of each other FOR THE SAME NAME
      const lastCallKey = `${name}-${caller}`;
      const lastCallTime = (window as any).__lastSpeakCall || 0;
      const lastCallName = (window as any).__lastSpeakName || '';
      
      if (lastCallName === lastCallKey && now - lastCallTime < 2000) {
        console.log('⏸️ Debounce: ignoring duplicate call for same name within 2s window');
        return;
      }
      
      // Check if isSpeakingRef is stuck (more than 45 seconds since last call)
      const lastSpeakTime = lastSpeakCallRef.current;
      if (isSpeakingRef.current && lastSpeakTime > 0 && now - lastSpeakTime > 45000) {
        console.warn('⚠️ isSpeakingRef was stuck for over 45s, forcing reset');
        isSpeakingRef.current = false;
      }
      
      // Prevent duplicate TTS calls - but add a timeout safety
      if (isSpeakingRef.current) {
        console.log('⏸️ Already speaking, skipping duplicate call. Time since last speak:', now - lastSpeakTime, 'ms');
        return;
      }
      
      (window as any).__lastSpeakCall = now;
      (window as any).__lastSpeakName = lastCallKey;
      lastSpeakCallRef.current = now;
      isSpeakingRef.current = true;
      console.log('🎤 isSpeakingRef set to TRUE');

      // Safety timeout: reset isSpeakingRef after 30 seconds max (in case of errors)
      const safetyTimeout = setTimeout(() => {
        if (isSpeakingRef.current) {
          console.warn('⚠️ Safety timeout: resetting isSpeakingRef after 30s');
          isSpeakingRef.current = false;
        }
      }, 30000);

      // Start visual alert; it will auto-stop after 10s in the effect below
      // (We keep the UI as triage vs non-triage for now)
      setAnnouncingType(caller === 'triage' ? 'triage' : 'doctor');

      const defaultLocationByCaller: Record<typeof caller, string> = {
        triage: 'Triagem',
        doctor: 'Consultório Médico',
        ecg: 'Sala de Eletrocardiograma',
        curativos: 'Sala de Curativos',
        raiox: 'Sala do Raio X',
        enfermaria: 'Enfermaria',
      };

      const location = destination || defaultLocationByCaller[caller];
      const destinationPhrase = getDestinationPhrase(location);
      console.log('🎯 TTS - Name:', name, 'Destination phrase:', destinationPhrase);

      try {
        // Repeat the announcement 2 times (to ensure patient hears it)
        for (let i = 0; i < 2; i++) {
          console.log(`🔄 Patient announcement iteration ${i + 1}/2`);
          
          // Play notification sound first (mandatory)
          console.log('🔔 Playing notification sound...');
          await playNotificationSound();
          console.log('✅ Notification sound done');

          // Use Google Cloud TTS with concatenated mode (Brazilian Portuguese)
          console.log('🎙️ Calling TTS for name:', name);
          await speakWithConcatenatedTTS(name, destinationPhrase);
          console.log(`✅ TTS iteration ${i + 1} completed`);
          
          // Small pause between repetitions (only if not the last iteration)
          if (i < 1) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
        console.log('✅ TTS completed (2x repetition - Google Cloud TTS Brazilian Portuguese)');
      } catch (e) {
        console.error('❌ Google Cloud TTS failed:', e);
        // Show error to user
        setTtsError({ 
          message: e instanceof Error ? e.message : 'Erro desconhecido no TTS', 
          timestamp: new Date() 
        });
      } finally {
        clearTimeout(safetyTimeout);
        isSpeakingRef.current = false;
        console.log('🎤 isSpeakingRef set to FALSE');
      }
    },
    [playNotificationSound, speakWithConcatenatedTTS, getDestinationPhrase, audioUnlocked]
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

  // Store callbacks in refs to avoid recreating the subscription
  const speakNameRef = useRef(speakName);
  const speakCustomTextRef = useRef(speakCustomText);
  
  useEffect(() => {
    speakNameRef.current = speakName;
    speakCustomTextRef.current = speakCustomText;
  }, [speakName, speakCustomText]);

  // Subscribe to realtime updates - stable subscription without callback dependencies
  useEffect(() => {
    if (!unitName) {
      console.log('No unit name, skipping realtime subscription');
      return;
    }

    console.log('Setting up realtime subscription for unit:', unitName);
    
    // Clear processed calls on new subscription
    processedCallsRef.current.clear();
    
    // Use unique channel name per unit to avoid conflicts
    const channelName = `public-display-${unitName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patient_calls',
        },
        (payload) => {
          const call = payload.new as any;
          
          // Filter by unit name in handler (to handle spaces/special chars)
          const normalizedUnit = (unitName || '').trim().toLowerCase();
          const callUnit = (call.unit_name || '').trim().toLowerCase();
          if (!normalizedUnit || callUnit !== normalizedUnit) {
            return;
          }
          
          console.log('🔔 Received INSERT event:', payload);
          
          if (processedCallsRef.current.has(call.id)) {
            console.log('Skipping already processed call:', call.id);
            return;
          }
          processedCallsRef.current.add(call.id);

          console.log('📢 Processing call:', call.patient_name, call.call_type, call.status);
          
          if (call.status === 'active') {
            // Dispatch activity event to reset idle timer (anti-standby)
            window.dispatchEvent(new CustomEvent('patientCallActivity'));
            
            // Valid call types for announcements
            const validCallTypes = ['triage', 'doctor', 'ecg', 'curativos', 'raiox', 'enfermaria', 'custom'] as const;
            type ValidCallType = typeof validCallTypes[number];
            
            // Handle custom announcements (just speak the text, no destination display)
            if (call.call_type === 'custom') {
              console.log('Custom announcement:', call.patient_name);
              speakCustomTextRef.current(call.patient_name);
            } else if (validCallTypes.includes(call.call_type as ValidCallType)) {
              // Update display state based on call type
              if (call.call_type === 'triage') {
                setCurrentTriageCall({ name: call.patient_name, destination: call.destination || undefined });
              } else {
                // For doctor and all services (ecg, curativos, raiox, enfermaria)
                setCurrentDoctorCall({ name: call.patient_name, destination: call.destination || undefined });
              }
              
              // Play audio announcement with correct service type
              const callType = call.call_type as 'triage' | 'doctor' | 'ecg' | 'curativos' | 'raiox' | 'enfermaria';
              console.log('🔊 About to call speakName with type:', callType);
              speakNameRef.current(call.patient_name, callType, call.destination || undefined);
            } else {
              console.log('⚠️ Unknown call type:', call.call_type);
            }
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
          
          // Filter by unit name in handler
          const normalizedUnit = (unitName || '').trim().toLowerCase();
          const callUnit = (call.unit_name || '').trim().toLowerCase();
          if (!normalizedUnit || callUnit !== normalizedUnit) {
            return;
          }

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
          
          // Filter by unit name in handler
          const normalizedUnit = (unitName || '').trim().toLowerCase();
          const itemUnit = (historyItem.unit_name || '').trim().toLowerCase();
          if (!normalizedUnit || itemUnit !== normalizedUnit) {
            return;
          }

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
          
          // Filter by unit name in handler
          const normalizedUnit = (unitName || '').trim().toLowerCase();
          const itemUnit = (deletedItem?.unit_name || '').trim().toLowerCase();
          if (!normalizedUnit || itemUnit !== normalizedUnit) {
            return;
          }
          
          if (deletedItem?.id) {
            setHistoryItems(prev => prev.filter(item => item.id !== deletedItem.id));
          } else {
            // Se não tiver ID específico, limpar tudo (delete em massa)
            setHistoryItems([]);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime updates for unit:', unitName);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error - will retry...');
        }
      });

    return () => {
      console.log('🔌 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [unitName]);

  // Fallback polling: algumas TVs não mantêm realtime/websocket ativo; então buscamos chamadas ativas periodicamente
  useEffect(() => {
    if (!unitName || !audioUnlocked) return;

    // reset init marker on unit change
    pollInitializedRef.current = false;

    let disposed = false;

    const poll = async () => {
      try {
        console.log('🛰️ Polling patient_calls...', { unitName, pollInitialized: pollInitializedRef.current, processedCount: processedCallsRef.current.size });
        
        const { data, error } = await supabase
          .from('patient_calls')
          .select('id, unit_name, call_type, patient_name, destination, status, created_at')
          .eq('unit_name', unitName)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5);

        if (disposed) return;

        if (error) {
          console.error('❌ Poll patient_calls error:', error);
          return;
        }

        console.log('🛰️ Poll result:', { count: data?.length || 0, calls: data?.map(c => ({ id: c.id.substring(0,8), name: c.patient_name, type: c.call_type })) });

        if (!data) return;

        // First run: track current actives without speaking (avoid replay after reload)
        if (!pollInitializedRef.current) {
          data.forEach((c) => processedCallsRef.current.add(c.id));
          pollInitializedRef.current = true;
          console.log('🛰️ Poll initialized. Active calls tracked:', data.length, 'IDs:', data.map(c => c.id.substring(0,8)));
          return;
        }

        for (const call of data) {
          const isProcessed = processedCallsRef.current.has(call.id);
          if (isProcessed) continue;
          processedCallsRef.current.add(call.id);

          console.log('🛰️ Poll detected NEW active call - WILL SPEAK:', call.patient_name, call.call_type);

          // Reset idle timer (anti-standby)
          window.dispatchEvent(new CustomEvent('patientCallActivity'));

          if (call.call_type === 'custom') {
            speakCustomTextRef.current(call.patient_name);
            continue;
          }

          const valid = ['triage', 'doctor', 'ecg', 'curativos', 'raiox', 'enfermaria'] as const;
          if (!valid.includes(call.call_type as any)) continue;

          const callType = call.call_type as typeof valid[number];

          if (callType === 'triage') {
            setCurrentTriageCall({ name: call.patient_name, destination: call.destination || undefined });
          } else {
            setCurrentDoctorCall({ name: call.patient_name, destination: call.destination || undefined });
          }

          console.log('🔊 About to call speakNameRef.current for:', call.patient_name, callType);
          speakNameRef.current(call.patient_name, callType, call.destination || undefined);
        }
      } catch (e) {
        console.error('❌ Poll patient_calls failed:', e);
      }
    };

    // kick once
    void poll();

    // Poll every 5 seconds (increased from 2s to reduce load on TV browsers)
    const interval = window.setInterval(() => {
      if (isSpeakingRef.current) return;
      void poll();
    }, 5000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [unitName, audioUnlocked]);

  // Clock is managed by useBrazilTime hook

  // Show unlock overlay if audio not yet unlocked
  if (!audioUnlocked) {
    return (
      <div 
        onClick={unlockAudio}
        className={`h-dvh w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center cursor-pointer p-4 ${!cursorVisible ? 'cursor-none' : ''}`}
        style={{ cursor: cursorVisible ? 'pointer' : 'none' }}
      >
        <div className="text-center space-y-4 sm:space-y-6 animate-pulse max-w-lg mx-auto px-4">
          <HealthCrossIcon size={96} className="mx-auto w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Clique para Ativar Áudio</h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-400">Toque na tela para habilitar as chamadas de pacientes</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`h-dvh w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 tv-safe-area relative overflow-hidden flex flex-col ${!cursorVisible ? 'cursor-none' : ''}`}
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

      {/* Voice Announcement Indicator */}
      {announcingType && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[55] pointer-events-none">
          <div className={`flex flex-col items-center gap-4 p-6 sm:p-8 rounded-2xl backdrop-blur-lg shadow-2xl ${
            announcingType === 'triage'
              ? 'bg-blue-900/90 border-2 border-blue-400 shadow-blue-500/50'
              : 'bg-emerald-900/90 border-2 border-emerald-400 shadow-emerald-500/50'
          }`}>
            {/* Animated Sound Wave Icon */}
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 sm:w-3 rounded-full ${
                    announcingType === 'triage' ? 'bg-blue-400' : 'bg-emerald-400'
                  }`}
                  style={{
                    height: `${20 + Math.random() * 30}px`,
                    animation: `soundWave 0.5s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            
            <div className="text-center">
              <p className={`text-lg sm:text-2xl font-bold ${
                announcingType === 'triage' ? 'text-blue-100' : 'text-emerald-100'
              }`}>
                🔊 Reproduzindo Anúncio
              </p>
              <p className={`text-sm sm:text-base mt-1 ${
                announcingType === 'triage' ? 'text-blue-300' : 'text-emerald-300'
              }`}>
                Por favor, aguarde...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TTS Error Indicator */}
      {ttsError && (
        <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-[60] max-w-[90vw] sm:max-w-md animate-scale-in">
          <div className="bg-red-900/95 border-2 border-red-500 rounded-lg sm:rounded-xl p-2 sm:p-4 shadow-2xl shadow-red-500/30 backdrop-blur-sm">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-red-300 font-bold text-xs sm:text-sm mb-1">Erro no TTS</h3>
                <p className="text-red-200 text-[10px] sm:text-xs break-words line-clamp-2">{ttsError.message}</p>
                <p className="text-red-400/70 text-[8px] sm:text-[10px] mt-1">
                  {formatBrazilTime(ttsError.timestamp, 'HH:mm:ss')}
                </p>
              </div>
              <button
                onClick={() => setTtsError(null)}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="w-3 h-3 text-red-300" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TV Quick Test Button (shows when cursor is visible) */}
      {cursorVisible && (
        <button
          type="button"
          onClick={playCommercialPhraseNow}
          className="fixed top-2 left-2 sm:top-3 sm:left-3 z-[60] p-1.5 sm:p-2 rounded-full bg-white/5 hover:bg-white/20 text-white/60 hover:text-white/90 transition-all opacity-40 hover:opacity-100"
          title="Tocar frase comercial agora"
        >
          <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* Animated background elements - Responsive */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[2%] left-[2%] w-[20vw] h-[20vw] max-w-[200px] max-h-[200px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[2%] right-[2%] w-[15vw] h-[15vw] max-w-[150px] max-h-[150px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Header - Responsive gradient bar for all TV resolutions */}
      <div className="relative z-10 mb-1 sm:mb-2 3xl:mb-4 4k:mb-6 shrink-0">
        <div className="bg-gradient-to-r from-indigo-900/95 via-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-lg sm:rounded-xl lg:rounded-2xl 3xl:rounded-3xl px-2 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 3xl:px-8 3xl:py-4 4k:px-12 4k:py-6 shadow-2xl border border-white/20 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/20 to-blue-500/10 rounded-lg sm:rounded-xl lg:rounded-2xl 3xl:rounded-3xl" />
          <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          
          <div className="flex items-center relative z-10 w-full gap-2 sm:gap-3 lg:gap-4 3xl:gap-6 4k:gap-8">
            {/* Left: Logo + Title - Fixed width to prevent overlap */}
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 xl:gap-4 3xl:gap-5 shrink-0">
              <div className="w-7 h-7 sm:w-9 sm:h-9 lg:w-11 lg:h-11 xl:w-14 xl:h-14 3xl:w-20 3xl:h-20 4k:w-28 4k:h-28 rounded-md sm:rounded-lg lg:rounded-xl 3xl:rounded-2xl bg-white/90 flex items-center justify-center shadow-lg shrink-0">
                <HealthCrossIcon size={32} className="w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7 xl:w-9 xl:h-9 3xl:w-14 3xl:h-14 4k:w-20 4k:h-20" />
              </div>
              <div className="hidden sm:block shrink-0">
                <h1 className="font-bold text-white leading-tight whitespace-nowrap text-xs sm:text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl 4k:text-4xl">
                  Painel de Chamadas
                </h1>
                <p className="text-amber-300 leading-tight font-medium text-[9px] sm:text-[10px] lg:text-xs xl:text-sm 3xl:text-base 4k:text-xl whitespace-nowrap">
                  {unitName || 'Unidade de Saúde'}
                </p>
              </div>
            </div>
            
            {/* Separator */}
            <div className="hidden sm:block w-px h-6 lg:h-8 3xl:h-12 4k:h-16 bg-gradient-to-b from-transparent via-white/30 to-transparent shrink-0" />
            
            {/* Right: Weather + Clock */}
            <div className="flex-1 min-w-0 flex items-center justify-end overflow-visible">
              <WeatherWidget currentTime={currentTime} formatTime={formatBrazilTime} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive grid layout for all TV sizes */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-2 sm:gap-3 lg:gap-4 3xl:gap-6 4k:gap-8 min-h-0 pb-12 sm:pb-14 lg:pb-16 3xl:pb-20 4k:pb-24">
        {/* Current Calls - Stacked on mobile, side by side on larger screens */}
        <div className="col-span-9 grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4 3xl:gap-6 4k:gap-8">
          {/* Triage Call */}
          <div className={`tv-glass tv-card flex flex-col transition-all duration-300 ${
            announcingType === 'triage' 
              ? 'border-4 border-red-500 animate-border-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
              : 'border border-slate-700/50'
          } ${currentTriageCall ? 'animate-card-pop' : ''}`}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-3 3xl:px-6 3xl:py-4 4k:px-8 4k:py-5 shrink-0">
              <p className="text-white font-bold flex items-center gap-1.5 sm:gap-2 3xl:gap-3 text-sm sm:text-base lg:text-lg xl:text-xl 3xl:text-2xl 4k:text-3xl">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 3xl:w-8 3xl:h-8 4k:w-10 4k:h-10 shrink-0" />
                <span>TRIAGEM</span>
                {announcingType === 'triage' && (
                  <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 3xl:w-8 3xl:h-8 4k:w-10 4k:h-10 text-red-400 animate-bounce ml-auto shrink-0" />
                )}
              </p>
            </div>
            <div className="p-2 sm:p-3 lg:p-4 xl:p-6 3xl:p-8 4k:p-12 flex items-center justify-center flex-1 min-h-[100px] sm:min-h-[120px] lg:min-h-[150px] 3xl:min-h-[200px] 4k:min-h-[280px]">
              {currentTriageCall ? (
                <div className={`text-center w-full transition-all duration-300 ${announcingType === 'triage' ? 'scale-105' : ''}`}>
                  <h2 className={`font-black tracking-wide leading-tight break-words transition-all duration-300 animate-text-reveal text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl 3xl:text-7xl 4k:text-8xl ${
                    announcingType === 'triage' 
                      ? 'text-red-400 animate-pulse drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]' 
                      : 'text-white'
                  }`} style={{ wordBreak: 'break-word' }} key={currentTriageCall.name}>
                    {currentTriageCall.name}
                  </h2>
                  <p className="text-blue-400 mt-1 sm:mt-2 3xl:mt-4 font-semibold text-xs sm:text-sm lg:text-base xl:text-lg 3xl:text-xl 4k:text-2xl">
                    {currentTriageCall.destination || 'Triagem'}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-center text-xs sm:text-sm lg:text-base 3xl:text-lg 4k:text-xl">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>

          {/* Doctor Call */}
          <div className={`tv-glass tv-card flex flex-col transition-all duration-300 ${
            announcingType === 'doctor' 
              ? 'border-4 border-red-500 animate-border-pulse shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
              : 'border border-slate-700/50'
          } ${currentDoctorCall ? 'animate-card-pop' : ''}`}>
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-3 3xl:px-6 3xl:py-4 4k:px-8 4k:py-5 shrink-0">
              <p className="text-white font-bold flex items-center gap-1.5 sm:gap-2 3xl:gap-3 text-sm sm:text-base lg:text-lg xl:text-xl 3xl:text-2xl 4k:text-3xl">
                <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 3xl:w-8 3xl:h-8 4k:w-10 4k:h-10 shrink-0" />
                <span>CONSULTÓRIO</span>
                {announcingType === 'doctor' && (
                  <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 3xl:w-8 3xl:h-8 4k:w-10 4k:h-10 text-red-400 animate-bounce ml-auto shrink-0" />
                )}
              </p>
            </div>
            <div className="p-2 sm:p-3 lg:p-4 xl:p-6 3xl:p-8 4k:p-12 flex items-center justify-center flex-1 min-h-[100px] sm:min-h-[120px] lg:min-h-[150px] 3xl:min-h-[200px] 4k:min-h-[280px]">
              {currentDoctorCall ? (
                <div className={`text-center w-full transition-all duration-300 ${announcingType === 'doctor' ? 'scale-105' : ''}`}>
                  <h2 className={`font-black tracking-wide leading-tight break-words transition-all duration-300 animate-text-reveal text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl 3xl:text-7xl 4k:text-8xl ${
                    announcingType === 'doctor' 
                      ? 'text-red-400 animate-pulse drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]' 
                      : 'text-white'
                  }`} style={{ wordBreak: 'break-word' }} key={currentDoctorCall.name}>
                    {currentDoctorCall.name}
                  </h2>
                  <p className="text-emerald-400 mt-1 sm:mt-2 3xl:mt-4 font-semibold text-xs sm:text-sm lg:text-base xl:text-lg 3xl:text-xl 4k:text-2xl">
                    {currentDoctorCall.destination || 'Consultório'}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-center text-xs sm:text-sm lg:text-base 3xl:text-lg 4k:text-xl">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: History Panel - Hidden on very small screens, shown on sm+ */}
        <div className="col-span-3 flex tv-glass tv-card border border-slate-700/50 p-2 sm:p-3 lg:p-4 flex-col min-h-0">
          <h3 className="font-bold text-white mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2 shrink-0 text-xs sm:text-sm lg:text-base">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-primary shrink-0" />
            <span>Últimas Chamadas</span>
          </h3>
          <div className="space-y-1 sm:space-y-1.5 lg:space-y-2 flex-1 overflow-y-auto scrollbar-thin">
            {historyItems.length === 0 ? (
              <p className="text-slate-500 text-center py-2 sm:py-4 text-[10px] sm:text-xs lg:text-sm">
                Nenhuma chamada ainda
              </p>
            ) : (
              historyItems.slice(0, 8).map((item, index) => (
                <div
                  key={item.id}
                  className={`p-1.5 sm:p-2 lg:p-2.5 rounded-md sm:rounded-lg ${
                    index === 0 
                      ? 'bg-primary/20 border border-primary/40 ring-1 ring-primary/20 animate-call-entrance' 
                      : 'bg-slate-700/50'
                  } transition-all`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center shrink-0 ${
                      item.type === 'triage' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}>
                      {item.type === 'triage' ? (
                        <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                      ) : (
                        <Stethoscope className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate text-[10px] sm:text-xs lg:text-sm">
                        {item.name}
                      </p>
                      <p className="text-slate-400 text-[8px] sm:text-[10px] lg:text-xs">
                        {item.type === 'triage' ? 'Triagem' : 'Médico'}
                      </p>
                    </div>
                    <span className="text-slate-400 font-mono shrink-0 text-[9px] sm:text-[10px] lg:text-xs">
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
          <div className="flex items-stretch h-10 sm:h-12 lg:h-14">
            {/* Scrolling News Section - Dark background full width */}
            <div className="flex-1 bg-slate-900 overflow-hidden flex items-center relative">
              <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-8 bg-gradient-to-r from-slate-900 to-transparent z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-4 sm:w-8 bg-gradient-to-l from-slate-900 to-transparent z-10" />
              <div className="animate-marquee whitespace-nowrap inline-flex py-1">
                {(() => {
                  const creditItem = { title: 'Solução criada e cedida gratuitamente por Kalebe Gomes', source: 'Créditos', link: '' };
                  // Convert commercial phrases to news format
                  const commercialItems = commercialPhrases.map(phrase => ({
                    title: phrase.phrase_content,
                    source: '📢 Informativo',
                    link: '',
                    isCommercial: true,
                  }));
                  
                  const itemsWithExtras: Array<typeof newsItems[0] & { isCommercial?: boolean }> = [];
                  let commercialIndex = 0;
                  
                  newsItems.forEach((item, index) => {
                    itemsWithExtras.push(item);
                    
                    // Insert commercial phrase every 5 news items (if available)
                    if ((index + 1) % 5 === 0 && commercialIndex < commercialItems.length) {
                      itemsWithExtras.push(commercialItems[commercialIndex]);
                      commercialIndex++;
                    }
                    
                    // Insert credits every 5 items
                    if ((index + 1) % 5 === 0) {
                      itemsWithExtras.push(creditItem);
                    }
                  });
                  
                  // Add remaining commercial items at the end
                  while (commercialIndex < commercialItems.length) {
                    itemsWithExtras.push(commercialItems[commercialIndex]);
                    commercialIndex++;
                  }
                  
                  return itemsWithExtras.map((item, index) => (
                    <span key={index} className="mx-2 sm:mx-4 inline-flex items-center gap-1 sm:gap-2 text-white font-medium tracking-wide text-xs sm:text-sm lg:text-base xl:text-lg" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] lg:text-xs font-bold inline-block ${
                        item.source === '📢 Informativo' ? 'bg-gradient-to-r from-red-900 to-red-700 text-white animate-pulse shadow-lg shadow-red-900/50 ring-2 ring-red-500 ring-offset-1 ring-offset-transparent' :
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
                      } ${item.source !== 'Créditos' && item.source !== 'Itatiaia' ? 'text-white' : ''}`}>
                        {item.source === 'Créditos' ? '⭐' : item.source === '📢 Informativo' ? <><Megaphone className="w-3 h-3 sm:w-4 sm:h-4 inline animate-bounce" /> Informativo</> : item.source}
                      </span>
                      <span className={`${item.source === '📢 Informativo' ? 'text-red-500 font-bold' : 'text-white'}`}>
                        {item.title}
                      </span>
                      <span className="text-slate-500 mx-1 sm:mx-2">•</span>
                    </span>
                  ));
                })()}
                {(() => {
                  const creditItem = { title: 'Solução criada e cedida gratuitamente por Kalebe Gomes', source: 'Créditos', link: '' };
                  // Convert commercial phrases to news format
                  const commercialItems = commercialPhrases.map(phrase => ({
                    title: phrase.phrase_content,
                    source: '📢 Informativo',
                    link: '',
                    isCommercial: true,
                  }));
                  
                  const itemsWithExtras: Array<typeof newsItems[0] & { isCommercial?: boolean }> = [];
                  let commercialIndex = 0;
                  
                  newsItems.forEach((item, index) => {
                    itemsWithExtras.push(item);
                    
                    // Insert commercial phrase every 5 news items (if available)
                    if ((index + 1) % 5 === 0 && commercialIndex < commercialItems.length) {
                      itemsWithExtras.push(commercialItems[commercialIndex]);
                      commercialIndex++;
                    }
                    
                    // Insert credits every 5 items
                    if ((index + 1) % 5 === 0) {
                      itemsWithExtras.push(creditItem);
                    }
                  });
                  
                  // Add remaining commercial items at the end
                  while (commercialIndex < commercialItems.length) {
                    itemsWithExtras.push(commercialItems[commercialIndex]);
                    commercialIndex++;
                  }
                  
                  return itemsWithExtras.map((item, index) => (
                    <span key={`dup-${index}`} className="mx-2 sm:mx-4 inline-flex items-center gap-1 sm:gap-2 text-white font-medium tracking-wide text-xs sm:text-sm lg:text-base xl:text-lg" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] lg:text-xs font-bold inline-block ${
                        item.source === '📢 Informativo' ? 'bg-gradient-to-r from-red-900 to-red-700 text-white animate-pulse shadow-lg shadow-red-900/50 ring-2 ring-red-500 ring-offset-1 ring-offset-transparent' :
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
                      } ${item.source !== 'Créditos' && item.source !== 'Itatiaia' ? 'text-white' : ''}`}>
                        {item.source === 'Créditos' ? '⭐' : item.source === '📢 Informativo' ? <><Megaphone className="w-3 h-3 sm:w-4 sm:h-4 inline animate-bounce" /> Informativo</> : item.source}
                      </span>
                      <span className={`${item.source === '📢 Informativo' ? 'text-red-500 font-bold' : 'text-white'}`}>
                        {item.title}
                      </span>
                      <span className="text-slate-500 mx-1 sm:mx-2">•</span>
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
          <div className="bg-slate-800 border-2 sm:border-4 border-red-500 rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-8 lg:p-12 max-w-lg w-full shadow-2xl shadow-red-500/20 animate-scale-in">
            <div className="text-center space-y-4 sm:space-y-6">
              {/* Warning Icon */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto rounded-full bg-red-500/20 border-2 sm:border-4 border-red-500 flex items-center justify-center">
                <LogOut className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-red-500" />
              </div>
              
              {/* Title */}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">
                SAIR DO MODO TV?
              </h2>
              
              {/* Description */}
              <p className="text-sm sm:text-base lg:text-lg text-slate-300">
                Você será redirecionado para a tela de login.
              </p>
              
              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-2 sm:pt-4">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 sm:py-3 lg:py-4 px-4 sm:px-6 text-sm sm:text-base lg:text-lg font-bold text-white bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg sm:rounded-xl transition-all duration-200 hover:scale-105"
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
                  className="flex-1 py-2.5 sm:py-3 lg:py-4 px-4 sm:px-6 text-sm sm:text-base lg:text-lg font-bold text-white bg-red-600 hover:bg-red-500 border border-red-400 rounded-lg sm:rounded-xl transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                  SAIR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Exit Button - Only visible on hover */}
      <div className="fixed bottom-12 sm:bottom-14 lg:bottom-16 right-2 sm:right-4 z-50 group">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-slate-800/0 group-hover:bg-slate-800/90 border-2 border-transparent group-hover:border-red-500/50 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
          title="Sair do modo TV"
        >
          <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-400" />
            <span className="text-[7px] sm:text-[8px] lg:text-[9px] text-red-400 font-medium">SAIR</span>
          </div>
        </button>
      </div>

      {/* Audio Test Button - Discrete */}
    </div>
  );
}
