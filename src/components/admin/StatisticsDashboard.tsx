import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, 
  LineChart, Line, CartesianGrid, Tooltip, Legend, AreaChart, Area 
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart3, TrendingUp, Users, Clock, Activity, 
  Calendar, RefreshCw, Loader2, Building2,
  Stethoscope, Heart, Pill, FileDown
} from 'lucide-react';
import { useUnits } from '@/hooks/useAdminData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';


interface CallData {
  call_type: string;
  destination: string | null;
  created_at: string;
  unit_name: string;
}

interface DailyStats {
  date: string;
  total: number;
  triage: number;
  doctor: number;
  service: number;
}

interface HourlyStats {
  hour: string;
  count: number;
}

interface TypeStats {
  name: string;
  value: number;
  color: string;
}

interface DestinationStats {
  name: string;
  count: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(45, 93%, 47%)',
  'hsl(0, 84%, 60%)',
  'hsl(262, 83%, 58%)',
  'hsl(199, 89%, 48%)',
  'hsl(31, 97%, 50%)',
  'hsl(173, 80%, 40%)',
];

const TYPE_LABELS: Record<string, string> = {
  triage: 'Triagem',
  doctor: 'Médico',
  curativos: 'Curativos',
  ecg: 'ECG',
  enfermaria: 'Enfermaria',
  raiox: 'Raio-X',
  registration: 'Cadastro',
  service: 'Serviço',
};

