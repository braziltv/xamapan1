import { Patient, CallHistory as CallHistoryType } from '@/types/patient';
import { Volume2, Clock, Stethoscope, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';

interface PublicDisplayProps {
  currentTriageCall: Patient | null;
  currentDoctorCall: Patient | null;
  history: CallHistoryType[];
}

export function PublicDisplay({ currentTriageCall, currentDoctorCall, history }: PublicDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

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
            <p className="text-slate-400 text-xl">Unidade Básica de Saúde</p>
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
                    Por favor, dirija-se à Triagem
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
                    Por favor, dirija-se ao Consultório
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
            {history.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-xl">
                Nenhuma chamada ainda
              </p>
            ) : (
              history.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl ${index === 0 ? 'bg-primary/20 border-2 border-primary/40 ring-2 ring-primary/20' : 'bg-slate-700/50'} transition-all`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      item.calledBy === 'triage' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}>
                      {item.calledBy === 'triage' ? (
                        <Activity className="w-6 h-6 text-white" />
                      ) : (
                        <Stethoscope className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-xl truncate">
                        {item.patient.name}
                      </p>
                      <p className="text-lg text-slate-400">
                        {item.calledBy === 'triage' ? 'Triagem' : 'Médico'}
                      </p>
                    </div>
                    <span className="text-lg text-slate-400 font-mono">
                      {format(item.calledAt, 'HH:mm')}
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
