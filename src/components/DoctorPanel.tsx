import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { SuccessAnimation } from '@/components/SuccessAnimation';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Phone, PhoneCall, Check, Users, Stethoscope, CheckCircle, AlertTriangle, AlertCircle, Circle, Volume2, VolumeX, FileText, Pencil, ArrowRight, Heart, Bandage, Scan, BedDouble, Activity } from 'lucide-react';
import { Patient, PatientPriority } from '@/types/patient';
import { formatBrazilTime } from '@/hooks/useBrazilTime';
import { ElapsedTimeDisplay } from '@/components/ElapsedTimeDisplay';
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

interface DoctorPanelProps {
  waitingPatients: Patient[];
  currentCall: Patient | null;
  onCallPatient: (id: string, destination?: string) => void;
  onFinishConsultation: (id: string) => void;
  onRecall: (destination?: string) => void;
  onFinishWithoutCall: (id: string) => void;
  onForwardToTriage?: (id: string, destination?: string) => void;
  onSendToTriageQueue?: (id: string) => void;
  onForwardToEcg?: (id: string) => void;
  onForwardToCurativos?: (id: string) => void;
  onForwardToRaiox?: (id: string) => void;
  onForwardToEnfermaria?: (id: string) => void;
  onSendToEcgQueue?: (id: string) => void;
  onSendToCurativosQueue?: (id: string) => void;
  onSendToRaioxQueue?: (id: string) => void;
  onSendToEnfermariaQueue?: (id: string) => void;
  onUpdateObservations?: (id: string, observations: string) => void;
}

