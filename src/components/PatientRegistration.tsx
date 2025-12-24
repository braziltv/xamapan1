import { useState } from 'react';
import { useInactivityReload } from '@/hooks/useInactivityReload';
import { usePatientAddedSound } from '@/hooks/usePatientAddedSound';
import { RotatingTipsCard } from '@/components/RotatingTipsCard';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NameAutocomplete } from '@/components/NameAutocomplete';
import { UserPlus, Trash2, Users, Volume2, VolumeX, CheckCircle, Activity, Stethoscope, AlertTriangle, AlertCircle, Circle, FileText, Pencil, Heart, Bandage, Scan, BedDouble, ArrowRight } from 'lucide-react';
import { Patient, PatientPriority, PatientStatus } from '@/types/patient';
import { formatBrazilTime } from '@/hooks/useBrazilTime';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ElapsedTimeDisplay } from '@/components/ElapsedTimeDisplay';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ContextualTip, InlineTip } from '@/components/ContextualTip';

interface PatientRegistrationProps {
  patients: Patient[];
  onAddPatient: (name: string, priority?: PatientPriority) => Promise<{ isDuplicate: boolean }>;
  onRemovePatient: (id: string) => void;
  onDirectPatient: (patientName: string, destination: string) => void;
  onFinishWithoutCall: (id: string) => void;
  onForwardToTriage: (id: string, destination?: string) => void;
  onForwardToDoctor: (id: string, destination?: string) => void;
  onForwardToEcg: (id: string) => void;
  onForwardToCurativos: (id: string) => void;
  onForwardToRaiox: (id: string) => void;
  onForwardToEnfermaria: (id: string) => void;
  onSendToTriageQueue?: (id: string) => void;
  onSendToDoctorQueue?: (id: string, destination?: string) => void;
  onSendToEcgQueue?: (id: string) => void;
  onSendToCurativosQueue?: (id: string) => void;
  onSendToRaioxQueue?: (id: string) => void;
  onSendToEnfermariaQueue?: (id: string) => void;
  onUpdatePriority?: (id: string, priority: PatientPriority) => void;
  onUpdateObservations?: (id: string, observations: string) => void;
}

const SALAS = [
  { id: 'triagem', name: 'Triagem', icon: Activity, color: 'text-blue-600' },
  { id: 'eletro', name: 'Sala de Eletrocardiograma', icon: Heart, color: 'text-blue-500' },
  { id: 'curativo', name: 'Sala de Curativos', icon: Bandage, color: 'text-amber-600' },
  { id: 'raiox', name: 'Sala de Raio X', icon: Scan, color: 'text-purple-600' },
  { id: 'enfermaria', name: 'Enfermaria', icon: BedDouble, color: 'text-rose-600' },
];

const CONSULTORIOS = [
  { id: 'cons1', name: 'Consultório 1' },
  { id: 'cons2', name: 'Consultório 2' },
];

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergência', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-500', icon: AlertTriangle },
  priority: { label: 'Prioridade', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-500', icon: AlertCircle },
  normal: { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-500', icon: Circle },
};

// Helper to get status display info
const getStatusInfo = (status: PatientStatus, destination?: string) => {
  const statusMap: Record<string, { text: string; color: string }> = {
    'waiting': { text: 'Aguardando cadastro', color: 'text-slate-500' },
    'waiting-triage': { text: 'Na fila da triagem', color: 'text-amber-500' },
    'in-triage': { text: 'Em triagem', color: 'text-blue-500' },
    'waiting-doctor': { text: `Aguardando médico${destination ? ` - ${destination}` : ''}`, color: 'text-purple-500' },
    'in-consultation': { text: 'Em consulta', color: 'text-green-500' },
    'waiting-ecg': { text: 'Aguardando ECG', color: 'text-blue-500' },
    'in-ecg': { text: 'Em ECG', color: 'text-blue-600' },
    'waiting-curativos': { text: 'Aguardando Curativos', color: 'text-amber-500' },
    'in-curativos': { text: 'Em Curativos', color: 'text-amber-600' },
    'waiting-raiox': { text: 'Aguardando Raio X', color: 'text-purple-500' },
    'in-raiox': { text: 'Em Raio X', color: 'text-purple-600' },
    'waiting-enfermaria': { text: 'Aguardando Enfermaria', color: 'text-rose-500' },
    'in-enfermaria': { text: 'Em Enfermaria', color: 'text-rose-600' },
    'attended': { text: 'Atendido', color: 'text-green-600' },
  };
  return statusMap[status] || { text: status, color: 'text-muted-foreground' };
};

// Helper to get origin badge
const getOriginBadge = (destination?: string) => {
  if (!destination) return null;
  
  const originMap: Record<string, { bg: string; text: string; icon: typeof Activity }> = {
    'Sala de Eletrocardiograma': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: Heart },
    'Sala de Curativos': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: Bandage },
    'Sala de Raio X': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', icon: Scan },
    'Enfermaria': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', icon: BedDouble },
    'Triagem': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', icon: Activity },
    'Consultório 1': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: Stethoscope },
    'Consultório 2': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: Stethoscope },
  };
  
  return originMap[destination] || null;
};

