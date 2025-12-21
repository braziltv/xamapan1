-- Tabela de unidades (para gerenciar unidades do sistema)
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password text NOT NULL DEFAULT '123456',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de módulos customizáveis
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  icon text DEFAULT 'Activity',
  call_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(unit_id, code)
);

-- Tabela de destinos customizáveis por módulo
CREATE TABLE public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enum para roles de usuário
CREATE TYPE public.user_role AS ENUM ('admin', 'recepcao', 'triagem', 'medico', 'enfermagem', 'custom');

-- Tabela de usuários do sistema (operadores)
CREATE TABLE public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'recepcao',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(unit_id, username)
);

-- Tabela de permissões de módulos por operador (para permissões granulares)
CREATE TABLE public.operator_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES public.operators(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_call boolean NOT NULL DEFAULT true,
  can_manage boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(operator_id, module_id)
);

-- Tabela de frases TTS customizáveis por módulo
CREATE TABLE public.tts_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
  phrase_type text NOT NULL DEFAULT 'call',
  phrase_template text NOT NULL,
  voice_id text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tts_phrases ENABLE ROW LEVEL SECURITY;

-- RLS Policies (acesso público para o sistema funcionar sem auth do Supabase)
CREATE POLICY "Anyone can view units" ON public.units FOR SELECT USING (true);
CREATE POLICY "Anyone can manage units" ON public.units FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Anyone can manage modules" ON public.modules FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view destinations" ON public.destinations FOR SELECT USING (true);
CREATE POLICY "Anyone can manage destinations" ON public.destinations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view operators" ON public.operators FOR SELECT USING (true);
CREATE POLICY "Anyone can manage operators" ON public.operators FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view permissions" ON public.operator_permissions FOR SELECT USING (true);
CREATE POLICY "Anyone can manage permissions" ON public.operator_permissions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view tts phrases" ON public.tts_phrases FOR SELECT USING (true);
CREATE POLICY "Anyone can manage tts phrases" ON public.tts_phrases FOR ALL USING (true) WITH CHECK (true);

-- Triggers para updated_at
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON public.operators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tts_phrases_updated_at BEFORE UPDATE ON public.tts_phrases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();