export function DoctorPanel({ 
  waitingPatients, 
  currentCall, 
  onCallPatient, 
  onFinishConsultation,
  onRecall,
  onFinishWithoutCall,
  onForwardToTriage,
  onSendToTriageQueue,
  onForwardToEcg,
  onForwardToCurativos,
  onForwardToRaiox,
  onForwardToEnfermaria,
  onSendToEcgQueue,
  onSendToCurativosQueue,
  onSendToRaioxQueue,
  onSendToEnfermariaQueue,
  onUpdateObservations
}: DoctorPanelProps) {
  const consultorios = [
    { value: 'consultorio-1', label: 'Consultório 1' },
    { value: 'consultorio-2', label: 'Consultório 2' },
  ];

  // Persist selected consultório in localStorage
  const [selectedConsultorio, setSelectedConsultorio] = useState<string>(() => {
    return localStorage.getItem('selectedConsultorio') || 'consultorio-1';
  });
  
  const currentConsultorioLabel = consultorios.find(c => c.value === selectedConsultorio)?.label || 'Consultório 1';
  
  const [confirmFinish, setConfirmFinish] = useState<{ id: string; name: string; type: 'consultation' | 'without' | 'finished' } | null>(null);
  const { soundEnabled, toggleSound, visualAlert } = useNewPatientSound('doctor', waitingPatients);
  const { forwardAlert } = useForwardNotification('doctor', waitingPatients, 'waiting-doctor');
  const [editingObservation, setEditingObservation] = useState<{ id: string; value: string } | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successAnimationData, setSuccessAnimationData] = useState<{ message: string; type: 'consultation' | 'withdrawal' | 'default' }>({ message: '', type: 'default' });
  const [isLoading, setIsLoading] = useState(false);

  // Auto-reload após 10 minutos de inatividade
  useInactivityReload();
  
  // Filter currentCall to only show if it belongs to this consultório
  const myCurrentCall = currentCall && currentCall.destination === currentConsultorioLabel ? currentCall : null;

  // Save selected consultório to localStorage
  const handleConsultorioChange = (value: string) => {
    setSelectedConsultorio(value);
    localStorage.setItem('selectedConsultorio', value);
  };

  const alertColors = {
    emergency: 'bg-red-500/20 border-red-500',
    priority: 'bg-amber-500/20 border-amber-500',
    normal: 'bg-green-500/20 border-green-500'
  };

  const handleCallPatient = (patientId: string) => {
    onCallPatient(patientId, currentConsultorioLabel);
  };

  const handleRecall = () => {
    onRecall(currentConsultorioLabel);
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
            <ArrowRight className="w-4 h-4" />
            Encaminhado: {forwardAlert.patient.name} ({forwardAlert.patient.fromModule})
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
      {/* Consultório Selection */}
      <div className="bg-card rounded-xl p-3 sm:p-4 shadow-health border border-border">
        <label className="block text-xs sm:text-sm font-medium text-foreground mb-2">
          Selecionar Consultório
        </label>
        <Select value={selectedConsultorio} onValueChange={handleConsultorioChange}>
          <SelectTrigger className="w-full bg-background text-sm sm:text-base">
            <SelectValue placeholder="Selecione o consultório" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border">
            {consultorios.map((consultorio) => (
              <SelectItem key={consultorio.value} value={consultorio.value}>
                {consultorio.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Current Call */}
      <div className="bg-card rounded-xl shadow-health border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 sm:p-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="animate-bounce inline-block">🩺</span> Chamada Atual - {currentConsultorioLabel}
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          {myCurrentCall ? (
            <div className="text-center">
              <p className="text-2xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4 break-words">
                {myCurrentCall.name}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Chamado às {formatBrazilTime(myCurrentCall.calledAt!, 'HH:mm')} - {currentConsultorioLabel}
              </p>
              <div className="flex gap-2 sm:gap-4 justify-center flex-wrap">
                <Button onClick={handleRecall} variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Chamar</span> Novamente
                </Button>

                {/* Menu Encaminhar para outros serviços */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                      Encaminhar Paciente
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border border-border z-50 min-w-[200px]">
                    <DropdownMenuLabel>Encaminhar para</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Triagem */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Activity className="w-4 h-4 mr-2 text-cyan-500" />
                        Triagem
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card border border-border">
                        <DropdownMenuItem onClick={() => onForwardToTriage?.(myCurrentCall.id, 'Triagem')} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendToTriageQueue?.(myCurrentCall.id)} className="cursor-pointer">
                          <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                          Interno (sem voz)
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    
                    {/* ECG */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Heart className="w-4 h-4 mr-2 text-pink-500" />
                        ECG
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-card border border-border">
                        <DropdownMenuItem onClick={() => onForwardToEcg?.(myCurrentCall.id)} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendToEcgQueue?.(myCurrentCall.id)} className="cursor-pointer">
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
                        <DropdownMenuItem onClick={() => onForwardToCurativos?.(myCurrentCall.id)} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendToCurativosQueue?.(myCurrentCall.id)} className="cursor-pointer">
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
                        <DropdownMenuItem onClick={() => onForwardToRaiox?.(myCurrentCall.id)} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendToRaioxQueue?.(myCurrentCall.id)} className="cursor-pointer">
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
                        <DropdownMenuItem onClick={() => onForwardToEnfermaria?.(myCurrentCall.id)} className="cursor-pointer">
                          <Volume2 className="w-4 h-4 mr-2 text-green-600" />
                          Com voz na TV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendToEnfermariaQueue?.(myCurrentCall.id)} className="cursor-pointer">
                          <VolumeX className="w-4 h-4 mr-2 text-muted-foreground" />
                          Interno (sem voz)
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={() => setConfirmFinish({ id: myCurrentCall.id, name: myCurrentCall.name, type: 'finished' })} size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Finalizar Atendimento
                </Button>
                <Button onClick={() => setConfirmFinish({ id: myCurrentCall.id, name: myCurrentCall.name, type: 'consultation' })} size="sm" className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Concluir Consulta
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
              Nenhum paciente em consulta
            </p>
          )}
        </div>
      </div>

      {/* Waiting Queue */}
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-health border border-border">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
          <span className="animate-spin inline-block" style={{ animationDuration: '3s' }}>⏳</span> 
          <ContextualTip tipKey="setor_lista" side="right">
            Aguardando Consulta - {currentConsultorioLabel}
          </ContextualTip>
          <AnimatedCounter value={waitingPatients.filter(p => p.destination === currentConsultorioLabel).length} />
          <InlineTip tipKey="atualizacao_auto" />
        </h2>
        
        {waitingPatients.filter(p => p.destination === currentConsultorioLabel).length === 0 ? (
          <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm sm:text-base">
            Nenhum paciente aguardando consulta neste consultório
          </p>
        ) : (
          <div className="space-y-2 max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
            {waitingPatients.filter(p => p.destination === currentConsultorioLabel).map((patient, index) => {
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
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span>Triagem finalizada às {formatBrazilTime(patient.calledAt || patient.createdAt, 'HH:mm')}</span>
                        {patient.calledBy && ORIGIN_CONFIG[patient.calledBy] && (
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${ORIGIN_CONFIG[patient.calledBy].color}`}>
                            Veio: {ORIGIN_CONFIG[patient.calledBy].label}
                          </span>
                        )}
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
                  <div className="flex items-center gap-1.5 sm:gap-2 justify-end ml-9 sm:ml-0">
                    {/* Desistência - paciente não compareceu */}
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
                      className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
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
              {confirmFinish?.type === 'consultation' 
                ? 'Concluir Consulta' 
                : confirmFinish?.type === 'finished'
                ? 'Finalizar Atendimento'
                : 'Confirmar Desistência'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmFinish?.type === 'consultation' ? (
                <>Confirma a conclusão da consulta de <strong>{confirmFinish?.name}</strong>?</>
              ) : confirmFinish?.type === 'finished' ? (
                <>Confirma que o atendimento de <strong>{confirmFinish?.name}</strong> foi finalizado?</>
              ) : (
                <>Confirma a desistência de <strong>{confirmFinish?.name}</strong>?</>
              )}
              <br />
              <span className="text-muted-foreground">
                {confirmFinish?.type === 'finished' 
                  ? 'O paciente será liberado com sucesso.'
                  : 'O paciente será removido da fila.'}
              </span>
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
                    const message = confirmFinish.type === 'consultation' 
                      ? 'Consulta Concluída!' 
                      : confirmFinish.type === 'finished'
                      ? 'Atendimento Finalizado!'
                      : 'Desistência Registrada!';
                    const animationType = confirmFinish.type === 'without' ? 'withdrawal' : 'consultation';
                    if (confirmFinish.type === 'consultation' || confirmFinish.type === 'finished') {
                      onFinishConsultation(confirmFinish.id);
                    } else {
                      onFinishWithoutCall(confirmFinish.id);
                    }
                    setSuccessAnimationData({ message, type: animationType });
                    setShowSuccessAnimation(true);
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
        show={showSuccessAnimation} 
        message={successAnimationData.message} 
        type={successAnimationData.type}
        onComplete={() => setShowSuccessAnimation(false)} 
      />

      {/* Loading Overlay */}
      <LoadingOverlay show={isLoading} message="Processando..." />
    </div>
  );
}
