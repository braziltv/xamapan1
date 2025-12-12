import { Button } from '@/components/ui/button';
import { Phone, PhoneCall, Check, Users, Volume2, CheckCircle, Stethoscope, Clock, Activity } from 'lucide-react';
import { Patient } from '@/types/patient';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface TriagePanelProps {
  waitingPatients: Patient[];
  currentCall: Patient | null;
  onCallPatient: (id: string) => void;
  onFinishTriage: (id: string) => void;
  onRecall: () => void;
  onDirectPatient: (patientName: string, destination: string) => void;
  onFinishWithoutCall: (id: string) => void;
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

export function TriagePanel({ 
  waitingPatients, 
  currentCall, 
  onCallPatient, 
  onFinishTriage,
  onRecall,
  onDirectPatient,
  onFinishWithoutCall,
  onForwardToDoctor
}: TriagePanelProps) {

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Current Call */}
      <div className="card-elevated rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-health-blue to-health-blue-dark p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Chamada Atual - Triagem
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
                Chamado às {format(currentCall.calledAt!, 'HH:mm')}
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button onClick={onRecall} variant="outline" className="gap-2 hover:bg-muted">
                  <Phone className="w-4 h-4" />
                  Chamar Novamente
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 hover:bg-muted">
                      <Volume2 className="w-4 h-4" />
                      Sala
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border border-border shadow-xl z-50">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Escolha a Sala</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {SALAS.map((sala) => (
                      <DropdownMenuItem key={sala.id} onClick={() => onDirectPatient(currentCall.name, sala.name)} className="cursor-pointer">
                        {sala.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 hover:bg-muted">
                      <Volume2 className="w-4 h-4" />
                      Consultório
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border border-border shadow-xl z-50">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Escolha o Consultório</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {CONSULTORIOS.map((cons) => (
                      <DropdownMenuItem key={cons.id} onClick={() => onDirectPatient(currentCall.name, cons.name)} className="cursor-pointer">
                        {cons.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={() => onFinishTriage(currentCall.id)} className="gap-2 gradient-success hover:opacity-90 shadow-lg">
                  <Check className="w-4 h-4" />
                  Finalizar Triagem
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="icon-container-muted w-16 h-16 mx-auto mb-4">
                <Activity className="w-8 h-8" />
              </div>
              <p className="text-muted-foreground font-medium">Nenhum paciente sendo atendido</p>
            </div>
          )}
        </div>
      </div>

      {/* Waiting Queue */}
      <div className="card-elevated rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-health-blue-light rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-health-blue" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Fila de Espera</h2>
            <p className="text-sm text-muted-foreground">{waitingPatients.length} paciente{waitingPatients.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        
        {waitingPatients.length === 0 ? (
          <div className="text-center py-8">
            <div className="icon-container-muted w-16 h-16 mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhum paciente aguardando triagem</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {waitingPatients.map((patient, index) => (
              <div key={patient.id} className="card-interactive rounded-xl p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-health-blue-light flex items-center justify-center text-health-blue font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{patient.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Chegou às {format(patient.createdAt, 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 hover:bg-muted">
                          <Volume2 className="w-4 h-4" />
                          Sala
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border border-border shadow-xl z-50">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Direcionar para Sala</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {SALAS.map((sala) => (
                          <DropdownMenuItem key={sala.id} onClick={() => onDirectPatient(patient.name, sala.name)} className="cursor-pointer">
                            {sala.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 border-health-purple/30 text-health-purple hover:bg-health-purple-light">
                          <Stethoscope className="w-4 h-4" />
                          Médico
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border border-border shadow-xl z-50">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Escolha o Consultório</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onForwardToDoctor(patient.id, 'Consultório Médico 1')} className="cursor-pointer">
                          Consultório Médico 1
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onForwardToDoctor(patient.id, 'Consultório Médico 2')} className="cursor-pointer">
                          Consultório Médico 2
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" size="sm" onClick={() => onFinishWithoutCall(patient.id)} className="gap-1.5 border-health-green/30 text-health-green hover:bg-health-green-light">
                      <CheckCircle className="w-4 h-4" />
                      Finalizar
                    </Button>

                    <Button onClick={() => onCallPatient(patient.id)} size="sm" className="gap-1.5 bg-health-blue hover:bg-health-blue-dark shadow-lg">
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