import { HealthCrossIcon } from '../HealthCrossIcon';
import { WeatherWidget } from '../WeatherWidget';

interface TVHeaderProps {
  unitName: string;
  currentTime: Date | null;
  formatTime: (date: Date, format: string) => string;
  isAnnouncing: boolean;
}

export function TVHeader({ unitName, currentTime, formatTime, isAnnouncing }: TVHeaderProps) {
  return (
    <header 
      className={`relative z-10 shrink-0 transition-opacity duration-300 ${isAnnouncing ? 'opacity-30' : 'opacity-100'}`}
      style={{ padding: '0.75rem 1.5rem' }}
    >
      <div 
        className="relative overflow-hidden bg-gradient-to-r from-slate-900/95 via-indigo-950/95 to-slate-900/95 border border-indigo-500/40 rounded-xl"
        style={{
          padding: '0.75rem 1.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-t-xl" />
        
        <div className="flex items-center justify-between gap-4 relative z-10">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Logo */}
            <div 
              className="relative shrink-0 bg-white rounded-lg shadow-lg flex items-center justify-center" 
              style={{ width: '3.5rem', height: '3.5rem' }}
            >
              <HealthCrossIcon size={32} className="w-8 h-8" />
            </div>
            
            {/* Text */}
            <div className="flex flex-col justify-center">
              <h1 
                className="tv-font-heading font-black text-white leading-none whitespace-nowrap tracking-tight"
                style={{ 
                  fontSize: '1.75rem',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(6,182,212,0.3)',
                }}
              >
                Painel de Chamadas
              </h1>
              <p 
                className="tv-font-body text-amber-400 leading-tight font-black truncate max-w-[400px]" 
                title={unitName || 'Unidade de Saúde'}
                style={{ 
                  fontSize: '1.25rem',
                  textShadow: '0 2px 4px rgba(0,0,0,0.7), 0 0 10px rgba(251,191,36,0.3)',
                  marginTop: '0.25rem',
                }}
              >
                {(unitName || 'Unidade de Saúde').replace(/Pronto Atendimento/gi, 'P.A')}
              </p>
              <p 
                className="tv-font-body leading-tight font-bold whitespace-nowrap text-yellow-300"
                style={{ 
                  fontSize: '0.875rem',
                  marginTop: '0.125rem',
                  textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 0 8px rgba(253,224,71,0.3)',
                }}
              >
                ✨ Solução criada por Kalebe Gomes
              </p>
            </div>
          </div>
          
          {/* Separator */}
          <div 
            className="w-0.5 bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent shrink-0" 
            style={{ height: '4rem' }} 
          />
          
          {/* Right: Weather Widget */}
          <div className="flex-1 flex items-center justify-end overflow-hidden">
            <WeatherWidget currentTime={currentTime} formatTime={formatTime} />
          </div>
        </div>
      </div>
    </header>
  );
}
