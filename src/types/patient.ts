export type PatientPriority = 'normal' | 'priority' | 'emergency';

export type PatientStatus = 
  | 'waiting' 
  | 'in-triage' 
  | 'waiting-doctor' 
  | 'in-consultation' 
  | 'waiting-ecg'
  | 'in-ecg'
  | 'waiting-curativos'
  | 'in-curativos'
  | 'waiting-raiox'
  | 'in-raiox'
  | 'waiting-enfermaria'
  | 'in-enfermaria'
  | 'attended';

export interface Patient {
  id: string;
  name: string;
  status: PatientStatus;
  priority: PatientPriority;
  createdAt: Date;
  calledAt?: Date;
  calledBy?: 'cadastro' | 'triage' | 'doctor' | 'ecg' | 'curativos' | 'raiox' | 'enfermaria';
  destination?: string;
  observations?: string;
}

export interface CallHistory {
  id: string;
  patient: Patient;
  calledAt: Date;
  calledBy: 'cadastro' | 'triage' | 'doctor' | 'ecg' | 'curativos' | 'raiox' | 'enfermaria';
}
