import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription 
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle, UserPlus, Activity, Stethoscope, Heart, Bandage, Scan, BedDouble, Volume2, VolumeX, CheckCircle, ArrowRight, RefreshCw, AlertTriangle, Timer } from 'lucide-react';

interface TipCategory {
  title: string;
  icon: React.ReactNode;
  color: string;
  tips: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

const HELP_CATEGORIES: TipCategory[] = [
  {
    title: 'Cadastro',
    icon: <UserPlus className="w-5 h-5" />,
    color: 'bg-blue-500',
    tips: [
      {
        icon: '🧾➜🩺',
        title: 'Salvar Paciente',
        description: 'Ao salvar, o paciente vai automaticamente para a fila da Triagem'
      },
      {
        icon: '🚫🧭',
        title: 'Sem encaminhamento',
        description: 'Não é necessário encaminhar nesta etapa - isso é feito na triagem'
      }
    ]
  },
  {
    title: 'Triagem',
    icon: <Activity className="w-5 h-5" />,
    color: 'bg-amber-500',
    tips: [
      {
        icon: '🩺',
        title: 'Lista de espera',
        description: 'Exibe pacientes aguardando avaliação de enfermagem'
      },
      {
        icon: '❤️‍🩹',
        title: 'Avaliação',
        description: 'Realize a triagem completa antes de encaminhar o paciente'
      }
    ]
  },
  {
    title: 'Chamadas',
    icon: <Volume2 className="w-5 h-5" />,
    color: 'bg-green-500',
    tips: [
      {
        icon: '🔊📺',
        title: 'Chamar com voz',
        description: 'A chamada aparece no painel da TV e o nome é anunciado por voz'
      },
      {
        icon: '🔕🔒',
        title: 'Chamar sem voz',
        description: 'Chamada interna silenciosa - não aparece na TV pública'
      }
    ]
  },
  {
    title: 'Encaminhamentos',
    icon: <ArrowRight className="w-5 h-5" />,
    color: 'bg-purple-500',
    tips: [
      {
        icon: '🔊➡️',
        title: 'Encaminhar com voz',
        description: 'Envia o paciente para outro setor com anúncio sonoro na TV pública'
      },
      {
        icon: '🔕➡️',
        title: 'Encaminhar interno',
        description: 'Direcionamento silencioso, sem som e sem exibição pública - apenas interno'
      }
    ]
  },
  {
    title: 'Setores',
    icon: <Stethoscope className="w-5 h-5" />,
    color: 'bg-cyan-500',
    tips: [
      {
        icon: '🏥📋',
        title: 'Lista do setor',
        description: 'Mostra apenas os pacientes destinados a este setor específico'
      },
      {
        icon: '🔊👤',
        title: 'Chamar com voz',
        description: 'Chamada pública com anúncio sonoro exibida no painel da TV'
      },
      {
        icon: '🔕👤',
        title: 'Chamada interna',
        description: 'Chamada silenciosa, sem som e sem exibição no painel público - apenas interno'
      }
    ]
  },
  {
    title: 'Prioridades',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'bg-red-500',
    tips: [
      {
        icon: '🟢',
        title: 'Normal',
        description: 'Atendimento por ordem de chegada na fila'
      },
      {
        icon: '🟡',
        title: 'Preferencial',
        description: 'Idosos, gestantes, deficientes e lactantes - prioridade na fila'
      },
      {
        icon: '🔴',
        title: 'Urgente',
        description: 'Casos críticos com atendimento imediato - máxima prioridade'
      }
    ]
  },
  {
    title: 'Finalização',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'bg-emerald-500',
    tips: [
      {
        icon: '✅📤',
        title: 'Finalizar atendimento',
        description: 'Remove o paciente da fila após conclusão do atendimento'
      }
    ]
  },
  {
    title: 'Sistema',
    icon: <RefreshCw className="w-5 h-5" />,
    color: 'bg-slate-500',
    tips: [
      {
        icon: '🔄⚡',
        title: 'Atualização automática',
        description: 'As filas são sincronizadas em tempo real automaticamente'
      },
      {
        icon: '⛔📑',
        title: 'Regra de fila única',
        description: 'Cada paciente pode estar em apenas uma fila por vez'
      }
    ]
  }
];

export interface QuickHelpPanelRef {
  openWithAutoClose: (seconds?: number) => void;
}

interface QuickHelpPanelProps {
  variant?: 'icon' | 'button';
  className?: string;
}

export const QuickHelpPanel = forwardRef<QuickHelpPanelRef, QuickHelpPanelProps>(
  ({ variant = 'icon', className = '' }, ref) => {
    const [open, setOpen] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [countdownFinished, setCountdownFinished] = useState(false);

    // Expose method to open with countdown (no auto-close)
    useImperativeHandle(ref, () => ({
      openWithAutoClose: (seconds = 10) => {
        setOpen(true);
        setCountdown(seconds);
        setCountdownFinished(false);
      }
    }));

    // Handle countdown (no auto-close, just shows timer)
    useEffect(() => {
      if (countdown === null || countdown <= 0) {
        if (countdown === 0) {
          setCountdownFinished(true);
          setCountdown(null);
        }
        return;
      }

      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }, [countdown]);

    // Reset state when manually closed
    const handleOpenChange = (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        setCountdown(null);
        setCountdownFinished(false);
      }
    };

    // Close handler
    const handleClose = () => {
      setOpen(false);
      setCountdown(null);
      setCountdownFinished(false);
    };

    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          {variant === 'icon' ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className={`text-muted-foreground hover:text-primary ${className}`}
              title="Ajuda rápida"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="outline" className={className}>
              <HelpCircle className="h-4 w-4 mr-2" />
              Ajuda
            </Button>
          )}
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader className="pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <HelpCircle className="h-6 w-6 text-primary" />
                Guia Rápido
              </SheetTitle>
              {/* Countdown Timer or Close Button */}
              {countdown !== null && countdown > 0 ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <Timer className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-sm font-medium text-primary tabular-nums">
                    {countdown}s
                  </span>
                </div>
              ) : countdownFinished ? (
                <Button 
                  onClick={handleClose}
                  size="sm"
                  className="animate-pulse"
                >
                  Fechar Guia
                </Button>
              ) : null}
            </div>
            <SheetDescription>
              Dicas e orientações para usar o sistema
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-120px)] pr-4">
            <div className="space-y-6">
              {HELP_CATEGORIES.map((category) => (
                <div key={category.title} className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${category.color} text-white`}>
                      {category.icon}
                    </div>
                    <h3 className="font-semibold text-foreground">{category.title}</h3>
                  </div>
                  
                  {/* Tips */}
                  <div className="space-y-2 ml-2">
                    {category.tips.map((tip, index) => (
                      <div 
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <span className="text-xl flex-shrink-0">{tip.icon}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground">{tip.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Setores disponíveis */}
              <div className="border-t pt-4 mt-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Setores Disponíveis
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Triagem</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Stethoscope className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Médico</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                    <Heart className="w-4 h-4 text-pink-600" />
                    <span className="text-sm">ECG</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Bandage className="w-4 h-4 text-amber-600" />
                    <span className="text-sm">Curativos</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Scan className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Raio X</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                    <BedDouble className="w-4 h-4 text-rose-600" />
                    <span className="text-sm">Enfermaria</span>
                  </div>
                </div>
              </div>

              {/* Atalhos de teclado */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-foreground mb-3">💡 Dicas extras</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Acentue os nomes corretamente para melhor pronúncia no áudio</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>A tela recarrega automaticamente após 10 minutos de inatividade</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Clique no ícone de som para ativar/desativar notificações sonoras</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Use o chat interno para comunicação entre setores</span>
                  </li>
                </ul>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }
);

QuickHelpPanel.displayName = 'QuickHelpPanel';
