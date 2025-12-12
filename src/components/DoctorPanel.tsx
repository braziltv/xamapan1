import { Button } from '@/components/ui/button';
import { Phone, PhoneCall, Check, Users, Stethoscope, CheckCircle } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Consultório Selection */}
      <div className="bg-card rounded-xl p-4 shadow-health border border-border">
        <label className="block text-sm font-medium text-foreground mb-2">
          Selecionar Consultório
        </label>
        <Select value={selectedConsultorio} onValueChange={setSelectedConsultorio}>
          <SelectTrigger className="w-full bg-background">
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
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Chamada Atual - {currentConsultorio}
          </h2>
        </div>
        <div className="p-6">
          {currentCall ? (
            <div className="text-center">
              <p className="text-4xl font-bold text-foreground mb-4">
                {currentCall.name}
              </p>
              <p className="text-muted-foreground mb-6">
                Chamado às {format(currentCall.calledAt!, 'HH:mm')} - {currentConsultorio}
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={handleRecall} variant="outline">
                  <Phone className="w-4 h-4 mr-2" />
                  Chamar Novamente
                </Button>
                <Button onClick={() => onFinishConsultation(currentCall.id)} className="bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />
                  Finalizar Consulta
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum paciente em consulta
            </p>
          )}
        </div>
      </div>

      {/* Waiting Queue */}
      <div className="bg-card rounded-xl p-6 shadow-health border border-border">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Aguardando Consulta ({waitingPatients.length})
        </h2>
        
        {waitingPatients.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum paciente aguardando consulta
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {waitingPatients.map((patient, index) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-mono font-bold text-primary w-8">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Triagem finalizada às {format(patient.calledAt || patient.createdAt, 'HH:mm')}
                    </p>
                  </div>
                </div>
                {/* Finalizar sem chamar */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFinishWithoutCall(patient.id)}
                  className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Finalizar
                </Button>

                <Button
                  onClick={() => handleCallPatient(patient.id)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Chamar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
