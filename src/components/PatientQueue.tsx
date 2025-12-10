import { Patient, ROOMS } from '@/types/patient';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Clock, AlertTriangle, Heart, User } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientQueueProps {
  patients: Patient[];
  onCallPatient: (patientId: string, room: string) => void;
}

export function PatientQueue({ patients, onCallPatient }: PatientQueueProps) {
  const [selectedRooms, setSelectedRooms] = useState<Record<string, string>>({});

  const handleRoomSelect = (patientId: string, room: string) => {
    setSelectedRooms(prev => ({ ...prev, [patientId]: room }));
  };

  const handleCall = (patientId: string) => {
    const room = selectedRooms[patientId];
    if (room) {
      onCallPatient(patientId, room);
    }
  };

  const priorityConfig = {
    normal: {
      icon: User,
      label: 'Normal',
      className: 'bg-secondary text-secondary-foreground',
      borderClass: 'border-l-secondary-foreground/30',
    },
    priority: {
      icon: Heart,
      label: 'Prioridade',
      className: 'bg-health-amber-light text-health-amber',
      borderClass: 'border-l-health-amber',
    },
    emergency: {
      icon: AlertTriangle,
      label: 'Emergência',
      className: 'bg-destructive/10 text-destructive',
      borderClass: 'border-l-destructive',
    },
  };

  if (patients.length === 0) {
    return (
      <div className="bg-card rounded-xl p-8 shadow-health border border-border text-center">
        <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhum paciente na fila</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Fila de Espera
        </h3>
        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
          {patients.length} paciente{patients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {patients.map((patient, index) => {
        const config = priorityConfig[patient.priority];
        const Icon = config.icon;

        return (
          <div
            key={patient.id}
            className={`bg-card rounded-xl p-4 shadow-health border border-border border-l-4 ${config.borderClass} animate-slide-up`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-4">
              {/* Position and Ticket */}
              <div className="flex-shrink-0 text-center">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <div className="font-mono text-2xl font-bold text-primary">
                  {patient.ticket}
                </div>
              </div>

              {/* Patient Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </span>
                </div>
                <h4 className="font-semibold text-foreground truncate">
                  {patient.name}
                </h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{patient.service}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(patient.createdAt, { 
                      addSuffix: true,
                      locale: ptBR 
                    })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Select
                  value={selectedRooms[patient.id] || ''}
                  onValueChange={(value) => handleRoomSelect(patient.id, value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Selecionar sala" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOMS.map(room => (
                      <SelectItem key={room} value={room}>
                        {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => handleCall(patient.id)}
                  disabled={!selectedRooms[patient.id]}
                  className="gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Chamar
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
