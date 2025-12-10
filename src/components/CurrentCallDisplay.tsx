import { Patient } from '@/types/patient';
import { Volume2, RefreshCw, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CurrentCallDisplayProps {
  currentCall: Patient | null;
  onRecall: () => void;
  onMarkAttended: (id: string) => void;
  onMarkMissed: (id: string) => void;
}

export function CurrentCallDisplay({ 
  currentCall, 
  onRecall,
  onMarkAttended,
  onMarkMissed 
}: CurrentCallDisplayProps) {
  if (!currentCall) {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-health-lg border border-border">
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Volume2 className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold text-muted-foreground">
            Aguardando chamada
          </h2>
          <p className="text-muted-foreground mt-2">
            Selecione um paciente da fila para chamar
          </p>
        </div>
      </div>
    );
  }

  const priorityStyles = {
    normal: 'bg-health-blue',
    priority: 'bg-health-amber',
    emergency: 'bg-health-red',
  };

  const priorityLabels = {
    normal: 'Normal',
    priority: 'Prioridade',
    emergency: 'Emergência',
  };

  return (
    <div className="bg-card rounded-2xl shadow-health-xl border border-border overflow-hidden animate-scale-in">
      {/* Header with priority indicator */}
      <div className={`${priorityStyles[currentCall.priority]} px-6 py-3`}>
        <span className="text-sm font-semibold text-primary-foreground uppercase tracking-wide">
          {priorityLabels[currentCall.priority]} • {currentCall.service}
        </span>
      </div>

      {/* Main content */}
      <div className="p-8">
        {/* Ticket number - Large display */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center bg-primary/10 rounded-2xl px-8 py-4 mb-4">
            <span className="font-mono text-8xl font-bold text-primary tracking-tight">
              {currentCall.ticket}
            </span>
          </div>
        </div>

        {/* Patient name */}
        <h2 className="text-4xl font-bold text-foreground text-center mb-4 animate-fade-in">
          {currentCall.name}
        </h2>

        {/* Room - Prominent display */}
        <div className="bg-accent/10 rounded-xl p-4 mb-6">
          <p className="text-center">
            <span className="text-lg text-muted-foreground">Dirija-se ao</span>
            <br />
            <span className="text-3xl font-bold text-accent animate-blink">
              {currentCall.room}
            </span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={onRecall}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Chamar Novamente
          </Button>
          <Button
            onClick={() => onMarkAttended(currentCall.id)}
            className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            size="lg"
          >
            <Check className="w-5 h-5" />
            Atendido
          </Button>
          <Button
            onClick={() => onMarkMissed(currentCall.id)}
            variant="destructive"
            size="lg"
            className="gap-2"
          >
            <X className="w-5 h-5" />
            Não Compareceu
          </Button>
        </div>
      </div>
    </div>
  );
}
