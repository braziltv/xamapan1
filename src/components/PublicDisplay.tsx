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

  const speakName = useCallback((name: string, caller: 'triage' | 'doctor', destination?: string) => {
    const location = destination || (caller === 'triage' ? 'Triagem' : 'Consultório Médico');
    const utterance = new SpeechSynthesisUtterance(
      `${name}. Por favor, dirija-se ao ${location}.`
    );
    utterance.lang = 'pt-BR';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
            <Volume2 className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">
              Painel de Chamadas
            </h1>
            <p className="text-slate-400 text-xl">{unitName || 'Unidade de Saúde'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-6xl font-mono font-bold text-white">
            {format(currentTime, 'HH:mm')}
          </p>
          <p className="text-slate-400 text-xl">
            {format(currentTime, "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Current Calls - Main Area */}
        <div className="col-span-2 grid grid-rows-2 gap-6">
          {/* Triage Call */}
          <div className="bg-slate-800/50 rounded-3xl border border-slate-700 overflow-hidden backdrop-blur-sm">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-5">
              <p className="text-white text-2xl font-bold flex items-center gap-3">
                <Activity className="w-8 h-8" />
                TRIAGEM
              </p>
            </div>
            <div className="p-8 flex items-center justify-center h-[calc(100%-80px)]">
              {currentTriageCall ? (
                <div className="text-center animate-pulse">
                  <h2 className="text-7xl font-bold text-white tracking-wide">
                    {currentTriageCall.name}
                  </h2>
                  <p className="text-3xl text-blue-400 mt-4 font-medium">
                    Por favor, dirija-se à {currentTriageCall.destination || 'Triagem'}
                  </p>
                </div>
              ) : (
                <p className="text-3xl text-slate-500">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>

          {/* Doctor Call */}
          <div className="bg-slate-800/50 rounded-3xl border border-slate-700 overflow-hidden backdrop-blur-sm">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-5">
              <p className="text-white text-2xl font-bold flex items-center gap-3">
                <Stethoscope className="w-8 h-8" />
                CONSULTÓRIO MÉDICO
              </p>
            </div>
            <div className="p-8 flex items-center justify-center h-[calc(100%-80px)]">
              {currentDoctorCall ? (
                <div className="text-center animate-pulse">
                  <h2 className="text-7xl font-bold text-white tracking-wide">
                    {currentDoctorCall.name}
                  </h2>
                  <p className="text-3xl text-emerald-400 mt-4 font-medium">
                    Por favor, dirija-se ao {currentDoctorCall.destination || 'Consultório'}
                  </p>
                </div>
              ) : (
                <p className="text-3xl text-slate-500">
                  Aguardando próxima chamada...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* History Panel */}
        <div className="bg-slate-800/50 rounded-3xl border border-slate-700 p-6 overflow-hidden backdrop-blur-sm">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Clock className="w-7 h-7 text-primary" />
            Últimas Chamadas
          </h3>
          <div className="space-y-4 overflow-y-auto h-[calc(100%-80px)]">
            {historyItems.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-xl">
                Nenhuma chamada ainda
              </p>
            ) : (
              historyItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl ${index === 0 ? 'bg-primary/20 border-2 border-primary/40 ring-2 ring-primary/20' : 'bg-slate-700/50'} transition-all`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      item.type === 'triage' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}>
                      {item.type === 'triage' ? (
                        <Activity className="w-6 h-6 text-white" />
                      ) : (
                        <Stethoscope className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-xl truncate">
                        {item.name}
                      </p>
                      <p className="text-lg text-slate-400">
                        {item.type === 'triage' ? 'Triagem' : 'Médico'}
                      </p>
                    </div>
                    <span className="text-lg text-slate-400 font-mono">
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
