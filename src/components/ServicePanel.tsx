import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { SuccessAnimation } from '@/components/SuccessAnimation';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Phone, Check, AlertTriangle, AlertCircle, Circle, Volume2, VolumeX, FileText, Pencil, Forward, Stethoscope, ChevronDown, Activity, Heart, Bandage, Scan, BedDouble, ArrowRight } from 'lucide-react';
import { Patient, PatientPriority } from '@/types/patient';
import { formatBrazilTime } from '@/hooks/useBrazilTime';
import { ElapsedTimeDisplay } from '@/components/ElapsedTimeDisplay';
import { toast } from 'sonner';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useNewPatientSound } from '@/hooks/useNewPatientSound';
import { useForwardNotification } from '@/hooks/useForwardNotification';
import { useInactivityReload } from '@/hooks/useInactivityReload';
import { DailyQuoteCard } from '@/components/DailyQuoteCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LucideIcon } from 'lucide-react';
import { ContextualTip, InlineTip } from '@/components/ContextualTip';

const CONSULTORIOS = [
  { id: 'cons1', name: 'Consultório 1' },
  { id: 'cons2', name: 'Consultório 2' },
];

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergência', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-500', icon: AlertTriangle },
  priority: { label: 'Prioridade', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-500', icon: AlertCircle },
  normal: { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-500', icon: Circle },
};

const ORIGIN_CONFIG: Record<string, { label: string; color: string }> = {
  cadastro: { label: 'Cadastro', color: 'bg-slate-500' },
  triage: { label: 'Triagem', color: 'bg-blue-500' },
  doctor: { label: 'Médico', color: 'bg-green-600' },
  ecg: { label: 'ECG', color: 'bg-cyan-500' },
  curativos: { label: 'Curativos', color: 'bg-amber-500' },
  raiox: { label: 'Raio X', color: 'bg-purple-500' },
  enfermaria: { label: 'Enfermaria', color: 'bg-rose-500' },
};

interface ServicePanelProps {
  serviceName: string;
  serviceIcon: string;
  serviceColor: string;
  serviceKey: 'ecg' | 'curativos' | 'raiox' | 'enfermaria';
  waitingPatients: Patient[];
  currentCall: Patient | null;
  onCallPatient: (id: string, destination?: string) => void;
  onFinishService: (id: string) => void;
  onRecall: (destination?: string) => void;
  onFinishWithoutCall: (id: string) => void;
  onUpdateObservations?: (id: string, observations: string) => void;
  onForwardToTriage?: (id: string, destination?: string) => void;
  onSendToTriageQueue?: (id: string) => void;
  onForwardToDoctor?: (id: string, destination: string) => void;
  onSendToDoctorQueue?: (id: string, destination: string) => void;
  onForwardToEcg?: (id: string) => void;
  onForwardToCurativos?: (id: string) => void;
  onForwardToRaiox?: (id: string) => void;
  onForwardToEnfermaria?: (id: string) => void;
  onSendToEcgQueue?: (id: string) => void;
  onSendToCurativosQueue?: (id: string) => void;
  onSendToRaioxQueue?: (id: string) => void;
  onSendToEnfermariaQueue?: (id: string) => void;
  soundKey: string;
}

export function ServicePanel({ 
  serviceName,
  serviceIcon,
  serviceColor,
  serviceKey,
  waitingPatients, 
  currentCall, 
  onCallPatient, 
  onFinishService,
  onRecall,
  onFinishWithoutCall,
  onUpdateObservations,
  onForwardToTriage,
  onSendToTriageQueue,
  onForwardToDoctor,
  onSendToDoctorQueue,
  onForwardToEcg,
  onForwardToCurativos,
  onForwardToRaiox,
  onForwardToEnfermaria,
  onSendToEcgQueue,
  onSendToCurativosQueue,
  onSendToRaioxQueue,
  onSendToEnfermariaQueue,
  soundKey,
}: ServicePanelProps) {
  const [confirmFinish, setConfirmFinish] = useState<{ id: string; name: string; type: 'service' | 'without' } | null>(null);
  const { soundEnabled, toggleSound, visualAlert } = useNewPatientSound(soundKey, waitingPatients);
  
  // Map serviceKey to expected waiting status
  const expectedStatus = `waiting-${serviceKey}` as const;
  const { forwardAlert } = useForwardNotification(soundKey, waitingPatients, expectedStatus);
  const [editingObservation, setEditingObservation] = useState<{ id: string; value: string } | null>(null);
  const [successAnimation, setSuccessAnimation] = useState<{ message: string; type: 'consultation' | 'withdrawal' | 'default' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-reload após 10 minutos de inatividade
  useInactivityReload();

  const alertColors = {
    emergency: 'bg-red-500/20 border-red-500',
    priority: 'bg-amber-500/20 border-amber-500',
    normal: 'bg-green-500/20 border-green-500'
  };

  const handleCallPatient = (patientId: string) => {
    onCallPatient(patientId, serviceName);
  };

  const handleRecall = () => {
    onRecall(serviceName);
  };

  // Helper functions for silent queue sending
  const handleSendToQueue = (patientId: string, patientName: string, queueType: string, sendFn?: (id: string) => void) => {
    if (sendFn) {
      sendFn(patientId);
      toast.success(`${patientName} encaminhado para ${queueType} (interno)`);
    }
  };

  // Get gradient color classes based on serviceColor
  const getGradientClass = () => {
    switch (serviceColor) {
      case 'blue': return 'from-blue-500 to-blue-600';
      case 'amber': return 'from-amber-500 to-amber-600';
      case 'purple': return 'from-purple-500 to-purple-600';
      case 'rose': return 'from-rose-500 to-rose-600';
      default: return 'from-primary to-primary/80';
    }
  };

  const getButtonClass = () => {
    switch (serviceColor) {
      case 'blue': return 'bg-blue-600 hover:bg-blue-700';
      case 'amber': return 'bg-amber-600 hover:bg-amber-700';
      case 'purple': return 'bg-purple-600 hover:bg-purple-700';
      case 'rose': return 'bg-rose-600 hover:bg-rose-700';
      default: return 'bg-primary hover:bg-primary/90';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      {/* Visual Alert Overlay - New Patient */}
      {visualAlert.active && visualAlert.priority && (
        <div className={`absolute inset-0 z-50 pointer-events-none rounded-xl border-4 animate-pulse ${alertColors[visualAlert.priority]}`}>
          <div className={`absolute top-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-white font-bold text-sm ${
            visualAlert.priority === 'emergency' ? 'bg-red-600' : 
            visualAlert.priority === 'priority' ? 'bg-amber-600' : 'bg-green-600'
          }`}>
            {visualAlert.priority === 'emergency' ? '🚨 EMERGÊNCIA!' : 
             visualAlert.priority === 'priority' ? '⚠️ PRIORIDADE' : '✓ Novo Paciente'}
          </div>
        </div>
      )}

      {/* Forward Alert Overlay - Patient Forwarded from another module */}
      {forwardAlert.active && forwardAlert.patient && (
        <div className="absolute inset-0 z-50 pointer-events-none rounded-xl border-4 animate-pulse bg-blue-500/20 border-blue-500">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center gap-2">
            ↪ Encaminhado: {forwardAlert.patient.name} ({forwardAlert.patient.fromModule})
          </div>
        </div>
      )}

      {/* Sound Toggle */}
      <div className="flex justify-end">
        <Button 
          onClick={toggleSound} 
          variant="outline" 
          size="sm"
          className={soundEnabled ? 'text-green-600 border-green-300' : 'text-muted-foreground border-border'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
          {soundEnabled ? 'Som Ativado' : 'Som Desativado'}
        </Button>
      </div>

      {/* Current Call */}
      <div className="bg-card rounded-xl shadow-health border border-border overflow-hidden">
        <div className={`bg-gradient-to-r ${getGradientClass()} p-3 sm:p-4`}>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="animate-bounce inline-block">{serviceIcon}</span> Chamada Atual - {serviceName}
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          {currentCall ? (
            <div className="text-center">
              <p className="text-2xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4 break-words">
                {currentCall.name}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Chamado às {formatBrazilTime(currentCall.calledAt!, 'HH:mm')} - {serviceName}
              </p>
              <div className="flex gap-2 sm:gap-4 justify-center flex-wrap">
                <Button onClick={handleRecall} variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Chamar</span> Novamente
                </Button>
                <Button onClick={() => setConfirmFinish({ id: currentCall.id, name: currentCall.name, type: 'service' })} size="sm" className={`${getButtonClass()} text-xs sm:text-sm`}>
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Concluir Atendimento
                </Button>
{/* Unified Forward Menu - Services and Doctor with Submenus */}
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
                        <DropdownMenuItem onClick={() => onForwardToTriage?.(currentCall.id, 'Triagem')} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        {onSendToTriageQueue && (
                          <DropdownMenuItem onClick={() => handleSendToQueue(currentCall.id, currentCall.name, 'Triagem', onSendToTriageQueue)} className="cursor-pointer">
                            <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                            Interno (sem voz)
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    {/* ECG */}
                    {serviceKey !== 'ecg' && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <Heart className="w-4 h-4 mr-2 text-blue-500" />
                          Eletrocardiograma
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-card border border-border">
                          <DropdownMenuItem onClick={() => onForwardToEcg?.(currentCall.id)} className="cursor-pointer">
                            <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                            Com voz na TV
                          </DropdownMenuItem>
                          {onSendToEcgQueue && (
                            <DropdownMenuItem onClick={() => handleSendToQueue(currentCall.id, currentCall.name, 'ECG', onSendToEcgQueue)} className="cursor-pointer">
                              <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                              Interno (sem voz)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}

                    {/* Curativos */}
                    {serviceKey !== 'curativos' && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <Bandage className="w-4 h-4 mr-2 text-amber-600" />
                          Curativos
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-card border border-border">
                          <DropdownMenuItem onClick={() => onForwardToCurativos?.(currentCall.id)} className="cursor-pointer">
                            <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                            Com voz na TV
                          </DropdownMenuItem>
                          {onSendToCurativosQueue && (
                            <DropdownMenuItem onClick={() => handleSendToQueue(currentCall.id, currentCall.name, 'Curativos', onSendToCurativosQueue)} className="cursor-pointer">
                              <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                              Interno (sem voz)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}

                    {/* Raio X */}
                    {serviceKey !== 'raiox' && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <Scan className="w-4 h-4 mr-2 text-purple-600" />
                          Raio X
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-card border border-border">
                          <DropdownMenuItem onClick={() => onForwardToRaiox?.(currentCall.id)} className="cursor-pointer">
                            <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                            Com voz na TV
                          </DropdownMenuItem>
                          {onSendToRaioxQueue && (
                            <DropdownMenuItem onClick={() => handleSendToQueue(currentCall.id, currentCall.name, 'Raio X', onSendToRaioxQueue)} className="cursor-pointer">
                              <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                              Interno (sem voz)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}

                    {/* Enfermaria */}
                    {serviceKey !== 'enfermaria' && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <BedDouble className="w-4 h-4 mr-2 text-rose-600" />
                          Enfermaria
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-card border border-border">
                          <DropdownMenuItem onClick={() => onForwardToEnfermaria?.(currentCall.id)} className="cursor-pointer">
                            <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                            Com voz na TV
                          </DropdownMenuItem>
                          {onSendToEnfermariaQueue && (
                            <DropdownMenuItem onClick={() => handleSendToQueue(currentCall.id, currentCall.name, 'Enfermaria', onSendToEnfermariaQueue)} className="cursor-pointer">
                              <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                              Interno (sem voz)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}

                    <DropdownMenuSeparator />

                    {/* Médico */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Stethoscope className="w-4 h-4 mr-2 text-green-600" />
                        Médico
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card border border-border">
                        <DropdownMenuLabel className="text-xs">Consultório 1</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onForwardToDoctor?.(currentCall.id, 'Consultório 1')} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        {onSendToDoctorQueue && (
                          <DropdownMenuItem onClick={() => {
                            onSendToDoctorQueue(currentCall.id, 'Consultório 1');
                            toast.success(`${currentCall.name} encaminhado para Consultório 1 (interno)`);
                          }} className="cursor-pointer">
                            <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                            Interno (sem voz)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs">Consultório 2</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onForwardToDoctor?.(currentCall.id, 'Consultório 2')} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        {onSendToDoctorQueue && (
                          <DropdownMenuItem onClick={() => {
                            onSendToDoctorQueue(currentCall.id, 'Consultório 2');
                            toast.success(`${currentCall.name} encaminhado para Consultório 2 (interno)`);
                          }} className="cursor-pointer">
                            <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                            Interno (sem voz)
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
              Nenhum paciente em atendimento
            </p>
          )}
        </div>
      </div>

      {/* Waiting Queue */}
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-health border border-border">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
          <span className="animate-spin inline-block" style={{ animationDuration: '3s' }}>⏳</span> 
          <ContextualTip tipKey="setor_lista" side="right">
            Aguardando - {serviceName}
          </ContextualTip>
          <AnimatedCounter value={waitingPatients.length} />
          <InlineTip tipKey="atualizacao_auto" />
        </h2>
        
        {waitingPatients.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm sm:text-base">
            Nenhum paciente aguardando
          </p>
        ) : (
          <div className="space-y-2 max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
            {waitingPatients.map((patient, index) => {
              const priorityConfig = PRIORITY_CONFIG[patient.priority || 'normal'];
              const PriorityIcon = priorityConfig.icon;
              
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
                        {patient.calledBy && ORIGIN_CONFIG[patient.calledBy] && (
                          <span className={`px-2 py-0.5 text-[10px] font-medium text-white rounded ${ORIGIN_CONFIG[patient.calledBy].color}`}>
                            Veio: {ORIGIN_CONFIG[patient.calledBy].label}
                          </span>
                        )}
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Encaminhado às {formatBrazilTime(patient.calledAt || patient.createdAt, 'HH:mm')}
                        </p>
                      </div>
                      {/* Observações */}
                      {editingObservation?.id === patient.id ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <textarea
                            placeholder="Digite uma observação..."
                            value={editingObservation.value}
                            onChange={(e) => setEditingObservation({ id: patient.id, value: e.target.value })}
                            className="text-xs min-h-[60px] resize-none rounded border border-border bg-background px-2 py-1"
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
                  <div className="flex items-center gap-1.5 sm:gap-2 justify-end ml-9 sm:ml-0 flex-wrap">
                    {/* Menu Encaminhar Paciente Unificado com Submenus */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <Forward className="w-3 h-3 sm:w-4 sm:h-4" />
                          <ChevronDown className="w-3 h-3 ml-0.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border border-border z-50 min-w-[200px]">
                        <DropdownMenuLabel>Encaminhar para</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {/* Triagem */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <Activity className="w-4 h-4 mr-2 text-cyan-600" />
                            Triagem
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-card border border-border">
                            <DropdownMenuItem onClick={() => onForwardToTriage?.(patient.id, 'Triagem')} className="cursor-pointer">
                              <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                              Com voz na TV
                            </DropdownMenuItem>
                            {onSendToTriageQueue && (
                              <DropdownMenuItem onClick={() => onSendToTriageQueue(patient.id)} className="cursor-pointer">
                                <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                Interno (sem voz)
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {/* ECG */}
                        {serviceKey !== 'ecg' && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="cursor-pointer">
                              <Heart className="w-4 h-4 mr-2 text-pink-500" />
                              ECG
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-card border border-border">
                              <DropdownMenuItem onClick={() => onForwardToEcg?.(patient.id)} className="cursor-pointer">
                                <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                                Com voz na TV
                              </DropdownMenuItem>
                              {onSendToEcgQueue && (
                                <DropdownMenuItem onClick={() => onSendToEcgQueue(patient.id)} className="cursor-pointer">
                                  <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                  Interno (sem voz)
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}

                        {/* Curativos */}
                        {serviceKey !== 'curativos' && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="cursor-pointer">
                              <Bandage className="w-4 h-4 mr-2 text-orange-500" />
                              Curativos
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-card border border-border">
                              <DropdownMenuItem onClick={() => onForwardToCurativos?.(patient.id)} className="cursor-pointer">
                                <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                                Com voz na TV
                              </DropdownMenuItem>
                              {onSendToCurativosQueue && (
                                <DropdownMenuItem onClick={() => onSendToCurativosQueue(patient.id)} className="cursor-pointer">
                                  <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                  Interno (sem voz)
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}

                        {/* Raio X */}
                        {serviceKey !== 'raiox' && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="cursor-pointer">
                              <Scan className="w-4 h-4 mr-2 text-purple-500" />
                              Raio X
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-card border border-border">
                              <DropdownMenuItem onClick={() => onForwardToRaiox?.(patient.id)} className="cursor-pointer">
                                <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                                Com voz na TV
                              </DropdownMenuItem>
                              {onSendToRaioxQueue && (
                                <DropdownMenuItem onClick={() => onSendToRaioxQueue(patient.id)} className="cursor-pointer">
                                  <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                  Interno (sem voz)
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}

                        {/* Enfermaria */}
                        {serviceKey !== 'enfermaria' && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="cursor-pointer">
                              <BedDouble className="w-4 h-4 mr-2 text-teal-500" />
                              Enfermaria
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-card border border-border">
                              <DropdownMenuItem onClick={() => onForwardToEnfermaria?.(patient.id)} className="cursor-pointer">
                                <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                                Com voz na TV
                              </DropdownMenuItem>
                              {onSendToEnfermariaQueue && (
                                <DropdownMenuItem onClick={() => onSendToEnfermariaQueue(patient.id)} className="cursor-pointer">
                                  <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                  Interno (sem voz)
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}

                        <DropdownMenuSeparator />

                        {/* Médico */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <Stethoscope className="w-4 h-4 mr-2 text-green-600" />
                            Médico
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-card border border-border">
                            <DropdownMenuLabel className="text-xs">Consultório 1</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onForwardToDoctor?.(patient.id, 'Consultório 1')} className="cursor-pointer">
                              <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                              Com voz na TV
                            </DropdownMenuItem>
                            {onSendToDoctorQueue && (
                              <DropdownMenuItem onClick={() => onSendToDoctorQueue(patient.id, 'Consultório 1')} className="cursor-pointer">
                                <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                Interno (sem voz)
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs">Consultório 2</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onForwardToDoctor?.(patient.id, 'Consultório 2')} className="cursor-pointer">
                              <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                              Com voz na TV
                            </DropdownMenuItem>
                            {onSendToDoctorQueue && (
                              <DropdownMenuItem onClick={() => onSendToDoctorQueue(patient.id, 'Consultório 2')} className="cursor-pointer">
                                <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                                Interno (sem voz)
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Desistência */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmFinish({ id: patient.id, name: patient.name, type: 'without' })}
                      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                    >
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      Desistência
                    </Button>

                    <Button
                      onClick={() => handleCallPatient(patient.id)}
                      size="sm"
                      className={`${getButtonClass()} text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3`}
                    >
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Chamar
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
        <DailyQuoteCard />
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmFinish} onOpenChange={() => setConfirmFinish(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmFinish?.type === 'service' ? 'Concluir Atendimento' : 'Confirmar Desistência'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmFinish?.type === 'service' ? (
                <>Confirma a conclusão do atendimento de <strong>{confirmFinish?.name}</strong>?</>
              ) : (
                <>Confirma a desistência de <strong>{confirmFinish?.name}</strong>?</>
              )}
              <br />
              <span className="text-destructive">O paciente será removido da fila.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmFinish) {
                  setIsLoading(true);
                  setConfirmFinish(null);
                  try {
                    await new Promise(resolve => setTimeout(resolve, 400));
                    const message = confirmFinish.type === 'service' 
                      ? 'Atendimento Concluído!' 
                      : 'Desistência Registrada!';
                    const animationType = confirmFinish.type === 'service' ? 'consultation' : 'withdrawal';
                    if (confirmFinish.type === 'service') {
                      onFinishService(confirmFinish.id);
                    } else {
                      onFinishWithoutCall(confirmFinish.id);
                    }
                    setSuccessAnimation({ message, type: animationType });
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              className={getButtonClass()}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Animation */}
      <SuccessAnimation 
        show={!!successAnimation}
        message={successAnimation?.message || ''} 
        type={successAnimation?.type}
        onComplete={() => setSuccessAnimation(null)} 
      />

      {/* Loading Overlay */}
      <LoadingOverlay show={isLoading} />
    </div>
  );
}
