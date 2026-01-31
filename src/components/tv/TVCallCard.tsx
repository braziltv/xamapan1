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
          ? 'ring-4 ring-yellow-400 shadow-2xl shadow-yellow-500/30 scale-[1.02] z-20' 
          : isOtherCardAnnouncing
            ? 'opacity-30 scale-95'
            : 'border border-slate-700/50'
      } ${call ? 'animate-card-pop' : ''}`}
      style={{
        background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 100%)',
        minHeight: `${280 * scale}px`,
      }}
    >
      {/* Header */}
      <div 
        className={`shrink-0 relative overflow-hidden ${
          isThisCardAnnouncing 
            ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500' 
            : isTriage 
              ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600' 
              : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600'
        }`}
        style={{ padding: `${0.5 * scale}rem ${1 * scale}rem` }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        
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
        {/* Subtle inner glow */}
        <div className={`absolute inset-0 pointer-events-none ${
          isThisCardAnnouncing 
            ? 'bg-gradient-to-b from-yellow-500/15 to-transparent' 
            : isTriage
              ? 'bg-gradient-to-b from-indigo-500/5 to-transparent'
              : 'bg-gradient-to-b from-emerald-500/5 to-transparent'
        }`} />
        
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
