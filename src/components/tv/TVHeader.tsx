import { HealthCrossIcon } from '../HealthCrossIcon';
import { WeatherWidget } from '../WeatherWidget';
import { useTVResolution } from '@/hooks/useTVResolution';

interface TVHeaderProps {
  unitName: string;
  currentTime: Date | null;
  formatTime: (date: Date, format: string) => string;
  isAnnouncing: boolean;
}

export function TVHeader({ unitName, currentTime, formatTime, isAnnouncing }: TVHeaderProps) {
  const { scale, tier } = useTVResolution();
  
  // Dynamic sizing based on resolution
  const logoSize = Math.max(28, Math.round(40 * scale));
  const titleSize = `clamp(0.875rem, ${1.5 * scale}vw, 1.25rem)`;
  const unitNameSize = `clamp(0.75rem, ${1.4 * scale}vw, 1.125rem)`;
  const creditSize = `clamp(0.5rem, ${0.8 * scale}vw, 0.7rem)`;
  
  // Process unit name - abbreviate and split for better display
  const processedUnitName = (unitName || 'Unidade de Saúde').replace(/Pronto Atendimento/gi, 'P.A');
  
  return (
    <header 
      className={`relative z-10 shrink-0 transition-opacity duration-300 ${isAnnouncing ? 'opacity-30' : 'opacity-100'}`}
      style={{ padding: `${0.35 * scale}rem ${0.75 * scale}rem` }}
    >
      <div 
        className="relative overflow-hidden bg-gradient-to-r from-slate-900/95 via-indigo-950/95 to-slate-900/95 border border-indigo-500/40 rounded-xl"
        style={{
          padding: `${0.4 * scale}rem ${0.75 * scale}rem`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-t-xl" />
        
        {/* Main layout: 3 columns - Logo/Title | Unit Name | Weather */}
        <div className="flex items-center gap-2 lg:gap-3 relative z-10">
          
          {/* Left: Logo + Title + Credits (compact) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Logo */}
            <div 
              className="relative shrink-0 bg-white rounded-lg shadow-lg flex items-center justify-center" 
              style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
            >
              <HealthCrossIcon size={Math.round(logoSize * 0.7)} className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            
            {/* Title only */}
            <div className="flex flex-col justify-center">
              <h1 
                className="tv-font-heading font-black text-white leading-none whitespace-nowrap tracking-tight"
                style={{ 
                  fontSize: titleSize,
                  textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(6,182,212,0.3)',
                }}
              >
                Painel de Chamadas
              </h1>
            </div>
          </div>
          
          {/* Separator */}
          <div 
            className="w-0.5 bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent shrink-0 hidden sm:block" 
            style={{ height: `${2.5 * scale}rem` }} 
          />
          
          {/* Center: Unit Name + Credits - takes available space */}
          <div className="flex-1 flex flex-col justify-center min-w-0 px-2">
            <p 
              className="tv-font-body text-amber-400 font-black text-left leading-tight"
              style={{ 
                fontSize: unitNameSize,
                textShadow: '0 2px 4px rgba(0,0,0,0.7), 0 0 10px rgba(251,191,36,0.3)',
                wordBreak: 'break-word',
                hyphens: 'auto',
                maxWidth: '100%',
              }}
            >
              {processedUnitName}
            </p>
            <p 
              className="tv-font-body leading-tight font-bold text-left text-yellow-300"
              style={{ 
                fontSize: creditSize,
                marginTop: '0.15rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 0 8px rgba(253,224,71,0.3)',
              }}
            >
              ✨ Solução criada por Kalebe Gomes
            </p>
          </div>
          
          {/* Separator */}
          <div 
            className="w-0.5 bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent shrink-0 hidden sm:block" 
            style={{ height: `${2.5 * scale}rem` }} 
          />
          
          {/* Right: Weather Widget */}
          <div className="flex items-center justify-end overflow-visible shrink-0">
            <WeatherWidget currentTime={currentTime} formatTime={formatTime} />
          </div>
        </div>
      </div>
    </header>
  );
}
