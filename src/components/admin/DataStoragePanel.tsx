import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Database,
  HardDrive,
  Trash2,
  RefreshCw,
  Loader2,
  TrendingUp,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Volume2,
  FileText,
  MessageSquare,
  Users,
  Bug,
  Activity,
  TestTube2,
} from 'lucide-react';

interface TableStats {
  tableName: string;
  displayName: string;
  rowCount: number;
  estimatedSizeMB: number;
  oldestRecord: string | null;
  newestRecord: string | null;
  category: 'temporary' | 'permanent' | 'cache';
  canDelete: boolean;
}

interface StorageStats {
  bucketName: string;
  displayName: string;
  fileCount: number;
  totalSizeMB: number;
  oldestFile: string | null;
  newestFile: string | null;
}

interface DataStats {
  tables: TableStats[];
  storage: StorageStats[];
  summary: {
    totalRows: number;
    totalDbSizeMB: number;
    totalStorageSizeMB: number;
    temporaryDataMB: number;
    dailyGrowthRows: number;
    dailyGrowthMB: number;
    monthlyProjectionMB: number;
  };
  generatedAt: string;
}

const tableIcons: Record<string, React.ReactNode> = {
  call_history: <BarChart3 className="w-4 h-4" />,
  patient_calls: <Users className="w-4 h-4" />,
  chat_messages: <MessageSquare className="w-4 h-4" />,
  user_sessions: <Users className="w-4 h-4" />,
  system_error_logs: <Bug className="w-4 h-4" />,
  edge_function_health_history: <Activity className="w-4 h-4" />,
  test_history: <TestTube2 className="w-4 h-4" />,
  statistics_daily: <BarChart3 className="w-4 h-4" />,
  tts_name_usage: <Volume2 className="w-4 h-4" />,
  'tts-cache': <Volume2 className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  temporary: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  permanent: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  cache: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
};

const categoryLabels: Record<string, string> = {
  temporary: 'Temporário',
  permanent: 'Permanente',
  cache: 'Cache',
};

export function DataStoragePanel() {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [deleteAge, setDeleteAge] = useState<string>('30');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('database-stats', {
        body: { action: 'stats' },
      });

      if (error) throw error;
      if (data.success) {
        setStats(data);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas de armazenamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDelete = async (tableName: string) => {
    setDeleting(tableName);
    try {
      const { data, error } = await supabase.functions.invoke('database-stats', {
        body: {
          action: 'delete',
          tableName,
          olderThanDays: parseInt(deleteAge),
        },
      });

      if (error) throw error;
      if (data.success) {
        toast.success(`${data.deletedCount} registros removidos de ${tableName}`);
        // Refresh stats
        await fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao remover dados');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return date.split('T')[0];
    }
  };

  const formatRelativeDate = (date: string | null) => {
    if (!date) return '-';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
    } catch {
      return '-';
    }
  };

  // Calculate used percentage (assuming 500MB limit for visual)
  const totalUsedMB = stats ? stats.summary.totalDbSizeMB + stats.summary.totalStorageSizeMB : 0;
  const usagePercent = Math.min((totalUsedMB / 500) * 100, 100);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando estatísticas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="w-4 h-4" />
              Uso Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsedMB.toFixed(2)} MB</div>
            <Progress value={usagePercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.summary.totalRows.toLocaleString()} registros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Dados Temporários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats?.summary.temporaryDataMB.toFixed(2)} MB
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Podem ser limpos para liberar espaço
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Crescimento Diário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              +{stats?.summary.dailyGrowthRows} registros
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{stats?.summary.dailyGrowthMB.toFixed(3)} MB/dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Projeção Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              +{stats?.summary.monthlyProjectionMB.toFixed(2)} MB
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimativa para 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Storage Bucket Stats */}
      {stats?.storage && stats.storage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Armazenamento de Arquivos
            </CardTitle>
            <CardDescription>Cache de áudio TTS e outros arquivos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.storage.map((bucket) => (
                <div
                  key={bucket.bucketName}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/50 gap-4"
                >
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium">{bucket.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {bucket.fileCount} arquivos • {bucket.totalSizeMB.toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Limpar Cache
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Limpar cache de áudio?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso removerá arquivos de áudio mais antigos que {deleteAge} dias.
                            Os arquivos serão regenerados quando necessário.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete('tts-cache')}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleting === 'tts-cache' ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : null}
                            Limpar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Tables */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Tabelas do Banco de Dados
            </CardTitle>
            <CardDescription>Gerenciamento de dados por tabela</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={deleteAge} onValueChange={setDeleteAge}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Idade para exclusão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Mais de 7 dias</SelectItem>
                <SelectItem value="14">Mais de 14 dias</SelectItem>
                <SelectItem value="30">Mais de 30 dias</SelectItem>
                <SelectItem value="60">Mais de 60 dias</SelectItem>
                <SelectItem value="90">Mais de 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Registros</TableHead>
                  <TableHead className="text-right">Tamanho Est.</TableHead>
                  <TableHead>Registro mais antigo</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.tables.map((table) => (
                  <TableRow key={table.tableName}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tableIcons[table.tableName] || <FileText className="w-4 h-4" />}
                        <span className="font-medium">{table.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={categoryColors[table.category]} variant="secondary">
                        {categoryLabels[table.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {table.rowCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {table.estimatedSizeMB.toFixed(2)} MB
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {table.oldestRecord ? (
                        <span title={formatDate(table.oldestRecord)}>
                          {formatRelativeDate(table.oldestRecord)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {table.canDelete && table.rowCount > 0 ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {deleting === table.tableName ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Limpar {table.displayName}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso removerá todos os registros mais antigos que{' '}
                                <strong>{deleteAge} dias</strong> da tabela{' '}
                                <strong>{table.displayName}</strong>.
                                <br />
                                <br />
                                <span className="text-muted-foreground">
                                  Registro mais antigo: {formatDate(table.oldestRecord)}
                                </span>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(table.tableName)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Confirmar Exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : table.category === 'permanent' ? (
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Vazio</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {stats && (
            <p className="text-xs text-muted-foreground mt-4 text-right">
              Atualizado {formatRelativeDate(stats.generatedAt)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p>
                <strong>Limpeza automática:</strong> O sistema automaticamente remove dados com mais de 60 dias diariamente.
              </p>
              <p>
                <strong>Dados permanentes:</strong> Configurações de unidades, operadores, módulos e destinos não podem ser excluídos automaticamente.
              </p>
              <p>
                <strong>Cache TTS:</strong> Arquivos de áudio são regenerados automaticamente quando necessário após limpeza.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
