import { Clock, Stethoscope, Activity, Megaphone, VolumeX, LogOut, Minimize2, AlertTriangle, X } from 'lucide-react';
import { CNNStyleNewsTicker } from './CNNStyleNewsTicker';
import { HealthCrossIcon } from './HealthCrossIcon';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeatherWidget } from './WeatherWidget';
import { useBrazilTime, formatBrazilTime } from '@/hooks/useBrazilTime';
import { useHourAudio } from '@/hooks/useHourAudio';
import { usePreventSleep } from '@/hooks/usePreventSleep';
import { useInactivePatientCleanup } from '@/hooks/useInactivePatientCleanup';
import { AnalogClock } from './AnalogClock';
import { SpotlightOverlay } from './SpotlightOverlay';
import { ParticleBackground } from './ParticleBackground';
import { RecentCallsCarousel } from './RecentCallsCarousel';
import { useTVResolution, type TVResolutionTier } from '@/hooks/useTVResolution';

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

// Mascara nomes progressivamente: 3min = mascara do 3º em diante, 10min = só primeiro nome + iniciais
const maskNameAfterOneMinute = (name: string, callTime: Date, currentTime: Date): string => {
  const threeMinutesMs = 3 * 60 * 1000;
  const tenMinutesMs = 10 * 60 * 1000;
  const elapsed = currentTime.getTime() - callTime.getTime();
  
  const parts = name.trim().split(/\s+/);
  
  // Após 10 minutos, mostra primeiro nome + iniciais dos sobrenomes com ***
  if (elapsed >= tenMinutesMs) {
    if (parts.length <= 1) return parts[0];
    const firstName = parts[0];
    const maskedSurnames = parts.slice(1).map(part => part[0] + '***');
    return [firstName, ...maskedSurnames].join(' ');
  }
  
  // Se passou menos de 3 minutos, mostra o nome completo
  if (elapsed < threeMinutesMs) {
    return name;
  }
  
  // Entre 3-10 minutos: primeiro e segundo nome visíveis, demais mascarados com inicial
  if (parts.length <= 2) {
    return name; // Até 2 nomes, não mascara
  }
  
  const visibleNames = parts.slice(0, 2);
  const maskedNames = parts.slice(2).map(part => part[0] + '***');
  
  return [...visibleNames, ...maskedNames].join(' ')
};

