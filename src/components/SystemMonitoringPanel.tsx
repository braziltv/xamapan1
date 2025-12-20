import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Server,
  Database,
  HardDrive,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  MessageSquare,
  Cloud,
  Trash2,
  Volume2,
  Newspaper,
  CloudSun,
  Megaphone,
  FileText,
  Activity,
  Loader2,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface SystemStatus {
  database: 'online' | 'offline' | 'checking';
  edgeFunctions: Record<string, 'online' | 'offline' | 'checking'>;
  storage: {
    ttsCacheFiles: number;
    permanentFiles: number;
    tempFiles: number;
    hourFiles: number;
    totalSizeMB: number;
  };
  tables: {
    patientCalls: number;
    callHistory: number;
    newsCache: number;
    weatherCache: number;
    scheduledAnnouncements: number;
    commercialPhrases: number;
    unitSettings: number;
    appointments: number;
    chatMessages: number;
    statisticsDaily: number;
    ttsNameUsage: number;
    apiKeyUsage: number;
  };
  lastUpdate: Date;
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

export function SystemMonitoringPanel() {
  const [status, setStatus] = useState<SystemStatus>({
    database: 'checking',
    edgeFunctions: {},
    storage: { ttsCacheFiles: 0, permanentFiles: 0, tempFiles: 0, hourFiles: 0, totalSizeMB: 0 },
    tables: {
      patientCalls: 0,
      callHistory: 0,
      newsCache: 0,
      weatherCache: 0,
      scheduledAnnouncements: 0,
      commercialPhrases: 0,
      unitSettings: 0,
      appointments: 0,
      chatMessages: 0,
      statisticsDaily: 0,
      ttsNameUsage: 0,
      apiKeyUsage: 0,
    },
    lastUpdate: new Date(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const checkDatabaseStatus = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('unit_settings')
        .select('*', { count: 'exact', head: true });
      
      return error ? 'offline' : 'online';
    } catch {
      return 'offline';
    }
  }, []);

  const checkEdgeFunction = useCallback(async (functionName: string): Promise<'online' | 'offline'> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: 'OPTIONS',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      return response.ok || response.status === 204 ? 'online' : 'offline';
    } catch {
      return 'offline';
    }
  }, []);

  const loadTableCounts = useCallback(async (): Promise<SystemStatus['tables']> => {
    const counts: SystemStatus['tables'] = {
      patientCalls: 0,
      callHistory: 0,
      newsCache: 0,
      weatherCache: 0,
      scheduledAnnouncements: 0,
      commercialPhrases: 0,
      unitSettings: 0,
      appointments: 0,
      chatMessages: 0,
      statisticsDaily: 0,
      ttsNameUsage: 0,
      apiKeyUsage: 0,
    };

    const [
      patientCallsResult,
      callHistoryResult,
      newsCacheResult,
      weatherCacheResult,
      scheduledAnnouncementsResult,
      commercialPhrasesResult,
      unitSettingsResult,
      appointmentsResult,
      chatMessagesResult,
      statisticsDailyResult,
      ttsNameUsageResult,
      apiKeyUsageResult,
    ] = await Promise.all([
      supabase.from('patient_calls').select('*', { count: 'exact', head: true }),
      supabase.from('call_history').select('*', { count: 'exact', head: true }),
      supabase.from('news_cache').select('*', { count: 'exact', head: true }),
      supabase.from('weather_cache').select('*', { count: 'exact', head: true }),
      supabase.from('scheduled_announcements').select('*', { count: 'exact', head: true }),
      supabase.from('scheduled_commercial_phrases').select('*', { count: 'exact', head: true }),
      supabase.from('unit_settings').select('*', { count: 'exact', head: true }),
      supabase.from('appointments').select('*', { count: 'exact', head: true }),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
      supabase.from('statistics_daily').select('*', { count: 'exact', head: true }),
      supabase.from('tts_name_usage').select('*', { count: 'exact', head: true }),
      supabase.from('api_key_usage').select('*', { count: 'exact', head: true }),
    ]);

    counts.patientCalls = patientCallsResult.count || 0;
    counts.callHistory = callHistoryResult.count || 0;
    counts.newsCache = newsCacheResult.count || 0;
    counts.weatherCache = weatherCacheResult.count || 0;
    counts.scheduledAnnouncements = scheduledAnnouncementsResult.count || 0;
    counts.commercialPhrases = commercialPhrasesResult.count || 0;
    counts.unitSettings = unitSettingsResult.count || 0;
    counts.appointments = appointmentsResult.count || 0;
    counts.chatMessages = chatMessagesResult.count || 0;
    counts.statisticsDaily = statisticsDailyResult.count || 0;
    counts.ttsNameUsage = ttsNameUsageResult.count || 0;
    counts.apiKeyUsage = apiKeyUsageResult.count || 0;

    return counts;
  }, []);

  const loadStorageInfo = useCallback(async () => {
    try {
      const { data: files } = await supabase.storage
        .from('tts-cache')
        .list('', { limit: 1000 });

      if (!files) return { ttsCacheFiles: 0, permanentFiles: 0, tempFiles: 0, hourFiles: 0, totalSizeMB: 0 };

      const permanentFiles = files.filter(f => f.name.startsWith('phrase_')).length;
      const tempFiles = files.filter(f => f.name.startsWith('part_') || f.name.startsWith('tts_')).length;
      const hourFiles = files.filter(f => f.name.startsWith('hora_')).length;
      const totalSize = files.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);

      return {
        ttsCacheFiles: files.length,
        permanentFiles,
        tempFiles,
        hourFiles,
        totalSizeMB: parseFloat((totalSize / 1024 / 1024).toFixed(2)),
      };
    } catch {
      return { ttsCacheFiles: 0, permanentFiles: 0, tempFiles: 0, hourFiles: 0, totalSizeMB: 0 };
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      // Check database
      const dbStatus = await checkDatabaseStatus();
      
      // Check edge functions in parallel
      const edgeFunctionStatuses: Record<string, 'online' | 'offline' | 'checking'> = {};
      await Promise.all(
        EDGE_FUNCTIONS.map(async (fn) => {
          edgeFunctionStatuses[fn.name] = await checkEdgeFunction(fn.name);
        })
      );

      // Load table counts
      const tableCounts = await loadTableCounts();

      // Load storage info
      const storageInfo = await loadStorageInfo();

      setStatus({
        database: dbStatus as 'online' | 'offline',
        edgeFunctions: edgeFunctionStatuses,
        storage: storageInfo,
        tables: tableCounts,
        lastUpdate: new Date(),
      });
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast.error('Erro ao atualizar status do sistema');
    } finally {
      setIsRefreshing(false);
    }
  }, [checkDatabaseStatus, checkEdgeFunction, loadTableCounts, loadStorageInfo]);

  const cleanTTSCache = useCallback(async () => {
    setIsCleaningCache(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-tts-cache`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Cache limpo: ${result.message}`);
        await refreshStatus();
      } else {
        toast.error('Erro ao limpar cache');
      }
    } catch (error) {
      console.error('Error cleaning cache:', error);
      toast.error('Erro ao limpar cache TTS');
    } finally {
      setIsCleaningCache(false);
    }
  }, [refreshStatus]);

  // Initial load and auto-refresh
  useEffect(() => {
    refreshStatus();
    
    if (autoRefresh) {
      const interval = setInterval(refreshStatus, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [refreshStatus, autoRefresh]);

  const getStatusIcon = (status: 'online' | 'offline' | 'checking') => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusBadge = (status: 'online' | 'offline' | 'checking') => {
    switch (status) {
      case 'online':
        return <Badge variant="default" className="bg-green-500">Online</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      case 'checking':
        return <Badge variant="secondary">Verificando...</Badge>;
    }
  };

  const onlineCount = Object.values(status.edgeFunctions).filter(s => s === 'online').length;
  const totalFunctions = EDGE_FUNCTIONS.length;
  const healthPercentage = totalFunctions > 0 ? (onlineCount / totalFunctions) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Monitoramento do Sistema</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'text-green-600' : 'text-muted-foreground'}
          >
            <Zap className="w-4 h-4 mr-1" />
            Auto
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStatus}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Last Update */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        Última atualização: {format(status.lastUpdate, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Saúde do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Serviços Ativos</span>
            <span className="text-sm font-medium">{onlineCount}/{totalFunctions}</span>
          </div>
          <Progress value={healthPercentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{healthPercentage.toFixed(0)}% operacional</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                {status.database === 'online' ? (
                  <Wifi className="w-3 h-3 text-green-500" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-500" />
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4" />
              Banco de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              {getStatusBadge(status.database)}
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-500" />
                <span>Pacientes: {status.tables.patientCalls}</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-green-500" />
                <span>Histórico: {status.tables.callHistory}</span>
              </div>
              <div className="flex items-center gap-1">
                <Newspaper className="w-3 h-3 text-orange-500" />
                <span>Notícias: {status.tables.newsCache}</span>
              </div>
              <div className="flex items-center gap-1">
                <CloudSun className="w-3 h-3 text-cyan-500" />
                <span>Clima: {status.tables.weatherCache}</span>
              </div>
              <div className="flex items-center gap-1">
                <Megaphone className="w-3 h-3 text-purple-500" />
                <span>Anúncios: {status.tables.scheduledAnnouncements}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-pink-500" />
                <span>Chat: {status.tables.chatMessages}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-amber-500" />
                <span>Frases: {status.tables.commercialPhrases}</span>
              </div>
              <div className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-indigo-500" />
                <span>TTS Nomes: {status.tables.ttsNameUsage}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Armazenamento TTS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total</span>
              <Badge variant="outline">{status.storage.totalSizeMB} MB</Badge>
            </div>
            <Separator />
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Arquivos totais:</span>
                <span className="font-medium">{status.storage.ttsCacheFiles}</span>
              </div>
              <div className="flex justify-between">
                <span>Cache permanente (frases):</span>
                <span className="font-medium">{status.storage.permanentFiles}</span>
              </div>
              <div className="flex justify-between">
                <span>Cache temporário (nomes):</span>
                <span className="font-medium">{status.storage.tempFiles}</span>
              </div>
              <div className="flex justify-between">
                <span>Áudios de hora:</span>
                <span className="font-medium">{status.storage.hourFiles}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={cleanTTSCache}
              disabled={isCleaningCache}
            >
              {isCleaningCache ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              Limpar Cache (7 dias)
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Edge Functions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Edge Functions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {EDGE_FUNCTIONS.map((fn) => (
                <div
                  key={fn.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status.edgeFunctions[fn.name] || 'checking')}
                    <span className="text-sm">{fn.label}</span>
                  </div>
                  <Badge
                    variant={status.edgeFunctions[fn.name] === 'online' ? 'default' : 'destructive'}
                    className={status.edgeFunctions[fn.name] === 'online' ? 'bg-green-500' : ''}
                  >
                    {status.edgeFunctions[fn.name] === 'online' ? 'OK' : 
                     status.edgeFunctions[fn.name] === 'offline' ? 'Erro' : '...'}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Na Fila</p>
              <p className="text-lg font-bold">{status.tables.patientCalls}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Histórico</p>
              <p className="text-lg font-bold">{status.tables.callHistory}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">TTS Cache</p>
              <p className="text-lg font-bold">{status.storage.ttsCacheFiles}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Anúncios</p>
              <p className="text-lg font-bold">{status.tables.scheduledAnnouncements}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
