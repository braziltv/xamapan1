import { Volume2, Clock, Stethoscope, Activity, Newspaper, Maximize, Minimize } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeatherWidget } from './WeatherWidget';

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentTriageCall, setCurrentTriageCall] = useState<{ name: string; destination?: string } | null>(null);
  const [currentDoctorCall, setCurrentDoctorCall] = useState<{ name: string; destination?: string } | null>(null);
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; name: string; type: string; time: Date }>>([]);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const [unitName, setUnitName] = useState(() => localStorage.getItem('selectedUnitName') || '');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [lastNewsUpdate, setLastNewsUpdate] = useState<Date | null>(null);
  const [newsCountdown, setNewsCountdown] = useState(5 * 60); // 5 minutes in seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenButton, setShowFullscreenButton] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Play notification sound effect
  const playNotificationSound = useCallback(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant chime sound
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
      
      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    };
    
    // Play a three-tone chime (ascending)
    playTone(523.25, 0, 0.3);      // C5
    playTone(659.25, 0.15, 0.3);   // E5
    playTone(783.99, 0.3, 0.4);    // G5
    
    // Return promise that resolves after the chime
    return new Promise<void>(resolve => setTimeout(resolve, 800));
  }, []);

  const speakName = useCallback(async (name: string, caller: 'triage' | 'doctor', destination?: string) => {
    // Play notification sound first
    await playNotificationSound();
    
    const location = destination || (caller === 'triage' ? 'Triagem' : 'Consultório Médico');
    const utterance = new SpeechSynthesisUtterance(
      `${name}. Por favor, dirija-se ao ${location}.`
    );
    utterance.lang = 'pt-BR';
    utterance.rate = 0.85;
    utterance.pitch = 1.2;
    
    // Try to select a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.lang.includes('pt') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('feminino') || v.name.includes('Luciana') || v.name.includes('Vitória') || v.name.includes('Maria'))
    ) || voices.find(v => v.lang.includes('pt-BR'));
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [playNotificationSound]);

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

      // Fetch history - same filtering logic
      let historyQuery = supabase
        .from('call_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

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
          const call = payload.new as any;
          
          // Skip empty unit_name calls
          if (!call.unit_name) return;
          // If we have a unit filter, only accept matching calls
          if (unitName && call.unit_name !== unitName) return;
          if (processedCallsRef.current.has(call.id)) return;
          processedCallsRef.current.add(call.id);

          if (call.status === 'active') {
            if (call.call_type === 'triage') {
              setCurrentTriageCall({ name: call.patient_name, destination: call.destination || undefined });
            } else {
              setCurrentDoctorCall({ name: call.patient_name, destination: call.destination || undefined });
            }
            
            // Play audio announcement
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
          }, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitName, speakName]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  // Listen for fullscreen changes (e.g., ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      
      if (isNowFullscreen) {
        // Start 60 second timer to hide button
        setShowFullscreenButton(true);
        hideButtonTimeoutRef.current = setTimeout(() => {
          setShowFullscreenButton(false);
        }, 60000);
      } else {
        // Show button when exiting fullscreen
        setShowFullscreenButton(true);
        if (hideButtonTimeoutRef.current) {
          clearTimeout(hideButtonTimeoutRef.current);
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (hideButtonTimeoutRef.current) {
        clearTimeout(hideButtonTimeoutRef.current);
      }
    };
  }, []);

  // Show button on mouse move in fullscreen, then hide after 5 seconds of inactivity
  useEffect(() => {
    if (!isFullscreen) return;

    let inactivityTimeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowFullscreenButton(true);
      
      // Clear existing timeout
      if (hideButtonTimeoutRef.current) {
        clearTimeout(hideButtonTimeoutRef.current);
      }
      clearTimeout(inactivityTimeout);
      
      // Hide after 5 seconds of no movement
      inactivityTimeout = setTimeout(() => {
        setShowFullscreenButton(false);
      }, 5000);
    };

    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(inactivityTimeout);
    };
  }, [isFullscreen]);

  // Keyboard shortcut F11 for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6 lg:p-8 relative overflow-hidden"
    >
      {/* Fullscreen Toggle Button */}
      <button
        onClick={toggleFullscreen}
        className={`fixed top-4 right-4 z-50 bg-slate-800/90 hover:bg-slate-700 text-white p-4 rounded-2xl border border-slate-500 shadow-2xl transition-all duration-300 hover:scale-110 ${
          showFullscreenButton ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        title={isFullscreen ? 'Sair do modo tela cheia (ESC ou F11)' : 'Entrar em tela cheia (F11)'}
      >
        {isFullscreen ? (
          <Minimize className="w-8 h-8" />
        ) : (
          <Maximize className="w-8 h-8" />
        )}
      </button>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-48 md:w-72 lg:w-96 h-48 md:h-72 lg:h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-40 md:w-60 lg:w-80 h-40 md:h-60 lg:h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 mb-4 md:mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
            <Volume2 className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-white">
              Painel de Chamadas
            </h1>
            <p className="text-slate-400 text-sm md:text-lg lg:text-xl">{unitName || 'Unidade de Saúde'}</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Weather Widget */}
          <WeatherWidget />
          
          {/* Clock */}
          <div className="text-center md:text-right bg-slate-800/50 rounded-xl md:rounded-2xl px-6 py-3 md:px-8 md:py-4 border border-slate-700">
            <p className="text-4xl md:text-6xl lg:text-7xl font-mono font-bold text-white leading-none">
              {format(currentTime, 'HH:mm')}
            </p>
            <p className="text-lg md:text-2xl lg:text-3xl text-yellow-400 font-bold mt-1">
              {format(currentTime, "EEEE", { locale: ptBR }).charAt(0).toUpperCase() + format(currentTime, "EEEE", { locale: ptBR }).slice(1)}
            </p>
            <p className="text-sm md:text-xl lg:text-2xl text-slate-300 font-medium">
              {format(currentTime, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-auto lg:h-[calc(100vh-180px)]">
        {/* Current Calls - Main Area */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-4 md:gap-6">
          {/* Triage Call */}
          <div className="bg-slate-800/50 rounded-2xl md:rounded-3xl border border-slate-700 overflow-hidden backdrop-blur-sm">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-3 md:p-4 lg:p-5">
              <p className="text-white text-lg md:text-xl lg:text-2xl font-bold flex items-center gap-2 md:gap-3">
                <Activity className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" />
                TRIAGEM
              </p>
            </div>
            <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[120px] md:min-h-[150px] lg:min-h-[200px]">
              {currentTriageCall ? (
                <div className="text-center animate-pulse">
                  <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white tracking-wide">
                    {currentTriageCall.name}
                  </h2>
                  <p className="text-lg md:text-2xl lg:text-3xl text-blue-400 mt-2 md:mt-4 font-medium">
                    Por favor, dirija-se à {currentTriageCall.destination || 'Triagem'}
                  </p>
                </div>
              ) : (
                <p className="text-lg md:text-2xl lg:text-3xl text-slate-500">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>

          {/* Doctor Call */}
          <div className="bg-slate-800/50 rounded-2xl md:rounded-3xl border border-slate-700 overflow-hidden backdrop-blur-sm">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-3 md:p-4 lg:p-5">
              <p className="text-white text-lg md:text-xl lg:text-2xl font-bold flex items-center gap-2 md:gap-3">
                <Stethoscope className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" />
                CONSULTÓRIO MÉDICO
              </p>
            </div>
            <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[120px] md:min-h-[150px] lg:min-h-[200px]">
              {currentDoctorCall ? (
                <div className="text-center animate-pulse">
                  <h2 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white tracking-wide">
                    {currentDoctorCall.name}
                  </h2>
                  <p className="text-lg md:text-2xl lg:text-3xl text-emerald-400 mt-2 md:mt-4 font-medium">
                    Por favor, dirija-se ao {currentDoctorCall.destination || 'Consultório'}
                  </p>
                </div>
              ) : (
                <p className="text-lg md:text-2xl lg:text-3xl text-slate-500">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* History Panel */}
        <div className="bg-slate-800/50 rounded-2xl md:rounded-3xl border border-slate-700 p-4 md:p-6 overflow-hidden backdrop-blur-sm">
          <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
            <Clock className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-primary" />
            Últimas Chamadas
          </h3>
          <div className="space-y-3 md:space-y-4 overflow-y-auto max-h-[300px] lg:max-h-[calc(100%-80px)]">
            {historyItems.length === 0 ? (
              <p className="text-slate-500 text-center py-6 md:py-8 text-base md:text-xl">
                Nenhuma chamada ainda
              </p>
            ) : (
              historyItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-3 md:p-4 lg:p-5 rounded-xl md:rounded-2xl ${
                    index === 0 
                      ? 'bg-primary/20 border-2 border-primary/40 ring-2 ring-primary/20' 
                      : 'bg-slate-700/50'
                  } transition-all`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 ${
                      item.type === 'triage' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}>
                      {item.type === 'triage' ? (
                        <Activity className="w-4 h-4 md:w-6 md:h-6 text-white" />
                      ) : (
                        <Stethoscope className="w-4 h-4 md:w-6 md:h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-base md:text-lg lg:text-xl truncate">
                        {item.name}
                      </p>
                      <p className="text-sm md:text-base lg:text-lg text-slate-400">
                        {item.type === 'triage' ? 'Triagem' : 'Médico'}
                      </p>
                    </div>
                    <span className="text-sm md:text-base lg:text-lg text-slate-400 font-mono shrink-0">
                      {format(item.time, 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* News Ticker */}
      {newsItems.length > 0 && (
        <div className="relative z-10 mt-4 bg-gradient-to-r from-red-700 via-red-600 to-red-700 rounded-xl md:rounded-2xl overflow-hidden border border-red-500/50">
          <div className="flex items-center">
            <div className="bg-red-800 px-6 py-5 md:px-10 md:py-8 flex items-center gap-3 shrink-0 z-10">
              <Newspaper className="w-8 h-8 md:w-12 md:h-12 text-white" />
              <div className="flex flex-col">
                <span className="text-white font-bold text-xl md:text-3xl lg:text-4xl">NOTÍCIAS</span>
                <span className="text-red-200 text-xs md:text-sm">
                  Próxima atualização: {Math.floor(newsCountdown / 60)}:{(newsCountdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden py-5 md:py-8">
              <div className="animate-marquee whitespace-nowrap inline-flex">
                {newsItems.map((item, index) => (
                  <span key={index} className="text-3xl md:text-4xl lg:text-5xl mx-10 md:mx-16 inline-block text-white">
                    <span className={`px-4 py-2 rounded text-xl md:text-2xl lg:text-3xl font-bold mr-5 inline-block ${
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
                  <span key={`dup-${index}`} className="text-3xl md:text-4xl lg:text-5xl mx-10 md:mx-16 inline-block text-white">
                    <span className={`px-4 py-2 rounded text-xl md:text-2xl lg:text-3xl font-bold mr-5 inline-block ${
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

      {/* Credits */}
      <div className="relative z-10 mt-4 text-center">
        <p className="text-slate-400 text-sm md:text-base">
          Solução criada e cedida gratuitamente por Kalebe Gomes.
        </p>
      </div>
    </div>
  );
}
