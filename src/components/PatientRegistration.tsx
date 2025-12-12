import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Trash2, Users, Volume2, CheckCircle, Activity, Stethoscope, Clock } from 'lucide-react';
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
  onForwardToTriage: (id: string) => void;
  onForwardToDoctor: (id: string) => void;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return (
          <span className="badge-warning">
            <span className="status-dot-waiting" />
            Aguardando triagem
          </span>
        );
      case 'in-triage':
        return (
          <span className="badge-info">
            <span className="status-dot-triage" />
            Em triagem
          </span>
        );
      case 'waiting-doctor':
        return (
          <span className="badge-purple">
            <span className="status-dot-doctor" />
            Aguardando médico
          </span>
        );
      case 'in-consultation':
        return (
          <span className="badge-success">
            <span className="status-dot-active" />
            Em consulta
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Registration Form */}
      <div className="card-elevated rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="icon-container-primary w-10 h-10">
            <UserPlus className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Cadastrar Paciente
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            type="text"
            placeholder="Nome completo do paciente"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 h-12 bg-muted/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Button 
            type="submit" 
            disabled={!name.trim()}
            className="h-12 px-6 gradient-primary hover:opacity-90 shadow-lg hover:shadow-xl transition-all"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Cadastrar
          </Button>
        </form>
      </div>

      {/* Patient List */}
      <div className="card-elevated rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="icon-container-success w-10 h-10">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Pacientes Cadastrados
              </h2>
              <p className="text-sm text-muted-foreground">
                {activePatients.length} paciente{activePatients.length !== 1 ? 's' : ''} na fila
              </p>
            </div>
          </div>
        </div>
        
        {activePatients.length === 0 ? (
          <div className="text-center py-12">
            <div className="icon-container-muted w-16 h-16 mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <p className="text-muted-foreground font-medium">
              Nenhum paciente cadastrado
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Adicione um paciente usando o formulário acima
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {activePatients.map((patient, index) => (
              <div
                key={patient.id}
                className="card-interactive rounded-xl p-4 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {patient.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(patient.createdAt, 'HH:mm')}
                        </span>
                        {getStatusBadge(patient.status)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Encaminhar para próxima etapa - apenas para pacientes aguardando */}
                    {patient.status === 'waiting' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onForwardToTriage(patient.id)}
                          className="gap-1.5 border-health-blue/30 text-health-blue hover:bg-health-blue-light hover:border-health-blue transition-all"
                        >
                          <Activity className="w-4 h-4" />
                          Triagem
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onForwardToDoctor(patient.id)}
                          className="gap-1.5 border-health-purple/30 text-health-purple hover:bg-health-purple-light hover:border-health-purple transition-all"
                        >
                          <Stethoscope className="w-4 h-4" />
                          Médico
                        </Button>
                      </>
                    )}

                    {/* Menu Salas */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 hover:bg-muted">
                          <Volume2 className="w-4 h-4" />
                          Sala
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border border-border shadow-xl z-50">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          Direcionar para Sala
                        </DropdownMenuLabel>
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
                        <Button variant="ghost" size="sm" className="gap-1.5 hover:bg-muted">
                          <Volume2 className="w-4 h-4" />
                          Consultório
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border border-border shadow-xl z-50">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          Direcionar para Consultório
                        </DropdownMenuLabel>
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
                      className="gap-1.5 border-health-green/30 text-health-green hover:bg-health-green-light hover:border-health-green transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Finalizar
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemovePatient(patient.id)}
                      className="text-destructive hover:text-destructive hover:bg-health-red-light transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
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