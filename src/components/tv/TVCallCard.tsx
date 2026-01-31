import { Activity, Stethoscope, Megaphone } from 'lucide-react';
import { useTVResolution } from '@/hooks/useTVResolution';

interface CallData {
  name: string;
  destination?: string;
}

interface TVCallCardProps {
  type: 'triage' | 'doctor';
  call: CallData | null;
  isAnnouncing: boolean;
  announcingType: 'triage' | 'doctor' | null;
  waitingPhrase: string;
  waitingPhraseVisible: boolean;
  formatPatientName: (name: string) => string;
}

export function TVCallCard({
  type,
  call,
  isAnnouncing,
  announcingType,
  waitingPhrase,
  waitingPhraseVisible,
  formatPatientName,
}: TVCallCardProps) {
  const { scale, tier } = useTVResolution();
  
  const isTriage = type === 'triage';
  const isThisCardAnnouncing = announcingType === type;
  const isOtherCardAnnouncing = announcingType !== null && announcingType !== type;
  
  const Icon = isTriage ? Activity : Stethoscope;
  const title = isTriage ? 'TRIAGEM' : 'CONSULTÓRIO';
  const defaultDestination = isTriage ? 'Triagem' : 'Consultório';
  
  // Colors based on type
  const iconGlow = isTriage ? 'rgba(99, 102, 241, 0.8)' : 'rgba(16, 185, 129, 0.8)';

  // Get font size based on name length - responsive with clamp
  const getNameFontSize = (name: string): string => {
    const length = name?.length || 0;
    if (length <= 15) return `clamp(2rem, ${5 * scale}vw, 4.5rem)`;
    if (length <= 25) return `clamp(1.75rem, ${4 * scale}vw, 3.75rem)`;
    if (length <= 35) return `clamp(1.5rem, ${3.5 * scale}vw, 3rem)`;
    if (length <= 45) return `clamp(1.25rem, ${3 * scale}vw, 2.5rem)`;
    return `clamp(1rem, ${2.5 * scale}vw, 2rem)`;
  };
  
  // Responsive destination font size
  const destinationSize = `clamp(1rem, ${2.5 * scale}vw, 2rem)`;
  
  // Responsive waiting phrase font size - smaller than before
  const waitingPhraseSize = `clamp(0.875rem, ${2 * scale}vw, 1.25rem)`;

  return (
    <div 
      className={`flex flex-col rounded-2xl transition-all duration-500 overflow-hidden ${
        isThisCardAnnouncing 
          ? 'scale-[1.02] z-20' 
          : isOtherCardAnnouncing
            ? 'opacity-30 scale-95'
            : ''
      } ${call ? 'animate-card-pop' : ''}`}
      style={{
        background: isTriage
          ? 'linear-gradient(160deg, rgba(30,27,75,0.95) 0%, rgba(49,46,129,0.85) 50%, rgba(30,27,75,0.95) 100%)'
          : 'linear-gradient(160deg, rgba(6,78,59,0.95) 0%, rgba(4,120,87,0.85) 50%, rgba(6,78,59,0.95) 100%)',
        minHeight: `${280 * scale}px`,
        border: isThisCardAnnouncing 
          ? '3px solid rgba(251,191,36,0.8)' 
          : isTriage
            ? '1px solid rgba(129,140,248,0.3)'
            : '1px solid rgba(52,211,153,0.3)',
        boxShadow: isThisCardAnnouncing 
          ? '0 0 40px rgba(251,191,36,0.4), 0 0 80px rgba(251,191,36,0.2)' 
          : isTriage
            ? '0 8px 32px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 8px 32px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <div 
        className="shrink-0 relative overflow-hidden"
        style={{ 
          padding: `${0.5 * scale}rem ${1 * scale}rem`,
          background: isThisCardAnnouncing 
            ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #f59e0b 100%)' 
            : isTriage 
              ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 30%, #818cf8 70%, #4f46e5 100%)' 
              : 'linear-gradient(135deg, #059669 0%, #10b981 30%, #34d399 70%, #059669 100%)',
          boxShadow: isThisCardAnnouncing
            ? '0 4px 20px rgba(245,158,11,0.4)'
            : isTriage
              ? '0 4px 20px rgba(99,102,241,0.3)'
              : '0 4px 20px rgba(16,185,129,0.3)',
        }}
      >
        {/* Shimmer overlay */}
        <div 
          className="absolute inset-0 animate-pulse"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
          }}
        />
        
        <div className="flex items-center gap-2 relative z-10">
          <Icon 
            className={`shrink-0 text-white ${isThisCardAnnouncing ? 'animate-pulse' : ''}`}
            style={{ 
              width: `${1.25 * scale}rem`, 
              height: `${1.25 * scale}rem`,
              filter: `drop-shadow(0 0 8px ${iconGlow})` 
            }} 
          />
          <span 
            className="text-white font-bold tracking-wide drop-shadow-md"
            style={{ fontSize: `clamp(0.875rem, ${1.25 * scale}vw, 1.25rem)` }}
          >
            {isThisCardAnnouncing ? '🔔 CHAMANDO!' : title}
          </span>
          {isThisCardAnnouncing && (
            <Megaphone 
              className="text-white animate-megaphone-shake ml-auto shrink-0 drop-shadow-lg" 
              style={{ width: `${1.25 * scale}rem`, height: `${1.25 * scale}rem` }} 
            />
          )}
        </div>
      </div>
      
      {/* Content */}
      <div 
        className="flex-1 flex items-center justify-center relative"
        style={{ padding: `${1 * scale}rem` }}
      >
        {/* Radial glow effect - enhanced intensity */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isThisCardAnnouncing 
              ? 'radial-gradient(ellipse 120% 80% at center top, rgba(251,191,36,0.35) 0%, rgba(251,191,36,0.15) 40%, transparent 70%)' 
              : isTriage
                ? 'radial-gradient(ellipse 120% 80% at center top, rgba(129,140,248,0.3) 0%, rgba(99,102,241,0.12) 40%, transparent 70%)'
                : 'radial-gradient(ellipse 120% 80% at center top, rgba(52,211,153,0.3) 0%, rgba(16,185,129,0.12) 40%, transparent 70%)',
          }}
        />
        
        {call ? (
          <div className={`text-center w-full transition-all duration-300 relative z-10 ${isThisCardAnnouncing ? 'scale-105' : ''}`}>
            {/* Patient Name */}
            <h2 
              className="tv-font-display break-words text-white font-extrabold leading-tight"
              style={{ 
                fontSize: getNameFontSize(call.name),
                wordBreak: 'break-word', 
                letterSpacing: '0.03em',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              {formatPatientName(call.name)}
            </h2>
            
            {/* Destination */}
            <p 
              className={`font-black uppercase tracking-widest mt-3 ${
                isThisCardAnnouncing 
                  ? 'text-yellow-200' 
                  : isTriage 
                    ? 'text-cyan-300' 
                    : 'text-emerald-300'
              }`}
              style={{
                fontSize: destinationSize,
                textShadow: '0 2px 6px rgba(0,0,0,0.6)',
              }}
            >
              {call.destination || defaultDestination}
            </p>
          </div>
        ) : (
          <div className="text-center px-4 max-w-[95%]">
            {/* Waiting icon */}
            <div 
              className={`mx-auto rounded-full flex items-center justify-center animate-pulse mb-3 ${
                isTriage 
                  ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10' 
                  : 'bg-gradient-to-br from-emerald-500/20 to-green-500/10'
              }`}
              style={{ width: `${4 * scale}rem`, height: `${4 * scale}rem` }}
            >
              <Icon 
                className={isTriage ? 'text-blue-400/60' : 'text-emerald-400/60'} 
                style={{ width: `${2 * scale}rem`, height: `${2 * scale}rem` }} 
              />
            </div>
            
            {/* Waiting phrase - smaller font */}
            <p 
              className={`text-white text-center font-bold transition-opacity duration-500 ${
                waitingPhraseVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ 
                fontSize: waitingPhraseSize,
                lineHeight: '1.4',
                textShadow: '0 2px 8px rgba(0,0,0,0.7)',
              }}
            >
              {waitingPhrase}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
