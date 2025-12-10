import { Patient, CallHistory as CallHistoryType } from '@/types/patient';
import { Volume2, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';

interface PublicDisplayProps {
  currentCall: Patient | null;
  history: CallHistoryType[];
}

export function PublicDisplay({ currentCall, history }: PublicDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-health flex items-center justify-center shadow-glow">
            <Volume2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Painel de Chamadas
            </h1>
            <p className="text-muted-foreground">Unidade Básica de Saúde</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold text-foreground">
            {format(currentTime, 'HH:mm')}
          </p>
          <p className="text-muted-foreground">
            {format(currentTime, "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-180px)]">
        {/* Current Call - Main Display */}
        <div className="col-span-2">
          {currentCall ? (
            <div className="h-full bg-card rounded-3xl shadow-health-xl border border-border overflow-hidden animate-scale-in">
              <div className="gradient-health p-6">
                <p className="text-primary-foreground/80 text-xl font-medium">
                  CHAMANDO AGORA
                </p>
              </div>
              <div className="p-12 flex flex-col items-center justify-center h-[calc(100%-88px)]">
                <div className="bg-primary/10 rounded-3xl px-16 py-8 mb-8">
                  <span className="font-mono text-[10rem] font-bold text-primary leading-none">
                    {currentCall.ticket}
                  </span>
                </div>
                <h2 className="text-5xl font-bold text-foreground text-center mb-6">
                  {currentCall.name}
                </h2>
                <div className="flex items-center gap-3 bg-accent/10 px-8 py-4 rounded-2xl">
                  <MapPin className="w-8 h-8 text-accent" />
                  <span className="text-4xl font-bold text-accent animate-blink">
                    {currentCall.room}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-card rounded-3xl shadow-health-xl border border-border flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="w-16 h-16 text-muted-foreground" />
                </div>
                <h2 className="text-4xl font-semibold text-muted-foreground">
                  Aguardando próxima chamada
                </h2>
              </div>
            </div>
          )}
        </div>

        {/* History Panel */}
        <div className="bg-card rounded-3xl shadow-health-lg border border-border p-6 overflow-hidden">
          <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Últimas Chamadas
          </h3>
          <div className="space-y-3 overflow-y-auto h-[calc(100%-60px)]">
            {history.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma chamada ainda
              </p>
            ) : (
              history.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl ${index === 0 ? 'bg-primary/10 border-2 border-primary/30' : 'bg-muted/50'} animate-fade-in`}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-3xl font-bold text-primary">
                      {item.patient.ticket}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {item.patient.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.room}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
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
