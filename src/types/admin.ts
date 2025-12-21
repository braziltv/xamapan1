// Tipos para o sistema de administração

export type UserRole = 'admin' | 'recepcao' | 'triagem' | 'medico' | 'enfermagem' | 'custom';

export interface Unit {
  id: string;
  name: string;
  display_name: string;
  password: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  unit_id: string;
  code: string;
  name: string;
  icon: string;
  call_type: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Destination {
  id: string;
  unit_id: string;
  module_id: string | null;
  name: string;
  display_name: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Operator {
  id: string;
  unit_id: string;
  name: string;
  username: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OperatorPermission {
  id: string;
  operator_id: string;
  module_id: string;
  can_view: boolean;
  can_call: boolean;
  can_manage: boolean;
  created_at: string;
}

export interface TTSPhrase {
  id: string;
  unit_id: string;
  module_id: string | null;
  phrase_type: string;
  phrase_template: string;
  voice_id: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Perfis predefinidos com permissões padrão
export const DEFAULT_ROLE_PERMISSIONS: Record<Exclude<UserRole, 'custom'>, { modules: string[], description: string }> = {
  admin: {
    modules: ['*'],
    description: 'Acesso total a todos os módulos e configurações'
  },
  recepcao: {
    modules: ['cadastro'],
    description: 'Cadastro e gerenciamento de pacientes'
  },
  triagem: {
    modules: ['cadastro', 'triagem'],
    description: 'Cadastro e triagem de pacientes'
  },
  medico: {
    modules: ['medico'],
    description: 'Consultas médicas'
  },
  enfermagem: {
    modules: ['triagem', 'ecg', 'curativos', 'enfermaria'],
    description: 'Triagem e procedimentos de enfermagem'
  }
};

// Ícones disponíveis para módulos
export const AVAILABLE_ICONS = [
  'Activity', 'Stethoscope', 'Heart', 'Bandage', 'Scan', 'BedDouble',
  'Pill', 'Syringe', 'Thermometer', 'ClipboardList', 'UserPlus', 
  'Users', 'Building2', 'Phone', 'Monitor'
];

// Cores disponíveis para módulos
export const AVAILABLE_COLORS = [
  { name: 'Azul', value: 'blue' },
  { name: 'Verde', value: 'green' },
  { name: 'Vermelho', value: 'red' },
  { name: 'Amarelo', value: 'amber' },
  { name: 'Roxo', value: 'purple' },
  { name: 'Rosa', value: 'rose' },
  { name: 'Laranja', value: 'orange' },
  { name: 'Ciano', value: 'cyan' },
];
