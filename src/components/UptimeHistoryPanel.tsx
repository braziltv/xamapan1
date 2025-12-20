import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Trash2,
  BarChart3,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, subHours, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface HealthRecord {
  id: string;
  function_name: string;
  function_label: string;
  status: string;
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
}

interface UptimeStats {
  function_name: string;
  function_label: string;
  total_checks: number;
  online_checks: number;
  uptime_percentage: number;
  avg_response_time: number;
  last_status: string;
  last_check: string;
}

const EDGE_FUNCTIONS = [
  { name: 'google-cloud-tts', label: 'Google Cloud TTS' },
  { name: 'cleanup-duplicates', label: 'Limpeza Duplicatas' },
  { name: 'cleanup-patient-calls', label: 'Limpeza Chamados' },
  { name: 'cleanup-tts-cache', label: 'Limpeza Cache TTS' },
  { name: 'compact-statistics', label: 'Compactar Estatísticas' },
  { name: 'generate-hour-audio', label: 'Gerar Áudio Horas' },
  { name: 'update-cache', label: 'Atualizar Cache' },
];

export function UptimeHistoryPanel() {
  const [stats, setStats] = useState<UptimeStats[]>([]);
  const [recentHistory, setRecentHistory] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  const loadStats = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      // Determine time filter
      let startTime: Date;
      switch (timeRange) {
        case '1h':
          startTime = subHours(new Date(), 1);
          break;
        case '7d':
          startTime = subDays(new Date(), 7);
          break;
        default:
          startTime = subHours(new Date(), 24);
      }

      // Fetch health history
      const { data: historyData, error: historyError } = await supabase
        .from('edge_function_health_history')
        .select('*')
        .gte('checked_at', startTime.toISOString())
        .order('checked_at', { ascending: false });

      if (historyError) throw historyError;

      // Calculate stats for each function
      const statsMap = new Map<string, UptimeStats>();
      
      EDGE_FUNCTIONS.forEach(fn => {
        statsMap.set(fn.name, {
          function_name: fn.name,
          function_label: fn.label,
          total_checks: 0,
          online_checks: 0,
          uptime_percentage: 100,
          avg_response_time: 0,
          last_status: 'unknown',
          last_check: '',
        });
      });

      if (historyData && historyData.length > 0) {
        const responseTimesByFunction = new Map<string, number[]>();

        historyData.forEach((record: HealthRecord) => {
          const stat = statsMap.get(record.function_name);
          if (stat) {
            stat.total_checks++;
            if (record.status === 'online') {
              stat.online_checks++;
            }
            
            // Track response times
            if (record.response_time_ms) {
              if (!responseTimesByFunction.has(record.function_name)) {
                responseTimesByFunction.set(record.function_name, []);
              }
              responseTimesByFunction.get(record.function_name)!.push(record.response_time_ms);
            }

            // Update last status (first record is most recent due to ordering)
            if (!stat.last_check) {
              stat.last_status = record.status;
              stat.last_check = record.checked_at;
            }
          }
        });

        // Calculate uptime percentages and avg response times
        statsMap.forEach((stat, name) => {
          if (stat.total_checks > 0) {
            stat.uptime_percentage = (stat.online_checks / stat.total_checks) * 100;
          }
          
          const responseTimes = responseTimesByFunction.get(name);
          if (responseTimes && responseTimes.length > 0) {
            stat.avg_response_time = Math.round(
              responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            );
          }
        });

        setRecentHistory(historyData.slice(0, 50));
      }

      setStats(Array.from(statsMap.values()));
    } catch (error) {
      console.error('Error loading uptime stats:', error);
      toast.error('Erro ao carregar estatísticas de uptime');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [timeRange]);

  const cleanupOldHistory = async () => {
    try {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      const { error } = await supabase
        .from('edge_function_health_history')
        .delete()
        .lt('checked_at', sevenDaysAgo);

      if (error) throw error;
      
      toast.success('Histórico antigo removido');
      loadStats();
    } catch (error) {
      console.error('Error cleaning up history:', error);
      toast.error('Erro ao limpar histórico');
    }
  };

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const getUptimeColor = (percentage: number) => {
    if (percentage >= 99) return 'text-green-500';
    if (percentage >= 95) return 'text-yellow-500';
    if (percentage >= 90) return 'text-orange-500';
    return 'text-red-500';
  };

  const getUptimeBadge = (percentage: number) => {
    if (percentage >= 99) return <Badge className="bg-green-500">Excelente</Badge>;
    if (percentage >= 95) return <Badge className="bg-yellow-500">Bom</Badge>;
    if (percentage >= 90) return <Badge className="bg-orange-500">Regular</Badge>;
    return <Badge variant="destructive">Crítico</Badge>;
  };

  const overallUptime = stats.length > 0
    ? stats.reduce((sum, s) => sum + s.uptime_percentage, 0) / stats.length
    : 100;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Histórico de Uptime</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cleanupOldHistory}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Limpar +7 dias
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStats}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Time Range Tabs */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as '1h' | '24h' | '7d')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="1h">Última Hora</TabsTrigger>
          <TabsTrigger value="24h">24 Horas</TabsTrigger>
          <TabsTrigger value="7d">7 Dias</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Overall Uptime Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Uptime Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-3xl font-bold ${getUptimeColor(overallUptime)}`}>
              {overallUptime.toFixed(2)}%
            </span>
            {getUptimeBadge(overallUptime)}
          </div>
          <Progress 
            value={overallUptime} 
            className="h-3"
          />
          <p className="text-xs text-muted-foreground">
            Média de uptime de todas as {stats.length} edge functions
          </p>
        </CardContent>
      </Card>

      {/* Individual Function Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Status por Função
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-80">
            <div className="space-y-3">
              {stats.map((stat) => (
                <div
                  key={stat.function_name}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {stat.last_status === 'online' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : stat.last_status === 'offline' ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">{stat.function_label}</span>
                    </div>
                    <span className={`font-bold ${getUptimeColor(stat.uptime_percentage)}`}>
                      {stat.uptime_percentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={stat.uptime_percentage} 
                    className="h-1.5 mb-2"
                  />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {stat.online_checks}
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-500" />
                        {stat.total_checks - stat.online_checks}
                      </span>
                      {stat.avg_response_time > 0 && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {stat.avg_response_time}ms
                        </span>
                      )}
                    </div>
                    {stat.last_check && (
                      <span>
                        {formatDistanceToNow(new Date(stat.last_check), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Histórico Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-60">
            {recentHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum registro de health check encontrado
              </p>
            ) : (
              <div className="space-y-2">
                {recentHistory.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2 rounded border text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {record.status === 'online' ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500" />
                      )}
                      <span className="font-medium">{record.function_label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {record.response_time_ms && (
                        <span>{record.response_time_ms}ms</span>
                      )}
                      <span>
                        {format(new Date(record.checked_at), 'HH:mm:ss', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
