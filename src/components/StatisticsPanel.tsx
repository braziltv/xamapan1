import { useState, useEffect, useCallback } from 'react';
import { Patient, CallHistory } from '@/types/patient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Clock, 
  Activity, 
  Stethoscope, 
  TrendingUp,
  CheckCircle,
  FileDown,
  Filter,
  Calendar,
  RefreshCw,
  Trash2,
  Database
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StatisticsPanelProps {
  patients: Patient[];
  history: CallHistory[];
}

interface DbCallHistory {
  id: string;
  patient_name: string;
  call_type: string;
  destination: string | null;
  created_at: string;
  unit_name: string;
}

export function StatisticsPanel({ patients, history }: StatisticsPanelProps) {
  const [dbHistory, setDbHistory] = useState<DbCallHistory[]>([]);
  const [aggregatedStats, setAggregatedStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [compacting, setCompacting] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ detailed: 0, aggregated: 0 });
  const [unitName] = useState(() => localStorage.getItem('selectedUnitName') || '');
  
  // Filtros
  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [callTypeFilter, setCallTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar dados do banco (detalhados + agregados)
  const loadDbHistory = useCallback(async () => {
    setLoading(true);
    try {
      // Carregar dados detalhados (últimos 7 dias)
      let query = supabase
        .from('call_history')
        .select('*')
        .gte('created_at', startOfDay(parseISO(dateFrom)).toISOString())
        .lte('created_at', endOfDay(parseISO(dateTo)).toISOString())
        .order('created_at', { ascending: false });

      if (unitName) {
        query = query.eq('unit_name', unitName);
      }

      if (callTypeFilter !== 'all') {
        query = query.eq('call_type', callTypeFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao carregar histórico:', error);
      } else {
        setDbHistory(data || []);
      }

      // Carregar dados agregados (para datas mais antigas)
      const { data: aggData } = await supabase
        .from('statistics_daily')
        .select('*')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .eq('unit_name', unitName || '')
        .order('date', { ascending: false });

      setAggregatedStats(aggData || []);

      // Contar registros para info de armazenamento
      const { count: detailedCount } = await supabase
        .from('call_history')
        .select('*', { count: 'exact', head: true });

      const { count: aggCount } = await supabase
        .from('statistics_daily')
        .select('*', { count: 'exact', head: true });

      setStorageInfo({
        detailed: detailedCount || 0,
        aggregated: aggCount || 0
      });
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, unitName, callTypeFilter]);

  // Compactar dados antigos
  const compactData = async () => {
    if (!confirm('Isso vai agregar e remover registros detalhados com mais de 7 dias. Continuar?')) {
      return;
    }
    
    setCompacting(true);
    try {
      const { data, error } = await supabase.rpc('compact_old_statistics', { days_to_keep: 7 });
      
      if (error) {
        console.error('Erro ao compactar:', error);
        alert('Erro ao compactar dados: ' + error.message);
      } else {
        alert(`Compactação concluída! ${data} registros removidos.`);
        loadDbHistory();
      }
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao compactar dados');
    } finally {
      setCompacting(false);
    }
  };

  useEffect(() => {
    loadDbHistory();
  }, [loadDbHistory]);

  // Filtrar por termo de busca
  const filteredHistory = dbHistory.filter(item => 
    searchTerm === '' || item.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estatísticas calculadas
  const totalCalls = filteredHistory.length;
  const triageCalls = filteredHistory.filter(h => h.call_type === 'triage').length;
  const doctorCalls = filteredHistory.filter(h => h.call_type === 'doctor').length;

  // Atendimentos por dia (últimos 30 dias)
  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = filteredHistory.filter(h => 
      format(parseISO(h.created_at), 'yyyy-MM-dd') === dateStr
    ).length;
    return {
      date: format(date, 'dd/MM'),
      fullDate: dateStr,
      atendimentos: count,
    };
  });

  // Atendimentos por hora (agregado)
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const count = filteredHistory.filter(h => {
      const callHour = parseISO(h.created_at).getHours();
      return callHour === hour;
    }).length;
    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      atendimentos: count,
    };
  }).filter(h => h.atendimentos > 0 || [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(parseInt(h.hour)));

  // Dados para gráfico de pizza
  const typeData = [
    { name: 'Triagem', value: triageCalls, color: 'hsl(217, 91%, 60%)' },
    { name: 'Médico', value: doctorCalls, color: 'hsl(142, 71%, 45%)' },
  ].filter(item => item.value > 0);

  // Estatísticas do dia atual
  const totalPatients = patients.length;
  const waitingTriage = patients.filter(p => p.status === 'waiting').length;
  const waitingDoctor = patients.filter(p => p.status === 'waiting-doctor').length;
  const inTriage = patients.filter(p => p.status === 'in-triage').length;
  const inConsultation = patients.filter(p => p.status === 'in-consultation').length;
  const attended = patients.filter(p => p.status === 'attended').length;

  const patientsWithWaitTime = patients.filter(p => p.calledAt && p.createdAt);
  const avgWaitTime = patientsWithWaitTime.length > 0
    ? Math.round(
        patientsWithWaitTime.reduce((acc, p) => {
          const waitTime = (p.calledAt!.getTime() - p.createdAt.getTime()) / (1000 * 60);
          return acc + waitTime;
        }, 0) / patientsWithWaitTime.length
      )
    : 0;

  const chartConfig = {
    atendimentos: {
      label: 'Atendimentos',
      color: 'hsl(var(--primary))',
    },
  };

  // Exportar PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Título
    doc.setFontSize(18);
    doc.text('Relatório de Estatísticas', pageWidth / 2, 20, { align: 'center' });
    
    // Informações do período
    doc.setFontSize(12);
    doc.text(`Unidade: ${unitName || 'Todas'}`, 14, 35);
    doc.text(`Período: ${format(parseISO(dateFrom), 'dd/MM/yyyy')} a ${format(parseISO(dateTo), 'dd/MM/yyyy')}`, 14, 42);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 49);
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo do Período', 14, 62);
    
    doc.setFontSize(11);
    doc.text(`Total de Chamadas: ${totalCalls}`, 14, 72);
    doc.text(`Chamadas Triagem: ${triageCalls}`, 14, 79);
    doc.text(`Chamadas Médico: ${doctorCalls}`, 14, 86);
    
    // Tabela de histórico
    doc.setFontSize(14);
    doc.text('Histórico de Chamadas', 14, 100);
    
    const tableData = filteredHistory.slice(0, 100).map(item => [
      item.patient_name,
      item.call_type === 'triage' ? 'Triagem' : 'Médico',
      item.destination || '-',
      format(parseISO(item.created_at), 'dd/MM/yyyy HH:mm'),
    ]);
    
    autoTable(doc, {
      startY: 105,
      head: [['Paciente', 'Tipo', 'Destino', 'Data/Hora']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });
    
    // Salvar
    doc.save(`estatisticas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Estatísticas</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToPDF} className="gap-2">
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </Button>
          <Button 
            onClick={compactData} 
            variant="outline" 
            className="gap-2"
            disabled={compacting}
          >
            <Trash2 className={`w-4 h-4 ${compacting ? 'animate-spin' : ''}`} />
            Compactar Dados
          </Button>
        </div>
      </div>

      {/* Info de armazenamento */}
      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Armazenamento:</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">{storageInfo.detailed}</span>
              <span className="text-muted-foreground">registros detalhados</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">{storageInfo.aggregated}</span>
              <span className="text-muted-foreground">dias agregados</span>
            </div>
            <span className="text-xs text-muted-foreground">
              (Compactar remove detalhes &gt;7 dias, mantendo resumos)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom" className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Data Inicial
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Data Final</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Chamada</Label>
              <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="triage">Triagem</SelectItem>
                  <SelectItem value="doctor">Médico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Buscar Paciente</Label>
              <Input
                id="search"
                placeholder="Nome do paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={loadDbHistory} variant="outline" className="w-full gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo - Período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chamadas (Período)</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{totalCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(parseISO(dateFrom), 'dd/MM')} - {format(parseISO(dateTo), 'dd/MM')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chamadas Triagem</CardTitle>
            <Activity className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-600">{triageCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCalls > 0 ? Math.round((triageCalls / totalCalls) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chamadas Médico</CardTitle>
            <Stethoscope className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{doctorCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCalls > 0 ? Math.round((doctorCalls / totalCalls) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Resumo - Dia Atual */}
      <h3 className="text-lg font-semibold text-foreground mt-6">Status Atual (Hoje)</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Triagem</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{waitingTriage}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Triagem</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inTriage}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Médico</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{waitingDoctor}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Consulta</CardTitle>
            <Stethoscope className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{inConsultation}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{attended}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tempo Médio de Espera */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Tempo Médio de Espera (Hoje)</CardTitle>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            {avgWaitTime} <span className="text-lg font-normal text-muted-foreground">minutos</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Baseado em {patientsWithWaitTime.length} pacientes chamados
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfico de Atendimentos por Dia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atendimentos por Dia (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={dailyData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  interval={4}
                />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone"
                  dataKey="atendimentos" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Atendimentos por Hora */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atendimentos por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={hourlyData}>
                <XAxis dataKey="hour" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="atendimentos" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Gráfico de Tipos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado no período
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {typeData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Últimas Chamadas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas Chamadas</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredHistory.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredHistory.slice(0, 20).map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {item.call_type === 'triage' ? (
                        <Activity className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Stethoscope className="h-4 w-4 text-emerald-500" />
                      )}
                      <span className="font-medium">{item.patient_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className={item.call_type === 'triage' ? 'text-blue-500' : 'text-emerald-500'}>
                        {item.call_type === 'triage' ? 'Triagem' : 'Médico'}
                      </span>
                      <span>
                        {format(parseISO(item.created_at), 'dd/MM HH:mm')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {loading ? 'Carregando...' : 'Nenhuma chamada no período'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