export function PublicDisplay(_props: PublicDisplayProps) {
  const { currentTime, isSynced } = useBrazilTime();
  const { playHourAudio } = useHourAudio();
  
  // Real-time resolution detection for responsive TV display
  const tvResolution = useTVResolution();
  
  // Previne modo de espera da TV Android
  usePreventSleep(true);
  
  // Get unit name for cleanup
  const cleanupUnitName = localStorage.getItem('selectedUnitName') || localStorage.getItem('tv_permanent_unit_name') || '';
  
  // Cleanup inactive patients (10 min) and patients from previous days - only on TV module
  useInactivePatientCleanup(cleanupUnitName);
  
  const [currentTriageCall, setCurrentTriageCall] = useState<{ name: string; destination?: string } | null>(null);
  const [currentDoctorCall, setCurrentDoctorCall] = useState<{ name: string; destination?: string } | null>(null);
  const [announcingType, setAnnouncingType] = useState<'triage' | 'doctor' | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [flashColor, setFlashColor] = useState<'blue' | 'green'>('blue');
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; name: string; type: string; time: Date }>>([]);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const pollInitializedRef = useRef(false);

  // Background color animation enabled, but dramatic overlays/flash effects disabled
  const ENABLE_BACKGROUND_ANIMATION = true;
  const ENABLE_CALL_OVERLAYS = false;

  type PatientCallType = 'triage' | 'doctor' | 'ecg' | 'curativos' | 'raiox' | 'enfermaria' | 'custom';
  type AnnouncementQueueItem = {
    id: string;
    call_type: PatientCallType;
    patient_name: string;
    destination?: string;
  };
  const announcementQueueRef = useRef<AnnouncementQueueItem[]>([]);
  const isProcessingQueueRef = useRef(false);
  const [unitName, setUnitName] = useState(() =>
    localStorage.getItem('selectedUnitName') || localStorage.getItem('tv_permanent_unit_name') || ''
  );
  const [unitId, setUnitId] = useState(() =>
    localStorage.getItem('selectedUnitId') || localStorage.getItem('tv_permanent_unit_id') || ''
  );

  // Reset de estado quando a unidade muda (evita replays e loops)
  useEffect(() => {
    processedCallsRef.current.clear();
    announcementQueueRef.current = [];
    isProcessingQueueRef.current = false;
    pollInitializedRef.current = false;
  }, [unitName]);

  // Limpar histórico de chamadas à meia-noite
  useEffect(() => {
    if (!currentTime) return;
    
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    
    // Limpar às 00:00 (meia-noite)
    if (hours === 0 && minutes === 0) {
      setHistoryItems([]);
      processedCallsRef.current.clear();
      console.log('[PublicDisplay] Histórico limpo à meia-noite');
    }
  }, [currentTime?.getHours(), currentTime?.getMinutes()]);
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
  const [showAnalogClock, setShowAnalogClock] = useState(false);
  
  // Waiting phrases rotation
  const WAITING_PHRASES = [
    "⏳ Aguarde um momento, já chamaremos você. Obrigado pela paciência! 🙏",
    "📋 Estamos organizando o atendimento. Em instantes, você será chamado. ✨",
    "🔔 Aguarde um momento, já chamaremos você. 😊",
    "👥 Você está na fila de atendimento. Obrigado pela paciência! 💙",
    "👀 Fique atento(a), sua chamada será exibida em instantes. 📺",
    "⏰ Seu atendimento está quase começando. 🌟",
    "📝 Siga sempre as orientações da equipe de saúde. 👨‍⚕️",
    "🚨 O atendimento prioriza os casos mais urgentes. 🏥",
    "❤️ Estamos aqui para cuidar de você. 🏥🧑‍⚕️",
    "🤝 Trabalhamos para oferecer um atendimento seguro e humanizado. 💚",
    "⚕️ O atendimento segue critérios de urgência e risco. 🩺"
  ];
  const [currentWaitingPhraseIndex, setCurrentWaitingPhraseIndex] = useState(0);
  const [waitingPhraseVisible, setWaitingPhraseVisible] = useState(true);
  
  // Cache de frases de destino pré-geradas (hash -> URL pública)
  const destinationPhraseCacheRef = useRef<Map<string, string>>(new Map());
  const destinationCacheLoadedRef = useRef(false);

  const readVolume = (key: string, fallback = 1) => {
    const raw = localStorage.getItem(key);
    const v = raw == null ? NaN : parseFloat(raw);
    if (!Number.isFinite(v)) return fallback;
    return Math.min(1, Math.max(0, v));
  };

  // Format patient name: full name in UPPERCASE for better visibility
  const formatPatientName = (name: string): string => {
    if (!name) return '';
    return name.trim().toUpperCase();
  };

  // Get dynamic font size based on name length and current resolution
  // Optimized for landscape TV displays - INCREASED SIZES for better visibility
  const getNameFontSize = useCallback((name: string): string => {
    const length = name?.length || 0;
    const { tier, scale } = tvResolution;
    
    // Base classes that scale with viewport - BOLDER and LARGER
    const baseClasses = 'leading-tight';
    
    // Very short names (1-15 chars) - EXTRA LARGE size
    if (length <= 15) {
      return `${baseClasses} text-[clamp(2.5rem,${8 * scale}vw,9rem)]`;
    }
    // Short names (16-25 chars) - LARGE size
    if (length <= 25) {
      return `${baseClasses} text-[clamp(2rem,${7 * scale}vw,7.5rem)]`;
    }
    // Medium names (26-35 chars) - MEDIUM-LARGE size
    if (length <= 35) {
      return `${baseClasses} text-[clamp(1.5rem,${5.5 * scale}vw,6rem)]`;
    }
    // Long names (36-45 chars) - MEDIUM size
    if (length <= 45) {
      return `${baseClasses} text-[clamp(1.25rem,${4.5 * scale}vw,5rem)]`;
    }
    // Very long names (46+ chars) - readable size
    return `${baseClasses} text-[clamp(1rem,${4 * scale}vw,4.5rem)]`;
  }, [tvResolution]);

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

  // Fixed voice configuration: pt-BR-Neural2-C (Female Premium)
  // No customization needed - this is the standard voice for all patient calls
  const FIXED_VOICE_ID = 'pt-BR-Neural2-C';
  const FIXED_SPEAKING_RATE = 1.0;

  // Gerar hash para buscar frase de destino no cache
  const hashDestinationPhrase = async (phrase: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${phrase}_${FIXED_VOICE_ID}_${FIXED_SPEAKING_RATE}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  };

  // Carregar cache de frases de destino do storage público
  useEffect(() => {
    if (!unitId || destinationCacheLoadedRef.current) return;

    const loadDestinationCache = async () => {
      try {
        console.log('📦 Loading destination phrase cache for unit:', unitId);

        // Buscar destinos da unidade
        const { data: destinations, error } = await supabase
          .from('destinations')
          .select('name, display_name')
          .eq('unit_id', unitId)
          .eq('is_active', true);

        if (error) {
          console.error('Error loading destinations:', error);
          return;
        }

        if (!destinations || destinations.length === 0) {
          console.log('No destinations found for unit');
          return;
        }

        const STORAGE_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tts-cache/destinations`;

        // Gerar hash para cada frase e montar map de cache
        for (const dest of destinations) {
          const destName = dest.display_name || dest.name;
          const lowerName = destName.toLowerCase();
          const feminineKeywords = ['sala', 'triagem', 'enfermaria', 'recepção', 'farmácia', 'emergência'];
          const useFeminine = feminineKeywords.some(kw => lowerName.startsWith(kw));
          const phrase = `Por favor, dirija-se ${useFeminine ? 'à' : 'ao'} ${destName}`;

          const hash = await hashDestinationPhrase(phrase);
          const cacheUrl = `${STORAGE_BASE_URL}/${hash}.mp3`;

          destinationPhraseCacheRef.current.set(phrase, cacheUrl);
        }

        destinationCacheLoadedRef.current = true;
        console.log(`📦 Destination cache loaded: ${destinationPhraseCacheRef.current.size} phrases`);

        // Disparar pré-cache em background (não bloqueia)
        supabase.functions.invoke('cache-destination-phrases', {
          body: { unitId }
        }).then(res => {
          if (res.error) {
            console.warn('Background cache-destination-phrases error:', res.error);
          } else {
            console.log('✅ Background cache-destination-phrases result:', res.data);
          }
        }).catch(e => console.warn('Background cache failed:', e));

      } catch (e) {
        console.error('Error loading destination cache:', e);
      }
    };

    loadDestinationCache();
  }, [unitId]);

  // Waiting phrases rotation every 15 seconds with fade effect
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setWaitingPhraseVisible(false);
      
      // After fade out completes, change phrase and fade in
      setTimeout(() => {
        setCurrentWaitingPhraseIndex(prev => (prev + 1) % WAITING_PHRASES.length);
        setWaitingPhraseVisible(true);
      }, 500); // 500ms for fade out animation
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [WAITING_PHRASES.length]);

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

  // Alternate between analog and digital clock every 30 seconds
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setShowAnalogClock(prev => !prev);
    }, 30000);
    return () => clearInterval(clockInterval);
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

  // Listen for remote reload commands via Supabase Realtime
  useEffect(() => {
    console.log('📡 Setting up remote command listener for TV');
    
    const channel = supabase
      .channel('tv-commands')
      .on(
        'broadcast',
        { event: 'reload' },
        (payload) => {
          console.log('📺 Received remote command:', payload);
          
          const command = payload.payload;
          
          // Check if command is for this unit or for all units
          if (command.unit === 'all' || command.unit === unitName || command.unit === marketingUnitName) {
            console.log('🔄 Executing remote reload command...');
            
            // Show a brief notification before reload
            const notification = document.createElement('div');
            notification.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(0,0,0,0.9);
              color: white;
              padding: 2rem 3rem;
              border-radius: 1rem;
              font-size: 1.5rem;
              z-index: 99999;
              text-align: center;
            `;
            notification.innerHTML = '🔄 Recarregando...<br><small>Comando remoto recebido</small>';
            document.body.appendChild(notification);
            
            // Reload after a short delay
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 TV command channel status:', status);
      });

    return () => {
      console.log('📡 Removing remote command listener');
      supabase.removeChannel(channel);
    };
  }, [unitName, marketingUnitName]);

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
        console.log('🎵 playSimpleAudio starting:', { bufferSize: buffer.byteLength, volume });
        
        if (buffer.byteLength === 0) {
          const error = new Error('Empty audio buffer');
          console.error('❌ playSimpleAudio error: empty buffer');
          reject(error);
          return;
        }
        
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = Math.min(1.0, volume);
        
        audio.oncanplaythrough = () => {
          console.log('✅ Audio can play through, duration:', audio.duration);
        };
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          console.log('✅ Simple audio playback finished');
          resolve();
        };
        audio.onerror = (err) => {
          URL.revokeObjectURL(url);
          console.error('❌ Simple audio playback error:', err, audio.error);
          reject(new Error(`Audio playback failed: ${audio.error?.message || 'unknown error'}`));
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

  const fetchConcatenatedTTSBuffer = useCallback(
    async (name: string, destinationPhrase: string): Promise<ArrayBuffer> => {
      const cleanName = name.trim();
      const cleanDestination = destinationPhrase.trim();
      console.log('🔊 Fetching Google Cloud TTS buffer (Neural2-C):', { name: cleanName, destinationPhrase: cleanDestination });

      // Clear previous error
      setTtsError(null);

      // Tentar usar cache de frase de destino para reduzir latência
      // Se a frase de destino estiver no cache, buscamos ela pré-gerada + geramos só o nome
      const cachedDestinationUrl = destinationPhraseCacheRef.current.get(cleanDestination);
      
      if (cachedDestinationUrl) {
        console.log('📦 Using cached destination phrase:', cachedDestinationUrl);
        
        try {
          // Buscar áudio do nome via API (mais curto, mais rápido)
          const nameUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`;
          const [nameResponse, destResponse] = await Promise.all([
            fetch(nameUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                text: cleanName,
                voiceName: FIXED_VOICE_ID,
                speakingRate: FIXED_SPEAKING_RATE,
              }),
            }),
            fetch(cachedDestinationUrl)
          ]);

          if (nameResponse.ok && destResponse.ok) {
            const [nameBuffer, destBuffer] = await Promise.all([
              nameResponse.arrayBuffer(),
              destResponse.arrayBuffer()
            ]);

            if (nameBuffer.byteLength > 0 && destBuffer.byteLength > 0) {
              // Concatenar os dois buffers (nome + destino)
              const combined = new Uint8Array(nameBuffer.byteLength + destBuffer.byteLength);
              combined.set(new Uint8Array(nameBuffer), 0);
              combined.set(new Uint8Array(destBuffer), nameBuffer.byteLength);
              console.log('✅ Combined audio from cache + API:', { nameSize: nameBuffer.byteLength, destSize: destBuffer.byteLength });
              return combined.buffer;
            }
          }
          
          // Se falhar, cai no fluxo normal abaixo
          console.log('⚠️ Cache fetch failed, falling back to full API call');
        } catch (cacheError) {
          console.warn('⚠️ Cache error, falling back to API:', cacheError);
        }
      }

      // Fallback: gerar tudo via API (modo concatenado)
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`;
      const headers = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      } as const;

      console.log('🌐 Calling TTS API (full):', { name: cleanName, destination: cleanDestination, voice: FIXED_VOICE_ID });

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            concatenate: {
              name: cleanName,
              prefix: '',
              destination: cleanDestination,
            },
            voiceName: FIXED_VOICE_ID,
            speakingRate: FIXED_SPEAKING_RATE,
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

        const audioBuffer = await response.arrayBuffer();
        console.log('✅ Google Cloud TTS audio received:', { size: audioBuffer.byteLength });

        if (audioBuffer.byteLength === 0) {
          console.error('❌ Audio buffer is empty!');
          setTtsError({ message: 'Buffer de áudio vazio', timestamp: new Date() });
          throw new Error('Audio buffer is empty');
        }

        return audioBuffer;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no TTS';
        console.error('❌ TTS error:', errorMessage);
        setTtsError({ message: errorMessage, timestamp: new Date() });
        throw error;
      }
    },
    []
  );

  const speakWithGoogleTTS = useCallback(
    async (text: string): Promise<void> => {
      console.log('Speaking with Google Cloud TTS (Neural2-C):', text);
      
      // Clear previous error
      setTtsError(null);
      
      // Fixed voice: pt-BR-Neural2-C (Female Premium) - no customization
      const ttsVolume = readVolume('volume-tts', 1);
      
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
            body: JSON.stringify({ text, voiceName: FIXED_VOICE_ID, speakingRate: FIXED_SPEAKING_RATE }),
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
      setFlashColor('blue');
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 800);
      
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
        setFlashColor('blue');
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 800);

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
      setFlashColor('blue');
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 800);

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
      setFlashColor('blue');
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 800);

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
  // Uses fixed voice: pt-BR-Neural2-C (Female Premium)
  const speakDestinationPhrase = useCallback(
    async (phrase: string): Promise<void> => {
      console.log('Speaking destination phrase (Neural2-C):', phrase);
      
      const ttsVolume = readVolume('volume-tts', 1);
      
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
            voiceName: FIXED_VOICE_ID, 
            speakingRate: FIXED_SPEAKING_RATE 
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Google Cloud TTS error: ${response.status}`);
      }

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
      setFlashColor('blue');
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 800);

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
      const audioContextState = audioContextRef.current?.state || 'not-created';
      console.log('📢 speakName called with:', { 
        name, 
        caller, 
        destination, 
        timestamp: now, 
        isSpeaking: isSpeakingRef.current, 
        audioUnlocked,
        audioContextState 
      });

      // Check if audio is unlocked first
      if (!audioUnlocked) {
        console.warn('⚠️ Audio not unlocked, cannot speak. User needs to click the screen first.');
        setTtsError({ message: 'Áudio não desbloqueado. Clique na tela primeiro.', timestamp: new Date() });
        return;
      }

      // Ensure AudioContext is running
      if (audioContextRef.current?.state === 'suspended') {
        console.log('🔄 Resuming suspended AudioContext...');
        try {
          await audioContextRef.current.resume();
          console.log('✅ AudioContext resumed successfully');
        } catch (err) {
          console.error('❌ Failed to resume AudioContext:', err);
        }
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

      // Pré-carrega o áudio ANTES de atualizar a tela.
      // Assim o texto só aparece quando o áudio já está pronto para tocar (sincronismo instantâneo).
      const ttsVolume = readVolume('volume-tts', 1);
      let audioBuffer: ArrayBuffer;
      try {
        audioBuffer = await fetchConcatenatedTTSBuffer(name, destinationPhrase);
      } catch (e) {
        console.error('❌ Failed to fetch TTS buffer:', e);
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

      // Atualiza a tela somente agora (áudio já está pronto)
      if (caller === 'triage') {
        setCurrentTriageCall({ name, destination: location });
      } else {
        setCurrentDoctorCall({ name, destination: location });
      }

      const callType = caller === 'triage' ? 'triage' : 'doctor';
      setAnnouncingType(callType);
      setFlashColor(callType === 'triage' ? 'blue' : 'green');
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 800);

      try {
        // Repeat the announcement 2 times (to ensure patient hears it)
        for (let i = 0; i < 2; i++) {
          console.log(`🔄 Patient announcement iteration ${i + 1}/2`);
          
          // Play notification sound first (mandatory)
          console.log('🔔 Playing notification sound...');
          await playNotificationSound();
          console.log('✅ Notification sound done');

          // Reproduz o buffer já gerado (evita delay entre tela e fala)
          console.log('🎙️ Playing preloaded TTS buffer');
          await playSimpleAudio(audioBuffer, ttsVolume);
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
    [playNotificationSound, getDestinationPhrase, audioUnlocked, fetchConcatenatedTTSBuffer, playSimpleAudio]
  );

  const processAnnouncementQueue = useCallback(() => {
    if (isProcessingQueueRef.current) return;
    if (!audioUnlocked) return;

    isProcessingQueueRef.current = true;

    const run = async () => {
      try {
        while (announcementQueueRef.current.length > 0) {
          const next = announcementQueueRef.current.shift();
          if (!next) break;

          // Nunca sobrepor com anúncios de hora/marketing: respeitar o lock global
          if (isSpeakingRef.current) {
            // Se algo externo já pegou o lock, re-enfileira e tenta depois
            announcementQueueRef.current.unshift(next);
            await new Promise((r) => setTimeout(r, 250));
            continue;
          }

          if (next.call_type === 'custom') {
            await speakCustomTextRef.current(next.patient_name);
            continue;
          }

          const callType = next.call_type as Exclude<PatientCallType, 'custom'>;
          await speakName(next.patient_name, callType, next.destination);
        }
      } finally {
        isProcessingQueueRef.current = false;
      }
    };

    void run();
  }, [audioUnlocked, speakName]);

  const enqueueAnnouncement = useCallback(
    (item: AnnouncementQueueItem) => {
      // Dedup por id (evita repetição do mesmo evento em polling/realtime)
      if (processedCallsRef.current.has(item.id)) return;
      processedCallsRef.current.add(item.id);

      announcementQueueRef.current.push(item);
      processAnnouncementQueue();
    },
    [processAnnouncementQueue]
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
  const enqueueAnnouncementRef = useRef(enqueueAnnouncement);
  
  useEffect(() => {
    speakNameRef.current = speakName;
    speakCustomTextRef.current = speakCustomText;
    enqueueAnnouncementRef.current = enqueueAnnouncement;
  }, [speakName, speakCustomText, enqueueAnnouncement]);

  // Subscribe to realtime updates - stable subscription without callback dependencies
  useEffect(() => {
    if (!unitName) {
      console.log('No unit name, skipping realtime subscription');
      return;
    }

    console.log('Setting up realtime subscription for unit:', unitName);
    
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

          // Important: only process when the call becomes ACTIVE.
          // Many flows insert the row as "waiting" and later UPDATE to "active".
          if (call.status !== 'active') {
            console.log('ℹ️ INSERT ignored (status not active):', {
              id: call.id,
              status: call.status,
              call_type: call.call_type,
              patient_name: call.patient_name,
            });
            return;
          }

          if (processedCallsRef.current.has(call.id)) {
            console.log('Skipping already processed ACTIVE call:', call.id);
            return;
          }

          console.log('📢 Processing ACTIVE call (INSERT):', call.patient_name, call.call_type, call.status);

          // Dispatch activity event to reset idle timer (anti-standby)
          window.dispatchEvent(new CustomEvent('patientCallActivity'));

          // Valid call types for announcements
          const validCallTypes = ['triage', 'doctor', 'ecg', 'curativos', 'raiox', 'enfermaria', 'custom'] as const;
          type ValidCallType = typeof validCallTypes[number];

          // Handle custom announcements (just speak the text, no destination display)
            if (validCallTypes.includes(call.call_type as ValidCallType)) {
              enqueueAnnouncementRef.current({
                id: call.id,
                call_type: call.call_type,
                patient_name: call.patient_name,
                destination: call.destination || undefined,
              });
            } else {
            console.log('⚠️ Unknown call type:', call.call_type);
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
          const prev = payload.old as any;

          // Filter by unit name in handler
          const normalizedUnit = (unitName || '').trim().toLowerCase();
          const callUnit = (call.unit_name || '').trim().toLowerCase();
          if (!normalizedUnit || callUnit !== normalizedUnit) {
            return;
          }

          const prevStatus = prev?.status;

          // If the row transitions to ACTIVE, announce it here (common flow: waiting -> active)
          if (call.status === 'active' && prevStatus !== 'active') {
            console.log('🔁 Call became ACTIVE (UPDATE):', {
              id: call.id,
              from: prevStatus,
              to: call.status,
              name: call.patient_name,
              type: call.call_type,
            });

            if (processedCallsRef.current.has(call.id)) {
              console.log('Skipping already processed ACTIVE call (UPDATE):', call.id);
              return;
            }

            // Dispatch activity event to reset idle timer (anti-standby)
            window.dispatchEvent(new CustomEvent('patientCallActivity'));

            const validCallTypes = ['triage', 'doctor', 'ecg', 'curativos', 'raiox', 'enfermaria', 'custom'] as const;
            type ValidCallType = typeof validCallTypes[number];

              if (validCallTypes.includes(call.call_type as ValidCallType)) {
                enqueueAnnouncementRef.current({
                 id: call.id,
                 call_type: call.call_type,
                 patient_name: call.patient_name,
                 destination: call.destination || undefined,
               });
             }
          }

          if (call.status === 'completed') {
            // Evita “sumir” a tela durante uma chamada em andamento.
            if (isSpeakingRef.current) return;

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

          console.log('🛰️ Poll detected NEW active call - ENQUEUE:', call.patient_name, call.call_type);

          // Reset idle timer (anti-standby)
          window.dispatchEvent(new CustomEvent('patientCallActivity'));

          enqueueAnnouncement({
            id: call.id,
            call_type: call.call_type as PatientCallType,
            patient_name: call.patient_name,
            destination: call.destination || undefined,
          });
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
  }, [unitName, audioUnlocked, enqueueAnnouncement]);

  // Clock is managed by useBrazilTime hook

  // Show unlock overlay if audio not yet unlocked
  if (!audioUnlocked) {
    return (
      <div 
        onClick={unlockAudio}
        className={`h-dvh w-full animate-color-shift flex flex-col items-center justify-center cursor-pointer p-4 ${!cursorVisible ? 'cursor-none' : ''} relative overflow-hidden`}
        style={{ cursor: cursorVisible ? 'pointer' : 'none' }}
      >
        {/* Floating 3D orbs background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-indigo-500/20 rounded-full blur-[100px] animate-float-orb" />
          <div className="absolute bottom-1/4 right-1/4 w-[35vw] h-[35vw] bg-purple-500/20 rounded-full blur-[80px] animate-float-orb-slow" />
          <div className="absolute top-1/2 right-1/3 w-[25vw] h-[25vw] bg-cyan-500/15 rounded-full blur-[60px] animate-float-orb-fast" />
        </div>
        
        <div className="text-center space-y-4 sm:space-y-6 max-w-lg mx-auto px-4 relative z-10 glass-3d rounded-3xl p-8 sm:p-12">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-xl opacity-50 animate-pulse" />
            <HealthCrossIcon size={96} className="mx-auto w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 relative z-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold shimmer-text">Clique para Ativar Áudio</h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-400">Toque na tela para habilitar as chamadas de pacientes</p>
        </div>
      </div>
    );
  }

  // Get the current call name for the dramatic overlay
  const currentCallName = announcingType === 'triage' 
    ? currentTriageCall?.name 
    : announcingType === 'doctor' 
      ? currentDoctorCall?.name 
      : null;
  
  const currentCallDestination = announcingType === 'triage' 
    ? currentTriageCall?.destination 
    : announcingType === 'doctor' 
      ? currentDoctorCall?.destination 
      : null;

  // Dynamic responsive classes based on real-time resolution
  const responsiveScale = tvResolution.scale;
  
  return (
    <div 
      ref={containerRef}
      className={`h-dvh w-full tv-safe-area relative overflow-hidden flex flex-col tv-font-body landscape:flex-col ${!cursorVisible ? 'cursor-none' : ''} ${
        ENABLE_BACKGROUND_ANIMATION ? (announcingType ? 'animate-calling-background' : 'animate-waiting-background') : 'bg-gradient-to-br from-slate-900 via-slate-950 to-black'
      }`}
      style={{ 
        cursor: cursorVisible ? 'auto' : 'none',
        // CSS custom property for dynamic scaling
        '--tv-scale': responsiveScale,
      } as React.CSSProperties}
      data-resolution-tier={tvResolution.tier}
      data-landscape={tvResolution.isLandscape}
    >
      {/* ========== FLASH EFFECT ON CALL START ========== */}
      {ENABLE_CALL_OVERLAYS && showFlash && (
        <div className="fixed inset-0 z-[200] pointer-events-none">
          {/* Main flash overlay */}
          <div className={`absolute inset-0 ${
            flashColor === 'blue' ? 'animate-call-flash-blue' : 'animate-call-flash-green'
          }`} />
          
          {/* Light burst rays from center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-[200vw] h-[200vw] animate-light-burst ${
              flashColor === 'blue' 
                ? 'bg-[conic-gradient(from_0deg,transparent,rgba(59,130,246,0.4),transparent,rgba(147,197,253,0.3),transparent,rgba(59,130,246,0.4),transparent)]' 
                : 'bg-[conic-gradient(from_0deg,transparent,rgba(16,185,129,0.4),transparent,rgba(167,243,208,0.3),transparent,rgba(16,185,129,0.4),transparent)]'
            }`} />
          </div>
          
          {/* Central white core flash */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 rounded-full blur-2xl sm:blur-3xl animate-pulse ${
              flashColor === 'blue' ? 'bg-blue-200' : 'bg-emerald-200'
            }`} style={{ animation: 'callFlashBlue 0.6s ease-out forwards' }} />
          </div>
        </div>
      )}

      {/* ========== DRAMATIC FULL-SCREEN CALLING OVERLAY ========== */}
      {ENABLE_CALL_OVERLAYS && announcingType && currentCallName && (
        <div className="fixed inset-0 z-[100] pointer-events-none animate-calling-overlay-enter">
          {/* Dark backdrop with blur */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          
          {/* Radar rings emanating from center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`absolute w-[60vw] sm:w-[50vw] lg:w-[40vw] h-[60vw] sm:h-[50vw] lg:h-[40vw] rounded-full border-2 sm:border-3 lg:border-4 ${
              announcingType === 'triage' ? 'border-blue-400/50' : 'border-emerald-400/50'
            } animate-radar-ring`} />
            <div className={`absolute w-[60vw] sm:w-[50vw] lg:w-[40vw] h-[60vw] sm:h-[50vw] lg:h-[40vw] rounded-full border-2 sm:border-3 lg:border-4 ${
              announcingType === 'triage' ? 'border-blue-400/40' : 'border-emerald-400/40'
            } animate-radar-ring-delayed`} />
            <div className={`absolute w-[60vw] sm:w-[50vw] lg:w-[40vw] h-[60vw] sm:h-[50vw] lg:h-[40vw] rounded-full border-2 sm:border-3 lg:border-4 ${
              announcingType === 'triage' ? 'border-blue-400/30' : 'border-emerald-400/30'
            } animate-radar-ring-delayed-2`} />
          </div>
          
          {/* Central content - Name prominently displayed */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
            {/* Status badge */}
            <div className={`mb-3 sm:mb-4 lg:mb-6 px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 lg:py-3 rounded-full animate-status-badge ${
              announcingType === 'triage' 
                ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] sm:shadow-[0_0_30px_rgba(59,130,246,0.6)]' 
                : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] sm:shadow-[0_0_30px_rgba(16,185,129,0.6)]'
            }`}>
              <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
                <Megaphone className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white animate-megaphone-shake" />
                <span className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-black text-white tracking-wider uppercase">
                  🔔 CHAMANDO AGORA
                </span>
                <Megaphone className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white animate-megaphone-shake" style={{ animationDelay: '0.25s' }} />
              </div>
            </div>
            
            {/* Patient name - MEGA SIZE with INTENSE glow effects */}
            <div className="text-center max-w-[90vw] relative">
              {/* Background glow layer */}
              <div 
                className="absolute inset-0 blur-3xl opacity-60"
                style={{
                  background: `radial-gradient(ellipse at center, ${
                    announcingType === 'triage' 
                      ? 'rgba(59, 130, 246, 0.5)' 
                      : 'rgba(16, 185, 129, 0.5)'
                  } 0%, transparent 70%)`
                }}
              />
              <h1 
                className="tv-font-display font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl 3xl:text-[10rem] leading-tight tracking-wide animate-name-mega-pulse text-yellow-300 relative z-10"
                style={{ 
                  wordBreak: 'break-word',
                  WebkitTextStroke: '1px rgba(255, 200, 0, 0.3)',
                  letterSpacing: '0.02em'
                }}
              >
                {currentCallName}
              </h1>
              {/* Reflection effect */}
              <div 
                className="absolute -bottom-2 sm:-bottom-4 left-0 right-0 h-8 sm:h-12 lg:h-16 opacity-20 blur-sm scale-y-[-0.3] pointer-events-none overflow-hidden hidden sm:block"
                style={{ 
                  maskImage: 'linear-gradient(to bottom, white, transparent)',
                  WebkitMaskImage: 'linear-gradient(to bottom, white, transparent)'
                }}
              >
                <span className="tv-font-display font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl 3xl:text-[10rem] text-yellow-300">
                  {currentCallName}
                </span>
              </div>
            </div>
            
            {/* Destination */}
            <div className={`mt-3 sm:mt-4 lg:mt-6 px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl ${
              announcingType === 'triage' 
                ? 'bg-blue-900/80 border sm:border-2 border-blue-400' 
                : 'bg-emerald-900/80 border sm:border-2 border-emerald-400'
            }`}>
              <p className={`tv-font-heading text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-bold ${
                announcingType === 'triage' ? 'text-blue-200' : 'text-emerald-200'
              }`}>
                {announcingType === 'triage' ? '🏥' : '👨‍⚕️'} {currentCallDestination || (announcingType === 'triage' ? 'Triagem' : 'Consultório')}
              </p>
            </div>
            
            {/* Sound wave indicator */}
            <div className="mt-4 sm:mt-6 lg:mt-8 flex items-center gap-1 sm:gap-1.5 lg:gap-2">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 sm:w-3 lg:w-4 rounded-full ${
                    announcingType === 'triage' ? 'bg-blue-400' : 'bg-emerald-400'
                  }`}
                  style={{
                    height: `${20 + Math.sin(Date.now() / 200 + i) * 15}px`,
                    animation: `soundWave 0.4s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.08}s`
                  }}
                />
              ))}
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
                {/* Retry button */}
                <button
                  onClick={() => {
                    setTtsError(null);
                    // Force re-unlock audio context
                    if (audioContextRef.current?.state === 'suspended') {
                      audioContextRef.current.resume().then(() => {
                        console.log('✅ AudioContext resumed via retry button');
                      }).catch(err => {
                        console.error('❌ Failed to resume AudioContext:', err);
                      });
                    }
                  }}
                  className="mt-2 text-[10px] sm:text-xs text-red-300 underline hover:text-red-200 transition-colors"
                >
                  Tentar novamente
                </button>
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

      {/* Lightweight static background elements - reduced GPU load */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
        <div className="absolute top-[5%] left-[5%] w-[20vw] h-[20vw] max-w-[250px] max-h-[250px] bg-indigo-600/15 rounded-full blur-[60px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[18vw] h-[18vw] max-w-[200px] max-h-[200px] bg-emerald-600/15 rounded-full blur-[50px]" />
        <div className="absolute top-[50%] left-[50%] w-[15vw] h-[15vw] max-w-[180px] max-h-[180px] bg-cyan-600/10 rounded-full blur-[50px] -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Dimming overlay when announcing - darkens everything except active call */}
      {announcingType && (
        <div className="fixed inset-0 z-[15] bg-black/70 animate-[fadeIn_0.3s_ease-out] pointer-events-none" />
      )}

      {/* Header - Optimized for TV performance with high contrast text */}
      <div className={`relative z-10 shrink-0 transition-opacity duration-300 ${announcingType ? 'opacity-30' : 'opacity-100'}`}
           style={{ marginBottom: `clamp(0.25rem, ${0.6 * responsiveScale}vw, 1rem)` }}>
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900/95 via-indigo-950/95 to-slate-900/95 border border-indigo-500/40"
             style={{
               borderRadius: `clamp(0.5rem, ${1 * responsiveScale}vw, 1.25rem)`,
               padding: `clamp(0.5rem, ${1 * responsiveScale}vw, 1.25rem) clamp(0.75rem, ${1.5 * responsiveScale}vw, 2.5rem)`,
               margin: `0 clamp(0.5rem, ${1 * responsiveScale}vw, 2rem)`,
               boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
             }}>
          {/* Simple top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" style={{ borderRadius: 'inherit' }} />
          
          <div className="flex items-center relative z-10 w-full" style={{ gap: `clamp(0.75rem, ${1.5 * responsiveScale}vw, 2rem)` }}>
            {/* Left: Logo + Title - FIXED WIDTH to prevent overlap */}
            <div className="flex items-center shrink-0" style={{ 
              gap: `clamp(0.5rem, ${1 * responsiveScale}vw, 1.5rem)`,
              minWidth: `clamp(12rem, 25vw, 22rem)`,
              maxWidth: `clamp(14rem, 30vw, 26rem)`,
            }}>
              {/* Logo container - simplified */}
              <div className="relative shrink-0 bg-white rounded-lg shadow-lg flex items-center justify-center" 
                   style={{ 
                     width: `clamp(2.5rem, ${4 * responsiveScale}vw, 5rem)`,
                     height: `clamp(2.5rem, ${4 * responsiveScale}vw, 5rem)`,
                   }}>
                <HealthCrossIcon size={32} style={{ width: `clamp(1.25rem, ${2.5 * responsiveScale}vw, 3.5rem)`, height: `clamp(1.25rem, ${2.5 * responsiveScale}vw, 3.5rem)` }} />
              </div>
              
              {/* Text content - high contrast */}
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <h1 className="tv-font-heading font-black text-white leading-none whitespace-nowrap tracking-tight"
                    style={{ 
                      fontSize: `clamp(1rem, ${2 * responsiveScale}vw, 2.75rem)`,
                      textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(6,182,212,0.3)',
                    }}>
                  Painel de Chamadas
                </h1>
                <p className="tv-font-body text-amber-400 leading-tight font-black truncate" 
                   title={unitName || 'Unidade de Saúde'}
                   style={{ 
                     fontSize: `clamp(0.75rem, ${1.4 * responsiveScale}vw, 1.75rem)`,
                     textShadow: '0 2px 4px rgba(0,0,0,0.7), 0 0 10px rgba(251,191,36,0.3)',
                     marginTop: `clamp(0.125rem, ${0.25 * responsiveScale}vw, 0.5rem)`,
                   }}>
                  {(unitName || 'Unidade de Saúde').replace(/Pronto Atendimento/gi, 'P.A')}
                </p>
                {/* Kalebe Credits - INCREASED SIZE AND WEIGHT */}
                <p className="tv-font-body leading-tight font-bold whitespace-nowrap text-yellow-300"
                   style={{ 
                     fontSize: `clamp(0.625rem, ${0.9 * responsiveScale}vw, 1.25rem)`,
                     marginTop: `clamp(0.125rem, ${0.2 * responsiveScale}vw, 0.375rem)`,
                     textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 0 8px rgba(253,224,71,0.3)',
                   }}>
                  ✨ Solução criada por Kalebe Gomes
                </p>
              </div>
            </div>
            
            {/* Separator - vertical divider */}
            <div className="hidden sm:block w-0.5 bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent shrink-0" 
                 style={{ height: `clamp(2rem, ${4 * responsiveScale}vw, 5rem)` }} />
            
            {/* Right: Weather + Clock - OVERFLOW HIDDEN to prevent overlap */}
            <div className="flex-1 flex items-center justify-end min-w-0 overflow-hidden">
              <div className="shrink-0 max-w-full">
                <WeatherWidget currentTime={currentTime} formatTime={formatBrazilTime} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Fully responsive grid for all horizontal TV sizes */}
      <div className="relative z-10 flex-1 grid grid-cols-12 min-h-0"
           style={{
             gap: `clamp(0.125rem, ${0.8 * responsiveScale}vw, 1.5rem)`,
             paddingBottom: `clamp(3rem, ${5 * responsiveScale}vw, 6rem)`,
             paddingLeft: `clamp(0.125rem, ${0.3 * responsiveScale}vw, 0.5rem)`,
             paddingRight: `clamp(0.125rem, ${0.3 * responsiveScale}vw, 0.5rem)`,
           }}>
        {/* Current Calls - Always side by side on landscape screens */}
        <div className="col-span-9 grid grid-cols-2" style={{ gap: `clamp(0.125rem, ${0.8 * responsiveScale}vw, 1.5rem)` }}>
          {/* Triage Call - 3D Modern Card - Fully responsive for landscape TV */}
          <div className={`glass-3d tv-card tv-card-3d flex flex-col transition-all duration-500 ${
            announcingType === 'triage' 
              ? 'animate-border-glow-intense animate-card-zoom-call relative z-20' 
              : announcingType === 'doctor'
                ? 'border border-indigo-500/30 opacity-30'
                : 'border border-indigo-500/30 hover:border-indigo-400/50'
          } ${currentTriageCall ? 'animate-card-pop' : ''}`}
          style={{
            borderWidth: announcingType === 'triage' ? `clamp(2px, ${0.3 * responsiveScale}vw, 4px)` : undefined,
            boxShadow: announcingType === 'triage' ? `0 0 clamp(20px, ${3 * responsiveScale}vw, 60px) clamp(5px, ${1 * responsiveScale}vw, 20px) rgba(234,179,8,0.4)` : undefined,
          }}>
            {/* Header with animated gradient */}
            <div className={`shrink-0 relative overflow-hidden ${
              announcingType === 'triage' ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500' : 'animate-triage-shift'
            }`}
            style={{
              padding: `clamp(0.125rem, ${0.5 * responsiveScale}vw, 0.75rem) clamp(0.25rem, ${0.8 * responsiveScale}vw, 1.5rem)`,
            }}>
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
              <p className="tv-font-heading text-white font-bold flex items-center relative z-10 drop-shadow-lg"
                 style={{ 
                   gap: `clamp(0.125rem, ${0.5 * responsiveScale}vw, 1rem)`,
                   fontSize: `clamp(0.625rem, ${1.2 * responsiveScale}vw, 1.5rem)`,
                 }}>
                <Activity className={`shrink-0 ${
                  announcingType === 'triage' ? 'animate-pulse' : 'animate-triage-icon'
                }`} 
                style={{ 
                  width: `clamp(0.625rem, ${1.5 * responsiveScale}vw, 2rem)`,
                  height: `clamp(0.625rem, ${1.5 * responsiveScale}vw, 2rem)`,
                  filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.8))' 
                }} />
                <span className="drop-shadow-md">
                  {announcingType === 'triage' ? '🔔 CHAMANDO!' : 'TRIAGEM'}
                </span>
                {announcingType === 'triage' && (
                  <Megaphone className="text-white animate-megaphone-shake ml-auto shrink-0 drop-shadow-lg" 
                             style={{ width: `clamp(0.625rem, ${1.5 * responsiveScale}vw, 2rem)`, height: `clamp(0.625rem, ${1.5 * responsiveScale}vw, 2rem)` }} />
                )}
              </p>
            </div>
            <div className="flex items-center justify-center flex-1 relative"
                 style={{
                   padding: `clamp(0.25rem, ${1 * responsiveScale}vw, 1.5rem)`,
                   minHeight: `clamp(3.75rem, ${15 * responsiveScale}vw, 13.75rem)`,
                 }}>
              {/* Subtle inner glow */}
              <div className={`absolute inset-0 pointer-events-none ${
                announcingType === 'triage' 
                  ? 'bg-gradient-to-b from-yellow-500/20 to-transparent' 
                  : 'bg-gradient-to-b from-blue-500/5 to-transparent'
              }`} />
              {currentTriageCall ? (
                <div className={`text-center w-full transition-all duration-300 relative z-10 ${announcingType === 'triage' ? 'scale-105' : ''}`}>
                  <h2 className={`tv-font-display break-words transition-all duration-300 ${
                    getNameFontSize(currentTriageCall.name)
                  } ${
                    announcingType === 'triage' 
                      ? 'text-yellow-300 animate-name-mega-pulse' 
                      : 'shimmer-text animate-text-reveal'
                  }`} style={{ 
                    wordBreak: 'break-word', 
                    letterSpacing: '0.08em', 
                    fontWeight: 900,
                    textShadow: '0 4px 8px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.2)',
                  }} key={currentTriageCall.name}>
                    {formatPatientName(currentTriageCall.name)}
                  </h2>
                  <p className={`tv-font-body font-black drop-shadow-lg tracking-widest uppercase ${
                    announcingType === 'triage' ? 'text-yellow-200' : 'text-cyan-300'
                  }`}
                  style={{
                    marginTop: `clamp(0.5rem, ${1.2 * responsiveScale}vw, 2rem)`,
                    fontSize: `clamp(1rem, ${2.5 * responsiveScale}vw, 3.5rem)`,
                    textShadow: '0 2px 6px rgba(0,0,0,0.6)',
                  }}>
                    {currentTriageCall.destination || 'Triagem'}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center animate-pulse"
                       style={{
                         width: `clamp(3rem, ${8 * responsiveScale}vw, 10rem)`,
                         height: `clamp(3rem, ${8 * responsiveScale}vw, 10rem)`,
                         marginBottom: `clamp(0.25rem, ${0.6 * responsiveScale}vw, 1rem)`,
                       }}>
                    <Activity className="text-blue-400/60" style={{ width: `clamp(1.5rem, ${4 * responsiveScale}vw, 5rem)`, height: `clamp(1.5rem, ${4 * responsiveScale}vw, 5rem)` }} />
                  </div>
                  <p className={`text-slate-200 text-center font-bold drop-shadow-lg transition-opacity duration-500 ${
                    waitingPhraseVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ 
                    fontSize: `clamp(0.875rem, ${1.8 * responsiveScale}vw, 2.5rem)`,
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  }}>
                    {WAITING_PHRASES[currentWaitingPhraseIndex]}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Doctor Call - 3D Modern Card - Fully responsive for landscape TV */}
          <div className={`glass-3d tv-card tv-card-3d flex flex-col transition-all duration-500 ${
            announcingType === 'doctor' 
              ? 'animate-border-glow-intense animate-card-zoom-call relative z-20' 
              : announcingType === 'triage'
                ? 'border border-emerald-500/30 opacity-30'
                : 'border border-emerald-500/30 hover:border-emerald-400/50'
          } ${currentDoctorCall ? 'animate-card-pop' : ''}`}
          style={{
            borderWidth: announcingType === 'doctor' ? `clamp(2px, ${0.3 * responsiveScale}vw, 4px)` : undefined,
            boxShadow: announcingType === 'doctor' ? `0 0 clamp(20px, ${3 * responsiveScale}vw, 60px) clamp(5px, ${1 * responsiveScale}vw, 20px) rgba(16,185,129,0.4)` : undefined,
          }}>
            {/* Header with animated gradient */}
            <div className={`shrink-0 relative overflow-hidden ${
              announcingType === 'doctor' ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500' : 'animate-doctor-shift'
            }`}
            style={{
              padding: `clamp(0.125rem, ${0.5 * responsiveScale}vw, 0.75rem) clamp(0.25rem, ${0.8 * responsiveScale}vw, 1.5rem)`,
            }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
              <p className="tv-font-heading text-white font-bold flex items-center relative z-10 drop-shadow-lg"
                 style={{ 
                   gap: `clamp(0.125rem, ${0.5 * responsiveScale}vw, 1rem)`,
                   fontSize: `clamp(0.625rem, ${1.2 * responsiveScale}vw, 1.5rem)`,
                 }}>
                <Stethoscope className={`shrink-0 ${announcingType === 'doctor' ? 'animate-pulse' : 'animate-doctor-icon'}`} 
                style={{ width: `clamp(0.625rem, ${1.5 * responsiveScale}vw, 2rem)`, height: `clamp(0.625rem, ${1.5 * responsiveScale}vw, 2rem)`, filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))' }} />
                <span className="drop-shadow-md">{announcingType === 'doctor' ? '🔔 CHAMANDO!' : 'CONSULTÓRIO'}</span>
                {announcingType === 'doctor' && (
                  <Megaphone className="text-white animate-megaphone-shake ml-auto shrink-0 drop-shadow-lg" 
                             style={{ width: `clamp(0.625rem, ${1.5 * responsiveScale}vw, 2rem)`, height: `clamp(0.625rem, ${1.5 * responsiveScale}vw, 2rem)` }} />
                )}
              </p>
            </div>
            <div className="flex items-center justify-center flex-1 relative"
                 style={{ padding: `clamp(0.25rem, ${1 * responsiveScale}vw, 1.5rem)`, minHeight: `clamp(3.75rem, ${15 * responsiveScale}vw, 13.75rem)` }}>
              <div className={`absolute inset-0 pointer-events-none ${announcingType === 'doctor' ? 'bg-gradient-to-b from-yellow-500/20 to-transparent' : 'bg-gradient-to-b from-emerald-500/5 to-transparent'}`} />
              {currentDoctorCall ? (
                <div className={`text-center w-full transition-all duration-300 relative z-10 ${announcingType === 'doctor' ? 'scale-105' : ''}`}>
                  <h2 className={`tv-font-display break-words transition-all duration-300 ${getNameFontSize(currentDoctorCall.name)} ${announcingType === 'doctor' ? 'text-yellow-300 animate-name-mega-pulse' : 'shimmer-text animate-text-reveal'}`} 
                      style={{ 
                        wordBreak: 'break-word', 
                        letterSpacing: '0.08em', 
                        fontWeight: 900,
                        textShadow: '0 4px 8px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.2)',
                      }} key={currentDoctorCall.name}>
                    {formatPatientName(currentDoctorCall.name)}
                  </h2>
                  <p className={`tv-font-body font-black drop-shadow-lg tracking-widest uppercase ${announcingType === 'doctor' ? 'text-yellow-200' : 'text-emerald-300'}`}
                     style={{ 
                       marginTop: `clamp(0.5rem, ${1.2 * responsiveScale}vw, 2rem)`, 
                       fontSize: `clamp(1rem, ${2.5 * responsiveScale}vw, 3.5rem)`,
                       textShadow: '0 2px 6px rgba(0,0,0,0.6)',
                     }}>
                    {currentDoctorCall.destination || 'Consultório'}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/10 flex items-center justify-center animate-pulse"
                       style={{ width: `clamp(3rem, ${8 * responsiveScale}vw, 10rem)`, height: `clamp(3rem, ${8 * responsiveScale}vw, 10rem)`, marginBottom: `clamp(0.25rem, ${0.6 * responsiveScale}vw, 1rem)` }}>
                    <Stethoscope className="text-emerald-400/60" style={{ width: `clamp(1.5rem, ${4 * responsiveScale}vw, 5rem)`, height: `clamp(1.5rem, ${4 * responsiveScale}vw, 5rem)` }} />
                  </div>
                  <p className={`text-slate-200 text-center font-bold drop-shadow-lg transition-opacity duration-500 ${waitingPhraseVisible ? 'opacity-100' : 'opacity-0'}`}
                     style={{ 
                       fontSize: `clamp(0.875rem, ${1.8 * responsiveScale}vw, 2.5rem)`,
                       textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                     }}>
                    {WAITING_PHRASES[currentWaitingPhraseIndex]}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Calls Carousel */}
        <RecentCallsCarousel
          historyItems={historyItems}
          currentTime={currentTime}
          maskNameAfterOneMinute={maskNameAfterOneMinute}
          isAnnouncing={!!announcingType}
        />
      </div>

      {/* CNN-Style News Ticker */}
      <CNNStyleNewsTicker
        newsItems={newsItems}
        commercialPhrases={commercialPhrases}
        currentTime={currentTime}
        isAnnouncing={!!announcingType}
      />

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
      <div className="fixed bottom-14 sm:bottom-16 lg:bottom-20 xl:bottom-24 3xl:bottom-28 right-1 sm:right-2 lg:right-4 z-50 group">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-full bg-slate-800/0 group-hover:bg-slate-800/90 border sm:border-2 border-transparent group-hover:border-red-500/50 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
          title="Sair do modo TV"
        >
          <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <LogOut className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 text-red-400" />
            <span className="text-[6px] sm:text-[7px] lg:text-[8px] xl:text-[9px] text-red-400 font-medium">SAIR</span>
          </div>
        </button>
      </div>

      {/* Audio Test Button - Discrete */}
    </div>
  );
}
