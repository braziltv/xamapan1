import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Database, 
  Volume2, 
  Users, 
  Building2,
  Layers,
  MapPin,
  MessageSquare,
  History,
  Clock,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Monitor,
  Tv,
  Trash2,
  Eye,
  UserX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TestResult {
  name: string;
  category: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
  error?: string;
}

interface TestHistoryEntry {
  id: string;
  unit_name: string;
  executed_at: string;
  duration_ms: number | null;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  warning_tests: number;
  results: TestResult[];
}

interface UserSession {
  id: string;
  unit_name: string;
  station: string;
  ip_address: string | null;
  is_active: boolean | null;
  is_tv_mode: boolean | null;
  login_at: string;
  last_activity_at: string;
  logout_at: string | null;
  voice_calls_count: number | null;
  tts_calls_count: number | null;
  registrations_count: number | null;
  messages_sent: number | null;
}

export function SystemTestPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [testHistory, setTestHistory] = useState<TestHistoryEntry[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<TestHistoryEntry | null>(null);

  // Load test history and sessions on mount
  useEffect(() => {
    loadTestHistory();
    loadUserSessions();
  }, []);

  const loadTestHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('test_history')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      // Parse results from JSON
      const parsed = (data || []).map(entry => ({
        ...entry,
        results: (entry.results as unknown as TestResult[]) || []
      }));
      setTestHistory(parsed as TestHistoryEntry[]);
    } catch (err) {
      console.error('Error loading test history:', err);
      toast.error('Erro ao carregar histórico de testes');
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadUserSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .order('last_activity_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setUserSessions((data || []) as UserSession[]);
    } catch (err) {
      console.error('Error loading user sessions:', err);
      toast.error('Erro ao carregar sessões');
    } finally {
      setLoadingSessions(false);
    }
  };

  const saveTestHistory = async (testResults: TestResult[], durationMs: number) => {
    try {
      const passed = testResults.filter(r => r.status === 'success').length;
      const failed = testResults.filter(r => r.status === 'error').length;
      
      const { error } = await supabase.from('test_history').insert([{
        unit_name: 'sistema',
        duration_ms: durationMs,
        total_tests: testResults.length,
        passed_tests: passed,
        failed_tests: failed,
        warning_tests: 0,
        results: JSON.parse(JSON.stringify(testResults))
      }]);
      
      if (error) throw error;
      loadTestHistory();
    } catch (err) {
      console.error('Error saving test history:', err);
    }
  };

  const deleteTestHistoryEntry = async (id: string) => {
    try {
      const { error } = await supabase.from('test_history').delete().eq('id', id);
      if (error) throw error;
      toast.success('Registro de teste removido');
      loadTestHistory();
    } catch (err) {
      console.error('Error deleting test history:', err);
      toast.error('Erro ao remover registro');
    }
  };

  const clearAllTestHistory = async () => {
    try {
      const { error } = await supabase.from('test_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      toast.success('Histórico de testes limpo');
      setTestHistory([]);
    } catch (err) {
      console.error('Error clearing test history:', err);
      toast.error('Erro ao limpar histórico');
    }
  };

  const deleteUserSession = async (id: string) => {
    try {
      const { error } = await supabase.from('user_sessions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Sessão removida');
      loadUserSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
      toast.error('Erro ao remover sessão');
    }
  };

  const clearAllUserSessions = async () => {
    try {
      const { error } = await supabase.from('user_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      toast.success('Todas as sessões foram removidas');
      setUserSessions([]);
    } catch (err) {
      console.error('Error clearing sessions:', err);
      toast.error('Erro ao limpar sessões');
    }
  };

  const clearInactiveSessions = async () => {
    try {
      const { error } = await supabase.from('user_sessions').delete().eq('is_active', false);
      if (error) throw error;
      toast.success('Sessões inativas removidas');
      loadUserSessions();
    } catch (err) {
      console.error('Error clearing inactive sessions:', err);
      toast.error('Erro ao limpar sessões inativas');
    }
  };

  const updateResult = (name: string, updates: Partial<TestResult>) => {
    setResults(prev => prev.map(r => 
      r.name === name ? { ...r, ...updates } : r
    ));
  };

  const clearResults = () => {
    setResults([]);
    setStartTime(null);
    setEndTime(null);
  };

  const runTest = async (
    name: string, 
    testFn: () => Promise<{ success: boolean; message: string; error?: string }>
  ): Promise<boolean> => {
    const start = Date.now();
    updateResult(name, { status: 'running' });
    
    try {
      const result = await testFn();
      const duration = Date.now() - start;
      
      updateResult(name, {
        status: result.success ? 'success' : 'error',
        message: result.message,
        error: result.error,
        duration
      });
      
      return result.success;
    } catch (err) {
      const duration = Date.now() - start;
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      
      updateResult(name, {
        status: 'error',
        message: 'Exceção durante o teste',
        error: errorMessage,
        duration
      });
      
      return false;
    }
  };

  const tests: { name: string; category: string; fn: () => Promise<{ success: boolean; message: string; error?: string }> }[] = [
    // Database Connection Tests
    {
      name: 'Conexão com Banco de Dados',
      category: 'Banco de Dados',
      fn: async () => {
        const { data, error } = await supabase.from('units').select('id').limit(1);
        if (error) return { success: false, message: 'Falha na conexão', error: error.message };
        return { success: true, message: 'Conexão estabelecida com sucesso' };
      }
    },
    // Units Table Tests
    {
      name: 'Leitura de Unidades',
      category: 'Tabela: Units',
      fn: async () => {
        const { data, error, count } = await supabase.from('units').select('*', { count: 'exact' });
        if (error) return { success: false, message: 'Erro ao ler unidades', error: error.message };
        return { success: true, message: `${count || data?.length || 0} unidades encontradas` };
      }
    },
    {
      name: 'Inserção de Unidade (Teste)',
      category: 'Tabela: Units',
      fn: async () => {
        const testName = `teste_auto_${Date.now()}`;
        const { data, error } = await supabase.from('units')
          .insert({ name: testName, display_name: 'Unidade Teste Auto', password: '123456' })
          .select()
          .single();
        if (error) return { success: false, message: 'Erro ao inserir unidade', error: error.message };
        // Cleanup
        await supabase.from('units').delete().eq('id', data.id);
        return { success: true, message: 'Inserção e limpeza OK' };
      }
    },
    // Modules Table Tests
    {
      name: 'Leitura de Módulos',
      category: 'Tabela: Modules',
      fn: async () => {
        const { data, error } = await supabase.from('modules').select('*');
        if (error) return { success: false, message: 'Erro ao ler módulos', error: error.message };
        return { success: true, message: `${data?.length || 0} módulos encontrados` };
      }
    },
    // Operators Table Tests
    {
      name: 'Leitura de Operadores',
      category: 'Tabela: Operators',
      fn: async () => {
        const { data, error } = await supabase.from('operators').select('*');
        if (error) return { success: false, message: 'Erro ao ler operadores', error: error.message };
        return { success: true, message: `${data?.length || 0} operadores encontrados` };
      }
    },
    // Destinations Table Tests
    {
      name: 'Leitura de Destinos',
      category: 'Tabela: Destinations',
      fn: async () => {
        const { data, error } = await supabase.from('destinations').select('*');
        if (error) return { success: false, message: 'Erro ao ler destinos', error: error.message };
        return { success: true, message: `${data?.length || 0} destinos encontrados` };
      }
    },
    // Patient Calls Tests
    {
      name: 'Leitura de Chamadas de Pacientes',
      category: 'Tabela: Patient Calls',
      fn: async () => {
        const { data, error } = await supabase.from('patient_calls').select('*');
        if (error) return { success: false, message: 'Erro ao ler chamadas', error: error.message };
        return { success: true, message: `${data?.length || 0} chamadas ativas` };
      }
    },
    {
      name: 'Inserção de Paciente (Teste)',
      category: 'Tabela: Patient Calls',
      fn: async () => {
        const { data: units } = await supabase.from('units').select('name').limit(1).single();
        if (!units) return { success: false, message: 'Nenhuma unidade disponível', error: 'Cadastre uma unidade primeiro' };
        
        const { data, error } = await supabase.from('patient_calls')
          .insert({ 
            patient_name: 'TESTE AUTOMATIZADO', 
            unit_name: units.name,
            call_type: 'registration',
            status: 'waiting'
          })
          .select()
          .single();
        if (error) return { success: false, message: 'Erro ao inserir paciente', error: error.message };
        // Cleanup
        await supabase.from('patient_calls').delete().eq('id', data.id);
        return { success: true, message: 'Inserção e limpeza OK' };
      }
    },
    // Call History Tests
    {
      name: 'Leitura de Histórico',
      category: 'Tabela: Call History',
      fn: async () => {
        const { data, error, count } = await supabase.from('call_history')
          .select('*', { count: 'exact' })
          .limit(10);
        if (error) return { success: false, message: 'Erro ao ler histórico', error: error.message };
        return { success: true, message: `${count || 0} registros no histórico` };
      }
    },
    // Chat Messages Tests
    {
      name: 'Leitura de Mensagens do Chat',
      category: 'Tabela: Chat Messages',
      fn: async () => {
        const { data, error } = await supabase.from('chat_messages').select('*').limit(10);
        if (error) return { success: false, message: 'Erro ao ler mensagens', error: error.message };
        return { success: true, message: `${data?.length || 0} mensagens recentes` };
      }
    },
    // TTS Phrases Tests
    {
      name: 'Leitura de Frases TTS',
      category: 'Tabela: TTS Phrases',
      fn: async () => {
        const { data, error } = await supabase.from('tts_phrases').select('*');
        if (error) return { success: false, message: 'Erro ao ler frases TTS', error: error.message };
        return { success: true, message: `${data?.length || 0} frases configuradas` };
      }
    },
    // Scheduled Announcements Tests
    {
      name: 'Leitura de Anúncios Programados',
      category: 'Tabela: Announcements',
      fn: async () => {
        const { data, error } = await supabase.from('scheduled_announcements').select('*');
        if (error) return { success: false, message: 'Erro ao ler anúncios', error: error.message };
        const active = data?.filter(a => a.is_active).length || 0;
        return { success: true, message: `${data?.length || 0} anúncios (${active} ativos)` };
      }
    },
    // User Sessions Tests
    {
      name: 'Leitura de Sessões de Usuário',
      category: 'Tabela: User Sessions',
      fn: async () => {
        const { data, error } = await supabase.from('user_sessions')
          .select('*')
          .eq('is_active', true);
        if (error) return { success: false, message: 'Erro ao ler sessões', error: error.message };
        return { success: true, message: `${data?.length || 0} sessões ativas` };
      }
    },
    // Session Filtering Test
    {
      name: 'Filtro de Sessões por Unidade',
      category: 'Tabela: User Sessions',
      fn: async () => {
        const { data: units } = await supabase.from('units').select('name').limit(1).single();
        if (!units) return { success: false, message: 'Nenhuma unidade disponível', error: 'Cadastre uma unidade primeiro' };
        
        const { data, error } = await supabase.from('user_sessions')
          .select('*')
          .eq('unit_name', units.name)
          .eq('is_active', true);
        if (error) return { success: false, message: 'Erro ao filtrar sessões', error: error.message };
        return { success: true, message: `${data?.length || 0} sessões ativas na unidade ${units.name}` };
      }
    },
    // Session IP and User Agent Test
    {
      name: 'Dados de Conexão (IP/User Agent)',
      category: 'Tabela: User Sessions',
      fn: async () => {
        const { data, error } = await supabase.from('user_sessions')
          .select('ip_address, user_agent')
          .eq('is_active', true)
          .limit(5);
        if (error) return { success: false, message: 'Erro ao ler dados de conexão', error: error.message };
        const withIP = data?.filter(s => s.ip_address).length || 0;
        const withUA = data?.filter(s => s.user_agent).length || 0;
        return { success: true, message: `${withIP} com IP, ${withUA} com User Agent` };
      }
    },
    // Session Statistics Test
    {
      name: 'Estatísticas de Sessões por Unidade',
      category: 'Tabela: User Sessions',
      fn: async () => {
        const { data, error } = await supabase.from('user_sessions')
          .select('unit_name, is_active');
        if (error) return { success: false, message: 'Erro ao calcular estatísticas', error: error.message };
        const units = [...new Set(data?.map(s => s.unit_name))];
        const active = data?.filter(s => s.is_active).length || 0;
        return { success: true, message: `${units.length} unidades, ${active} sessões ativas` };
      }
    },
    // Statistics Tests
    {
      name: 'Leitura de Estatísticas Diárias',
      category: 'Tabela: Statistics',
      fn: async () => {
        const { data, error } = await supabase.from('statistics_daily')
          .select('*')
          .order('date', { ascending: false })
          .limit(7);
        if (error) return { success: false, message: 'Erro ao ler estatísticas', error: error.message };
        return { success: true, message: `${data?.length || 0} dias de estatísticas` };
      }
    },
    // Edge Function Tests
    {
      name: 'Edge Function: Google Cloud TTS',
      category: 'Edge Functions',
      fn: async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
            },
            body: JSON.stringify({ text: 'Teste', voiceName: 'pt-BR-Neural2-A' })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            return { success: false, message: 'Erro no TTS', error: errorText };
          }
          
          const contentType = response.headers.get('Content-Type');
          if (contentType?.includes('audio')) {
            const blob = await response.blob();
            return { success: true, message: `Áudio gerado: ${Math.round(blob.size / 1024)}KB` };
          }
          
          return { success: false, message: 'Resposta inesperada', error: `Content-Type: ${contentType}` };
        } catch (err) {
          return { success: false, message: 'Falha ao chamar TTS', error: err instanceof Error ? err.message : 'Erro desconhecido' };
        }
      }
    },
    // Storage Tests
    {
      name: 'Storage: Bucket TTS Cache',
      category: 'Storage',
      fn: async () => {
        const { data, error } = await supabase.storage.from('tts-cache').list('', { limit: 10 });
        if (error) return { success: false, message: 'Erro ao acessar storage', error: error.message };
        return { success: true, message: `${data?.length || 0} arquivos no cache` };
      }
    },
    // Realtime Connection Test
    {
      name: 'Conexão Realtime',
      category: 'Realtime',
      fn: async () => {
        return new Promise((resolve) => {
          const channelName = `test-${Date.now()}`;
          const channel = supabase.channel(channelName);
          let resolved = false;
          
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              supabase.removeChannel(channel);
              resolve({ success: false, message: 'Timeout na conexão', error: 'Conexão demorou mais de 5s' });
            }
          }, 5000);
          
          channel
            .on('presence', { event: 'sync' }, () => {
              // Presence sync event
            })
            .subscribe((status) => {
              if (resolved) return;
              
              if (status === 'SUBSCRIBED') {
                resolved = true;
                clearTimeout(timeout);
                // Wait a moment then cleanup
                setTimeout(() => {
                  supabase.removeChannel(channel);
                }, 100);
                resolve({ success: true, message: 'Canal subscrito com sucesso' });
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                resolved = true;
                clearTimeout(timeout);
                supabase.removeChannel(channel);
                resolve({ success: false, message: `Status: ${status}`, error: 'Erro na conexão do canal' });
              }
              // For other statuses (SUBSCRIBING, etc), just wait
            });
        });
      }
    },
    // PWA Installation Tests
    {
      name: 'Página de Instalação PWA',
      category: 'PWA',
      fn: async () => {
        try {
          const response = await fetch('/install');
          if (response.ok) {
            return { success: true, message: 'Página de instalação acessível' };
          }
          return { success: false, message: 'Página não acessível', error: `Status: ${response.status}` };
        } catch (err) {
          return { success: false, message: 'Erro ao acessar página', error: err instanceof Error ? err.message : 'Erro desconhecido' };
        }
      }
    },
    {
      name: 'Link Instalação Modo TV',
      category: 'PWA',
      fn: async () => {
        try {
          const response = await fetch('/install?mode=tv');
          if (response.ok) {
            return { success: true, message: 'Modo TV acessível via /install?mode=tv' };
          }
          return { success: false, message: 'Link não acessível', error: `Status: ${response.status}` };
        } catch (err) {
          return { success: false, message: 'Erro ao acessar link', error: err instanceof Error ? err.message : 'Erro desconhecido' };
        }
      }
    },
    {
      name: 'Link Instalação Modo Normal',
      category: 'PWA',
      fn: async () => {
        try {
          const response = await fetch('/install?mode=normal');
          if (response.ok) {
            return { success: true, message: 'Modo Normal acessível via /install?mode=normal' };
          }
          return { success: false, message: 'Link não acessível', error: `Status: ${response.status}` };
        } catch (err) {
          return { success: false, message: 'Erro ao acessar link', error: err instanceof Error ? err.message : 'Erro desconhecido' };
        }
      }
    },
    {
      name: 'Ícones PWA TV',
      category: 'PWA',
      fn: async () => {
        try {
          const [res192, res512] = await Promise.all([
            fetch('/pwa-tv-192x192.png'),
            fetch('/pwa-tv-512x512.png')
          ]);
          if (res192.ok && res512.ok) {
            return { success: true, message: 'Ícones TV 192x192 e 512x512 disponíveis' };
          }
          return { success: false, message: 'Alguns ícones não encontrados', error: `192: ${res192.status}, 512: ${res512.status}` };
        } catch (err) {
          return { success: false, message: 'Erro ao verificar ícones', error: err instanceof Error ? err.message : 'Erro desconhecido' };
        }
      }
    },
    {
      name: 'Ícones PWA Full',
      category: 'PWA',
      fn: async () => {
        try {
          const [res192, res512] = await Promise.all([
            fetch('/pwa-full-192x192.png'),
            fetch('/pwa-full-512x512.png')
          ]);
          if (res192.ok && res512.ok) {
            return { success: true, message: 'Ícones Full 192x192 e 512x512 disponíveis' };
          }
          return { success: false, message: 'Alguns ícones não encontrados', error: `192: ${res192.status}, 512: ${res512.status}` };
        } catch (err) {
          return { success: false, message: 'Erro ao verificar ícones', error: err instanceof Error ? err.message : 'Erro desconhecido' };
        }
      }
    },
  ];

  const runAllTests = async () => {
    setIsRunning(true);
    const testStartTime = new Date();
    setStartTime(testStartTime);
    setEndTime(null);
    
    // Initialize all tests as pending
    const initialResults = tests.map(t => ({
      name: t.name,
      category: t.category,
      status: 'pending' as const
    }));
    setResults(initialResults);

    let successCount = 0;
    let errorCount = 0;
    const finalResults: TestResult[] = [...initialResults];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const success = await runTest(test.name, test.fn);
      if (success) successCount++;
      else errorCount++;
      
      // Update finalResults with the latest status
      setResults(prev => {
        const updated = prev.find(r => r.name === test.name);
        if (updated) {
          finalResults[i] = updated;
        }
        return prev;
      });
      
      // Small delay between tests
      await new Promise(r => setTimeout(r, 100));
    }

    const testEndTime = new Date();
    setEndTime(testEndTime);
    setIsRunning(false);

    // Get final results after all updates
    const durationMs = testEndTime.getTime() - testStartTime.getTime();
    
    // Save to history - get latest results
    setTimeout(() => {
      setResults(currentResults => {
        saveTestHistory(currentResults, durationMs);
        return currentResults;
      });
    }, 200);

    if (errorCount === 0) {
      toast.success(`Todos os ${successCount} testes passaram!`);
    } else {
      toast.error(`${errorCount} teste(s) falharam de ${tests.length}`);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pendente</Badge>;
      case 'running': return <Badge variant="outline" className="border-blue-500 text-blue-500">Executando</Badge>;
      case 'success': return <Badge className="bg-green-500">Sucesso</Badge>;
      case 'error': return <Badge variant="destructive">Erro</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('Units')) return <Building2 className="w-4 h-4" />;
    if (category.includes('Modules')) return <Layers className="w-4 h-4" />;
    if (category.includes('Operators')) return <Users className="w-4 h-4" />;
    if (category.includes('Destinations')) return <MapPin className="w-4 h-4" />;
    if (category.includes('Patient') || category.includes('Call')) return <History className="w-4 h-4" />;
    if (category.includes('Chat')) return <MessageSquare className="w-4 h-4" />;
    if (category.includes('TTS') || category.includes('Announcements')) return <Volume2 className="w-4 h-4" />;
    if (category.includes('Edge')) return <RefreshCw className="w-4 h-4" />;
    if (category.includes('PWA')) return <Smartphone className="w-4 h-4" />;
    if (category.includes('Sessions')) return <Monitor className="w-4 h-4" />;
    return <Database className="w-4 h-4" />;
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) acc[result.category] = [];
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tests" className="gap-2">
            <Play className="w-4 h-4" />
            Executar Testes
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Histórico ({testHistory.length})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Users className="w-4 h-4" />
            Sessões ({userSessions.length})
          </TabsTrigger>
        </TabsList>

        {/* Tests Tab */}
        <TabsContent value="tests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Testes Automatizados do Sistema
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Execute testes completos em todas as funcionalidades do sistema
                </p>
              </div>
              <div className="flex items-center gap-2">
                {results.length > 0 && !isRunning && (
                  <Button 
                    onClick={clearResults} 
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar Resultados
                  </Button>
                )}
                <Button 
                  onClick={runAllTests} 
                  disabled={isRunning}
                  size="lg"
                  className="gap-2"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Executar Todos os Testes
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>

            {results.length > 0 && (
              <CardContent>
                {/* Summary */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{tests.length}</div>
                      <div className="text-sm text-muted-foreground">Total de Testes</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-500/10 border-green-500/20">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{successCount}</div>
                      <div className="text-sm text-green-600">Sucesso</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10 border-red-500/20">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                      <div className="text-sm text-red-600">Erros</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{(totalDuration / 1000).toFixed(2)}s</div>
                      <div className="text-sm text-blue-600">Tempo Total</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Results */}
                <ScrollArea className="max-h-[calc(100vh-400px)] min-h-[400px] pr-4">
                  <div className="space-y-4">
                    {Object.entries(groupedResults).map(([category, categoryResults]) => (
                      <Card key={category} className="overflow-hidden">
                        <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 border-b">
                          {getCategoryIcon(category)}
                          <span className="font-medium">{category}</span>
                          <Badge variant="outline" className="ml-auto">
                            {categoryResults.filter(r => r.status === 'success').length}/{categoryResults.length}
                          </Badge>
                        </div>
                        <div className="divide-y">
                          {categoryResults.map((result) => (
                            <div key={result.name} className="p-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                  {getStatusIcon(result.status)}
                                  <span className="font-medium text-sm">{result.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {result.duration !== undefined && (
                                    <span className="text-xs text-muted-foreground">
                                      {result.duration}ms
                                    </span>
                                  )}
                                  {getStatusBadge(result.status)}
                                </div>
                              </div>
                              {result.message && (
                                <p className={`text-sm mt-1 ml-7 ${result.status === 'error' ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  {result.message}
                                </p>
                              )}
                              {result.error && (
                                <div className="mt-2 ml-7 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
                                  <div className="flex items-center gap-2 text-red-500 font-medium">
                                    <AlertTriangle className="w-4 h-4" />
                                    Detalhes do Erro:
                                  </div>
                                  <pre className="mt-1 text-xs text-red-400 whitespace-pre-wrap font-mono">
                                    {result.error}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                {/* Timestamp */}
                {startTime && (
                  <div className="mt-4 text-sm text-muted-foreground text-center">
                    Iniciado: {startTime.toLocaleTimeString('pt-BR')}
                    {endTime && ` • Finalizado: ${endTime.toLocaleTimeString('pt-BR')}`}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Histórico de Testes
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Visualize os resultados de testes anteriores
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={loadTestHistory} 
                  variant="outline"
                  size="sm"
                  disabled={loadingHistory}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                {testHistory.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Limpar Tudo
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação irá remover todos os {testHistory.length} registros de testes. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={clearAllTestHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Limpar Tudo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : testHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum teste executado ainda</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Sucesso</TableHead>
                        <TableHead className="text-center">Falhas</TableHead>
                        <TableHead className="text-center">Duração</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testHistory.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {format(new Date(entry.executed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{entry.total_tests}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-500">{entry.passed_tests}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={entry.failed_tests > 0 ? "destructive" : "outline"}>
                              {entry.failed_tests}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {entry.duration_ms ? `${(entry.duration_ms / 1000).toFixed(2)}s` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedHistoryEntry(entry)}
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteTestHistoryEntry(entry.id)}
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* History Detail Dialog */}
          {selectedHistoryEntry && (
            <AlertDialog open={!!selectedHistoryEntry} onOpenChange={() => setSelectedHistoryEntry(null)}>
              <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Detalhes do Teste - {format(new Date(selectedHistoryEntry.executed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {selectedHistoryEntry.passed_tests} sucesso, {selectedHistoryEntry.failed_tests} falhas de {selectedHistoryEntry.total_tests} testes
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {(selectedHistoryEntry.results as TestResult[]).map((result, idx) => (
                    <div key={idx} className={`p-2 rounded border ${result.status === 'success' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium text-sm">{result.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">{result.category}</Badge>
                      </div>
                      {result.message && (
                        <p className="text-xs text-muted-foreground mt-1 ml-6">{result.message}</p>
                      )}
                      {result.error && (
                        <p className="text-xs text-red-500 mt-1 ml-6">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Fechar</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Sessões de Usuários
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencie as sessões de usuários do sistema
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={loadUserSessions} 
                  variant="outline"
                  size="sm"
                  disabled={loadingSessions}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                {userSessions.some(s => !s.is_active) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <UserX className="w-4 h-4" />
                        Limpar Inativas
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar sessões inativas?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação irá remover todas as sessões que não estão mais ativas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={clearInactiveSessions}>
                          Limpar Inativas
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {userSessions.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Limpar Todas
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar todas as sessões?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação irá remover todas as {userSessions.length} sessões de usuários. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={clearAllUserSessions} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Limpar Todas
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : userSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma sessão registrada</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Estação</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Última Atividade</TableHead>
                        <TableHead className="text-center">Chamadas</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {session.is_active ? (
                                <Badge className="bg-green-500">Ativa</Badge>
                              ) : (
                                <Badge variant="secondary">Inativa</Badge>
                              )}
                              {session.is_tv_mode && (
                                <span title="Modo TV">
                                  <Tv className="w-4 h-4 text-muted-foreground" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{session.unit_name}</TableCell>
                          <TableCell>{session.station}</TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">
                            {session.ip_address || '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(session.last_activity_at), "dd/MM HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Badge variant="outline" title="Chamadas de voz">
                                🔊 {session.voice_calls_count || 0}
                              </Badge>
                              <Badge variant="outline" title="TTS">
                                📢 {session.tts_calls_count || 0}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteUserSession(session.id)}
                              title="Remover sessão"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}