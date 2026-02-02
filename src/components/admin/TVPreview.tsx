import { TVCustomization, defaultCustomization } from '@/hooks/useTVCustomization';
import { Clock, User, History, Newspaper } from 'lucide-react';

interface TVPreviewProps {
  customization: Partial<TVCustomization> | null;
  className?: string;
}

export function TVPreview({ customization, className = '' }: TVPreviewProps) {
  const config = { ...defaultCustomization, ...customization };

  const getBackgroundStyle = () => {
    if (config.background_style === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${config.background_color} 0%, ${adjustColor(config.background_color || '#0a0a1a', 20)} 50%, ${config.background_color} 100%)`,
      };
    }
    return { backgroundColor: config.background_color || '#0a0a1a' };
  };

  const adjustColor = (color: string, amount: number) => {
    // Simple color adjustment for gradients
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + amount);
      const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + amount);
      const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + amount);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  };

  return (
    <div 
      className={`relative rounded-lg overflow-hidden border-2 border-muted ${className}`}
      style={{ aspectRatio: '16/9', ...getBackgroundStyle() }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: config.header_bg_color || 'rgba(0,0,0,0.3)' }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center"
            style={{ 
              width: config.header_logo_size === 'small' ? '1rem' : config.header_logo_size === 'large' ? '2rem' : '1.5rem',
              height: config.header_logo_size === 'small' ? '1rem' : config.header_logo_size === 'large' ? '2rem' : '1.5rem',
            }}
          >
            <span className="text-xs">🏥</span>
          </div>
          {config.header_title_visible && (
            <span 
              className="text-xs font-semibold"
              style={{ color: config.header_text_color || '#ffffff' }}
            >
              UNIDADE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1" style={{ color: config.clock_color || '#38bdf8' }}>
          <Clock className="w-3 h-3" />
          <span className="text-xs font-mono">12:00</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-2 flex gap-2" style={{ height: 'calc(100% - 4rem)' }}>
        {/* Cards Area */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Triage Card */}
          <div 
            className="flex-1 rounded-md p-2 flex flex-col items-center justify-center relative overflow-hidden"
            style={{ 
              background: config.card_triage_bg || 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              borderWidth: config.card_border_style === 'neon' ? '2px' : config.card_border_style === 'minimal' ? '1px' : '0',
              borderColor: config.card_border_color || '#38bdf8',
              borderStyle: 'solid',
              boxShadow: config.card_border_style === 'neon' ? `0 0 10px ${config.card_border_color || '#38bdf8'}40` : 'none',
            }}
          >
            <span 
              className="text-[8px] font-bold uppercase opacity-80"
              style={{ color: config.card_triage_text || '#ffffff' }}
            >
              Triagem
            </span>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" style={{ color: config.card_triage_text || '#ffffff' }} />
              <span 
                className="font-bold"
                style={{ 
                  color: config.card_triage_text || '#ffffff',
                  fontSize: config.card_size === 'small' ? '10px' : config.card_size === 'large' ? '14px' : '12px',
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
            className="flex-1 rounded-md p-2 flex flex-col items-center justify-center relative overflow-hidden"
            style={{ 
              background: config.card_doctor_bg || 'linear-gradient(135deg, #059669, #10b981)',
              borderWidth: config.card_border_style === 'neon' ? '2px' : config.card_border_style === 'minimal' ? '1px' : '0',
              borderColor: config.card_border_color || '#38bdf8',
              borderStyle: 'solid',
              boxShadow: config.card_border_style === 'neon' ? `0 0 10px ${config.card_border_color || '#38bdf8'}40` : 'none',
            }}
          >
            <span 
              className="text-[8px] font-bold uppercase opacity-80"
              style={{ color: config.card_doctor_text || '#ffffff' }}
            >
              Consultório 01
            </span>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" style={{ color: config.card_doctor_text || '#ffffff' }} />
              <span 
                className="font-bold"
                style={{ 
                  color: config.card_doctor_text || '#ffffff',
                  fontSize: config.card_size === 'small' ? '10px' : config.card_size === 'large' ? '14px' : '12px',
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
              className="text-center py-1 text-white/80"
              style={{ 
                fontSize: config.waiting_message_font_size === 'sm' ? '6px' : config.waiting_message_font_size === 'lg' ? '10px' : '8px',
              }}
            >
              {config.waiting_messages?.[0] || 'Aguarde sua vez...'}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {config.sidebar_visible && (
          <div 
            className="rounded-md p-2 flex flex-col"
            style={{ 
              width: '30%',
              backgroundColor: config.sidebar_bg_color || 'rgba(0,0,0,0.4)',
              borderWidth: '1px',
              borderColor: config.sidebar_border_color || '#38bdf8',
              borderStyle: 'solid',
            }}
          >
            <div className="flex items-center gap-1 mb-2" style={{ color: config.sidebar_border_color || '#38bdf8' }}>
              <History className="w-2 h-2" />
              <span className="text-[6px] font-semibold">Últimas</span>
            </div>
            <div className="flex-1 space-y-1">
              {Array.from({ length: Math.min(config.sidebar_items_count || 4, 4) }).map((_, i) => (
                <div key={i} className="flex items-center gap-1 text-[6px] text-white/70">
                  <div className="w-2 h-2 rounded-full bg-primary/30" />
                  <span>Paciente {i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ticker */}
      {config.ticker_visible && (
        <div 
          className="absolute bottom-0 left-0 right-0 px-2 py-1 flex items-center gap-2"
          style={{ backgroundColor: config.ticker_bg_color || '#1e1e2e' }}
        >
          <Newspaper className="w-2 h-2 shrink-0" style={{ color: config.ticker_separator_color || '#ef4444' }} />
          <div 
            className="text-[6px] truncate"
            style={{ color: config.ticker_text_color || '#ffffff' }}
          >
            Notícias e informativos passando aqui...
          </div>
        </div>
      )}

      {/* Animation Indicator */}
      {config.background_animation && (
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Animação ativa" />
        </div>
      )}
    </div>
  );
}
