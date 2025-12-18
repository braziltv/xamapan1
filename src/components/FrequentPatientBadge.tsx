import { RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatBrazilTime } from '@/hooks/useBrazilTime';

interface FrequentPatientBadgeProps {
  visitCount: number;
  lastVisit: string;
}

export function FrequentPatientBadge({ visitCount, lastVisit }: FrequentPatientBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full border border-purple-300 dark:border-purple-700 cursor-help">
            <RefreshCw className="w-3 h-3" />
            Frequente
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-sm">
            <p className="font-semibold text-purple-600 dark:text-purple-400">⚠️ Paciente Frequente</p>
            <p className="text-muted-foreground mt-1">
              <strong>{visitCount}</strong> visitas nos últimos 30 dias
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Última visita: {formatBrazilTime(new Date(lastVisit), 'dd/MM/yyyy')}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
