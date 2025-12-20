import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  Clock,
  Trash2,
  RefreshCw,
  XCircle,
  BarChart3,
  History
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subHours, startOfHour } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface ErrorLog {
  id: string;
  module: string;
  label: string;
  error_message: string;
  unit_name: string;
  created_at: string;
}

interface HourlyData {
  hour: string;
  count: number;
  label: string;
}

export function ErrorHistoryPanel() {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalErrors24h, setTotalErrors24h] = useState(0);

  const loadErrorHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load last 24 hours of errors
      const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();
      
      const { data, error } = await supabase
        .from('system_error_logs')
        .select('*')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setErrorLogs(data || []);
      setTotalErrors24h(data?.length || 0);

      // Aggregate by hour for chart
      const hourlyMap = new Map<string, number>();
      
      // Initialize last 24 hours
      for (let i = 23; i >= 0; i--) {
        const hour = startOfHour(subHours(new Date(), i));
        const hourKey = format(hour, 'HH:00');
        hourlyMap.set(hourKey, 0);
      }

      // Count errors per hour
      (data || []).forEach(log => {
        const hourKey = format(new Date(log.created_at), 'HH:00');
        hourlyMap.set(hourKey, (hourlyMap.get(hourKey) || 0) + 1);
      });

      // Convert to array for chart
      const chartData: HourlyData[] = [];
      hourlyMap.forEach((count, hour) => {
        chartData.push({
          hour,
          count,
          label: `${hour}: ${count} erro${count !== 1 ? 's' : ''}`
        });
      });

      setHourlyData(chartData);
    } catch (error) {
      console.error('Error loading error history:', error);
      toast.error('Erro ao carregar histórico de erros');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearOldErrors = useCallback(async () => {
    try {
      const fortyEightHoursAgo = subHours(new Date(), 48).toISOString();
      
      const { error } = await supabase
        .from('system_error_logs')
        .delete()
        .lt('created_at', fortyEightHoursAgo);

      if (error) throw error;

      toast.success('Erros antigos removidos');
      loadErrorHistory();
    } catch (error) {
      console.error('Error clearing old errors:', error);
      toast.error('Erro ao limpar erros antigos');
    }
  }, [loadErrorHistory]);

  useEffect(() => {
    loadErrorHistory();

    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(loadErrorHistory, 30000);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('error-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_error_logs'
        },
        () => {
          loadErrorHistory();
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [loadErrorHistory]);

  const getBarColor = (count: number) => {
    if (count === 0) return 'hsl(var(--muted))';
    if (count <= 2) return 'hsl(48, 96%, 53%)'; // Yellow
    if (count <= 5) return 'hsl(25, 95%, 53%)'; // Orange
    return 'hsl(0, 84%, 60%)'; // Red
  };

  const moduleColors: Record<string, string> = {
    database: 'bg-blue-500',
    storage: 'bg-purple-500',
    system: 'bg-gray-500',
  };

  const getModuleColor = (module: string) => {
    if (module.startsWith('table_')) return 'bg-amber-500';
    if (module.includes('tts') || module.includes('google')) return 'bg-green-500';
    if (module.includes('cleanup') || module.includes('compact')) return 'bg-cyan-500';
    return moduleColors[module] || 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-destructive" />
          <h3 className="text-lg font-semibold">Histórico de Erros</h3>
          {totalErrors24h > 0 && (
            <Badge variant="destructive">{totalErrors24h} nas últimas 24h</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearOldErrors}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Limpar (+48h)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadErrorHistory}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Erros por Hora (Últimas 24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 10 }}
                  interval={2}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as HourlyData;
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                          <p className="font-medium">{data.hour}</p>
                          <p className="text-muted-foreground">
                            {data.count} erro{data.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {hourlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.count)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Últimos Erros Registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum erro registrado nas últimas 24 horas</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {errorLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant="secondary" 
                          className={`${getModuleColor(log.module)} text-white text-xs`}
                        >
                          {log.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {log.error_message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive">{totalErrors24h}</p>
            <p className="text-xs text-muted-foreground">Erros (24h)</p>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-500">
              {new Set(errorLogs.map(e => e.module)).size}
            </p>
            <p className="text-xs text-muted-foreground">Módulos</p>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {hourlyData.filter(h => h.count > 0).length}
            </p>
            <p className="text-xs text-muted-foreground">Horas c/ erros</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Function to save error to database (exported for use in SystemMonitoringPanel)
export async function saveErrorToHistory(
  module: string,
  label: string,
  errorMessage: string,
  unitName: string = 'sistema'
) {
  try {
    await supabase
      .from('system_error_logs')
      .insert({
        module,
        label,
        error_message: errorMessage,
        unit_name: unitName
      });
  } catch (error) {
    console.error('Failed to save error to history:', error);
  }
}