export function StatisticsDashboard() {
  const { units } = useUnits();
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [period, setPeriod] = useState<string>('7');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [callData, setCallData] = useState<CallData[]>([]);
  
  // Refs para captura dos gráficos - tipagem explícita
  const chartDailyRef = useRef<HTMLDivElement | null>(null);
  const chartHourlyRef = useRef<HTMLDivElement | null>(null);
  const chartTypeRef = useRef<HTMLDivElement | null>(null);
  const chartDestRef = useRef<HTMLDivElement | null>(null);
  
  // Estados para estatísticas processadas
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [hourlyStats, setHourlyStats] = useState<HourlyStats[]>([]);
  const [typeStats, setTypeStats] = useState<TypeStats[]>([]);
  const [destinationStats, setDestinationStats] = useState<DestinationStats[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [avgPerDay, setAvgPerDay] = useState(0);
  const [peakHour, setPeakHour] = useState<string>('');
  const [topDestination, setTopDestination] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const startDate = subDays(new Date(), parseInt(period));
    
    let query = supabase
      .from('call_history')
      .select('call_type, destination, created_at, unit_name')
      .gte('created_at', startOfDay(startDate).toISOString())
      .lte('created_at', endOfDay(new Date()).toISOString())
      .order('created_at', { ascending: true });
    
    if (selectedUnit !== 'all') {
      const unit = units.find(u => u.id === selectedUnit);
      if (unit) {
        query = query.eq('unit_name', unit.display_name);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar dados:', error);
    } else {
      setCallData(data || []);
      processData(data || []);
    }
    
    setLoading(false);
  }, [period, selectedUnit, units]);

  const processData = (data: CallData[]) => {
    if (data.length === 0) {
      setDailyStats([]);
      setHourlyStats([]);
      setTypeStats([]);
      setDestinationStats([]);
      setTotalCalls(0);
      setAvgPerDay(0);
      setPeakHour('');
      setTopDestination('');
      return;
    }

    // Total de chamadas
    setTotalCalls(data.length);

    // Estatísticas diárias
    const dailyMap = new Map<string, { total: number; triage: number; doctor: number; service: number }>();
    data.forEach(call => {
      const date = format(parseISO(call.created_at), 'dd/MM', { locale: ptBR });
      const current = dailyMap.get(date) || { total: 0, triage: 0, doctor: 0, service: 0 };
      current.total++;
      if (call.call_type === 'triage') current.triage++;
      else if (call.call_type === 'doctor') current.doctor++;
      else current.service++;
      dailyMap.set(date, current);
    });
    
    const daily = Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      ...stats
    }));
    setDailyStats(daily);
    setAvgPerDay(Math.round(data.length / Math.max(daily.length, 1)));

    // Estatísticas por hora
    const hourlyMap = new Map<number, number>();
    data.forEach(call => {
      const hour = new Date(call.created_at).getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    });
    
    const hourly = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}h`,
      count: hourlyMap.get(i) || 0
    }));
    setHourlyStats(hourly);
    
    // Hora de pico
    const peakHourEntry = [...hourlyMap.entries()].sort((a, b) => b[1] - a[1])[0];
    if (peakHourEntry) {
      setPeakHour(`${peakHourEntry[0].toString().padStart(2, '0')}:00`);
    }

    // Estatísticas por tipo
    const typeMap = new Map<string, number>();
    data.forEach(call => {
      typeMap.set(call.call_type, (typeMap.get(call.call_type) || 0) + 1);
    });
    
    const types = Array.from(typeMap.entries())
      .map(([name, value], index) => ({
        name: TYPE_LABELS[name] || name,
        value,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
    setTypeStats(types);

    // Estatísticas por destino
    const destMap = new Map<string, number>();
    data.forEach(call => {
      const dest = call.destination || 'Não especificado';
      destMap.set(dest, (destMap.get(dest) || 0) + 1);
    });
    
    const destinations = Array.from(destMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setDestinationStats(destinations);
    
    if (destinations.length > 0) {
      setTopDestination(destinations[0].name);
    }
  };

  const captureChart = async (ref: React.RefObject<HTMLDivElement>): Promise<string | null> => {
    if (!ref.current) return null;
    try {
      const canvas = await html2canvas(ref.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Erro ao capturar gráfico:', error);
      return null;
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const now = new Date();
      
      // Capturar todos os gráficos em paralelo
      const [dailyChart, hourlyChart, typeChart, destChart] = await Promise.all([
        captureChart(chartDailyRef),
        captureChart(chartHourlyRef),
        captureChart(chartTypeRef),
        captureChart(chartDestRef),
      ]);
      
      // Header
      doc.setFillColor(13, 148, 136); // Primary teal color
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Estatísticas', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const unitName = selectedUnit === 'all' 
        ? 'Todas as Unidades' 
        : units.find(u => u.id === selectedUnit)?.display_name || 'Unidade';
      doc.text(unitName, pageWidth / 2, 28, { align: 'center' });
      
      const periodText = period === '1' ? 'Hoje' : `Últimos ${period} dias`;
      doc.text(`Período: ${periodText}`, pageWidth / 2, 36, { align: 'center' });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      let yPos = 55;
      
      // Summary section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Geral', 14, yPos);
      yPos += 10;
      
      // Summary cards as table
      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: [
          ['Total de Chamadas', totalCalls.toString()],
          ['Média por Dia', avgPerDay.toString()],
          ['Hora de Pico', peakHour || 'N/A'],
          ['Principal Destino', topDestination || 'N/A'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [13, 148, 136], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold' } },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Gráfico de Evolução Diária
      if (dailyChart && dailyStats.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Evolução Diária', 14, yPos);
        yPos += 5;
        
        const imgWidth = pageWidth - 28;
        const imgHeight = 70;
        doc.addImage(dailyChart, 'PNG', 14, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }
      
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      // Gráfico de Distribuição por Hora
      if (hourlyChart) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Distribuição por Hora', 14, yPos);
        yPos += 5;
        
        const imgWidth = pageWidth - 28;
        const imgHeight = 70;
        doc.addImage(hourlyChart, 'PNG', 14, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }
      
      // New page for remaining charts
      doc.addPage();
      yPos = 20;
      
      // Gráfico por Tipo de Chamada
      if (typeChart && typeStats.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Por Tipo de Chamada', 14, yPos);
        yPos += 5;
        
        const imgWidth = pageWidth - 28;
        const imgHeight = 70;
        doc.addImage(typeChart, 'PNG', 14, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }
      
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      // Gráfico Top Destinos
      if (destChart && destinationStats.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Destinos', 14, yPos);
        yPos += 5;
        
        const imgWidth = pageWidth - 28;
        const imgHeight = 70;
        doc.addImage(destChart, 'PNG', 14, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }
      
      // New page for tables
      doc.addPage();
      yPos = 20;
      
      // Statistics by type table
      if (typeStats.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalhamento por Tipo', 14, yPos);
        yPos += 10;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Tipo', 'Quantidade', 'Percentual']],
          body: typeStats.map(type => [
            type.name,
            type.value.toString(),
            `${((type.value / totalCalls) * 100).toFixed(1)}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 3 },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
      
      // Statistics by destination table
      if (destinationStats.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalhamento por Destino', 14, yPos);
        yPos += 10;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Destino', 'Chamadas', 'Percentual']],
          body: destinationStats.map(dest => [
            dest.name, 
            dest.count.toString(),
            `${((dest.count / totalCalls) * 100).toFixed(1)}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 3 },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }
      
      // Daily evolution table
      if (dailyStats.length > 0) {
        if (yPos > 180) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Evolução Diária - Detalhes', 14, yPos);
        yPos += 10;
        
        autoTable(doc, {
          startY: yPos,
          head: [['Data', 'Total', 'Triagem', 'Médico', 'Serviços']],
          body: dailyStats.map(day => [
            day.date,
            day.total.toString(),
            day.triage.toString(),
            day.doctor.toString(),
            day.service.toString()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 2 },
        });
      }
      
      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      // Save
      const fileName = `relatorio-estatisticas-${format(now, 'yyyy-MM-dd-HHmm')}.pdf`;
      doc.save(fileName);
      
      toast.success('Relatório PDF com gráficos exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Dashboard de Estatísticas</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Todas unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as unidades</SelectItem>
              {units.map(unit => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoje</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button 
            variant="default" 
            onClick={exportToPDF} 
            disabled={loading || exporting || totalCalls === 0}
            className="gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {exporting ? 'Exportando...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Chamadas</p>
                    <p className="text-3xl font-bold text-primary">{totalCalls}</p>
                  </div>
                  <Activity className="w-10 h-10 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Média por Dia</p>
                    <p className="text-3xl font-bold text-green-600">{avgPerDay}</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hora de Pico</p>
                    <p className="text-3xl font-bold text-amber-600">{peakHour || '-'}</p>
                  </div>
                  <Clock className="w-10 h-10 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Top Destino</p>
                    <p className="text-lg font-bold text-purple-600 truncate max-w-[120px]" title={topDestination}>
                      {topDestination || '-'}
                    </p>
                  </div>
                  <Users className="w-10 h-10 text-purple-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos principais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de linha - Evolução diária */}
            <div ref={chartDailyRef}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5" />
                    Evolução Diária
                  </CardTitle>
                  <CardDescription>Chamadas por dia no período selecionado</CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dailyStats}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          name="Total"
                          stroke="hsl(var(--primary))" 
                          fill="url(#colorTotal)"
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="triage" 
                          name="Triagem"
                          stroke="hsl(142, 76%, 36%)" 
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="doctor" 
                          name="Médico"
                          stroke="hsl(262, 83%, 58%)" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Sem dados para o período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de barras - Por hora */}
            <div ref={chartHourlyRef}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5" />
                    Distribuição por Hora
                  </CardTitle>
                  <CardDescription>Volume de chamadas ao longo do dia</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourlyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="count" 
                        name="Chamadas"
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de pizza - Por tipo */}
            <div ref={chartTypeRef}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5" />
                    Por Tipo de Chamada
                  </CardTitle>
                  <CardDescription>Distribuição por módulo/tipo</CardDescription>
                </CardHeader>
                <CardContent>
                  {typeStats.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={typeStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                          >
                            {typeStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2 min-w-[150px]">
                        {typeStats.slice(0, 6).map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm text-muted-foreground flex-1">{item.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {item.value}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      Sem dados
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de barras horizontal - Por destino */}
            <div ref={chartDestRef}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5" />
                    Top Destinos
                  </CardTitle>
                  <CardDescription>Destinos mais frequentes</CardDescription>
                </CardHeader>
                <CardContent>
                  {destinationStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={destinationStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          tick={{ fontSize: 11 }} 
                          width={120}
                          className="fill-muted-foreground"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar 
                          dataKey="count" 
                          name="Chamadas"
                          fill="hsl(142, 76%, 36%)" 
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      Sem dados
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tabela de resumo por tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5" />
                Resumo por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {typeStats.map((type, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="text-sm font-medium truncate">{type.name}</span>
                    </div>
                    <p className="text-2xl font-bold">{type.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {((type.value / totalCalls) * 100).toFixed(1)}% do total
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
