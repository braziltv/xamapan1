import { TVCustomization, defaultCustomization } from '@/hooks/useTVCustomization';
import { Clock, User, History, Newspaper, Settings, MousePointer } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TVPreviewInteractiveProps {
  customization: Partial<TVCustomization> | null;
  onElementClick?: (tab: string) => void;
  className?: string;
}

type ClickableArea = 'background' | 'header' | 'cards' | 'sidebar' | 'ticker';

export function TVPreviewInteractive({ customization, onElementClick, className = '' }: TVPreviewInteractiveProps) {
  const config = { ...defaultCustomization, ...customization };

  const handleClick = (area: ClickableArea) => {
    onElementClick?.(area);
  };

  const getBackgroundStyle = () => {
    if (config.background_style === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${config.background_color} 0%, ${adjustColor(config.background_color || '#0a0a1a', 20)} 50%, ${config.background_color} 100%)`,
      };
    }
    return { backgroundColor: config.background_color || '#0a0a1a' };
  };

  const adjustColor = (color: string, amount: number) => {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + amount);
      const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + amount);
      const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + amount);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  };

  const ClickableWrapper = ({ 
    children, 
    area, 
    tooltip,
    className: wrapperClassName = ''
  }: { 
    children: React.ReactNode; 
    area: ClickableArea; 
    tooltip: string;
    className?: string;
  }) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "cursor-pointer transition-all duration-200 relative group",
              "hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:ring-offset-background rounded",
              wrapperClassName
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleClick(area);
            }}
          >
            {children}
            {/* Edit indicator */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-primary text-primary-foreground rounded-full p-0.5">
                <Settings className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="flex items-center gap-1">
            <MousePointer className="w-3 h-3" />
            {tooltip}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className={cn("relative", className)}>
      {/* Main TV Frame */}
      <div 
        className="relative rounded-xl overflow-hidden border-4 border-slate-700 shadow-2xl"
        style={{ aspectRatio: '16/9' }}
      >
        {/* Background - Clickable */}
        <ClickableWrapper area="background" tooltip="Clique para editar o fundo" className="absolute inset-0">
          <div 
            className="w-full h-full"
            style={getBackgroundStyle()}
          >
            {/* Animated gradient overlay */}
            {config.background_animation && (
              <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-cyan-500/20 via-transparent to-purple-500/20 animate-pulse" />
            )}
          </div>
        </ClickableWrapper>

        {/* Content Layer */}
        <div className="relative z-10 flex flex-col h-full">
          
          {/* Header - Clickable */}
          <ClickableWrapper area="header" tooltip="Clique para editar o cabeçalho" className="shrink-0">
            <header 
              className="flex items-center justify-between px-4 py-2"
              style={{ backgroundColor: config.header_bg_color || 'rgba(0,0,0,0.3)' }}
            >
              <div className="flex items-center gap-3">
                {/* Logo */}
                <div 
                  className="rounded-lg bg-white/90 flex items-center justify-center shadow-lg"
                  style={{ 
                    width: config.header_logo_size === 'small' ? '28px' : config.header_logo_size === 'large' ? '44px' : '36px',
                    height: config.header_logo_size === 'small' ? '28px' : config.header_logo_size === 'large' ? '44px' : '36px',
                  }}
                >
                  <span className="text-lg">🏥</span>
                </div>
                
                {/* Title */}
                {config.header_title_visible && (
                  <div className="flex flex-col">
                    <span 
                      className="font-bold text-sm"
                      style={{ color: config.header_text_color || '#ffffff' }}
                    >
                      Painel de Chamadas
                    </span>
                    <span 
                      className="text-[10px] text-amber-400 font-medium"
                    >
                      ✨ Unidade de Saúde
                    </span>
                  </div>
                )}
              </div>

              {/* Clock */}
              <div className="flex items-center gap-2" style={{ color: config.clock_color || '#38bdf8' }}>
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono font-bold">12:34:56</span>
              </div>
            </header>
          </ClickableWrapper>

          {/* Main Content Area */}
          <div className="flex-1 flex gap-3 p-3 min-h-0">
            
            {/* Cards Area - Clickable */}
            <ClickableWrapper area="cards" tooltip="Clique para editar os cards" className="flex-1 flex flex-col gap-3">
              {/* Triage Card */}
              <div 
                className="flex-1 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden"
                style={{ 
                  background: config.card_triage_bg || 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  borderWidth: config.card_border_style === 'neon' ? '2px' : config.card_border_style === 'minimal' ? '1px' : '0',
                  borderColor: config.card_border_color || '#38bdf8',
                  borderStyle: 'solid',
                  boxShadow: config.card_border_style === 'neon' ? `0 0 15px ${config.card_border_color || '#38bdf8'}50` : 'none',
                }}
              >
                {/* Shimmer effect */}
                <div 
                  className="absolute inset-0 -skew-x-12 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer-slide 3s ease-in-out infinite',
                  }}
                />
                
                <span 
                  className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80"
                  style={{ color: config.card_triage_text || '#ffffff' }}
                >
                  🏥 TRIAGEM
                </span>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" style={{ color: config.card_triage_text || '#ffffff' }} />
                  <span 
                    className="font-bold tracking-wide"
                    style={{ 
                      color: config.card_triage_text || '#ffffff',
                      fontSize: config.card_size === 'small' ? '14px' : config.card_size === 'large' ? '20px' : '16px',
                      fontWeight: config.patient_font_weight || '800',
                      textTransform: (config.patient_text_transform as 'uppercase' | 'lowercase' | 'capitalize' | 'none') || 'uppercase',
                    }}
                  >
                    MARIA SILVA
                  </span>
                </div>
              </div>

              {/* Doctor Card */}
              <div 
                className="flex-1 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden"
                style={{ 
                  background: config.card_doctor_bg || 'linear-gradient(135deg, #059669, #10b981)',
                  borderWidth: config.card_border_style === 'neon' ? '2px' : config.card_border_style === 'minimal' ? '1px' : '0',
                  borderColor: config.card_border_color || '#38bdf8',
                  borderStyle: 'solid',
                  boxShadow: config.card_border_style === 'neon' ? `0 0 15px ${config.card_border_color || '#38bdf8'}50` : 'none',
                }}
              >
                {/* Shimmer effect */}
                <div 
                  className="absolute inset-0 -skew-x-12 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer-slide 3s ease-in-out infinite',
                    animationDelay: '0.5s',
                  }}
                />
                
                <span 
                  className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80"
                  style={{ color: config.card_doctor_text || '#ffffff' }}
                >
                  👨‍⚕️ CONSULTÓRIO 01
                </span>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" style={{ color: config.card_doctor_text || '#ffffff' }} />
                  <span 
                    className="font-bold tracking-wide"
                    style={{ 
                      color: config.card_doctor_text || '#ffffff',
                      fontSize: config.card_size === 'small' ? '14px' : config.card_size === 'large' ? '20px' : '16px',
                      fontWeight: config.patient_font_weight || '800',
                      textTransform: (config.patient_text_transform as 'uppercase' | 'lowercase' | 'capitalize' | 'none') || 'uppercase',
                    }}
                  >
                    JOÃO SANTOS
                  </span>
                </div>
              </div>

              {/* Waiting Message */}
              {config.waiting_message_visible && (
                <div 
                  className="text-center py-2 text-white/90 font-medium"
                  style={{ 
                    fontSize: config.waiting_message_font_size === 'sm' ? '9px' : config.waiting_message_font_size === 'lg' ? '13px' : '11px',
                  }}
                >
                  ⏳ {config.waiting_messages?.[0] || 'Aguarde sua vez...'}
                </div>
              )}
            </ClickableWrapper>

            {/* Sidebar - Clickable */}
            {config.sidebar_visible && (
              <ClickableWrapper area="sidebar" tooltip="Clique para editar a barra lateral" className="shrink-0">
                <div 
                  className="rounded-xl p-3 flex flex-col h-full"
                  style={{ 
                    width: '120px',
                    background: config.sidebar_bg_color || 'rgba(0,0,0,0.4)',
                    borderWidth: '1px',
                    borderColor: config.sidebar_border_color || '#38bdf8',
                    borderStyle: 'solid',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-3" style={{ color: config.sidebar_border_color || '#38bdf8' }}>
                    <History className="w-3 h-3" />
                    <span className="text-[9px] font-bold tracking-wider">ÚLTIMAS</span>
                  </div>
                  <div className="flex-1 space-y-2 overflow-hidden">
                    {Array.from({ length: Math.min(config.sidebar_items_count || 4, 5) }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2 text-[8px] text-white/80">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 shrink-0" />
                        <span className="truncate">Paciente {i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ClickableWrapper>
            )}
          </div>

          {/* Ticker - Clickable */}
          {config.ticker_visible && (
            <ClickableWrapper area="ticker" tooltip="Clique para editar o ticker" className="shrink-0">
              <div 
                className="px-4 py-2 flex items-center gap-3"
                style={{ backgroundColor: config.ticker_bg_color || '#1e1e2e' }}
              >
                <div className="flex items-center gap-1.5" style={{ color: config.ticker_separator_color || '#ef4444' }}>
                  <Newspaper className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold">NOTÍCIAS</span>
                </div>
                <div className="h-3 w-px" style={{ backgroundColor: config.ticker_separator_color || '#ef4444' }} />
                <div 
                  className="text-[10px] flex-1 truncate"
                  style={{ color: config.ticker_text_color || '#ffffff' }}
                >
                  📰 G1: Últimas notícias do Brasil e do mundo • 🌤️ Previsão do tempo para hoje...
                </div>
              </div>
            </ClickableWrapper>
          )}
        </div>

        {/* Animation Indicator */}
        {config.background_animation && (
          <div className="absolute top-2 right-2 z-20">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" title="Animação ativa" />
          </div>
        )}
      </div>

      {/* TV Stand */}
      <div className="flex justify-center mt-1">
        <div className="w-16 h-2 bg-slate-700 rounded-b-lg" />
      </div>
      <div className="flex justify-center">
        <div className="w-24 h-1 bg-slate-600 rounded-b-lg" />
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
        <MousePointer className="w-3 h-3" />
        Clique em qualquer elemento para personalizá-lo
      </p>
    </div>
  );
}
