import { Volume2, Clock, Stethoscope, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PublicDisplayProps {
  currentTriageCall?: any;
  currentDoctorCall?: any;
  history?: any[];
}


export function PublicDisplay(_props: PublicDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentTriageCall, setCurrentTriageCall] = useState<{ name: string; destination?: string } | null>(null);
  const [currentDoctorCall, setCurrentDoctorCall] = useState<{ name: string; destination?: string } | null>(null);
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; name: string; type: string; time: Date }>>([]);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const [unitName, setUnitName] = useState(() => localStorage.getItem('selectedUnitName') || '');

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-fuchsia-900 to-rose-900 p-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-yellow-400 flex items-center justify-center shadow-2xl shadow-fuchsia-500/50 animate-pulse">
            <Volume2 className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
          <div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-yellow-300 drop-shadow-lg">
              PAINEL DE CHAMADAS
            </h1>
            <p className="text-white/80 text-2xl font-medium mt-1">{unitName || 'Unidade de Saúde'}</p>
          </div>
        </div>
        <div className="text-right bg-white/10 backdrop-blur-xl rounded-3xl px-8 py-4 border border-white/20 shadow-xl">
          <p className="text-7xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-300">
            {format(currentTime, 'HH:mm')}
          </p>
          <p className="text-white/70 text-xl font-medium">
            {format(currentTime, "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-8 h-[calc(100vh-220px)]">
        {/* Current Calls - Main Area */}
        <div className="col-span-2 grid grid-rows-2 gap-8">
          {/* Triage Call */}
          <div className="rounded-[2rem] overflow-hidden backdrop-blur-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border-2 border-cyan-400/50 shadow-2xl shadow-cyan-500/30">
            <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 p-6">
              <p className="text-white text-3xl font-black flex items-center gap-4 drop-shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Activity className="w-8 h-8" />
                </div>
                🏥 TRIAGEM
              </p>
            </div>
            <div className="p-10 flex items-center justify-center h-[calc(100%-96px)]">
              {currentTriageCall ? (
                <div className="text-center">
                  <h2 className="text-8xl font-black text-white tracking-wide drop-shadow-2xl animate-pulse">
                    {currentTriageCall.name}
                  </h2>
                  <div className="mt-6 inline-block bg-gradient-to-r from-cyan-400 to-blue-500 px-8 py-3 rounded-full">
                    <p className="text-2xl text-white font-bold">
                      👉 Dirija-se à {currentTriageCall.destination || 'Triagem'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-4xl text-white/50 font-medium">
                    ⏳ Aguardando próxima chamada...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Doctor Call */}
          <div className="rounded-[2rem] overflow-hidden backdrop-blur-xl bg-gradient-to-br from-emerald-500/30 to-teal-600/30 border-2 border-emerald-400/50 shadow-2xl shadow-emerald-500/30">
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 p-6">
              <p className="text-white text-3xl font-black flex items-center gap-4 drop-shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Stethoscope className="w-8 h-8" />
                </div>
                👨‍⚕️ CONSULTÓRIO MÉDICO
              </p>
            </div>
            <div className="p-10 flex items-center justify-center h-[calc(100%-96px)]">
              {currentDoctorCall ? (
                <div className="text-center">
                  <h2 className="text-8xl font-black text-white tracking-wide drop-shadow-2xl animate-pulse">
                    {currentDoctorCall.name}
                  </h2>
                  <div className="mt-6 inline-block bg-gradient-to-r from-emerald-400 to-teal-500 px-8 py-3 rounded-full">
                    <p className="text-2xl text-white font-bold">
                      👉 Dirija-se ao {currentDoctorCall.destination || 'Consultório'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-4xl text-white/50 font-medium">
                    ⏳ Aguardando próxima chamada...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History Panel */}
        <div className="rounded-[2rem] backdrop-blur-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 border-2 border-fuchsia-400/40 p-6 overflow-hidden shadow-2xl shadow-fuchsia-500/20">
          <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            📋 Últimas Chamadas
          </h3>
          <div className="space-y-4 overflow-y-auto h-[calc(100%-80px)] pr-2">
            {historyItems.length === 0 ? (
              <p className="text-white/40 text-center py-8 text-xl">
                Nenhuma chamada ainda
              </p>
            ) : (
              historyItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl backdrop-blur-sm transition-all duration-300 ${
                    index === 0 
                      ? 'bg-gradient-to-r from-yellow-500/40 to-orange-500/40 border-2 border-yellow-400/60 shadow-lg shadow-yellow-500/30 scale-105' 
                      : 'bg-white/10 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                      item.type === 'triage' 
                        ? 'bg-gradient-to-br from-cyan-400 to-blue-600' 
                        : 'bg-gradient-to-br from-emerald-400 to-teal-600'
                    }`}>
                      {item.type === 'triage' ? (
                        <Activity className="w-6 h-6 text-white" />
                      ) : (
                        <Stethoscope className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-lg truncate">
                        {item.name}
                      </p>
                      <p className="text-sm text-white/60">
                        {item.type === 'triage' ? '🏥 Triagem' : '👨‍⚕️ Médico'}
                      </p>
                    </div>
                    <span className="text-lg text-white/80 font-mono font-bold bg-white/10 px-3 py-1 rounded-lg">
                      {format(item.time, 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
