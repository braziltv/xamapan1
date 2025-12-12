import { Button } from '@/components/ui/button';
import { Phone, PhoneCall, Check, Users, Volume2, CheckCircle } from 'lucide-react';
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
  onFinishWithoutCall
}: TriagePanelProps) {

  return (
    <div className="space-y-6">
      {/* Current Call */}
      <div className="bg-card rounded-xl shadow-health border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PhoneCall className="w-5 h-5" />
            Chamada Atual - Triagem
          </h2>
        </div>
        <div className="p-6">
          {currentCall ? (
            <div className="text-center">
              <p className="text-4xl font-bold text-foreground mb-4">
                {currentCall.name}
              </p>
              <p className="text-muted-foreground mb-6">
                Chamado às {format(currentCall.calledAt!, 'HH:mm')}
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button onClick={onRecall} variant="outline">
                  <Phone className="w-4 h-4 mr-2" />
                  Chamar Novamente
                </Button>
                
                {/* Menu Salas */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Volume2 className="w-4 h-4" />
                      Direcionar para Sala
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

                {/* Menu Consultórios */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Volume2 className="w-4 h-4" />
                      Direcionar para Consultório
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border border-border z-50">
                    <DropdownMenuLabel>Escolha o Consultório</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {CONSULTORIOS.map((cons) => (
                      <DropdownMenuItem
                        key={cons.id}
                        onClick={() => onDirectPatient(currentCall.name, cons.name)}
                        className="cursor-pointer"
                      >
                        {cons.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={() => onFinishTriage(currentCall.id)} className="bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />
                  Finalizar Triagem
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum paciente sendo atendido
            </p>
          )}
        </div>
      </div>

      {/* Waiting Queue */}
      <div className="bg-card rounded-xl p-6 shadow-health border border-border">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Fila de Espera ({waitingPatients.length})
        </h2>
        
        {waitingPatients.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum paciente aguardando triagem
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
                      Chegou às {format(patient.createdAt, 'HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Menu Salas na fila */}
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

                  {/* Menu Consultórios na fila */}
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
                    onClick={() => onCallPatient(patient.id)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Chamar
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
