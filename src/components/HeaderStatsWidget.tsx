import { useEffect, useState } from 'react';
import { Users, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Stats {
  waitingCount: number;
  todayCalls: number;
  avgWaitTime: number;
}

interface HeaderStatsWidgetProps {
  unitName: string;
}

export function HeaderStatsWidget({ unitName }: HeaderStatsWidgetProps) {
  const [stats, setStats] = useState<Stats>({
    waitingCount: 0,
    todayCalls: 0,
    avgWaitTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_header_stats' as never, {
        target_unit: unitName,
      } as never);

      if (error) throw error;

      // RPC returns a single-row table
      const row: any = Array.isArray(data) ? data[0] : data;
      setStats({
        waitingCount: row?.waiting_count ?? 0,
        todayCalls: row?.today_calls ?? 0,
        avgWaitTime: row?.avg_wait_time ?? 0,
      });
    } catch (error) {
      console.error('Error fetching header stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Refresh every 2 minutes (was 30s)
    const interval = setInterval(fetchStats, 120000);

    // Debounce realtime triggers so bursts collapse into a single RPC call
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchStats, 1500);
    };

    const channel = supabase
      .channel('header-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_calls' }, triggerFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_history' }, triggerFetch)
      .subscribe();

    return () => {
      clearInterval(interval);
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [unitName]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 animate-pulse">
        <div className="h-8 w-16 bg-muted rounded" />
        <div className="h-8 w-16 bg-muted rounded" />
      </div>
    );
  }

  const statItems = [
    {
      icon: Users,
      value: stats.waitingCount,
      label: 'Aguardando',
      color: stats.waitingCount > 5 ? 'text-destructive' : stats.waitingCount > 0 ? 'text-amber-500' : 'text-green-500',
      bgColor: stats.waitingCount > 5 ? 'bg-destructive/10' : stats.waitingCount > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'
    },
    {
      icon: TrendingUp,
      value: stats.todayCalls,
      label: 'Chamadas Hoje',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      icon: Clock,
      value: `${stats.avgWaitTime}m`,
      label: 'Tempo Médio',
      color: stats.avgWaitTime > 30 ? 'text-destructive' : stats.avgWaitTime > 15 ? 'text-amber-500' : 'text-green-500',
      bgColor: stats.avgWaitTime > 30 ? 'bg-destructive/10' : stats.avgWaitTime > 15 ? 'bg-amber-500/10' : 'bg-green-500/10'
    }
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 lg:gap-2">
        {statItems.map((item, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <div 
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${item.bgColor} cursor-default transition-all hover:scale-105`}
              >
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className={`text-xs font-semibold ${item.color}`}>
                  {item.value}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{item.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
