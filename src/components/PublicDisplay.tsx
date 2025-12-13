import { Volume2, Clock, Stethoscope, Activity, Newspaper } from 'lucide-react';
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
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; name: string; type: string; time: Date; destination?: string }>>([]);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const [unitName, setUnitName] = useState(() => localStorage.getItem('selectedUnitName') || '');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [lastNewsUpdate, setLastNewsUpdate] = useState<Date | null>(null);
  const [newsCountdown, setNewsCountdown] = useState(5 * 60); // 5 minutes in seconds
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNewTriageCall, setIsNewTriageCall] = useState(false);
  const [isNewDoctorCall, setIsNewDoctorCall] = useState(false);
  const [speechActivated, setSpeechActivated] = useState(() => {
    // se já foi ativado nesta aba, mantém
    return window.sessionStorage.getItem('speechActivated') === 'true';
  });
  const [showActivatedMessage, setShowActivatedMessage] = useState(false);

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

  // Ensure voices are loaded
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
      }
    };

    loadVoices();
    
    // Chrome needs this event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Force reload voices periodically as fallback
    const interval = setInterval(loadVoices, 1000);
    return () => clearInterval(interval);
  }, []);

  // Escolhe a melhor voz em português, priorizando vozes locais (mais estáveis/offline)
  const getBestVoice = useCallback(() => {
    if (!('speechSynthesis' in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    const ptVoices = voices.filter(v => v.lang.toLowerCase().startsWith('pt'));
    
    console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
    console.log('Portuguese voices:', ptVoices.map(v => `${v.name} (${v.lang})`));

    if (ptVoices.length === 0) return null;

    // Evita priorizar vozes "Google" que dependem de rede
    const localPreferred = ptVoices.filter(v =>
      !v.name.toLowerCase().includes('google') &&
      !v.name.toLowerCase().includes('online')
    );

    const ordered = (localPreferred.length > 0 ? localPreferred : ptVoices);

    const priorityNames = [
      'luciana', 'vitória', 'vitoria', 'maria', 'fernanda', 'helena',
    ];

    for (const p of priorityNames) {
      const found = ordered.find(v => v.name.toLowerCase().includes(p));
      if (found) return found;
    }

    // Senão, devolve a primeira voz em pt-BR ou qualquer pt
    return (
      ordered.find(v => v.lang.toLowerCase() === 'pt-br') ||
      ordered[0]
    );
  }, []);

  const speakName = useCallback(async (name: string, caller: 'triage' | 'doctor', destination?: string) => {
    console.log('🔊 speakName called for:', name, caller, destination);

    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis API não suportada neste navegador.');
      await playNotificationSound();
      return;
    }
    
    // Toca primeiro o aviso sonoro
    await playNotificationSound();
    console.log('✅ Notification sound played');

    // Cancela qualquer fala pendente antes de iniciar a nova
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('Erro ao cancelar speechSynthesis:', e);
    }

    const location = destination || (caller === 'triage' ? 'Triagem' : 'Consultório Médico');
    const text = `${name}. Por favor, dirija-se ao ${location}.`;
    
    console.log('📢 Speaking:', text);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';

    const bestVoice = getBestVoice();
    console.log('🎤 Selected voice:', bestVoice?.name || 'default');

    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
    } else {
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
    }
    
    utterance.onstart = () => console.log('🎙️ Speech started');
    utterance.onend = () => console.log('🎙️ Speech ended');
    utterance.onerror = (event) => console.error('❌ Speech error:', event.error);

    try {
      window.speechSynthesis.speak(utterance);
      console.log('✅ Speech queued');
    } catch (e) {
      console.error('Erro ao chamar speak:', e);
    }
  }, [playNotificationSound, getBestVoice]);

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
        .limit(8);

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
          destination: h.destination || undefined,
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
              setIsNewTriageCall(true);
              setTimeout(() => setIsNewTriageCall(false), 10000); // Animation lasts 10 seconds
            } else {
              setCurrentDoctorCall({ name: call.patient_name, destination: call.destination || undefined });
              setIsNewDoctorCall(true);
              setTimeout(() => setIsNewDoctorCall(false), 10000); // Animation lasts 10 seconds
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
            destination: historyItem.destination || undefined,
          }, ...prev].slice(0, 8));
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

  const handleActivateSpeech = useCallback(() => {
    console.log('🟢 Ativando áudio do painel público');
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis API não suportada neste navegador.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const testUtterance = new SpeechSynthesisUtterance(
        'Sistema de chamadas por voz ativado.'
      );
      testUtterance.lang = 'pt-BR';
      testUtterance.onend = () => {
        console.log('✅ Teste de voz concluído');
      };
      testUtterance.onerror = (event) => {
        console.error('❌ Erro no teste de voz:', event.error);
      };

      window.speechSynthesis.speak(testUtterance);
      window.sessionStorage.setItem('speechActivated', 'true');
      
      // Mostra a mensagem de confirmação por 2 segundos
      setShowActivatedMessage(true);
      setTimeout(() => {
        setShowActivatedMessage(false);
        setSpeechActivated(true);
      }, 2000);
    } catch (e) {
      console.error('Erro ao ativar áudio de voz:', e);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-3 lg:p-4 relative overflow-hidden flex flex-col"
    >
      {/* Overlay grande para ativar áudio - desaparece após clicar */}
      {!speechActivated && !showActivatedMessage && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center animate-fade-in">
          <div className="text-center space-y-6 px-4">
            <Volume2 className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 text-emerald-400 mx-auto animate-pulse" />
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white">
              Ativar Chamadas por Voz
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-md mx-auto">
              Clique no botão abaixo para habilitar os avisos sonoros e de voz neste painel.
            </p>
            <button
              onClick={handleActivateSpeech}
              className="mt-4 px-8 py-4 sm:px-12 sm:py-5 lg:px-16 lg:py-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white text-xl sm:text-2xl lg:text-3xl font-bold shadow-2xl shadow-emerald-500/50 border-2 border-white/20 transition-all hover:scale-105 active:scale-95"
            >
              🔊 Ativar Áudio
            </button>
          </div>
        </div>
      )}

      {/* Mensagem de confirmação "Áudio ativado!" por 2 segundos */}
      {showActivatedMessage && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center animate-fade-in">
          <div className="text-center space-y-6 px-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto animate-scale-in">
              <Volume2 className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-emerald-400" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-emerald-400 animate-pulse">
              ✓ Áudio Ativado!
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300">
              O painel de chamadas está pronto.
            </p>
          </div>
        </div>
      )}

      {/* Indicador discreto de áudio ativo */}
      {speechActivated && (
        <div className="absolute z-20 top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm">
          <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
          <span className="text-[10px] sm:text-xs text-emerald-300 font-medium">Áudio ativo</span>
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
          
          {/* Clock - Modern design with seconds */}
          <div className="text-center bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl px-4 py-3 sm:px-6 lg:px-8 lg:py-4 border border-slate-600/50 shadow-2xl shadow-black/20 backdrop-blur-md">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-none tracking-tight" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {format(currentTime, 'HH:mm')}
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-semibold text-cyan-400 leading-none animate-pulse" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                :{format(currentTime, 'ss')}
              </span>
            </div>
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-yellow-400 font-bold mt-1 tracking-wide">
              {format(currentTime, "EEEE", { locale: ptBR }).charAt(0).toUpperCase() + format(currentTime, "EEEE", { locale: ptBR }).slice(1)}
            </p>
            <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-slate-300/90 font-medium">
              {format(currentTime, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Content - Landscape optimized: horizontal layout on wide screens */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 min-h-0">
        {/* Current Calls - Side by side on landscape */}
        <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {/* Triage Call */}
          <div className="bg-slate-800/50 rounded-xl lg:rounded-2xl border border-slate-700 overflow-hidden backdrop-blur-sm flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-2 lg:px-4 lg:py-3 shrink-0">
              <p className="text-white text-base sm:text-lg lg:text-xl xl:text-2xl font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                TRIAGEM
              </p>
            </div>
            <div className="p-3 sm:p-4 lg:p-6 flex items-center justify-center flex-1">
              {currentTriageCall ? (
                <div className={`text-center ${isNewTriageCall ? 'animate-call-attention' : ''}`}>
                  <h2 className={`text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold tracking-wide ${
                    isNewTriageCall 
                      ? 'text-yellow-300 animate-pulse drop-shadow-[0_0_30px_rgba(253,224,71,0.8)]' 
                      : 'text-white'
                  }`}>
                    {currentTriageCall.name}
                  </h2>
                  <p className={`text-base sm:text-lg lg:text-xl xl:text-2xl mt-1 sm:mt-2 font-medium ${
                    isNewTriageCall ? 'text-yellow-200 animate-pulse' : 'text-blue-400'
                  }`}>
                    Por favor, dirija-se à {currentTriageCall.destination || 'Triagem'}
                  </p>
                </div>
              ) : (
                <p className="text-base sm:text-lg lg:text-xl text-slate-500">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>

          {/* Doctor Call */}
          <div className="bg-slate-800/50 rounded-xl lg:rounded-2xl border border-slate-700 overflow-hidden backdrop-blur-sm flex flex-col">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-2 lg:px-4 lg:py-3 shrink-0">
              <p className="text-white text-base sm:text-lg lg:text-xl xl:text-2xl font-bold flex items-center gap-2">
                <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                CONSULTÓRIO MÉDICO
              </p>
            </div>
            <div className="p-3 sm:p-4 lg:p-6 flex items-center justify-center flex-1">
              {currentDoctorCall ? (
                <div className={`text-center ${isNewDoctorCall ? 'animate-call-attention' : ''}`}>
                  <h2 className={`text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold tracking-wide ${
                    isNewDoctorCall 
                      ? 'text-yellow-300 animate-pulse drop-shadow-[0_0_30px_rgba(253,224,71,0.8)]' 
                      : 'text-white'
                  }`}>
                    {currentDoctorCall.name}
                  </h2>
                  <p className={`text-base sm:text-lg lg:text-xl xl:text-2xl mt-1 sm:mt-2 font-medium ${
                    isNewDoctorCall ? 'text-yellow-200 animate-pulse' : 'text-emerald-400'
                  }`}>
                    Por favor, dirija-se ao {currentDoctorCall.destination || 'Consultório'}
                  </p>
                </div>
              ) : (
                <p className="text-base sm:text-lg lg:text-xl text-slate-500">
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
                        {item.destination || (item.type === 'triage' ? 'Triagem' : 'Consultório Médico')}
                      </p>
                    </div>
                    <span className="text-xs lg:text-sm text-slate-400 font-mono shrink-0">
                      {format(item.time, 'HH:mm')}
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

      {/* Credits - Minimal */}
      <div className="relative z-10 mt-1 text-center shrink-0">
        <p className="text-slate-500 text-[9px] sm:text-[10px] lg:text-xs">
          Solução criada por Kalebe Gomes
        </p>
      </div>
    </div>
  );
}
