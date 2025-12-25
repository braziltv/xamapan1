import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  Globe,
  Clock,
  Phone,
  MessageSquare,
  Tv,
  Monitor,
  UserPlus,
  Volume2,
  RefreshCw,
  Activity,
  Loader2,
  Trash2,
  Smartphone,
  Laptop,
  Chrome,
  BarChart3,
  MapPin,
  Wifi,
  WifiOff,
  Timer,
  TrendingUp,
  Building2,
  CalendarDays,
  Eye,
  MousePointerClick,
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, differenceInMinutes, differenceInHours, startOfDay, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RotateCcw } from 'lucide-react';

interface UserSession {
  id: string;
  unit_name: string;
  station: string;
  ip_address: string | null;
  user_agent: string | null;
  is_tv_mode: boolean;
  login_at: string;
  last_activity_at: string;
  logout_at: string | null;
  is_active: boolean;
  voice_calls_count: number;
  tts_calls_count: number;
  registrations_count: number;
  messages_sent: number;
}

interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  isMobile: boolean;
  isTablet: boolean;
}

interface UnitStats {
  unitName: string;
  activeSessions: number;
  totalSessions: number;
  totalCalls: number;
  totalRegistrations: number;
  avgSessionDuration: number;
}

export function ActiveUsersPanel() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');

  // Get unique unit names from sessions
  const unitNames = useMemo(() => {
    const names = new Set(sessions.map(s => s.unit_name));
    return Array.from(names).sort();
  }, [sessions]);

  // Filter sessions by selected unit
  const filteredSessions = useMemo(() => {
    if (selectedUnit === 'all') return sessions;
    return sessions.filter(s => s.unit_name === selectedUnit);
  }, [sessions, selectedUnit]);

  const loadSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .order('login_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const cleanupInactiveSessions = useCallback(async () => {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('last_activity_at', thirtyMinutesAgo);

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      await supabase
        .from('user_sessions')
        .delete()
        .lt('login_at', sevenDaysAgo);

      toast.success('Limpeza concluída');
      await loadSessions();
    } catch (error) {
      console.error('Error cleaning sessions:', error);
      toast.error('Erro ao limpar sessões');
    }
  }, [loadSessions]);

  // Send remote reload command to all TVs
  const sendTvReloadCommand = useCallback(async (unitName?: string) => {
    try {
      const channel = supabase.channel('tv-commands');
      
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'reload',
            payload: { 
              command: 'reload',
              unit: unitName || 'all',
              timestamp: new Date().toISOString()
            }
          });
          
          toast.success(
            unitName 
              ? `Comando de reload enviado para TV: ${unitName}`
              : 'Comando de reload enviado para todas as TVs'
          );
          
          // Cleanup channel after sending
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1000);
        }
      });
    } catch (error) {
      console.error('Error sending TV reload command:', error);
      toast.error('Erro ao enviar comando de reload');
    }
  }, []);

  useEffect(() => {
    loadSessions();
    
    const channel = supabase
      .channel('user_sessions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_sessions' },
        () => loadSessions()
      )
      .subscribe();

    const interval = setInterval(loadSessions, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadSessions]);

  // Parse User Agent for detailed device info
  const parseUserAgent = useCallback((userAgent: string | null): DeviceInfo => {
    if (!userAgent) {
      return { browser: 'Desconhecido', browserVersion: '', os: 'Desconhecido', osVersion: '', device: 'Desconhecido', isMobile: false, isTablet: false };
    }

    let browser = 'Outro';
    let browserVersion = '';
    let os = 'Outro';
    let osVersion = '';
    let device = 'Desktop';
    let isMobile = false;
    let isTablet = false;

    // Browser detection
    if (userAgent.includes('Edg/')) {
      browser = 'Edge';
      const match = userAgent.match(/Edg\/(\d+\.?\d*)/);
      browserVersion = match ? match[1] : '';
    } else if (userAgent.includes('Chrome/')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.?\d*)/);
      browserVersion = match ? match[1] : '';
    } else if (userAgent.includes('Firefox/')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.?\d*)/);
      browserVersion = match ? match[1] : '';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+\.?\d*)/);
      browserVersion = match ? match[1] : '';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
      browser = 'Opera';
      const match = userAgent.match(/(?:Opera|OPR)\/(\d+\.?\d*)/);
      browserVersion = match ? match[1] : '';
    }

    // OS detection
    if (userAgent.includes('Windows NT 10')) {
      os = 'Windows';
      osVersion = '10/11';
    } else if (userAgent.includes('Windows NT 6.3')) {
      os = 'Windows';
      osVersion = '8.1';
    } else if (userAgent.includes('Windows NT 6.1')) {
      os = 'Windows';
      osVersion = '7';
    } else if (userAgent.includes('Mac OS X')) {
      os = 'macOS';
      const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
      osVersion = match ? match[1].replace('_', '.') : '';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
      const match = userAgent.match(/Android (\d+\.?\d*)/);
      osVersion = match ? match[1] : '';
      isMobile = true;
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
      const match = userAgent.match(/OS (\d+[._]\d+)/);
      osVersion = match ? match[1].replace('_', '.') : '';
      isMobile = userAgent.includes('iPhone');
      isTablet = userAgent.includes('iPad');
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('CrOS')) {
      os = 'ChromeOS';
    }

    // Device type
    if (isMobile) {
      device = 'Smartphone';
    } else if (isTablet) {
      device = 'Tablet';
    } else if (userAgent.includes('Mobile')) {
      device = 'Mobile';
      isMobile = true;
    }

    return { browser, browserVersion, os, osVersion, device, isMobile, isTablet };
  }, []);

  // Calculate statistics based on filtered sessions
  const stats = useMemo(() => {
    const activeSessions = filteredSessions.filter(s => s.is_active);
    const inactiveSessions = filteredSessions.filter(s => !s.is_active);
    const todaySessions = filteredSessions.filter(s => isToday(new Date(s.login_at)));
    const yesterdaySessions = filteredSessions.filter(s => isYesterday(new Date(s.login_at)));
    
    const totalVoiceCalls = filteredSessions.reduce((sum, s) => sum + (s.voice_calls_count || 0), 0);
    const totalTtsCalls = filteredSessions.reduce((sum, s) => sum + (s.tts_calls_count || 0), 0);
    const totalRegistrations = filteredSessions.reduce((sum, s) => sum + (s.registrations_count || 0), 0);
    const totalMessages = filteredSessions.reduce((sum, s) => sum + (s.messages_sent || 0), 0);

    // Calculate average session duration
    const completedSessions = filteredSessions.filter(s => s.logout_at);
    const totalDuration = completedSessions.reduce((sum, s) => {
      return sum + differenceInMinutes(new Date(s.logout_at!), new Date(s.login_at));
    }, 0);
    const avgDuration = completedSessions.length > 0 ? Math.round(totalDuration / completedSessions.length) : 0;

    // Unique IPs
    const uniqueIPs = new Set(filteredSessions.map(s => s.ip_address).filter(Boolean)).size;

    // Device breakdown
    const deviceBreakdown = filteredSessions.reduce((acc, s) => {
      const info = parseUserAgent(s.user_agent);
      acc[info.device] = (acc[info.device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Browser breakdown
    const browserBreakdown = filteredSessions.reduce((acc, s) => {
      const info = parseUserAgent(s.user_agent);
      acc[info.browser] = (acc[info.browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // OS breakdown
    const osBreakdown = filteredSessions.reduce((acc, s) => {
      const info = parseUserAgent(s.user_agent);
      acc[info.os] = (acc[info.os] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Stats by unit (use all sessions for unit breakdown, not filtered)
    const unitStats: UnitStats[] = [];
    const unitMap = new Map<string, { sessions: UserSession[] }>();
    
    sessions.forEach(s => {
      if (!unitMap.has(s.unit_name)) {
        unitMap.set(s.unit_name, { sessions: [] });
      }
      unitMap.get(s.unit_name)!.sessions.push(s);
    });

    unitMap.forEach((data, unitName) => {
      const unitActiveSessions = data.sessions.filter(s => s.is_active).length;
      const unitTotalCalls = data.sessions.reduce((sum, s) => sum + (s.voice_calls_count || 0) + (s.tts_calls_count || 0), 0);
      const unitTotalRegistrations = data.sessions.reduce((sum, s) => sum + (s.registrations_count || 0), 0);
      const completed = data.sessions.filter(s => s.logout_at);
      const duration = completed.reduce((sum, s) => sum + differenceInMinutes(new Date(s.logout_at!), new Date(s.login_at)), 0);
      
      unitStats.push({
        unitName,
        activeSessions: unitActiveSessions,
        totalSessions: data.sessions.length,
        totalCalls: unitTotalCalls,
        totalRegistrations: unitTotalRegistrations,
        avgSessionDuration: completed.length > 0 ? Math.round(duration / completed.length) : 0,
      });
    });

    // Station breakdown
    const stationBreakdown = filteredSessions.reduce((acc, s) => {
      acc[s.station] = (acc[s.station] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // TV mode vs regular
    const tvModeSessions = filteredSessions.filter(s => s.is_tv_mode).length;
    const regularSessions = filteredSessions.length - tvModeSessions;

    return {
      activeSessions,
      inactiveSessions,
      todaySessions,
      yesterdaySessions,
      totalVoiceCalls,
      totalTtsCalls,
      totalRegistrations,
      totalMessages,
      avgDuration,
      uniqueIPs,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      unitStats: unitStats.sort((a, b) => b.activeSessions - a.activeSessions),
      stationBreakdown,
      tvModeSessions,
      regularSessions,
    };
  }, [sessions, filteredSessions, parseUserAgent]);

  const getStationLabel = (station: string) => {
    const labels: Record<string, string> = {
      login: 'Login',
      cadastro: 'Cadastro',
      triagem: 'Triagem',
      medico: 'Médico',
      ecg: 'ECG',
      curativos: 'Curativos',
      raiox: 'Raio X',
      enfermaria: 'Enfermaria',
      administrativo: 'Admin',
      display: 'TV Display',
    };
    return labels[station] || station;
  };

  const getStationColor = (station: string) => {
    const colors: Record<string, string> = {
      login: 'bg-gray-500',
      cadastro: 'bg-blue-500',
      triagem: 'bg-orange-500',
      medico: 'bg-green-500',
      ecg: 'bg-pink-500',
      curativos: 'bg-amber-500',
      raiox: 'bg-purple-500',
      enfermaria: 'bg-cyan-500',
      administrativo: 'bg-red-500',
      display: 'bg-indigo-500',
    };
    return colors[station] || 'bg-muted';
  };

  const formatDuration = (loginAt: string, logoutAt: string | null) => {
    const start = new Date(loginAt);
    const end = logoutAt ? new Date(logoutAt) : new Date();
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;
    
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const getBrowserIcon = (browser: string) => {
    if (browser === 'Chrome') return <Chrome className="w-3 h-3" />;
    return <Globe className="w-3 h-3" />;
  };

  const getDeviceIcon = (device: string) => {
    if (device === 'Smartphone' || device === 'Mobile') return <Smartphone className="w-4 h-4" />;
    if (device === 'Tablet') return <Smartphone className="w-4 h-4" />;
    return <Laptop className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Monitoramento de Sessões</h3>
            <Badge variant="outline" className="text-xs">
              {stats.activeSessions.length} online
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Unit Filter */}
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as unidades</SelectItem>
                {unitNames.map(unit => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* TV Reload Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <RotateCcw className="w-4 h-4" />
                  <Tv className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Recarregar TVs Remotamente</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso enviará um comando para todas as TVs ativas recarregarem a página. 
                    Use para aplicar atualizações de código.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => sendTvReloadCommand()}>
                    Recarregar Todas as TVs
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button variant="outline" size="sm" onClick={cleanupInactiveSessions}>
              <Trash2 className="w-4 h-4 mr-1" />
              Limpar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setIsRefreshing(true); loadSessions(); }}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Summary Cards - Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-500/10">
                <Activity className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Online Agora</p>
                <p className="text-xl font-bold">{stats.activeSessions.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-500/10">
                <CalendarDays className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sessões Hoje</p>
                <p className="text-xl font-bold">{stats.todaySessions.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Phone className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Chamadas</p>
                <p className="text-xl font-bold">{stats.totalVoiceCalls + stats.totalTtsCalls}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10">
                <UserPlus className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cadastros</p>
                <p className="text-xl font-bold">{stats.totalRegistrations}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-cyan-500/10">
                <Timer className="w-4 h-4 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duração Média</p>
                <p className="text-xl font-bold">{stats.avgDuration}min</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-pink-500/10">
                <MapPin className="w-4 h-4 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IPs Únicos</p>
                <p className="text-xl font-bold">{stats.uniqueIPs}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="active">
              <Wifi className="w-4 h-4 mr-1" />
              Ativos ({stats.activeSessions.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="w-4 h-4 mr-1" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="units">
              <Building2 className="w-4 h-4 mr-1" />
              Por Unidade
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-1" />
              Análise
            </TabsTrigger>
          </TabsList>

          {/* Active Sessions Tab */}
          <TabsContent value="active" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  Sessões Ativas em Tempo Real
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {stats.activeSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <WifiOff className="w-8 h-8 mb-2" />
                      <p>Nenhuma sessão ativa no momento</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stats.activeSessions.map((session) => {
                        const deviceInfo = parseUserAgent(session.user_agent);
                        return (
                          <div
                            key={session.id}
                            className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {session.is_tv_mode ? (
                                    <Tv className="w-5 h-5 text-purple-500 flex-shrink-0" />
                                  ) : (
                                    getDeviceIcon(deviceInfo.device)
                                  )}
                                  <span className="font-semibold truncate">
                                    {session.unit_name}
                                  </span>
                                  <Badge className={`${getStationColor(session.station)} text-white text-xs`}>
                                    {getStationLabel(session.station)}
                                  </Badge>
                                </div>

                                {/* Device & Browser Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        {getBrowserIcon(deviceInfo.browser)}
                                        <span>{deviceInfo.browser} {deviceInfo.browserVersion.split('.')[0]}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Navegador: {deviceInfo.browser} v{deviceInfo.browserVersion}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Monitor className="w-3 h-3" />
                                        <span>{deviceInfo.os} {deviceInfo.osVersion}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Sistema: {deviceInfo.os} {deviceInfo.osVersion}</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Globe className="w-3 h-3" />
                                    <span className="font-mono text-xs">{session.ip_address || 'N/A'}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDuration(session.login_at, null)}</span>
                                  </div>
                                </div>

                                {/* Activity Stats */}
                                <div className="flex items-center gap-4 text-xs">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50">
                                        <Phone className="w-3 h-3 text-blue-500" />
                                        <span>{session.voice_calls_count} voz</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Chamadas de voz realizadas</TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50">
                                        <Volume2 className="w-3 h-3 text-purple-500" />
                                        <span>{session.tts_calls_count} TTS</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Chamadas TTS realizadas</TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50">
                                        <UserPlus className="w-3 h-3 text-orange-500" />
                                        <span>{session.registrations_count} cad</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Cadastros realizados</TooltipContent>
                                  </Tooltip>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50">
                                        <MessageSquare className="w-3 h-3 text-cyan-500" />
                                        <span>{session.messages_sent} msg</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Mensagens enviadas</TooltipContent>
                                  </Tooltip>
                                </div>

                                {/* Last Activity */}
                                <p className="text-xs text-muted-foreground mt-2">
                                  <Eye className="w-3 h-3 inline mr-1" />
                                  Última atividade: {formatDistanceToNow(new Date(session.last_activity_at), { locale: ptBR, addSuffix: true })}
                                  <span className="ml-2">•</span>
                                  <span className="ml-2">Login: {format(new Date(session.login_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                                </p>
                              </div>
                              
                              <div className="flex flex-col items-end gap-2">
                                <Badge className="bg-green-500 text-white animate-pulse">
                                  <Wifi className="w-3 h-3 mr-1" />
                                  Online
                                </Badge>
                                {session.is_tv_mode && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Tv className="w-3 h-3 mr-1" />
                                    TV Mode
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Histórico de Sessões Encerradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {stats.inactiveSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum histórico disponível
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stats.inactiveSessions.map((session) => {
                        const deviceInfo = parseUserAgent(session.user_agent);
                        return (
                          <div
                            key={session.id}
                            className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {session.is_tv_mode ? (
                                    <Tv className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    getDeviceIcon(deviceInfo.device)
                                  )}
                                  <span className="font-medium text-sm truncate max-w-[200px]">
                                    {session.unit_name.split(' ').slice(0, 3).join(' ')}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {getStationLabel(session.station)}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                                  <span>{deviceInfo.browser} • {deviceInfo.os}</span>
                                  <span>{session.ip_address || 'N/A'}</span>
                                  <span>Duração: {formatDuration(session.login_at, session.logout_at)}</span>
                                  <span>{session.voice_calls_count + session.tts_calls_count} chamadas</span>
                                </div>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>{format(new Date(session.login_at), "dd/MM HH:mm", { locale: ptBR })}</p>
                                {session.logout_at && (
                                  <p className="text-muted-foreground/60">
                                    até {format(new Date(session.logout_at), "HH:mm", { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Units Tab */}
          <TabsContent value="units" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Estatísticas por Unidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {stats.unitStats.map((unit) => (
                      <div key={unit.unitName} className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            <span className="font-medium truncate max-w-[250px]">{unit.unitName}</span>
                          </div>
                          {unit.activeSessions > 0 && (
                            <Badge className="bg-green-500 text-white">
                              {unit.activeSessions} online
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Total Sessões</p>
                            <p className="font-semibold">{unit.totalSessions}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Total Chamadas</p>
                            <p className="font-semibold">{unit.totalCalls}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Cadastros</p>
                            <p className="font-semibold">{unit.totalRegistrations}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Duração Média</p>
                            <p className="font-semibold">{unit.avgSessionDuration}min</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Atividade</span>
                            <span>{Math.round((unit.activeSessions / Math.max(unit.totalSessions, 1)) * 100)}%</span>
                          </div>
                          <Progress value={(unit.activeSessions / Math.max(unit.totalSessions, 1)) * 100} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Device Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Laptop className="w-4 h-4" />
                    Dispositivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.deviceBreakdown).sort((a, b) => b[1] - a[1]).map(([device, count]) => (
                      <div key={device} className="flex items-center gap-3">
                        {getDeviceIcon(device)}
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{device}</span>
                            <span className="text-muted-foreground">{count} ({Math.round((count / sessions.length) * 100)}%)</span>
                          </div>
                          <Progress value={(count / sessions.length) * 100} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Browser Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Chrome className="w-4 h-4" />
                    Navegadores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.browserBreakdown).sort((a, b) => b[1] - a[1]).map(([browser, count]) => (
                      <div key={browser} className="flex items-center gap-3">
                        {getBrowserIcon(browser)}
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{browser}</span>
                            <span className="text-muted-foreground">{count} ({Math.round((count / sessions.length) * 100)}%)</span>
                          </div>
                          <Progress value={(count / sessions.length) * 100} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* OS Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Sistemas Operacionais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.osBreakdown).sort((a, b) => b[1] - a[1]).map(([os, count]) => (
                      <div key={os} className="flex items-center gap-3">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{os}</span>
                            <span className="text-muted-foreground">{count} ({Math.round((count / sessions.length) * 100)}%)</span>
                          </div>
                          <Progress value={(count / sessions.length) * 100} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Station Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MousePointerClick className="w-4 h-4" />
                    Estações de Trabalho
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.stationBreakdown).sort((a, b) => b[1] - a[1]).map(([station, count]) => (
                      <div key={station} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStationColor(station)}`} />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{getStationLabel(station)}</span>
                            <span className="text-muted-foreground">{count} ({Math.round((count / sessions.length) * 100)}%)</span>
                          </div>
                          <Progress value={(count / sessions.length) * 100} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Mode Distribution */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Resumo Geral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <Tv className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                      <p className="text-2xl font-bold">{stats.tvModeSessions}</p>
                      <p className="text-xs text-muted-foreground">Sessões TV</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <Monitor className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">{stats.regularSessions}</p>
                      <p className="text-xs text-muted-foreground">Sessões Regulares</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <MessageSquare className="w-6 h-6 mx-auto mb-2 text-cyan-500" />
                      <p className="text-2xl font-bold">{stats.totalMessages}</p>
                      <p className="text-xs text-muted-foreground">Mensagens Totais</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-muted/30">
                      <Volume2 className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                      <p className="text-2xl font-bold">{stats.totalVoiceCalls}</p>
                      <p className="text-xs text-muted-foreground">Chamadas Voz</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {sessions.length} sessões totais • Atualizado {format(new Date(), "HH:mm:ss", { locale: ptBR })}
        </div>
      </div>
    </TooltipProvider>
  );
}
