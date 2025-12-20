import { useState, useEffect, useCallback, useRef } from 'react';
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
  Medal,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Download,
  Upload,
  FileUp,
  HardDrive,
  Volume2,
  HeartPulse,
  Bandage,
  Scan,
  Bed,
  BookOpen
} from 'lucide-react';
import { exportTutorialPDF } from '@/utils/exportTutorialPDF';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { useHourAudio } from '@/hooks/useHourAudio';
import { useBrazilTime } from '@/hooks/useBrazilTime';
import { MarketingPanel } from './MarketingPanel';
import { SystemMonitoringPanel } from './SystemMonitoringPanel';
import { ActiveUsersPanel } from './ActiveUsersPanel';

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

interface ApiKeyUsage {
  api_key_index: number;
  count: number;
}

interface TTSNameUsage {
  name_text: string;
  name_hash: string;
  usage_count: number;
  first_used: string;
  last_used: string;
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
  
  // Estado para modal de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'all' | 'unit'>('all');
  const [deleteUnitName, setDeleteUnitName] = useState(currentUnitName);
  
  // Estado para modal de comparação
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [comparePassword, setComparePassword] = useState('');
  const [showComparePassword, setShowComparePassword] = useState(false);
  
  // Estado para backup/restore
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupData, setBackupData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para modal de exclusão de estatísticas
  const [deleteStatsDialogOpen, setDeleteStatsDialogOpen] = useState(false);
  const [deleteStatsPassword, setDeleteStatsPassword] = useState('');
  const [showDeleteStatsPassword, setShowDeleteStatsPassword] = useState(false);
  const [deletingStats, setDeletingStats] = useState(false);
  
  // Estado para modal de limpar painel de chamados
  const [clearCallsDialogOpen, setClearCallsDialogOpen] = useState(false);
  const [clearCallsPassword, setClearCallsPassword] = useState('');
  const [showClearCallsPassword, setShowClearCallsPassword] = useState(false);
  const [clearingCalls, setClearingCalls] = useState(false);
  
  // Estado para uso de API keys do TTS
  const [apiKeyUsage, setApiKeyUsage] = useState<ApiKeyUsage[]>([]);
  
  // Estado para uso de nomes TTS
  const [ttsNameUsage, setTtsNameUsage] = useState<TTSNameUsage[]>([]);
  const [showNamesDialog, setShowNamesDialog] = useState(false);
  
  // Estado para teste de áudio de hora
  const [testingHourAudio, setTestingHourAudio] = useState(false);
  
  // Estado para verificar cache de horas
  const [regenCacheDialogOpen, setRegenCacheDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { playHourAudio, checkAudiosExist } = useHourAudio();
  const { currentTime } = useBrazilTime();

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

      // Carregar uso de API keys do TTS
      const { data: apiKeyData } = await supabase
        .from('api_key_usage')
        .select('api_key_index')
        .gte('created_at', startOfDay(parseISO(dateFrom)).toISOString())
        .lte('created_at', endOfDay(parseISO(dateTo)).toISOString());

      if (apiKeyData) {
        const usageMap = new Map<number, number>();
        apiKeyData.forEach(item => {
          const current = usageMap.get(item.api_key_index) || 0;
          usageMap.set(item.api_key_index, current + 1);
        });
        const usageArray: ApiKeyUsage[] = Array.from(usageMap.entries())
          .map(([api_key_index, count]) => ({ api_key_index, count }))
          .sort((a, b) => a.api_key_index - b.api_key_index);
        setApiKeyUsage(usageArray);
      }

      // Carregar uso de nomes TTS (cache de nomes de pacientes)
      const { data: ttsNameData } = await supabase
        .from('tts_name_usage')
        .select('name_text, name_hash, used_at')
        .gte('used_at', startOfDay(parseISO(dateFrom)).toISOString())
        .lte('used_at', endOfDay(parseISO(dateTo)).toISOString());

      if (ttsNameData) {
        // Agrupar por nome
        const nameMap = new Map<string, { name_text: string; name_hash: string; count: number; first: string; last: string }>();
        ttsNameData.forEach(item => {
          const existing = nameMap.get(item.name_hash);
          if (existing) {
            existing.count++;
            if (item.used_at < existing.first) existing.first = item.used_at;
            if (item.used_at > existing.last) existing.last = item.used_at;
          } else {
            nameMap.set(item.name_hash, {
              name_text: item.name_text,
              name_hash: item.name_hash,
              count: 1,
              first: item.used_at,
              last: item.used_at
            });
          }
        });
        const nameArray: TTSNameUsage[] = Array.from(nameMap.values())
          .map(item => ({
            name_text: item.name_text,
            name_hash: item.name_hash,
            usage_count: item.count,
            first_used: item.first,
            last_used: item.last
          }))
          .sort((a, b) => b.usage_count - a.usage_count);
        setTtsNameUsage(nameArray);
      }
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

  // Estatísticas de procedimentos (baseado no destino)
  const ecgProcedures = filteredHistory.filter(h => 
    h.destination?.toLowerCase().includes('eletrocardiograma') || 
    h.destination?.toLowerCase().includes('ecg')
  ).length;
  const curativosProcedures = filteredHistory.filter(h => 
    h.destination?.toLowerCase().includes('curativo')
  ).length;
  const raioXProcedures = filteredHistory.filter(h => 
    h.destination?.toLowerCase().includes('raio x') || 
    h.destination?.toLowerCase().includes('raio-x') ||
    h.destination?.toLowerCase().includes('radiografia')
  ).length;
  const enfermariaProcedures = filteredHistory.filter(h => 
    h.destination?.toLowerCase().includes('enfermaria')
  ).length;
  const totalProcedures = ecgProcedures + curativosProcedures + raioXProcedures + enfermariaProcedures;

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

  // Função para adicionar cabeçalho elegante
  const addHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Faixa de cabeçalho com gradiente simulado
    doc.setFillColor(30, 64, 175); // Azul escuro
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Linha decorativa
    doc.setFillColor(59, 130, 246); // Azul claro
    doc.rect(0, 35, pageWidth, 3, 'F');
    
    // Título principal
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth / 2, 18, { align: 'center' });
    
