import { useState } from 'react';
import { useInactivityReload } from '@/hooks/useInactivityReload';
import { RotatingTipsCard } from '@/components/RotatingTipsCard';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { SuccessAnimation } from '@/components/SuccessAnimation';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Phone, PhoneCall, Check, Users, Volume2, VolumeX, CheckCircle, AlertTriangle, AlertCircle, Circle, FileText, Pencil, Stethoscope, Heart, Bandage, Scan, BedDouble, Activity } from 'lucide-react';
import { Patient, PatientPriority } from '@/types/patient';
import { formatBrazilTime } from '@/hooks/useBrazilTime';
import { useNewPatientSound } from '@/hooks/useNewPatientSound';
import { useForwardNotification } from '@/hooks/useForwardNotification';
import { ElapsedTimeDisplay } from '@/components/ElapsedTimeDisplay';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ContextualTip, InlineTip } from '@/components/ContextualTip';

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergência', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-500', icon: AlertTriangle },
  priority: { label: 'Prioridade', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-500', icon: AlertCircle },
  normal: { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-500', icon: Circle },
};

const ORIGIN_CONFIG: Record<string, { label: string; color: string }> = {
  cadastro: { label: 'Cadastro', color: 'bg-blue-500 text-white' },
  triage: { label: 'Triagem', color: 'bg-amber-500 text-white' },
  doctor: { label: 'Médico', color: 'bg-green-500 text-white' },
  ecg: { label: 'ECG', color: 'bg-pink-500 text-white' },
  curativos: { label: 'Curativos', color: 'bg-orange-500 text-white' },
  raiox: { label: 'Raio X', color: 'bg-purple-500 text-white' },
  enfermaria: { label: 'Enfermaria', color: 'bg-teal-500 text-white' },
};

interface TriagePanelProps {
  waitingPatients: Patient[];
  currentCall: Patient | null;
  onCallPatient: (id: string) => void;
  onFinishTriage: (id: string) => void;
  onRecall: () => void;
  onDirectPatient: (patientName: string, destination: string) => void;
  onFinishWithoutCall: (id: string) => void;
  onSendToDoctorQueue: (id: string, destination?: string) => void;
  onForwardToEcg: (id: string) => void;
  onForwardToCurativos: (id: string) => void;
  onForwardToRaiox: (id: string) => void;
  onForwardToEnfermaria: (id: string) => void;
  onSendToEcgQueue: (id: string) => void;
  onSendToCurativosQueue: (id: string) => void;
  onSendToRaioxQueue: (id: string) => void;
  onSendToEnfermariaQueue: (id: string) => void;
  onUpdateObservations?: (id: string, observations: string) => void;
}

const SALAS = [
  { id: 'triagem', name: 'Triagem' },
  { id: 'eletro', name: 'Sala de Eletrocardiograma' },
  { id: 'curativo', name: 'Sala de Curativos' },
  { id: 'raiox', name: 'Sala do Raio X' },
  { id: 'enfermaria', name: 'Enfermaria' },
];

const CONSULTORIOS = [
  { id: 'cons1', name: 'Consultório 1' },
  { id: 'cons2', name: 'Consultório 2' },
];

export function TriagePanel({ 
  waitingPatients, 
  currentCall, 
  onCallPatient, 
  onFinishTriage,
  onRecall,
  onDirectPatient,
  onFinishWithoutCall,
  onSendToDoctorQueue,
  onForwardToEcg,
  onForwardToCurativos,
  onForwardToRaiox,
  onForwardToEnfermaria,
  onSendToEcgQueue,
  onSendToCurativosQueue,
  onSendToRaioxQueue,
  onSendToEnfermariaQueue,
  onUpdateObservations
}: TriagePanelProps) {
  const [confirmFinish, setConfirmFinish] = useState<{ id: string; name: string; type: 'triage' | 'without' } | null>(null);
  const { soundEnabled, toggleSound, visualAlert } = useNewPatientSound('triage', waitingPatients);
  const { forwardAlert } = useForwardNotification('triage', waitingPatients, 'waiting-triage');
  const [editingObservation, setEditingObservation] = useState<{ id: string; value: string } | null>(null);
  const [successAnimation, setSuccessAnimation] = useState<{ message: string; type: 'triage' | 'withdrawal' | 'default' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-reload após 10 minutos de inatividade
  useInactivityReload();

  const alertColors = {
    emergency: 'border-red-500 text-red-500',
    priority: 'border-amber-500 text-amber-500',
    normal: 'border-green-500 text-green-500'
  };

  const alertBgColors = {
    emergency: 'bg-red-600',
    priority: 'bg-amber-600',
    normal: 'bg-green-600'
  };

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      {/* Visual Alert Overlay - New Patient - More Prominent */}
      {visualAlert.active && visualAlert.priority && (
        <>
          {/* Animated border glow */}
          <div className={`absolute inset-0 z-50 pointer-events-none rounded-xl border-4 animate-flash-border ${alertColors[visualAlert.priority]}`} />
          
          {/* Animated notification badge */}
          <div className={`absolute top-4 left-1/2 z-50 pointer-events-none animate-slide-down-bounce`}>
            <div className={`flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-base shadow-2xl animate-shake ${alertBgColors[visualAlert.priority]}`}>
              <span className="text-xl animate-bounce">
                {visualAlert.priority === 'emergency' ? '🚨' : 
                 visualAlert.priority === 'priority' ? '⚠️' : '🔔'}
              </span>
              <span>
                {visualAlert.priority === 'emergency' ? 'EMERGÊNCIA!' : 
                 visualAlert.priority === 'priority' ? 'PRIORIDADE!' : 'Novo Paciente!'}
              </span>
              <span className="text-xl animate-bounce">
                {visualAlert.priority === 'emergency' ? '🚨' : 
                 visualAlert.priority === 'priority' ? '⚠️' : '🔔'}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Forward Alert Overlay - Patient Forwarded from another module */}
      {forwardAlert.active && forwardAlert.patient && (
        <>
          <div className="absolute inset-0 z-50 pointer-events-none rounded-xl border-4 animate-flash-border border-blue-500 text-blue-500" />
          <div className="absolute top-4 left-1/2 z-50 pointer-events-none animate-slide-down-bounce">
            <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 text-white font-bold text-base shadow-2xl animate-shake">
              <span className="text-xl animate-bounce">↪</span>
              <span>Encaminhado: {forwardAlert.patient.name}</span>
              <span className="text-sm opacity-80">({forwardAlert.patient.fromModule})</span>
            </div>
          </div>
        </>
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
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 sm:p-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="animate-bounce inline-block">📞</span> 
            <ContextualTip tipKey="triagem_avaliacao" side="right" className="text-white">
              Chamada Atual - Triagem
            </ContextualTip>
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          {currentCall ? (
            <div className="text-center">
              <p className="text-2xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4 break-words">
                {currentCall.name}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Chamado às {formatBrazilTime(currentCall.calledAt!, 'HH:mm')}
              </p>
              <div className="flex gap-2 sm:gap-4 justify-center flex-wrap">
                <Button onClick={onRecall} variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Chamar</span> Novamente
                </Button>
                


                {/* Menu Encaminhar para outros serviços */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                      Encaminhar Paciente
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border border-border z-50 min-w-[200px]">
                    <DropdownMenuLabel>Encaminhar para</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* ECG */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Heart className="w-4 h-4 mr-2 text-pink-500" />
                        ECG
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card border border-border">
                        <DropdownMenuItem onClick={() => onForwardToEcg(currentCall.id)} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendToEcgQueue(currentCall.id)} className="cursor-pointer">
                          <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                          Interno (sem voz)
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Curativos */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Bandage className="w-4 h-4 mr-2 text-orange-500" />
                        Curativos
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card border border-border">
                        <DropdownMenuItem onClick={() => onForwardToCurativos(currentCall.id)} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendToCurativosQueue(currentCall.id)} className="cursor-pointer">
                          <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                          Interno (sem voz)
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Raio X */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Scan className="w-4 h-4 mr-2 text-purple-500" />
                        Raio X
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card border border-border">
                        <DropdownMenuItem onClick={() => onForwardToRaiox(currentCall.id)} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendToRaioxQueue(currentCall.id)} className="cursor-pointer">
                          <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                          Interno (sem voz)
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Enfermaria */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <BedDouble className="w-4 h-4 mr-2 text-teal-500" />
                        Enfermaria
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card border border-border">
                        <DropdownMenuItem onClick={() => onForwardToEnfermaria(currentCall.id)} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendToEnfermariaQueue(currentCall.id)} className="cursor-pointer">
                          <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                          Interno (sem voz)
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    {/* Médico */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Stethoscope className="w-4 h-4 mr-2 text-green-500" />
                        Médico
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card border border-border">
                        <DropdownMenuLabel className="text-xs">Consultório 1</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onDirectPatient(currentCall.name, 'Consultório 1')} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendToDoctorQueue(currentCall.id, 'Consultório 1')} className="cursor-pointer">
                          <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                          Interno (sem voz)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs">Consultório 2</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onDirectPatient(currentCall.name, 'Consultório 2')} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendToDoctorQueue(currentCall.id, 'Consultório 2')} className="cursor-pointer">
                          <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                          Interno (sem voz)
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={() => setConfirmFinish({ id: currentCall.id, name: currentCall.name, type: 'triage' })} size="sm" className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Finalizar</span> Triagem
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
              Nenhum paciente sendo atendido
            </p>
          )}
        </div>
      </div>

      {/* Waiting Queue */}
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-health border border-border">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
          <span className="animate-spin inline-block" style={{ animationDuration: '3s' }}>⏳</span> 
          <ContextualTip tipKey="triagem_lista" side="right">
            Fila de Espera
          </ContextualTip>
          <AnimatedCounter value={waitingPatients.length} />
          <InlineTip tipKey="atualizacao_auto" />
        </h2>
        
        {waitingPatients.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm sm:text-base">
            Nenhum paciente aguardando triagem
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
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <span className="text-amber-500 font-medium">Chegou às {formatBrazilTime(patient.createdAt, 'HH:mm')}</span>
                        {patient.calledBy && ORIGIN_CONFIG[patient.calledBy] && (
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${ORIGIN_CONFIG[patient.calledBy].color}`}>
                            Veio: {ORIGIN_CONFIG[patient.calledBy].label}
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

                  {/* Menu Encaminhar Paciente Unificado */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                      >
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Encaminhar</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card border border-border z-50 min-w-[200px]">
                      <DropdownMenuLabel>Encaminhar para</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {/* ECG */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <Heart className="w-4 h-4 mr-2 text-pink-500" />
                          ECG
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-card border border-border">
                          <DropdownMenuItem onClick={() => onForwardToEcg(patient.id)} className="cursor-pointer">
                            <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                            Com voz na TV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSendToEcgQueue(patient.id)} className="cursor-pointer">
                            <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                            Interno (sem voz)
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Curativos */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <Bandage className="w-4 h-4 mr-2 text-orange-500" />
                          Curativos
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-card border border-border">
                          <DropdownMenuItem onClick={() => onForwardToCurativos(patient.id)} className="cursor-pointer">
                            <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                            Com voz na TV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSendToCurativosQueue(patient.id)} className="cursor-pointer">
                            <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                            Interno (sem voz)
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Raio X */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <Scan className="w-4 h-4 mr-2 text-purple-500" />
                          Raio X
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-card border border-border">
                          <DropdownMenuItem onClick={() => onForwardToRaiox(patient.id)} className="cursor-pointer">
                            <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                            Com voz na TV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSendToRaioxQueue(patient.id)} className="cursor-pointer">
                            <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                            Interno (sem voz)
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Enfermaria */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <BedDouble className="w-4 h-4 mr-2 text-teal-500" />
                          Enfermaria
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-card border border-border">
                          <DropdownMenuItem onClick={() => onForwardToEnfermaria(patient.id)} className="cursor-pointer">
                            <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                            Com voz na TV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSendToEnfermariaQueue(patient.id)} className="cursor-pointer">
                            <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                            Interno (sem voz)
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      <DropdownMenuSeparator />

                      {/* Médico */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                          <Stethoscope className="w-4 h-4 mr-2 text-green-500" />
                          Médico
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-card border border-border">
                          <DropdownMenuLabel className="text-xs">Consultório 1</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onDirectPatient(patient.name, 'Consultório 1')} className="cursor-pointer">
                            <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                            Com voz na TV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSendToDoctorQueue(patient.id, 'Consultório 1')} className="cursor-pointer">
                            <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                            Interno (sem voz)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs">Consultório 2</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onDirectPatient(patient.name, 'Consultório 2')} className="cursor-pointer">
                            <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                            Com voz na TV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSendToDoctorQueue(patient.id, 'Consultório 2')} className="cursor-pointer">
                            <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                            Interno (sem voz)
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Finalizar sem chamar */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmFinish({ id: patient.id, name: patient.name, type: 'without' })}
                    className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                  >
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Finalizar</span>
                  </Button>

                  <Button
                    onClick={() => onCallPatient(patient.id)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
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
              onClick={async () => {
                if (confirmFinish) {
                  setIsLoading(true);
                  setConfirmFinish(null);
                  try {
                    await new Promise(resolve => setTimeout(resolve, 400));
                    const message = confirmFinish.type === 'triage' 
                      ? 'Triagem Finalizada!' 
                      : 'Paciente Removido!';
                    const animationType = confirmFinish.type === 'triage' ? 'triage' : 'withdrawal';
                    if (confirmFinish.type === 'triage') {
                      onFinishTriage(confirmFinish.id);
                    } else {
                      onFinishWithoutCall(confirmFinish.id);
                    }
                    setSuccessAnimation({ message, type: animationType });
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              className="bg-green-600 hover:bg-green-700"
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
        type={successAnimation?.type || 'default'}
        onComplete={() => setSuccessAnimation(null)} 
      />

      {/* Loading Overlay */}
      <LoadingOverlay show={isLoading} message="Processando..." />
    </div>
  );
}
