import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { SuccessAnimation } from '@/components/SuccessAnimation';
import { Phone, PhoneCall, Check, Users, Stethoscope, CheckCircle, AlertTriangle, AlertCircle, Circle, Volume2, VolumeX, FileText, Pencil } from 'lucide-react';
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
import { useState } from 'react';
import { useNewPatientSound } from '@/hooks/useNewPatientSound';
import { useInactivityReload } from '@/hooks/useInactivityReload';
import { DailyQuoteCard } from '@/components/DailyQuoteCard';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergência', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-500', icon: AlertTriangle },
  priority: { label: 'Prioridade', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-500', icon: AlertCircle },
  normal: { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-500', icon: Circle },
};

interface DoctorPanelProps {
  waitingPatients: Patient[];
  currentCall: Patient | null;
  onCallPatient: (id: string, destination?: string) => void;
  onFinishConsultation: (id: string) => void;
  onRecall: (destination?: string) => void;
  onFinishWithoutCall: (id: string) => void;
  onUpdateObservations?: (id: string, observations: string) => void;
}

export function DoctorPanel({ 
  waitingPatients, 
  currentCall, 
  onCallPatient, 
  onFinishConsultation,
  onRecall,
  onFinishWithoutCall,
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
  
  const [confirmFinish, setConfirmFinish] = useState<{ id: string; name: string; type: 'consultation' | 'without' } | null>(null);
  const { soundEnabled, toggleSound, visualAlert } = useNewPatientSound('doctor', waitingPatients);
  const [editingObservation, setEditingObservation] = useState<{ id: string; value: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      {/* Visual Alert Overlay */}
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
          <span className="animate-spin inline-block" style={{ animationDuration: '3s' }}>⏳</span> Aguardando Consulta - {currentConsultorioLabel} <AnimatedCounter value={waitingPatients.filter(p => p.destination === currentConsultorioLabel).length} />
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
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Triagem finalizada às {formatBrazilTime(patient.calledAt || patient.createdAt, 'HH:mm')}
                      </p>
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
              {confirmFinish?.type === 'consultation' ? 'Concluir Consulta' : 'Confirmar Desistência'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmFinish?.type === 'consultation' ? (
                <>Confirma a conclusão da consulta de <strong>{confirmFinish?.name}</strong>?</>
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
              onClick={() => {
                if (confirmFinish) {
                  const message = confirmFinish.type === 'consultation' 
                    ? 'Consulta Concluída!' 
                    : 'Desistência Registrada!';
                  if (confirmFinish.type === 'consultation') {
                    onFinishConsultation(confirmFinish.id);
                  } else {
                    onFinishWithoutCall(confirmFinish.id);
                  }
                  setSuccessMessage(message);
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

      {/* Success Animation */}
      <SuccessAnimation 
        show={!!successMessage} 
        message={successMessage || ''} 
        onComplete={() => setSuccessMessage(null)} 
      />
    </div>
  );
}