    // Subtítulo
    doc.setFontSize(10);
    doc.setTextColor(200, 220, 255);
    doc.text('Software de Chamada de Pacientes', pageWidth / 2, 28, { align: 'center' });
  };

  // Função para adicionar rodapé elegante em todas as páginas
  const addFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Linha decorativa superior do rodapé
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);
      
      // Ícone decorativo (círculo)
      doc.setFillColor(59, 130, 246);
      doc.circle(pageWidth / 2, pageHeight - 18, 3, 'F');
      
      // Créditos elegantes
      doc.setFontSize(9);
      doc.setTextColor(30, 64, 175);
      doc.text('Solução criada e cedida gratuitamente por', pageWidth / 2, pageHeight - 13, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setTextColor(30, 64, 175);
      doc.text('Kalebe Gomes', pageWidth / 2, pageHeight - 7, { align: 'center' });
      
      // Número da página
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 18, { align: 'right' });
      
      // Data de geração
      doc.setFontSize(7);
      doc.text(format(new Date(), "dd/MM/yyyy HH:mm"), 14, pageHeight - 18);
    }
  };

  // Função para desenhar seção com título estilizado
  const drawSectionTitle = (doc: jsPDF, title: string, y: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Fundo da seção
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, y - 5, pageWidth - 28, 12, 2, 2, 'F');
    
    // Barra lateral decorativa
    doc.setFillColor(59, 130, 246);
    doc.rect(14, y - 5, 3, 12, 'F');
    
    // Texto do título
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text(title, 22, y + 3);
    
    return y + 15;
  };

  // Exportar PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Cabeçalho elegante
    addHeader(doc, 'Relatório de Estatísticas');
    
    // Informações do período
    let currentY = 50;
    
    doc.setFillColor(250, 251, 252);
    doc.roundedRect(14, currentY - 5, pageWidth - 28, 25, 3, 3, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(14, currentY - 5, pageWidth - 28, 25, 3, 3, 'S');
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Unidade:', 20, currentY + 3);
    doc.setTextColor(0, 0, 0);
    doc.text(compareMode ? 'Múltiplas Unidades' : (currentUnitName || 'Todas'), 45, currentY + 3);
    
    doc.setTextColor(100, 100, 100);
    doc.text('Período:', 20, currentY + 12);
    doc.setTextColor(0, 0, 0);
    doc.text(`${format(parseISO(dateFrom), 'dd/MM/yyyy')} a ${format(parseISO(dateTo), 'dd/MM/yyyy')}`, 45, currentY + 12);
    
    // Seção de Resumo
    currentY = drawSectionTitle(doc, 'Resumo do Período', currentY + 35);
    
    // Cards de resumo mais elegantes
    const cardWidth = 55;
    const cardHeight = 28;
    const cardStartX = 14;
    
    // Card Total - Gradiente simulado
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(cardStartX, currentY, cardWidth, cardHeight, 4, 4, 'F');
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.roundedRect(cardStartX, currentY, cardWidth, cardHeight, 4, 4, 'S');
    doc.setFillColor(59, 130, 246);
    doc.rect(cardStartX, currentY, 4, cardHeight, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL DE CHAMADAS', cardStartX + 10, currentY + 8);
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text(totalCalls.toString(), cardStartX + 10, currentY + 22);
    
    // Card Triagem
    const card2X = cardStartX + cardWidth + 8;
    doc.setFillColor(236, 254, 255);
    doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 4, 4, 'F');
    doc.setDrawColor(6, 182, 212);
    doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 4, 4, 'S');
    doc.setFillColor(6, 182, 212);
    doc.rect(card2X, currentY, 4, cardHeight, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('TRIAGEM', card2X + 10, currentY + 8);
    doc.setFontSize(18);
    doc.setTextColor(8, 145, 178);
    doc.text(triageCalls.toString(), card2X + 10, currentY + 22);
    
    // Card Médico
    const card3X = card2X + cardWidth + 8;
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(card3X, currentY, cardWidth, cardHeight, 4, 4, 'F');
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(card3X, currentY, cardWidth, cardHeight, 4, 4, 'S');
    doc.setFillColor(16, 185, 129);
    doc.rect(card3X, currentY, 4, cardHeight, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('MÉDICO', card3X + 10, currentY + 8);
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105);
    doc.text(doctorCalls.toString(), card3X + 10, currentY + 22);
    
    currentY += cardHeight + 15;
    
    // Seção de Gráficos
    currentY = drawSectionTitle(doc, 'Análise Gráfica', currentY);
    
    // Gráfico de Atendimentos por Hora
    const hourlyChartData = hourlyData.map(h => ({ label: h.hour.substring(0, 2), value: h.atendimentos }));
    drawBarChart(doc, hourlyChartData, 14, currentY, 115, 50, 'Atendimentos por Hora');
    
    // Gráfico de Pizza - Distribuição por Tipo
    drawPieChart(doc, typeData, 165, currentY + 25, 18, 'Distribuição por Tipo');
    
    currentY += 60;
    
    // Gráfico de Atendimentos por Dia
    const recentDailyData = dailyData.slice(-7).map(d => ({ label: d.date.substring(0, 5), value: d.atendimentos }));
    drawBarChart(doc, recentDailyData, 14, currentY, pageWidth - 28, 40, 'Atendimentos por Dia (Últimos 7 dias)');
    
    currentY += 50;
    
    // Seção de Histórico
    currentY = drawSectionTitle(doc, 'Histórico de Chamadas', currentY);
    
    const tableData = filteredHistory.slice(0, 50).map(item => [
      item.patient_name,
      item.call_type === 'triage' ? 'Triagem' : 'Médico',
      item.destination || '-',
      format(parseISO(item.created_at), 'dd/MM/yyyy HH:mm'),
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Paciente', 'Tipo', 'Destino', 'Data/Hora']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { 
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 45 },
        3: { cellWidth: 35, halign: 'center' },
      },
      margin: { left: 14, right: 14, bottom: 35 },
    });
    
    // Adicionar rodapé elegante em todas as páginas
    addFooter(doc);
    
    // Salvar
    doc.save(`estatisticas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`);
  };

  // Função para apagar registros
  const handleDeleteRecords = async () => {
    if (deletePassword !== 'Paineiras@1') {
      toast({
        title: "Senha incorreta",
        description: "A senha informada está incorreta.",
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);

    // Fechar dialog imediatamente para não ficar preso no loading
    setDeleteDialogOpen(false);
    setDeletePassword('');

    const withTimeout = <T,>(promise: PromiseLike<T>, ms = 30000) => {
      return Promise.race([
        Promise.resolve(promise),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tempo limite ao comunicar com o servidor.')), ms)
        ),
      ]) as Promise<T>;
    };

    try {
      if (deleteScope === 'all') {
        // Apagar TODOS os registros do histórico de chamadas
        const { error: historyError } = await withTimeout(
          supabase
            .from('call_history')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'),
          60000
        );

        if (historyError) throw historyError;

        // Apagar TODOS os registros das estatísticas diárias
        const { error: statsError } = await withTimeout(
          supabase
            .from('statistics_daily')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'),
          60000
        );

        if (statsError) throw statsError;

        toast({
          title: "Registros apagados",
          description: "Todos os registros de todas as unidades foram removidos.",
        });
      } else {
        // Apagar apenas registros da unidade selecionada
        const { error: historyError } = await withTimeout(
          supabase
            .from('call_history')
            .delete()
            .eq('unit_name', deleteUnitName),
          60000
        );

        if (historyError) throw historyError;

        const { error: statsError } = await withTimeout(
          supabase
            .from('statistics_daily')
            .delete()
            .eq('unit_name', deleteUnitName),
          60000
        );

        if (statsError) throw statsError;

        toast({
          title: "Registros apagados",
          description: `Registros da unidade "${deleteUnitName}" foram removidos.`,
        });
      }

      setDeleteScope('all');
      loadDbHistory();
    } catch (error) {
      console.error('Erro ao apagar registros:', error);
      toast({
        title: "Erro ao apagar",
        description: "Não foi possível apagar agora. Verifique a conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Função para verificar senha de comparação
  const handleComparePassword = () => {
    if (comparePassword !== 'Paineiras@1') {
      toast({
        title: "Senha incorreta",
        description: "A senha informada está incorreta.",
        variant: "destructive",
      });
      return;
    }
    
    setCompareMode(true);
    setSelectedUnits(HEALTH_UNITS.map(u => u.name));
    setCompareDialogOpen(false);
    setComparePassword('');
    toast({
      title: "Modo comparação ativado",
      description: "Agora você pode comparar o rendimento entre as unidades.",
    });
  };

  // Função para tentar ativar modo comparação
  const handleToggleCompareMode = (checked: boolean) => {
    if (checked) {
      setCompareDialogOpen(true);
    } else {
      setCompareMode(false);
      setSelectedUnits([currentUnitName]);
    }
  };

  // Função para exportar backup
  const exportBackup = async () => {
    try {
      // Buscar todos os dados do histórico
      const { data: historyData, error: historyError } = await supabase
        .from('call_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      // Buscar estatísticas agregadas
      const { data: statsData, error: statsError } = await supabase
        .from('statistics_daily')
        .select('*')
        .order('date', { ascending: false });

      if (statsError) throw statsError;

      const backup = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUnitName,
        data: {
          call_history: historyData || [],
          statistics_daily: statsData || [],
        }
      };

      // Criar arquivo e baixar
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_chamadas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup exportado",
        description: `Backup com ${historyData?.length || 0} registros de chamadas e ${statsData?.length || 0} estatísticas diárias.`,
      });
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao gerar o backup.",
        variant: "destructive",
      });
    }
  };

  // Função para processar arquivo de backup
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Validar estrutura do backup
        if (!parsed.version || !parsed.data || !parsed.data.call_history) {
          throw new Error('Formato de backup inválido');
        }

        setBackupData(parsed);
        setRestoreDialogOpen(true);
      } catch (error) {
        toast({
          title: "Arquivo inválido",
          description: "O arquivo selecionado não é um backup válido.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Função para restaurar backup
  const handleRestoreBackup = async () => {
    if (restorePassword !== 'Paineiras@1') {
      toast({
        title: "Senha incorreta",
        description: "A senha informada está incorreta.",
        variant: "destructive",
      });
      return;
    }

    if (!backupData) return;

    setRestoring(true);
    try {
      let insertedHistory = 0;
      let insertedStats = 0;

      // Inserir dados do histórico (ignorar duplicados pelo ID)
      if (backupData.data.call_history && backupData.data.call_history.length > 0) {
        for (const record of backupData.data.call_history) {
          const { error } = await supabase
            .from('call_history')
            .upsert(record, { onConflict: 'id' });
          
          if (!error) insertedHistory++;
        }
      }

      // Inserir estatísticas diárias
      if (backupData.data.statistics_daily && backupData.data.statistics_daily.length > 0) {
        for (const record of backupData.data.statistics_daily) {
          const { error } = await supabase
            .from('statistics_daily')
            .upsert(record, { onConflict: 'id' });
          
          if (!error) insertedStats++;
        }
      }

      toast({
        title: "Backup restaurado",
        description: `Restaurados ${insertedHistory} registros de chamadas e ${insertedStats} estatísticas diárias.`,
      });

      setRestoreDialogOpen(false);
      setRestorePassword('');
      setBackupData(null);
      loadDbHistory();
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      toast({
        title: "Erro ao restaurar",
        description: "Ocorreu um erro ao restaurar o backup.",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  // Função para excluir estatísticas de atendimento e pacientes do dia
  const handleDeleteStatistics = async () => {
    if (deleteStatsPassword !== 'Paineiras@1') {
      toast({
        title: "Senha incorreta",
        description: "A senha informada está incorreta.",
        variant: "destructive",
      });
      return;
    }

    setDeletingStats(true);
    try {
      // Apagar estatísticas diárias
      const { error: statsError } = await supabase
        .from('statistics_daily')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (statsError) throw statsError;

      // Apagar pacientes chamados (para limpar tempo de espera)
      const { error: patientsError } = await supabase
        .from('patient_calls')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (patientsError) throw patientsError;

      toast({
        title: "Estatísticas apagadas",
        description: "Estatísticas de atendimento e dados de tempo de espera foram removidos.",
      });

      setDeleteStatsDialogOpen(false);
      setDeleteStatsPassword('');
      loadDbHistory();
    } catch (error) {
      console.error('Erro ao apagar estatísticas:', error);
      toast({
        title: "Erro ao apagar",
        description: "Ocorreu um erro ao tentar apagar as estatísticas.",
        variant: "destructive",
      });
    } finally {
      setDeletingStats(false);
    }
  };

  // Função para verificar status do cache de horas (agora 100% offline)
  const handleCheckHourCache = async () => {
    const status = await checkAudiosExist();
    toast({
      title: "Status do Cache de Horas (Offline)",
      description: `✅ Horas: ${status.hours}/24, Minutos: ${status.minutes}/59, Palavra 'minutos': ${status.hasMinutosWord ? 'Sim' : 'Não'}`,
    });
  };

  // Função para testar anúncio de hora atual
  const handleTestHourAnnouncement = async () => {
    if (!currentTime) {
      toast({
        title: "Erro",
        description: "Horário não sincronizado",
        variant: "destructive",
      });
      return;
    }
    
    setTestingHourAudio(true);
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    
    toast({
      title: "Testando Anúncio de Hora",
      description: `Reproduzindo: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    });
    
    try {
      const success = await playHourAudio(hour, minute);
      if (success) {
        toast({
          title: "Teste Concluído",
          description: "Áudio reproduzido com sucesso!",
        });
      } else {
        toast({
          title: "Erro no Teste",
          description: "Falha ao reproduzir áudio",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error testing hour audio:', error);
      toast({
        title: "Erro",
        description: "Erro ao testar áudio de hora",
        variant: "destructive",
      });
    } finally {
      setTestingHourAudio(false);
    }
  };

  // Função para limpar painel de chamados (patient_calls) e apagar as últimas chamadas exibidas na TV
  // Mantém TTS cache e estatísticas intactas
  const handleClearPatientCalls = async () => {
    if (clearCallsPassword !== 'Paineiras@1') {
      toast({
        title: "Senha incorreta",
        description: "A senha informada está incorreta.",
        variant: "destructive",
      });
      return;
    }

    setClearingCalls(true);

    // Fechar dialog imediatamente para feedback rápido
    setClearCallsDialogOpen(false);
    setClearCallsPassword('');

    const withTimeout = <T,>(promise: PromiseLike<T>, ms = 15000) => {
      return Promise.race([
        Promise.resolve(promise),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Tempo limite ao comunicar com o servidor.')),
            ms
          )
        ),
      ]) as Promise<T>;
    };

    try {
      // 1) Limpa o painel (todos os pacientes)
      const { error: callsError } = await withTimeout(
        supabase
          .from('patient_calls')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'),
        20000
      );

      if (callsError) throw callsError;

      // 2) Apaga apenas as últimas chamadas (para limpar a lista da TV), sem apagar todo o histórico do banco
      if (currentUnitName) {
        const { data: lastHistory, error: lastHistoryError } = await withTimeout(
          supabase
            .from('call_history')
            .select('id')
            .eq('unit_name', currentUnitName)
            .order('created_at', { ascending: false })
            .limit(10),
          15000
        );

        if (lastHistoryError) throw lastHistoryError;

        const ids = (lastHistory ?? []).map((i) => i.id).filter(Boolean);

        if (ids.length > 0) {
          const { error: historyError } = await withTimeout(
            supabase
              .from('call_history')
              .delete()
              .in('id', ids),
            20000
          );

          if (historyError) throw historyError;
        }
      }

      toast({
        title: "Painel limpo",
        description:
          "Pacientes removidos e últimas chamadas da TV apagadas. Estatísticas e cache TTS permanecem arquivados.",
      });

      // Recarregar dados em background
      loadDbHistory();
    } catch (error) {
      console.error('Erro ao limpar painel de chamados:', error);
      toast({
        title: "Erro ao limpar",
        description:
          "Não foi possível limpar agora. Verifique a conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setClearingCalls(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal de senha para comparação */}
      <Dialog open={compareDialogOpen} onOpenChange={(open) => {
        setCompareDialogOpen(open);
        if (!open) setComparePassword('');
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Comparar Unidades
            </DialogTitle>
            <DialogDescription>
              Digite a senha de administrador para acessar a comparação entre unidades.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="compare-password">Senha:</Label>
              <div className="relative">
                <Input
                  id="compare-password"
                  type={showComparePassword ? 'text' : 'password'}
                  value={comparePassword}
                  onChange={(e) => setComparePassword(e.target.value)}
                  placeholder="Digite a senha"
                  className="pr-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleComparePassword();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowComparePassword(!showComparePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showComparePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCompareDialogOpen(false);
                setComparePassword('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleComparePassword}
              disabled={!comparePassword}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Acessar Comparação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação para apagar */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Apagar Registros
            </DialogTitle>
            <DialogDescription>
              Escolha o escopo da exclusão e confirme com a senha de administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Seleção de escopo */}
            <div className="space-y-3">
              <Label>Escopo da exclusão:</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="delete-all"
                    name="deleteScope"
                    checked={deleteScope === 'all'}
                    onChange={() => setDeleteScope('all')}
                    className="w-4 h-4 text-destructive"
                  />
                  <Label htmlFor="delete-all" className="cursor-pointer font-normal">
                    Apagar <strong>todos</strong> os registros de <strong>todas as unidades</strong>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="delete-unit"
                    name="deleteScope"
                    checked={deleteScope === 'unit'}
                    onChange={() => setDeleteScope('unit')}
                    className="w-4 h-4 text-destructive"
                  />
                  <Label htmlFor="delete-unit" className="cursor-pointer font-normal">
                    Apagar apenas de uma unidade específica
                  </Label>
                </div>
              </div>
            </div>

            {/* Seleção de unidade */}
            {deleteScope === 'unit' && (
              <div className="space-y-2 ml-7">
                <Label>Selecione a unidade:</Label>
                <Select value={deleteUnitName} onValueChange={setDeleteUnitName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {HEALTH_UNITS.map((unit) => (
                      <SelectItem key={unit.id} value={unit.name}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Atenção: Esta ação não pode ser desfeita!
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-password">Digite a senha para confirmar:</Label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={showDeletePassword ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Senha de administrador"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletePassword('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRecords}
              disabled={deleting || !deletePassword}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Apagando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Apagar Registros
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de restauração de backup */}
      <Dialog open={restoreDialogOpen} onOpenChange={(open) => {
        setRestoreDialogOpen(open);
        if (!open) {
          setRestorePassword('');
          setBackupData(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Restaurar Backup
            </DialogTitle>
            <DialogDescription>
              Confirme a restauração do backup com a senha de administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {backupData && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Informações do Backup</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1 ml-6">
                  <p>Versão: {backupData.version}</p>
                  <p>Exportado em: {format(parseISO(backupData.exportedAt), 'dd/MM/yyyy HH:mm')}</p>
                  <p>Registros de chamadas: {backupData.data.call_history?.length || 0}</p>
                  <p>Estatísticas diárias: {backupData.data.statistics_daily?.length || 0}</p>
                </div>
              </div>
            )}
            
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-sm text-amber-600 font-medium">
                ⚠️ Os registros existentes com mesmo ID serão atualizados.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="restore-password">Digite a senha para confirmar:</Label>
              <div className="relative">
                <Input
                  id="restore-password"
                  type={showRestorePassword ? 'text' : 'password'}
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  placeholder="Senha de administrador"
                  className="pr-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRestoreBackup();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowRestorePassword(!showRestorePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showRestorePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRestoreDialogOpen(false);
                setRestorePassword('');
                setBackupData(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRestoreBackup}
              disabled={restoring || !restorePassword}
              className="gap-2"
            >
              {restoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Restaurar Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação para apagar estatísticas */}
      <Dialog open={deleteStatsDialogOpen} onOpenChange={(open) => {
        setDeleteStatsDialogOpen(open);
        if (!open) setDeleteStatsPassword('');
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <BarChart3 className="w-5 h-5" />
              Apagar Estatísticas de Atendimento
            </DialogTitle>
            <DialogDescription>
              Esta ação irá remover todas as estatísticas diárias agregadas de atendimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Atenção: Esta ação não pode ser desfeita! Todas as estatísticas de todas as unidades serão removidas.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-stats-password">Digite a senha para confirmar:</Label>
              <div className="relative">
                <Input
                  id="delete-stats-password"
                  type={showDeleteStatsPassword ? 'text' : 'password'}
                  value={deleteStatsPassword}
                  onChange={(e) => setDeleteStatsPassword(e.target.value)}
                  placeholder="Senha de administrador"
                  className="pr-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDeleteStatistics();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowDeleteStatsPassword(!showDeleteStatsPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showDeleteStatsPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteStatsDialogOpen(false);
                setDeleteStatsPassword('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStatistics}
              disabled={deletingStats || !deleteStatsPassword}
              className="gap-2"
            >
              {deletingStats ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Apagando...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  Apagar Estatísticas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para limpar painel de chamados */}
      <Dialog open={clearCallsDialogOpen} onOpenChange={(open) => {
        setClearCallsDialogOpen(open);
        if (!open) setClearCallsPassword('');
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-600">
              <Users className="w-5 h-5" />
              Limpar Painel de Chamados
            </DialogTitle>
            <DialogDescription>
              Remove todos os pacientes do painel de chamados (Cadastro, Triagem, Médico).
              <br /><br />
              <strong className="text-green-600">✓ Estatísticas e relatórios permanecem arquivados</strong>
              <br />
              <strong className="text-green-600">✓ Cache TTS permanece intacto</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
              <p className="text-sm text-cyan-700 dark:text-cyan-400 font-medium">
                ℹ️ Ideal para iniciar um novo dia de atendimento mantendo os dados históricos.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clear-calls-password">Digite a senha para confirmar:</Label>
              <div className="relative">
                <Input
                  id="clear-calls-password"
                  type={showClearCallsPassword ? 'text' : 'password'}
                  value={clearCallsPassword}
                  onChange={(e) => setClearCallsPassword(e.target.value)}
                  placeholder="Senha de administrador"
                  className="pr-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleClearPatientCalls();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowClearCallsPassword(!showClearCallsPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showClearCallsPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setClearCallsDialogOpen(false);
                setClearCallsPassword('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleClearPatientCalls}
              disabled={clearingCalls || !clearCallsPassword}
              className="gap-2 bg-cyan-600 hover:bg-cyan-700"
            >
              {clearingCalls ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Limpando...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Limpar Painel
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Input oculto para seleção de arquivo */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json"
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Administrativo</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToPDF} className="gap-2">
            <FileDown className="w-4 h-4" />
            Relatório PDF
          </Button>
          <Button onClick={exportTutorialPDF} variant="outline" className="gap-2 border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950">
            <BookOpen className="w-4 h-4" />
            Tutorial PDF
          </Button>
          <Button onClick={exportBackup} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Backup
          </Button>
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            variant="outline" 
            className="gap-2"
          >
            <FileUp className="w-4 h-4" />
            Restaurar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setDeleteStatsDialogOpen(true)} 
            className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
          >
            <BarChart3 className="w-4 h-4" />
            Limpar Estatísticas
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setClearCallsDialogOpen(true)} 
            className="gap-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950"
          >
            <Users className="w-4 h-4" />
            Limpar Painel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => setDeleteDialogOpen(true)} 
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Apagar Tudo
          </Button>
          <Button 
            variant="outline" 
            onClick={async () => {
              setTestingHourAudio(true);
              const now = new Date();
              const hour = now.getHours();
              const minute = now.getMinutes();
              toast({
                title: "Testando áudio de hora",
                description: `Reproduzindo: ${hour}h${minute.toString().padStart(2, '0')}`,
              });
              try {
                // Play time notification sound first (G5 → C6 ascending tones)
                const timeNotificationVolume = parseFloat(localStorage.getItem('volume-time-notification') || '1');
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                
                const playTone = (frequency: number, startTime: number, duration: number) => {
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  oscillator.frequency.value = frequency;
                  oscillator.type = 'sine';
                  
                  const maxGain = 0.3 * timeNotificationVolume;
                  gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
                  gainNode.gain.linearRampToValueAtTime(maxGain, audioContext.currentTime + startTime + 0.05);
                  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
                  
                  oscillator.start(audioContext.currentTime + startTime);
                  oscillator.stop(audioContext.currentTime + startTime + duration);
                };
                
                // G5 (783.99 Hz) → C6 (1046.50 Hz) - soft ascending tones
                playTone(783.99, 0, 0.25);
                playTone(1046.50, 0.15, 0.35);
                
                // Wait for notification sound to finish
                await new Promise(resolve => setTimeout(resolve, 600));
                
                const success = await playHourAudio(hour, minute);
                if (!success) {
                  toast({
                    title: "Erro no áudio",
                    description: "Não foi possível reproduzir o áudio da hora.",
                    variant: "destructive",
                  });
                }
              } catch (error) {
                toast({
                  title: "Erro ao testar",
                  description: "Ocorreu um erro ao reproduzir o áudio.",
                  variant: "destructive",
                });
              } finally {
                setTestingHourAudio(false);
              }
            }}
            disabled={testingHourAudio}
            className="gap-2 border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
          >
            {testingHourAudio ? (
              <>
                <Volume2 className="w-4 h-4 animate-pulse" />
                Reproduzindo...
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                Testar Hora Falada
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setRegenCacheDialogOpen(true)}
            className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            <Clock className="w-4 h-4" />
            Anúncio de Horas (Google TTS)
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
                onCheckedChange={(checked) => handleToggleCompareMode(checked === true)}
              />
              <Label htmlFor="compareMode" className="flex items-center gap-2 cursor-pointer">
                <Building2 className="w-4 h-4" />
                Comparar rendimento entre unidades
                {!compareMode && <span className="text-xs text-muted-foreground">(requer senha)</span>}
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

      {/* Cards de Procedimentos */}
      <h3 className="text-lg font-semibold text-foreground mt-6 flex items-center gap-2">
        <Activity className="w-5 h-5" />
        Procedimentos Realizados (Período)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eletrocardiogramas</CardTitle>
            <HeartPulse className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{ecgProcedures}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalProcedures > 0 ? Math.round((ecgProcedures / totalProcedures) * 100) : 0}% dos procedimentos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Curativos</CardTitle>
            <Bandage className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{curativosProcedures}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalProcedures > 0 ? Math.round((curativosProcedures / totalProcedures) * 100) : 0}% dos procedimentos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Raio X</CardTitle>
            <Scan className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">{raioXProcedures}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalProcedures > 0 ? Math.round((raioXProcedures / totalProcedures) * 100) : 0}% dos procedimentos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enfermaria</CardTitle>
            <Bed className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{enfermariaProcedures}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalProcedures > 0 ? Math.round((enfermariaProcedures / totalProcedures) * 100) : 0}% dos procedimentos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-600/5 border-slate-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Procedimentos</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{totalProcedures}</div>
            <p className="text-xs text-muted-foreground mt-1">
              no período selecionado
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Tempo Médio de Espera (Hoje)</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
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

        {/* Horário de Pico */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Horário de Pico</CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            {(() => {
              const peakHour = hourlyData.reduce((max, h) => h.atendimentos > max.atendimentos ? h : max, { hour: '-', atendimentos: 0 });
              return (
                <>
                  <div className="text-4xl font-bold text-orange-600">
                    {peakHour.atendimentos > 0 ? peakHour.hour : '-'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {peakHour.atendimentos > 0 
                      ? `${peakHour.atendimentos} atendimentos neste horário` 
                      : 'Nenhum atendimento no período'}
                  </p>
                  {peakHour.atendimentos > 0 && (
                    <div className="mt-3 flex gap-1">
                      {hourlyData.slice(0, 12).map((h, i) => {
                        const maxAtt = Math.max(...hourlyData.map(d => d.atendimentos), 1);
                        const height = (h.atendimentos / maxAtt) * 100;
                        const isPeak = h.hour === peakHour.hour;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center">
                            <div 
                              className={`w-full rounded-t transition-all ${isPeak ? 'bg-orange-500' : 'bg-primary/30'}`}
                              style={{ height: `${Math.max(height, 5)}%`, minHeight: '4px', maxHeight: '40px' }}
                            />
                            <span className="text-[8px] text-muted-foreground mt-1">{h.hour.substring(0, 2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

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

      {/* Estatísticas TTS Google Cloud */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Estatísticas TTS (Texto para Voz)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Cards de Resumo TTS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Consultas API</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {apiKeyUsage.reduce((sum, i) => sum + i.count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">gerações no período</p>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Uso do Cache</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {ttsNameUsage.reduce((sum, i) => sum + i.usage_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">reproduções totais</p>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Nomes Salvos</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {ttsNameUsage.length}
              </p>
              <p className="text-xs text-muted-foreground">pacientes no cache</p>
            </div>
            
            <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Economia</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {ttsNameUsage.length > 0 && apiKeyUsage.reduce((sum, i) => sum + i.count, 0) > 0
                  ? Math.round(((ttsNameUsage.reduce((sum, i) => sum + i.usage_count, 0) - apiKeyUsage.reduce((sum, i) => sum + i.count, 0)) / Math.max(ttsNameUsage.reduce((sum, i) => sum + i.usage_count, 0), 1)) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">de chamadas API</p>
            </div>
          </div>

          <div className="grid md:grid-cols-1 gap-6">

            {/* Lista de Nomes com Botão Ver Todos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Nomes em Cache
                </h4>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowNamesDialog(true)}
                  disabled={ttsNameUsage.length === 0}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Todos ({ttsNameUsage.length})
                </Button>
              </div>
              
              {ttsNameUsage.length > 0 ? (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {ttsNameUsage.slice(0, 8).map((item) => (
                    <div 
                      key={item.name_hash}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-purple-600">
                            {item.name_text.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate capitalize">{item.name_text}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(item.last_used), 'dd/MM HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-purple-600">{item.usage_count}x</span>
                        {item.usage_count >= 5 && (
                          <span className="block text-[10px] text-green-600">permanente</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Nenhum nome registrado
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Users Panel */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-green-500/10 to-blue-500/10">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" />
            Usuários e Sessões Ativas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ActiveUsersPanel />
        </CardContent>
      </Card>

      {/* System Monitoring Panel */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            Monitoramento do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <SystemMonitoringPanel />
        </CardContent>
      </Card>

      {/* Marketing Panel */}
      <MarketingPanel />

      {/* Dialog para Ver Todos os Nomes */}
      <Dialog open={showNamesDialog} onOpenChange={setShowNamesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Nomes de Pacientes em Cache ({ttsNameUsage.length})
            </DialogTitle>
            <DialogDescription>
              Lista completa de nomes armazenados no cache TTS. Nomes com 5+ usos são promovidos a cache permanente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[50vh] mt-4">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="text-left py-2 px-2">Nome</th>
                  <th className="text-center py-2 px-2">Usos</th>
                  <th className="text-center py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">Último Uso</th>
                </tr>
              </thead>
              <tbody>
                {ttsNameUsage.map((item) => (
                  <tr key={item.name_hash} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-2 capitalize font-medium">{item.name_text}</td>
                    <td className="py-2 px-2 text-center">
                      <span className="font-bold text-purple-600">{item.usage_count}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {item.usage_count >= 5 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-600">
                          Permanente
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-600">
                          Temporário
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {format(parseISO(item.last_used), 'dd/MM/yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <DialogFooter className="mt-4">
            <div className="flex justify-between w-full items-center">
              <div className="text-sm text-muted-foreground">
                <span className="text-green-600 font-medium">{ttsNameUsage.filter(n => n.usage_count >= 5).length}</span> permanentes • 
                <span className="text-amber-600 font-medium ml-1">{ttsNameUsage.filter(n => n.usage_count < 5).length}</span> temporários
              </div>
              <Button variant="outline" onClick={() => setShowNamesDialog(false)}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para verificar cache de horas (100% offline) */}
      <Dialog open={regenCacheDialogOpen} onOpenChange={(open) => {
        setRegenCacheDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Anúncio de Horas (Google Cloud TTS)
            </DialogTitle>
            <DialogDescription>
              O sistema de anúncio de horas usa Google Cloud TTS para gerar a frase completa do horário em tempo real.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-sm text-blue-600 font-medium">
                🎙️ Google Cloud TTS - Frase completa gerada em tempo real
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ex: "duas horas e trinta e cinco minutos", "meio-dia e meia", "meia-noite"
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-sm text-amber-600 font-medium mb-2">📋 Regras de Anúncio:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 3 anúncios por hora em horários aleatórios (mínimo 10 min entre eles)</li>
                <li>• Cada anúncio repete 2x com som de notificação antes</li>
                <li>• Silêncio entre 22h e 6h (horário de descanso)</li>
                <li>• Não fala "minutos" em hora cheia ou meia-hora</li>
              </ul>
            </div>
            {currentTime && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm text-green-600 font-medium">
                  🕐 Hora atual: {currentTime.getHours().toString().padStart(2, '0')}:{currentTime.getMinutes().toString().padStart(2, '0')}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setRegenCacheDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
