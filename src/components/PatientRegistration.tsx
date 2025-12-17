import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Trash2, Users, Volume2, VolumeX, CheckCircle, Activity, Stethoscope, AlertTriangle, AlertCircle, Circle, FileText, Pencil } from 'lucide-react';
import { Patient, PatientPriority } from '@/types/patient';
import { formatBrazilTime } from '@/hooks/useBrazilTime';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

interface PatientRegistrationProps {
  patients: Patient[];
  onAddPatient: (name: string, priority?: PatientPriority) => void;
  onRemovePatient: (id: string) => void;
  onDirectPatient: (patientName: string, destination: string) => void;
  onFinishWithoutCall: (id: string) => void;
  onForwardToTriage: (id: string, destination?: string) => void;
  onForwardToDoctor: (id: string, destination?: string) => void;
  onSendToTriageQueue?: (id: string) => void;
  onUpdatePriority?: (id: string, priority: PatientPriority) => void;
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

const CONSULTORIOS_MEDICO = [
  { id: 'med1', name: 'Consultório 1' },
  { id: 'med2', name: 'Consultório 2' },
];

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergência', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-500', icon: AlertTriangle },
  priority: { label: 'Prioridade', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-500', icon: AlertCircle },
  normal: { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-500', icon: Circle },
};

export function PatientRegistration({ 
  patients, 
  onAddPatient, 
  onRemovePatient,
  onDirectPatient,
  onFinishWithoutCall,
  onForwardToTriage,
  onForwardToDoctor,
  onSendToTriageQueue,
  onUpdatePriority,
  onUpdateObservations
}: PatientRegistrationProps) {
  const [name, setName] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<PatientPriority>('normal');
  const [confirmFinish, setConfirmFinish] = useState<{ id: string; name: string } | null>(null);
  const [editingObservation, setEditingObservation] = useState<{ id: string; value: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddPatient(name, selectedPriority);
      setName('');
      setSelectedPriority('normal');
      toast.success('Paciente cadastrado com sucesso!');
    }
  };

  const activePatients = patients.filter(p => p.status !== 'attended');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Registration Form */}
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-health border border-border">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Cadastrar Paciente
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Input
            type="text"
            placeholder="Nome completo do paciente"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <Button type="submit" disabled={!name.trim()} className="w-full sm:w-auto">
            <UserPlus className="w-4 h-4 mr-2" />
            Cadastrar
          </Button>
        </form>
      </div>

      {/* Patient List */}
      <div className="bg-card rounded-xl p-4 sm:p-6 shadow-health border border-border">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Pacientes Cadastrados ({activePatients.length})
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
                        <span className="text-amber-500 font-medium">Cadastrado às {formatBrazilTime(patient.createdAt, 'HH:mm')}</span>
                        {' • '}
                        <span className={`font-medium ${
                          patient.status === 'waiting' ? 'text-amber-500' :
                          patient.status === 'in-triage' ? 'text-blue-500' :
                          patient.status === 'waiting-doctor' ? 'text-purple-500' :
                          'text-green-500'
                        }`}>
                          {patient.status === 'waiting' && 'Aguardando triagem'}
                          {patient.status === 'in-triage' && 'Em triagem'}
                          {patient.status === 'waiting-doctor' && 'Aguardando médico'}
                          {patient.status === 'in-consultation' && 'Em consulta'}
                        </span>
                      </p>
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
                          <DropdownMenuItem
                            onClick={() => onUpdatePriority(patient.id, 'emergency')}
                            className="cursor-pointer text-red-600"
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Emergência
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onUpdatePriority(patient.id, 'priority')}
                            className="cursor-pointer text-amber-600"
                          >
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Prioridade
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onUpdatePriority(patient.id, 'normal')}
                            className="cursor-pointer text-green-600"
                          >
                            <Circle className="w-4 h-4 mr-2" />
                            Normal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  {/* Encaminhar para próxima etapa - apenas para pacientes aguardando */}
                  {patient.status === 'waiting' && (
                    <>
                      {/* Fila Triagem Silenciosa */}
                      {onSendToTriageQueue && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  onSendToTriageQueue(patient.id);
                                  toast.success(`${patient.name} encaminhado para fila de triagem`);
                                }}
                                className="gap-1 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                              >
                                <VolumeX className="w-3 h-3 sm:w-4 sm:h-4" />
                                <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Encaminhar para triagem (sem áudio)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Menu Triagem com áudio */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                          >
                            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden xs:inline">Triagem</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-card border border-border z-50">
                          <DropdownMenuLabel>Direcionar para (com áudio)</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {SALAS.map((sala) => (
                            <DropdownMenuItem
                              key={sala.id}
                              onClick={() => onForwardToTriage(patient.id, sala.name)}
                              className="cursor-pointer"
                            >
                              {sala.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Menu Médico */}
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
                          {CONSULTORIOS_MEDICO.map((cons) => (
                            <DropdownMenuItem
                              key={cons.id}
                              onClick={() => onForwardToDoctor(patient.id, cons.name)}
                              className="cursor-pointer"
                            >
                              {cons.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}

                  {/* Menu Salas */}
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

                  {/* Menu Consultórios */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
                        <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">Consultório</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card border border-border z-50">
                      <DropdownMenuLabel>Direcionar para Consultório</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {CONSULTORIOS.map((cons) => (
                        <DropdownMenuItem
                          key={cons.id}
                          onClick={() => onDirectPatient(patient.name, cons.name)}
                          className="cursor-pointer"
                        >
                          {cons.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Finalizar sem chamar */}
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
    </div>
  );
}
