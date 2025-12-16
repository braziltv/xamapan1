import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneCall, Check, Users, Volume2, VolumeX, CheckCircle, Stethoscope, AlertTriangle, AlertCircle, Circle } from 'lucide-react';
import { Patient, PatientPriority } from '@/types/patient';
import { formatBrazilTime } from '@/hooks/useBrazilTime';
import { useNewPatientSound } from '@/hooks/useNewPatientSound';
import { ElapsedTimeDisplay } from '@/components/ElapsedTimeDisplay';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergência', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-500', icon: AlertTriangle },
  priority: { label: 'Prioridade', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-500', icon: AlertCircle },
  normal: { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-500', icon: Circle },
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
  onSendToDoctorQueue
}: TriagePanelProps) {
  const [confirmFinish, setConfirmFinish] = useState<{ id: string; name: string; type: 'triage' | 'without' } | null>(null);
  const { soundEnabled, toggleSound, visualAlert } = useNewPatientSound('triage', waitingPatients);
  

  const alertColors = {
    emergency: 'bg-red-500/20 border-red-500',
    priority: 'bg-amber-500/20 border-amber-500',
    normal: 'bg-green-500/20 border-green-500'
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
      
      {/* Current Call */}
      <div className="bg-card rounded-xl shadow-health border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 sm:p-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5" />
            Chamada Atual - Triagem
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
                
                {/* Menu Salas */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                      <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Direcionar para</span> Sala
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border border-border z-50">
                    <DropdownMenuLabel>Escolha a Sala</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {SALAS.map((sala) => (
                      <DropdownMenuItem
                        key={sala.id}
                        onClick={() => onDirectPatient(currentCall.name, sala.name)}
                        className="cursor-pointer"
                      >
                        {sala.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Menu Encaminhar para Médico - Consultórios */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm text-purple-600 hover:text-purple-700 border-purple-300 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20">
                      <Stethoscope className="w-3 h-3 sm:w-4 sm:h-4" />
                      Consultório
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border border-border z-50">
                    <DropdownMenuLabel>Encaminhar para Médico</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        onSendToDoctorQueue(currentCall.id, 'Consultório Médico 1');
                      }}
                      className="cursor-pointer"
                    >
                      Consultório Médico 1
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        onSendToDoctorQueue(currentCall.id, 'Consultório Médico 2');
                      }}
                      className="cursor-pointer"
                    >
                      Consultório Médico 2
                    </DropdownMenuItem>
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
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Fila de Espera ({waitingPatients.length})
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
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg hover:bg-muted transition-colors gap-3 ${priorityConfig.bg} border-l-4 ${priorityConfig.border}`}
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
                      <p className="text-xs sm:text-sm">
                        <span className="text-amber-500 font-medium">Chegou às {formatBrazilTime(patient.createdAt, 'HH:mm')}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end ml-9 sm:ml-0">
                  {/* Menu Salas na fila */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
                        <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Sala</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card border border-border z-50">
                      <DropdownMenuLabel>Direcionar para Sala</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {SALAS.map((sala) => (
                        <DropdownMenuItem
                          key={sala.id}
                          onClick={() => onDirectPatient(patient.name, sala.name)}
                          className="cursor-pointer"
                        >
                          {sala.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>


                  {/* Encaminhar para médico sem chamada */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                      >
                        <Stethoscope className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Médico</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card border border-border z-50">
                      <DropdownMenuLabel>Escolha o Consultório</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onSendToDoctorQueue(patient.id, 'Consultório Médico 1')}
                        className="cursor-pointer"
                      >
                        Consultório Médico 1
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onSendToDoctorQueue(patient.id, 'Consultório Médico 2')}
                        className="cursor-pointer"
                      >
                        Consultório Médico 2
                      </DropdownMenuItem>
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
                  if (confirmFinish.type === 'triage') {
                    onFinishTriage(confirmFinish.id);
                  } else {
                    onFinishWithoutCall(confirmFinish.id);
                  }
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
    </div>
  );
}
