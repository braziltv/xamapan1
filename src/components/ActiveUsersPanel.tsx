import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

export function ActiveUsersPanel() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .order('login_at', { ascending: false })
        .limit(50);

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
      // Mark sessions as inactive if no activity for 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('last_activity_at', thirtyMinutesAgo);

      // Delete sessions older than 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: deleteResult } = await supabase
        .from('user_sessions')
        .delete()
        .lt('login_at', sevenDaysAgo);

      toast.success('Limpeza concluída. Sessões antigas removidas.');
      await loadSessions();
    } catch (error) {
      console.error('Error cleaning sessions:', error);
      toast.error('Erro ao limpar sessões');
    }
  }, [loadSessions]);

  useEffect(() => {
    loadSessions();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('user_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_sessions',
        },
        () => {
          loadSessions();
        }
      )
      .subscribe();

    // Refresh every 60 seconds
    const interval = setInterval(loadSessions, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadSessions]);

  const activeSessions = sessions.filter(s => s.is_active);
  const inactiveSessions = sessions.filter(s => !s.is_active);
  
  const totalVoiceCalls = sessions.reduce((sum, s) => sum + (s.voice_calls_count || 0), 0);
  const totalTtsCalls = sessions.reduce((sum, s) => sum + (s.tts_calls_count || 0), 0);
  const totalRegistrations = sessions.reduce((sum, s) => sum + (s.registrations_count || 0), 0);
  const totalMessages = sessions.reduce((sum, s) => sum + (s.messages_sent || 0), 0);

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
      display: 'TV',
    };
    return labels[station] || station;
  };

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Desconhecido';
    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Desktop';
  };

  const formatDuration = (loginAt: string, logoutAt: string | null) => {
    const start = new Date(loginAt);
    const end = logoutAt ? new Date(logoutAt) : new Date();
    const diff = end.getTime() - start.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Usuários e Sessões</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cleanupInactiveSessions}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Limpar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsRefreshing(true);
              loadSessions();
            }}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Ativos Agora</p>
              <p className="text-lg font-bold">{activeSessions.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Chamadas Voz</p>
              <p className="text-lg font-bold">{totalVoiceCalls}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-xs text-muted-foreground">Chamadas TTS</p>
              <p className="text-lg font-bold">{totalTtsCalls}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Cadastros</p>
              <p className="text-lg font-bold">{totalRegistrations}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            Sessões Ativas ({activeSessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            {activeSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma sessão ativa no momento
              </p>
            ) : (
              <div className="space-y-2">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 rounded-lg bg-green-500/5 border border-green-500/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {session.is_tv_mode ? (
                            <Tv className="w-4 h-4 text-purple-500" />
                          ) : (
                            <Monitor className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="font-medium text-sm truncate max-w-[200px]">
                            {session.unit_name.split(' ')[0]}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getStationLabel(session.station)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            <span>{session.ip_address || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(session.login_at, null)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{session.voice_calls_count} chamadas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{session.messages_sent} msgs</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Última atividade: {formatDistanceToNow(new Date(session.last_activity_at), { locale: ptBR, addSuffix: true })}
                        </p>
                      </div>
                      <Badge className="bg-green-500 text-white">Online</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent Sessions History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Histórico de Sessões ({inactiveSessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-40">
            {inactiveSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum histórico de sessões
              </p>
            ) : (
              <div className="space-y-2">
                {inactiveSessions.slice(0, 20).map((session) => (
                  <div
                    key={session.id}
                    className="p-2 rounded-lg bg-muted/30 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {session.is_tv_mode ? (
                          <Tv className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <Monitor className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="truncate max-w-[150px]">
                          {session.unit_name.split(' ')[0]}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {getStationLabel(session.station)}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(session.login_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{session.ip_address || 'N/A'}</span>
                      <span>Duração: {formatDuration(session.login_at, session.logout_at)}</span>
                      <span>{session.voice_calls_count} chamadas</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <div className="text-xs text-muted-foreground text-center">
        Total: {sessions.length} sessões | {totalVoiceCalls} chamadas | {totalRegistrations} cadastros | {totalMessages} mensagens
      </div>
    </div>
  );
}
