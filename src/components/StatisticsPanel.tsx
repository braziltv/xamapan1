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
  TrendingDown,
  Minus,
  CheckCircle,
  FileDown,
  Filter,
  Calendar,
  RefreshCw,
  Database,
  Building2,
  BarChart3,
  Trophy,
  Medal
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInDays } from 'date-fns';
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
  const [storageInfo, setStorageInfo] = useState({ detailed: 0, aggregated: 0 });
  const [currentUnitName] = useState(() => localStorage.getItem('selectedUnitName') || '');
  
  // Lista de unidades disponíveis
  const HEALTH_UNITS = [
    { id: "pa-pedro-jose", name: "Pronto Atendimento Pedro José de Menezes" },
    { id: "psf-aguinalda", name: "PSF Aguinalda Angélica" },
    { id: "ubs-maria-alves", name: "UBS Maria Alves de Mendonça" },
  ];
  
  // Filtros
  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [callTypeFilter, setCallTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([currentUnitName]);
  const [comparisonData, setComparisonData] = useState<{unit: string, shortName: string, total: number, triage: number, doctor: number}[]>([]);
  const [previousPeriodData, setPreviousPeriodData] = useState<{total: number, triage: number, doctor: number}>({ total: 0, triage: 0, doctor: 0 });

  // Carregar dados do banco (detalhados + agregados)
  const loadDbHistory = useCallback(async () => {
    setLoading(true);
    try {
      // Determinar unidades a buscar
      const unitsToFetch = compareMode && selectedUnits.length > 0 ? selectedUnits : [currentUnitName];
      
      // Carregar dados detalhados
      let query = supabase
        .from('call_history')
        .select('*')
        .gte('created_at', startOfDay(parseISO(dateFrom)).toISOString())
        .lte('created_at', endOfDay(parseISO(dateTo)).toISOString())
        .order('created_at', { ascending: false });

      if (!compareMode && currentUnitName) {
        query = query.eq('unit_name', currentUnitName);
      } else if (compareMode && selectedUnits.length > 0) {
        query = query.in('unit_name', selectedUnits);
      }

      if (callTypeFilter !== 'all') {
        query = query.eq('call_type', callTypeFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao carregar histórico:', error);
      } else {
        setDbHistory(data || []);
        
        // Calcular dados de comparação por unidade
        if (compareMode && data) {
          const comparison = unitsToFetch.map(unitName => {
            const unitData = data.filter(d => d.unit_name === unitName);
            const unit = HEALTH_UNITS.find(u => u.name === unitName);
            return {
              unit: unitName,
              shortName: unit ? unit.name.split(' ')[0] : unitName.substring(0, 10),
              total: unitData.length,
              triage: unitData.filter(d => d.call_type === 'triage').length,
              doctor: unitData.filter(d => d.call_type === 'doctor').length,
            };
          });
          setComparisonData(comparison);
        }
      }

      // Calcular período anterior para tendências
      const fromDate = parseISO(dateFrom);
      const toDate = parseISO(dateTo);
      const periodDays = differenceInDays(toDate, fromDate) + 1;
      const previousFrom = format(subDays(fromDate, periodDays), 'yyyy-MM-dd');
      const previousTo = format(subDays(fromDate, 1), 'yyyy-MM-dd');

      // Carregar dados do período anterior
      let prevQuery = supabase
        .from('call_history')
        .select('*')
        .gte('created_at', startOfDay(parseISO(previousFrom)).toISOString())
        .lte('created_at', endOfDay(parseISO(previousTo)).toISOString());

      if (!compareMode && currentUnitName) {
        prevQuery = prevQuery.eq('unit_name', currentUnitName);
      } else if (compareMode && selectedUnits.length > 0) {
        prevQuery = prevQuery.in('unit_name', selectedUnits);
      }

      if (callTypeFilter !== 'all') {
        prevQuery = prevQuery.eq('call_type', callTypeFilter);
      }

      const { data: prevData } = await prevQuery;
      
      if (prevData) {
        setPreviousPeriodData({
          total: prevData.length,
          triage: prevData.filter(d => d.call_type === 'triage').length,
          doctor: prevData.filter(d => d.call_type === 'doctor').length,
        });
      }

      // Carregar dados agregados (para datas mais antigas)
      let aggQuery = supabase
        .from('statistics_daily')
        .select('*')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false });
      
      if (!compareMode && currentUnitName) {
        aggQuery = aggQuery.eq('unit_name', currentUnitName);
      } else if (compareMode && selectedUnits.length > 0) {
        aggQuery = aggQuery.in('unit_name', selectedUnits);
      }

      const { data: aggData } = await aggQuery;
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
  }, [dateFrom, dateTo, currentUnitName, callTypeFilter, compareMode, selectedUnits, HEALTH_UNITS]);

  // Função para calcular tendência
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' as const };
    const diff = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(Math.round(diff)),
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral' as const
    };
  };

  // Componente de indicador de tendência
  const TrendIndicator = ({ current, previous, label }: { current: number; previous: number; label: string }) => {
    const trend = calculateTrend(current, previous);
    
    return (
      <div className="flex items-center gap-1 text-xs">
        {trend.direction === 'up' && (
          <>
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-green-600">+{trend.percentage}%</span>
          </>
        )}
        {trend.direction === 'down' && (
          <>
            <TrendingDown className="w-3 h-3 text-red-500" />
            <span className="text-red-600">-{trend.percentage}%</span>
          </>
        )}
        {trend.direction === 'neutral' && (
          <>
            <Minus className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">0%</span>
          </>
        )}
        <span className="text-muted-foreground ml-1">vs período anterior</span>
      </div>
    );
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

  // Função auxiliar para desenhar gráfico de barras no PDF
  const drawBarChart = (doc: jsPDF, data: {label: string, value: number}[], x: number, y: number, width: number, height: number, title: string) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barWidth = (width - 10) / data.length;
    const chartHeight = height - 25;
    
    // Título do gráfico
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(title, x + width / 2, y, { align: 'center' });
    
    // Desenhar barras
    data.forEach((item, index) => {
      const barHeight = (item.value / maxValue) * chartHeight;
      const barX = x + 5 + (index * barWidth);
      const barY = y + 10 + chartHeight - barHeight;
      
      // Barra
      doc.setFillColor(59, 130, 246);
      doc.rect(barX, barY, barWidth - 2, barHeight, 'F');
      
      // Label
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text(item.label, barX + (barWidth - 2) / 2, y + 10 + chartHeight + 4, { align: 'center' });
      
      // Valor no topo
      if (item.value > 0) {
        doc.setFontSize(6);
        doc.setTextColor(0, 0, 0);
        doc.text(item.value.toString(), barX + (barWidth - 2) / 2, barY - 1, { align: 'center' });
      }
    });
    
    // Linha base
    doc.setDrawColor(200, 200, 200);
    doc.line(x + 5, y + 10 + chartHeight, x + width - 5, y + 10 + chartHeight);
  };

  // Função auxiliar para desenhar gráfico de pizza no PDF
  const drawPieChart = (doc: jsPDF, data: {name: string, value: number, color: string}[], centerX: number, centerY: number, radius: number, title: string) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return;
    
    // Título
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(title, centerX, centerY - radius - 8, { align: 'center' });
    
    let startAngle = -Math.PI / 2;
    const colors: [number, number, number][] = [
      [59, 130, 246],  // Azul - Triagem
      [34, 197, 94],   // Verde - Médico
    ];
    
    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      
      // Desenhar fatia usando segmentos
      doc.setFillColor(...colors[index % colors.length]);
      
      // Criar path da fatia
      const segments = 50;
      const points: [number, number][] = [[centerX, centerY]];
      
      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + (sliceAngle * i / segments);
        points.push([
          centerX + radius * Math.cos(angle),
          centerY + radius * Math.sin(angle)
        ]);
      }
      
      // Desenhar polígono preenchido
      if (points.length > 2) {
        const firstPoint = points[0];
        doc.moveTo(firstPoint[0], firstPoint[1]);
        for (let i = 1; i < points.length; i++) {
          doc.lineTo(points[i][0], points[i][1]);
        }
        doc.lineTo(firstPoint[0], firstPoint[1]);
        doc.fill();
      }
      
      startAngle = endAngle;
    });
    
    // Legenda
    let legendY = centerY + radius + 10;
    data.forEach((item, index) => {
      doc.setFillColor(...colors[index % colors.length]);
      doc.rect(centerX - 30, legendY - 3, 8, 8, 'F');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
      doc.text(`${item.name}: ${item.value} (${percentage}%)`, centerX - 18, legendY + 3);
      legendY += 12;
    });
  };

  // Função para adicionar rodapé em todas as páginas
  const addFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Solução criada e cedida gratuitamente por Kalebe Gomes', pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }
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
    doc.text(`Unidade: ${compareMode ? selectedUnits.join(', ') : (currentUnitName || 'Todas')}`, 14, 35);
    doc.text(`Período: ${format(parseISO(dateFrom), 'dd/MM/yyyy')} a ${format(parseISO(dateTo), 'dd/MM/yyyy')}`, 14, 42);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 49);
    
    // Resumo em cards
    doc.setFontSize(14);
    doc.text('Resumo do Período', 14, 62);
    
    // Cards de resumo
    const cardY = 68;
    const cardWidth = 55;
    const cardHeight = 20;
    
    // Card Total
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Total de Chamadas', 14 + cardWidth/2, cardY + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(totalCalls.toString(), 14 + cardWidth/2, cardY + 16, { align: 'center' });
    
    // Card Triagem
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(14 + cardWidth + 5, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(59, 130, 246);
    doc.text('Chamadas Triagem', 14 + cardWidth + 5 + cardWidth/2, cardY + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.text(triageCalls.toString(), 14 + cardWidth + 5 + cardWidth/2, cardY + 16, { align: 'center' });
    
    // Card Médico
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(14 + (cardWidth + 5) * 2, cardY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(34, 197, 94);
    doc.text('Chamadas Médico', 14 + (cardWidth + 5) * 2 + cardWidth/2, cardY + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.text(doctorCalls.toString(), 14 + (cardWidth + 5) * 2 + cardWidth/2, cardY + 16, { align: 'center' });
    
    // Gráfico de Atendimentos por Hora
    const hourlyChartData = hourlyData.map(h => ({ label: h.hour.substring(0, 2), value: h.atendimentos }));
    drawBarChart(doc, hourlyChartData, 14, 100, 120, 55, 'Atendimentos por Hora');
    
    // Gráfico de Pizza - Distribuição por Tipo
    drawPieChart(doc, typeData, 165, 130, 20, 'Distribuição por Tipo');
    
    // Gráfico de Atendimentos por Dia (últimos 7 dias)
    const recentDailyData = dailyData.slice(-7).map(d => ({ label: d.date.substring(0, 5), value: d.atendimentos }));
    drawBarChart(doc, recentDailyData, 14, 165, 180, 45, 'Atendimentos por Dia (Últimos 7 dias)');
    
    // Tabela de histórico
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Histórico de Chamadas (Últimas 50)', 14, 220);
    
    const tableData = filteredHistory.slice(0, 50).map(item => [
      item.patient_name,
      item.call_type === 'triage' ? 'Triagem' : 'Médico',
      item.destination || '-',
      format(parseISO(item.created_at), 'dd/MM/yyyy HH:mm'),
    ]);
    
    autoTable(doc, {
      startY: 225,
      head: [['Paciente', 'Tipo', 'Destino', 'Data/Hora']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14, bottom: 20 },
    });
    
    // Adicionar rodapé em todas as páginas
    addFooter(doc);
    
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
              (Compactação automática diária às 3h - mantém últimos 30 dias)
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
        <CardContent className="space-y-4">
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
          
          {/* Modo de Comparação */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-3 mb-3">
              <Checkbox 
                id="compareMode" 
                checked={compareMode}
                onCheckedChange={(checked) => {
                  setCompareMode(checked === true);
                  if (checked) {
                    setSelectedUnits(HEALTH_UNITS.map(u => u.name));
                  } else {
                    setSelectedUnits([currentUnitName]);
                  }
                }}
              />
              <Label htmlFor="compareMode" className="flex items-center gap-2 cursor-pointer">
                <Building2 className="w-4 h-4" />
                Comparar rendimento entre unidades
              </Label>
            </div>
            
            {compareMode && (
              <div className="flex flex-wrap gap-4 ml-6">
                {HEALTH_UNITS.map((unit) => (
                  <div key={unit.id} className="flex items-center gap-2">
                    <Checkbox
                      id={unit.id}
                      checked={selectedUnits.includes(unit.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUnits([...selectedUnits, unit.name]);
                        } else {
                          setSelectedUnits(selectedUnits.filter(u => u !== unit.name));
                        }
                      }}
                    />
                    <Label htmlFor={unit.id} className="text-sm cursor-pointer">
                      {unit.name.split(' ').slice(0, 2).join(' ')}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Comparação entre Unidades */}
      {compareMode && comparisonData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Comparação entre Unidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="shortName" 
                        type="category" 
                        width={80}
                        tick={{ fontSize: 11 }}
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-3 shadow-lg">
                                <p className="font-medium text-sm mb-1">{data.unit}</p>
                                <p className="text-sm text-blue-600">Triagem: {data.triage}</p>
                                <p className="text-sm text-green-600">Médico: {data.doctor}</p>
                                <p className="text-sm font-medium mt-1">Total: {data.total}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="triage" stackId="a" fill="hsl(217, 91%, 60%)" name="Triagem" />
                      <Bar dataKey="doctor" stackId="a" fill="hsl(142, 71%, 45%)" name="Médico" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span className="text-sm">Triagem</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span className="text-sm">Médico</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ranking de Produtividade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Ranking de Produtividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...comparisonData]
                  .sort((a, b) => b.total - a.total)
                  .map((unit, index) => {
                    const maxTotal = Math.max(...comparisonData.map(u => u.total), 1);
                    const percentage = (unit.total / maxTotal) * 100;
                    const getMedalColor = (pos: number) => {
                      if (pos === 0) return 'text-yellow-500';
                      if (pos === 1) return 'text-gray-400';
                      if (pos === 2) return 'text-amber-700';
                      return 'text-muted-foreground';
                    };
                    const getBgColor = (pos: number) => {
                      if (pos === 0) return 'bg-yellow-500/10 border-yellow-500/30';
                      if (pos === 1) return 'bg-gray-500/10 border-gray-500/30';
                      if (pos === 2) return 'bg-amber-700/10 border-amber-700/30';
                      return 'bg-muted/30 border-muted';
                    };
                    
                    return (
                      <div 
                        key={unit.unit} 
                        className={`p-3 rounded-lg border ${getBgColor(index)} transition-all hover:scale-[1.02]`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8">
                            {index < 3 ? (
                              <Medal className={`w-6 h-6 ${getMedalColor(index)}`} />
                            ) : (
                              <span className="text-lg font-bold text-muted-foreground">{index + 1}º</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{unit.unit}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-12 text-right">
                                {Math.round(percentage)}%
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{unit.total}</p>
                            <p className="text-xs text-muted-foreground">atendimentos</p>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-2 ml-11 text-xs">
                          <span className="text-blue-600">Triagem: {unit.triage}</span>
                          <span className="text-green-600">Médico: {unit.doctor}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {comparisonData.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Geral</p>
                      <p className="text-lg font-bold">{comparisonData.reduce((sum, u) => sum + u.total, 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Média</p>
                      <p className="text-lg font-bold">
                        {Math.round(comparisonData.reduce((sum, u) => sum + u.total, 0) / comparisonData.length)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Unidades</p>
                      <p className="text-lg font-bold">{comparisonData.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
            <div className="mt-2">
              <TrendIndicator current={totalCalls} previous={previousPeriodData.total} label="total" />
            </div>
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
            <div className="mt-2">
              <TrendIndicator current={triageCalls} previous={previousPeriodData.triage} label="triagem" />
            </div>
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
            <div className="mt-2">
              <TrendIndicator current={doctorCalls} previous={previousPeriodData.doctor} label="médico" />
            </div>
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
