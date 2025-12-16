import { Button } from '@/components/ui/button';
import { Phone, PhoneCall, Check, Users, Stethoscope, CheckCircle, AlertTriangle, AlertCircle, Circle, Volume2, VolumeX } from 'lucide-react';
import { Patient, PatientPriority } from '@/types/patient';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { useNewPatientSound } from '@/hooks/useNewPatientSound';

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
}

export function DoctorPanel({ 
  waitingPatients, 
  currentCall, 
  onCallPatient, 
  onFinishConsultation,
  onRecall,
  onFinishWithoutCall
}: DoctorPanelProps) {
  const [selectedConsultorio, setSelectedConsultorio] = useState<string>('consultorio-1');
  const [currentConsultorio, setCurrentConsultorio] = useState<string>('Consultório 1');
  const { soundEnabled, toggleSound } = useNewPatientSound('doctor', waitingPatients.length);

  const consultorios = [
    { value: 'consultorio-1', label: 'Consultório 1' },
    { value: 'consultorio-2', label: 'Consultório 2' },
  ];

  const handleCallPatient = (patientId: string) => {
    const selected = consultorios.find(c => c.value === selectedConsultorio);
    setCurrentConsultorio(selected?.label || 'Consultório 1');
    onCallPatient(patientId, selected?.label);
  };

  const handleRecall = () => {
    onRecall(currentConsultorio);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
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
        <Select value={selectedConsultorio} onValueChange={setSelectedConsultorio}>
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
            <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
            Chamada Atual - {currentConsultorio}
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          {currentCall ? (
            <div className="text-center">
              <p className="text-2xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4 break-words">
                {currentCall.name}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Chamado às {format(currentCall.calledAt!, 'HH:mm')} - {currentConsultorio}
              </p>
              <div className="flex gap-2 sm:gap-4 justify-center flex-wrap">
                <Button onClick={handleRecall} variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Chamar</span> Novamente
                </Button>
                <Button onClick={() => onFinishConsultation(currentCall.id)} size="sm" className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Finalizar</span> Consulta
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
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Aguardando Consulta ({waitingPatients.length})
        </h2>
        
        {waitingPatients.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm sm:text-base">
            Nenhum paciente aguardando consulta
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
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base sm:text-lg font-mono font-bold text-primary w-6 sm:w-8 text-center">
                        {index + 1}
                      </span>
                      <PriorityIcon className={`w-4 h-4 ${priorityConfig.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
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
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Triagem finalizada às {format(patient.calledAt || patient.createdAt, 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 justify-end ml-9 sm:ml-0">
                    {/* Finalizar sem chamar */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFinishWithoutCall(patient.id)}
                      className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                    >
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Finalizar</span>
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
    </div>
  );
}
