import { Button } from '@/components/ui/button';
import { Phone, PhoneCall, Check, Users, Stethoscope, CheckCircle, Clock } from 'lucide-react';
import { Patient } from '@/types/patient';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

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
    <div className="space-y-6 animate-fade-in">
      {/* Consultório Selection */}
      <div className="card-elevated rounded-2xl p-5">
        <label className="block text-sm font-semibold text-foreground mb-3">
          Selecionar Consultório
        </label>
        <Select value={selectedConsultorio} onValueChange={setSelectedConsultorio}>
          <SelectTrigger className="w-full h-12 bg-muted/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20">
            <SelectValue placeholder="Selecione o consultório" />
          </SelectTrigger>
          <SelectContent className="bg-card border border-border shadow-xl">
            {consultorios.map((consultorio) => (
              <SelectItem key={consultorio.value} value={consultorio.value}>
                {consultorio.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Current Call */}
      <div className="card-elevated rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-health-purple to-health-purple/80 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Chamada Atual - {currentConsultorio}
            </h2>
          </div>
        </div>
        <div className="p-6">
          {currentCall ? (
            <div className="text-center animate-scale-in">
              <p className="text-4xl font-extrabold text-foreground mb-2">
                {currentCall.name}
              </p>
              <p className="text-muted-foreground mb-6 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Chamado às {format(currentCall.calledAt!, 'HH:mm')} - {currentConsultorio}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleRecall} variant="outline" className="gap-2 hover:bg-muted">
                  <Phone className="w-4 h-4" />
                  Chamar Novamente
                </Button>
                <Button onClick={() => onFinishConsultation(currentCall.id)} className="gap-2 gradient-success hover:opacity-90 shadow-lg">
                  <Check className="w-4 h-4" />
                  Finalizar Consulta
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="icon-container-muted w-16 h-16 mx-auto mb-4">
                <Stethoscope className="w-8 h-8" />
              </div>
              <p className="text-muted-foreground font-medium">Nenhum paciente em consulta</p>
            </div>
          )}
        </div>
      </div>

      {/* Waiting Queue */}
      <div className="card-elevated rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-health-purple-light rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-health-purple" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Aguardando Consulta</h2>
            <p className="text-sm text-muted-foreground">{waitingPatients.length} paciente{waitingPatients.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        
        {waitingPatients.length === 0 ? (
          <div className="text-center py-8">
            <div className="icon-container-muted w-16 h-16 mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhum paciente aguardando consulta</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {waitingPatients.map((patient, index) => (
              <div key={patient.id} className="card-interactive rounded-xl p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-health-purple-light flex items-center justify-center text-health-purple font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{patient.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Triagem às {format(patient.calledAt || patient.createdAt, 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onFinishWithoutCall(patient.id)} className="gap-1.5 border-health-green/30 text-health-green hover:bg-health-green-light">
                      <CheckCircle className="w-4 h-4" />
                      Finalizar
                    </Button>
                    <Button onClick={() => handleCallPatient(patient.id)} size="sm" className="gap-1.5 bg-health-purple hover:bg-health-purple/90 shadow-lg">
                      <Phone className="w-4 h-4" />
                      Chamar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}