export function PatientRegistration({ 
  patients, 
  onAddPatient, 
  onRemovePatient,
  onDirectPatient,
  onFinishWithoutCall,
  onForwardToTriage,
  onForwardToDoctor,
  onForwardToEcg,
  onForwardToCurativos,
  onForwardToRaiox,
  onForwardToEnfermaria,
  onSendToTriageQueue,
  onSendToDoctorQueue,
  onSendToEcgQueue,
  onSendToCurativosQueue,
  onSendToRaioxQueue,
  onSendToEnfermariaQueue,
  onUpdatePriority,
  onUpdateObservations
}: PatientRegistrationProps) {
  const [name, setName] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<PatientPriority>('normal');
  const [confirmFinish, setConfirmFinish] = useState<{ id: string; name: string } | null>(null);
  const [editingObservation, setEditingObservation] = useState<{ id: string; value: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useInactivityReload();
  const { playAddedSound } = usePatientAddedSound();

  const ACCENT_TIPS = [
    '💡 Dica: Acentue os nomes corretamente (ex: José, João, Luís) para melhor pronúncia no áudio!',
    '✨ Lembre-se: Nomes acentuados como "André", "Inês", "Márcio" soam mais naturais na chamada.',
    '🎯 Para melhor qualidade de áudio, use acentos: "Cláudia" ao invés de "Claudia".',
    '📢 O sistema pronuncia melhor nomes com acentos corretos: José, não Jose.',
    '🔊 Acentos fazem diferença! "Antônio" soa muito melhor que "Antonio" no alto-falante.',
  ];
  const [currentTip] = useState(() => ACCENT_TIPS[Math.floor(Math.random() * ACCENT_TIPS.length)]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setIsLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        const result = await onAddPatient(name, selectedPriority);
        
        if (result.isDuplicate) {
          toast.warning(`Paciente "${name}" já está cadastrado na lista!`, {
            description: 'Verifique a lista de pacientes aguardando.',
            duration: 5000,
          });
        } else {
          setName('');
          setSelectedPriority('normal');
          playAddedSound();
          toast.success('Paciente cadastrado com sucesso!');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const activePatients = patients.filter(p => p.status !== 'attended');

  // Helper functions for silent queue sending
  const handleSendToQueue = (patientId: string, patientName: string, queueType: string, sendFn?: (id: string) => void) => {
    if (sendFn) {
      sendFn(patientId);
      toast.success(`${patientName} encaminhado para ${queueType} (interno)`);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Registration Form */}
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-health border border-border">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
          <span className="animate-bounce inline-block">📝</span> 
          <ContextualTip tipKey="cadastro_salvar" side="right">
            Cadastrar Paciente
          </ContextualTip>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <NameAutocomplete
              value={name}
              onChange={setName}
              placeholder="Nome completo do paciente"
              className="flex-1 text-base"
            />
            <Select value={selectedPriority} onValueChange={(v) => setSelectedPriority(v as PatientPriority)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">
                  <span className="flex items-center gap-2">
                    <Circle className="w-3 h-3 text-green-600" />
                    Normal
                  </span>
                </SelectItem>
                <SelectItem value="priority">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Prioridade
                  </span>
                </SelectItem>
                <SelectItem value="emergency">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    Emergência
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={!name.trim() || isLoading} className="w-full sm:w-auto">
              <UserPlus className="w-4 h-4 mr-2" />
              Cadastrar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground italic">{currentTip}</p>
        </form>
      </div>

      {/* Patient List */}
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-health border border-border">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
          <span className="animate-pulse inline-block">👥</span> 
          <ContextualTip tipKey="atualizacao_auto" side="right">
            Pacientes Cadastrados
          </ContextualTip>
          <AnimatedCounter value={activePatients.length} />
          <InlineTip tipKey="regra_fila_unica" />
        </h2>
        
        {activePatients.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm sm:text-base">
            Nenhum paciente cadastrado
          </p>
        ) : (
          <div className="space-y-2 max-h-[60vh] sm:max-h-[500px] overflow-y-auto">
            {activePatients.map((patient, index) => {
              const priorityConfig = PRIORITY_CONFIG[patient.priority || 'normal'];
              const PriorityIcon = priorityConfig.icon;
              const statusInfo = getStatusInfo(patient.status, patient.destination);
              const originBadge = getOriginBadge(patient.destination);
              
              return (
                <div
                  key={patient.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg hover:bg-muted transition-all duration-300 gap-3 ${priorityConfig.bg} border-l-4 ${priorityConfig.border} animate-fade-in hover:scale-[1.01] hover:shadow-md`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Posição</span>
                      <span className="text-xl sm:text-2xl font-mono font-bold text-primary">
                        {index + 1}º
                      </span>
                      <PriorityIcon className={`w-4 h-4 ${priorityConfig.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm sm:text-base truncate">{patient.name}</p>
                        {patient.priority === 'emergency' && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded animate-pulse">
                            EMERGÊNCIA
                          </span>
                        )}
                        {patient.priority === 'priority' && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded">
                            PRIORIDADE
                          </span>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ElapsedTimeDisplay startTime={patient.createdAt} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Tempo aguardando</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-amber-500 font-medium text-xs sm:text-sm">
                          Cadastrado às {formatBrazilTime(patient.createdAt, 'HH:mm')}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className={`font-medium text-xs sm:text-sm ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                        {/* Origin badge - show where patient came from */}
                        {originBadge && patient.status !== 'waiting' && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${originBadge.bg} ${originBadge.text}`}>
                            <originBadge.icon className="w-3 h-3" />
                            {patient.destination}
                          </span>
                        )}
                      </div>
                      {/* Observações */}
                      {editingObservation?.id === patient.id ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <Textarea
                            placeholder="Digite uma observação..."
                            value={editingObservation.value}
                            onChange={(e) => setEditingObservation({ id: patient.id, value: e.target.value })}
                            className="text-xs min-h-[60px] resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (onUpdateObservations) {
                                  onUpdateObservations(patient.id, editingObservation.value);
                                }
                                setEditingObservation(null);
                              }}
                              className="text-xs h-7 px-2"
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingObservation(null)}
                              className="text-xs h-7 px-2"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-start gap-1">
                          {patient.observations ? (
                            <div className="flex items-start gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                              <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="break-words">{patient.observations}</span>
                            </div>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingObservation({ id: patient.id, value: patient.observations || '' })}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            title={patient.observations ? 'Editar observação' : 'Adicionar observação'}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end ml-9 sm:ml-0">
                    {/* Alterar Prioridade */}
                    {onUpdatePriority && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-1 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 ${priorityConfig.color}`}
                          >
                            <PriorityIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">Prioridade</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-card border border-border z-50">
                          <DropdownMenuLabel>Alterar Prioridade</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onUpdatePriority(patient.id, 'emergency')} className="cursor-pointer text-red-600">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Emergência
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdatePriority(patient.id, 'priority')} className="cursor-pointer text-amber-600">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Prioridade
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdatePriority(patient.id, 'normal')} className="cursor-pointer text-green-600">
                            <Circle className="w-4 h-4 mr-2" />
                            Normal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* Main Actions Dropdown - Encaminhar */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-primary hover:text-primary/80 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                        >
                          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline">Encaminhar</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border border-border z-50 w-64">
                        {/* Triagem */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <Activity className="w-4 h-4 mr-2 text-cyan-600" />
                            Triagem
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-card border border-border">
                            <DropdownMenuItem onClick={() => onForwardToTriage(patient.id, 'Triagem')} className="cursor-pointer">
                              <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                              Com voz na TV
                            </DropdownMenuItem>
                            {onSendToTriageQueue && (
                              <DropdownMenuItem onClick={() => handleSendToQueue(patient.id, patient.name, 'Triagem', onSendToTriageQueue)} className="cursor-pointer">
                                <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                Interno (sem voz)
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />

                        {/* ECG */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <Heart className="w-4 h-4 mr-2 text-blue-500" />
                            Eletrocardiograma
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-card border border-border">
                            <DropdownMenuItem onClick={() => onForwardToEcg(patient.id)} className="cursor-pointer">
                              <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                              Com voz na TV
                            </DropdownMenuItem>
                            {onSendToEcgQueue && (
                              <DropdownMenuItem onClick={() => handleSendToQueue(patient.id, patient.name, 'ECG', onSendToEcgQueue)} className="cursor-pointer">
                                <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                Interno (sem voz)
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {/* Curativos */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <Bandage className="w-4 h-4 mr-2 text-amber-600" />
                            Curativos
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-card border border-border">
                            <DropdownMenuItem onClick={() => onForwardToCurativos(patient.id)} className="cursor-pointer">
                              <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                              Com voz na TV
                            </DropdownMenuItem>
                            {onSendToCurativosQueue && (
                              <DropdownMenuItem onClick={() => handleSendToQueue(patient.id, patient.name, 'Curativos', onSendToCurativosQueue)} className="cursor-pointer">
                                <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                Interno (sem voz)
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {/* Raio X */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <Scan className="w-4 h-4 mr-2 text-purple-600" />
                            Raio X
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-card border border-border">
                            <DropdownMenuItem onClick={() => onForwardToRaiox(patient.id)} className="cursor-pointer">
                              <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                              Com voz na TV
                            </DropdownMenuItem>
                            {onSendToRaioxQueue && (
                              <DropdownMenuItem onClick={() => handleSendToQueue(patient.id, patient.name, 'Raio X', onSendToRaioxQueue)} className="cursor-pointer">
                                <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                Interno (sem voz)
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {/* Enfermaria */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <BedDouble className="w-4 h-4 mr-2 text-rose-600" />
                            Enfermaria
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-card border border-border">
                            <DropdownMenuItem onClick={() => onForwardToEnfermaria(patient.id)} className="cursor-pointer">
                              <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                              Com voz na TV
                            </DropdownMenuItem>
                            {onSendToEnfermariaQueue && (
                              <DropdownMenuItem onClick={() => handleSendToQueue(patient.id, patient.name, 'Enfermaria', onSendToEnfermariaQueue)} className="cursor-pointer">
                                <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                Interno (sem voz)
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />

                        {/* Médico */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <Stethoscope className="w-4 h-4 mr-2 text-green-600" />
                            Médico
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-card border border-border">
                            <DropdownMenuLabel className="text-xs">Com voz na TV</DropdownMenuLabel>
                            {CONSULTORIOS.map((cons) => (
                              <DropdownMenuItem key={cons.id} onClick={() => onForwardToDoctor(patient.id, cons.name)} className="cursor-pointer">
                                <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                                {cons.name}
                              </DropdownMenuItem>
                            ))}
                            {onSendToDoctorQueue && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs">Interno (sem voz)</DropdownMenuLabel>
                                {CONSULTORIOS.map((cons) => (
                                  <DropdownMenuItem key={`silent-${cons.id}`} onClick={() => {
                                    onSendToDoctorQueue(patient.id, cons.name);
                                    toast.success(`${patient.name} encaminhado para ${cons.name} (interno)`);
                                  }} className="cursor-pointer">
                                    <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                    {cons.name}
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Finalizar */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmFinish({ id: patient.id, name: patient.name })}
                      className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                    >
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Finalizar</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemovePatient(patient.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Motivational Quote */}
      <div className="mt-4">
        <RotatingTipsCard />
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmFinish} onOpenChange={() => setConfirmFinish(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar finalização</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar o atendimento de <strong>{confirmFinish?.name}</strong>?
              <br />
              <span className="text-destructive">O paciente será removido de todos os módulos.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmFinish) {
                  onFinishWithoutCall(confirmFinish.id);
                  setConfirmFinish(null);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading Overlay */}
      <LoadingOverlay show={isLoading} message="Processando..." />
    </div>
  );
}
