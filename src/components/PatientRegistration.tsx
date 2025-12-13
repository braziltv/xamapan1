import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Trash2, Users, Volume2, CheckCircle, ArrowRight, Activity, Stethoscope } from 'lucide-react';
import { Patient } from '@/types/patient';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface PatientRegistrationProps {
  patients: Patient[];
  onAddPatient: (name: string) => void;
  onRemovePatient: (id: string) => void;
  onDirectPatient: (patientName: string, destination: string) => void;
  onFinishWithoutCall: (id: string) => void;
  onForwardToTriage: (id: string, destination?: string) => void;
  onForwardToDoctor: (id: string, destination?: string) => void;
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
  { id: 'med1', name: 'Consultório Médico 1' },
  { id: 'med2', name: 'Consultório Médico 2' },
];

export function PatientRegistration({ 
  patients, 
  onAddPatient, 
  onRemovePatient,
  onDirectPatient,
  onFinishWithoutCall,
  onForwardToTriage,
  onForwardToDoctor
}: PatientRegistrationProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddPatient(name);
      setName('');
      toast.success('Paciente cadastrado com sucesso!');
    }
  };

  const activePatients = patients.filter(p => p.status !== 'attended');

  return (
    <div className="space-y-6">
      {/* Registration Form */}
      <div className="bg-card rounded-xl p-6 shadow-health border border-border">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Cadastrar Paciente
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Input
            type="text"
            placeholder="Nome completo do paciente"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!name.trim()} className="w-full sm:w-auto">
            <UserPlus className="w-4 h-4 mr-2" />
            Cadastrar
          </Button>
        </form>
      </div>

      {/* Patient List */}
      <div className="bg-card rounded-xl p-6 shadow-health border border-border">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Pacientes Cadastrados ({activePatients.length})
        </h2>
        
        {activePatients.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum paciente cadastrado
          </p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {activePatients.map((patient, index) => (
              <div
                key={patient.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors gap-2"
              >
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="text-lg font-mono font-bold text-primary w-8">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Cadastrado às {format(patient.createdAt, 'HH:mm')}
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
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end mt-2 sm:mt-0">
                  {/* Encaminhar para próxima etapa - apenas para pacientes aguardando */}
                  {patient.status === 'waiting' && (
                    <>
                      {/* Menu Triagem */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Activity className="w-4 h-4" />
                            Triagem
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-card border border-border z-50">
                          <DropdownMenuLabel>Direcionar para</DropdownMenuLabel>
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
                            className="gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          >
                            <Stethoscope className="w-4 h-4" />
                            Médico
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
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Volume2 className="w-4 h-4" />
                        Sala
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
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Volume2 className="w-4 h-4" />
                        Consultório
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
                    onClick={() => onFinishWithoutCall(patient.id)}
                    className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Finalizar
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemovePatient(patient.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
