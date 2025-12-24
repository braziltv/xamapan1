import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Info } from "lucide-react";
import { ReactNode } from "react";

export type TipKey = 
  | 'cadastro_salvar'
  | 'cadastro_sem_encaminhar'
  | 'triagem_lista'
  | 'chamar_com_voz'
  | 'chamar_sem_voz'
  | 'triagem_avaliacao'
  | 'encaminhar'
  | 'encaminhar_sem_voz'
  | 'setor_lista'
  | 'setor_chamar_voz'
  | 'setor_chamar_interno'
  | 'finalizar'
  | 'atualizacao_auto'
  | 'regra_fila_unica';

interface TipConfig {
  icon: string;
  text: string;
}

const TIPS: Record<TipKey, TipConfig> = {
  cadastro_salvar: {
    icon: '🧾➜🩺',
    text: 'Ao salvar, paciente vai direto para Triagem'
  },
  cadastro_sem_encaminhar: {
    icon: '🚫🧭',
    text: 'Não é necessário encaminhar nesta etapa'
  },
  triagem_lista: {
    icon: '🩺',
    text: 'Lista de pacientes aguardando avaliação'
  },
  chamar_com_voz: {
    icon: '🔊📺',
    text: 'Exibe na TV e faz anúncio por voz'
  },
  chamar_sem_voz: {
    icon: '🔕🔒',
    text: 'Chamada interna, não aparece na TV'
  },
  triagem_avaliacao: {
    icon: '❤️‍🩹',
    text: 'Realize a triagem antes de encaminhar'
  },
  encaminhar: {
    icon: '🔀➡️',
    text: 'Envie o paciente para o próximo setor'
  },
  encaminhar_sem_voz: {
    icon: '🔕➡️',
    text: 'Direcionamento interno sem TV'
  },
  setor_lista: {
    icon: '🏥📋',
    text: 'Mostra apenas pacientes deste setor'
  },
  setor_chamar_voz: {
    icon: '🔊👤',
    text: 'Chamada pública por voz e painel'
  },
  setor_chamar_interno: {
    icon: '🔕👤',
    text: 'Chamada interna sem exibição pública'
  },
  finalizar: {
    icon: '✅📤',
    text: 'Remove o paciente da fila'
  },
  atualizacao_auto: {
    icon: '🔄⚡',
    text: 'Filas atualizam automaticamente'
  },
  regra_fila_unica: {
    icon: '⛔📑',
    text: 'Paciente em apenas uma fila por vez'
  }
};

interface ContextualTipProps {
  tipKey: TipKey;
  children?: ReactNode;
  showIcon?: boolean;
  iconSize?: 'sm' | 'md' | 'lg';
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function ContextualTip({ 
  tipKey, 
  children, 
  showIcon = true,
  iconSize = 'sm',
  side = 'top',
  className = ''
}: ContextualTipProps) {
  const tip = TIPS[tipKey];
  
  if (!tip) return <>{children}</>;

  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 cursor-help ${className}`}>
            {children}
            {showIcon && (
              <Info className={`${sizeClasses[iconSize]} text-muted-foreground/70 hover:text-primary transition-colors`} />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className="bg-popover/95 backdrop-blur-sm border-border/50 shadow-lg max-w-xs"
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base">{tip.icon}</span>
            <span className="text-popover-foreground">{tip.text}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Componente para mostrar dica inline
interface InlineTipProps {
  tipKey: TipKey;
  className?: string;
}

export function InlineTip({ tipKey, className = '' }: InlineTipProps) {
  const tip = TIPS[tipKey];
  
  if (!tip) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center cursor-help ${className}`}>
            <HelpCircle className="h-4 w-4 text-muted-foreground/60 hover:text-primary transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-popover/95 backdrop-blur-sm border-border/50 shadow-lg max-w-xs">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base">{tip.icon}</span>
            <span className="text-popover-foreground">{tip.text}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Hook para obter texto da dica
export function useTip(tipKey: TipKey) {
  return TIPS[tipKey];
}
