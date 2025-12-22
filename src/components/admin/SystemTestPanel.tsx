import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  category: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
  error?: string;
}

export function SystemTestPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);

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
    setStartTime(new Date());
    setEndTime(null);
    
    // Initialize all tests as pending
    setResults(tests.map(t => ({
      name: t.name,
      category: t.category,
      status: 'pending' as const
    })));

    let successCount = 0;
    let errorCount = 0;

    for (const test of tests) {
      const success = await runTest(test.name, test.fn);
      if (success) successCount++;
      else errorCount++;
      // Small delay between tests
      await new Promise(r => setTimeout(r, 100));
    }

    setEndTime(new Date());
    setIsRunning(false);

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

            {/* Results - now with max-height instead of fixed height for better visibility */}
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
    </div>
  );
}