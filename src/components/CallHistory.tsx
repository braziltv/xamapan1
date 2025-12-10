import { CallHistory as CallHistoryType } from '@/types/patient';
import { History, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CallHistoryProps {
  history: CallHistoryType[];
}

export function CallHistory({ history }: CallHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-health border border-border">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Histórico</h3>
        </div>
        <p className="text-muted-foreground text-center py-4">
          Nenhuma chamada realizada
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 shadow-health border border-border">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Últimas Chamadas</h3>
      </div>

      <div className="space-y-2">
        {history.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-fade-in"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="font-mono text-lg font-bold text-primary min-w-[48px]">
              {item.patient.ticket}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm">
                {item.patient.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.room}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {format(item.calledAt, 'HH:mm', { locale: ptBR })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
