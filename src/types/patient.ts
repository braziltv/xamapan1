export interface Patient {
  id: string;
  name: string;
  ticket: string;
  priority: 'normal' | 'priority' | 'emergency';
  service: string;
  room: string;
  status: 'waiting' | 'called' | 'attended' | 'missed';
  calledAt?: Date;
  createdAt: Date;
}

export interface CallHistory {
  id: string;
  patient: Patient;
  calledAt: Date;
  room: string;
}

export type ServiceType = {
  id: string;
  name: string;
  color: string;
};

export const SERVICES: ServiceType[] = [
  { id: 'clinica', name: 'Clínica Geral', color: 'health-blue' },
  { id: 'pediatria', name: 'Pediatria', color: 'health-green' },
  { id: 'enfermagem', name: 'Enfermagem', color: 'health-amber' },
  { id: 'vacina', name: 'Vacinação', color: 'accent' },
  { id: 'odonto', name: 'Odontologia', color: 'primary' },
  { id: 'coleta', name: 'Coleta', color: 'destructive' },
];

export const ROOMS = [
  'Consultório 01',
  'Consultório 02',
  'Consultório 03',
  'Sala de Vacinas',
  'Sala de Enfermagem',
  'Sala de Coleta',
  'Consultório Odonto',
];
