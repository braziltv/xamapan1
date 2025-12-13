import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  User, 
  Activity, 
  Stethoscope, 
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  FileText,
  History
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientHistoryRecord {
  id: string;
  patient_name: string;
  call_type: string;
  destination: string | null;
  created_at: string;
  unit_name: string;
}

interface PatientSummary {
  name: string;
  totalCalls: number;
  triageCalls: number;
  doctorCalls: number;
  firstVisit: string;
  lastVisit: string;
  records: PatientHistoryRecord[];
}

export function PatientHistorySearch() {
  const [searchName, setSearchName] = useState('');
  const [searching, setSearching] = useState(false);
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [noResults, setNoResults] = useState(false);

  const searchPatientHistory = useCallback(async () => {
    if (!searchName.trim()) return;
    
    setSearching(true);
    setNoResults(false);
    setPatientSummary(null);
    
    try {
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .ilike('patient_name', `%${searchName.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        return;
      }

      if (!data || data.length === 0) {
        setNoResults(true);
        return;
      }

      // Group by exact patient name and get the most common one
      const nameGroups: Record<string, PatientHistoryRecord[]> = {};
      data.forEach(record => {
        const name = record.patient_name.toUpperCase();
        if (!nameGroups[name]) {
          nameGroups[name] = [];
        }
        nameGroups[name].push(record);
      });

      // Find the best match (exact or most records)
      const searchUpper = searchName.trim().toUpperCase();
      let bestMatch = Object.keys(nameGroups).find(name => name === searchUpper);
      
      if (!bestMatch) {
        // Get the one with most records
        bestMatch = Object.keys(nameGroups).reduce((a, b) => 
          nameGroups[a].length > nameGroups[b].length ? a : b
        );
      }

      const records = nameGroups[bestMatch];
      const triageCalls = records.filter(r => r.call_type === 'triage').length;
      const doctorCalls = records.filter(r => r.call_type === 'doctor').length;

      setPatientSummary({
        name: records[0].patient_name,
        totalCalls: records.length,
        triageCalls,
        doctorCalls,
        firstVisit: records[records.length - 1].created_at,
        lastVisit: records[0].created_at,
        records
      });
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setSearching(false);
    }
  }, [searchName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchPatientHistory();
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Histórico por Paciente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="patient-search" className="sr-only">Nome do paciente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="patient-search"
                placeholder="Digite o nome do paciente para buscar..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
          </div>
          <Button 
            onClick={searchPatientHistory} 
            disabled={searching || !searchName.trim()}
            className="gap-2"
          >
            {searching ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Buscar
          </Button>
        </div>

        {/* No results message */}
        {noResults && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum registro encontrado</p>
            <p className="text-sm">Não foram encontrados atendimentos para "{searchName}"</p>
          </div>
        )}

        {/* Patient summary */}
        {patientSummary && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Summary header */}
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{patientSummary.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {patientSummary.totalCalls} atendimento{patientSummary.totalCalls !== 1 ? 's' : ''} registrado{patientSummary.totalCalls !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="gap-1"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Expandir
                    </>
                  )}
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{patientSummary.totalCalls}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{patientSummary.triageCalls}</div>
                  <div className="text-xs text-muted-foreground">Triagem</div>
                </div>
                <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{patientSummary.doctorCalls}</div>
                  <div className="text-xs text-muted-foreground">Médico</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-sm font-medium">
                    {format(parseISO(patientSummary.firstVisit), 'dd/MM/yy')}
                  </div>
                  <div className="text-xs text-muted-foreground">Primeiro registro</div>
                </div>
              </div>
            </div>

            {/* Detailed records */}
            {expanded && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  Histórico detalhado
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                  {patientSummary.records.map((record, index) => (
                    <div 
                      key={record.id}
                      className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        record.call_type === 'triage' 
                          ? 'bg-blue-500/10' 
                          : 'bg-emerald-500/10'
                      }`}>
                        {record.call_type === 'triage' ? (
                          <Activity className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Stethoscope className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={record.call_type === 'triage' ? 'default' : 'secondary'} className={
                            record.call_type === 'triage' 
                              ? 'bg-blue-500 hover:bg-blue-600' 
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          }>
                            {record.call_type === 'triage' ? 'Triagem' : 'Médico'}
                          </Badge>
                          {record.destination && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {record.destination}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {record.unit_name}
                        </div>
                      </div>

                      {/* Date/Time */}
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(record.created_at), 'dd/MM/yyyy')}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(record.created_at), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!patientSummary && !noResults && !searching && (
          <div className="text-center py-6 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Digite o nome de um paciente para ver seu histórico de atendimentos</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
