export type PatientPriority = 'normal' | 'priority' | 'emergency';

export interface Patient {
  id: string;
  name: string;
  status: 'waiting' | 'in-triage' | 'waiting-doctor' | 'in-consultation' | 'attended';
  priority: PatientPriority;
  createdAt: Date;
  calledAt?: Date;
  calledBy?: 'triage' | 'doctor';
}

export interface CallHistory {
  id: string;
  patient: Patient;
  calledAt: Date;
  calledBy: 'triage' | 'doctor';
}
