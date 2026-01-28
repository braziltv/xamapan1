import { Activity, Stethoscope, Megaphone } from 'lucide-react';

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
  const isTriage = type === 'triage';
  const isThisCardAnnouncing = announcingType === type;
  const isOtherCardAnnouncing = announcingType !== null && announcingType !== type;
  
  const Icon = isTriage ? Activity : Stethoscope;
  const title = isTriage ? 'TRIAGEM' : 'CONSULTÓRIO';
  const defaultDestination = isTriage ? 'Triagem' : 'Consultório';
  
  // Colors based on type
  const accentColor = isTriage ? 'indigo' : 'emerald';
  const iconGlow = isTriage ? 'rgba(99, 102, 241, 0.8)' : 'rgba(16, 185, 129, 0.8)';

  // Get font size based on name length - optimized for 1920x1080
  const getNameFontSize = (name: string): string => {
    const length = name?.length || 0;
    if (length <= 15) return '4.5rem';
    if (length <= 25) return '3.75rem';
    if (length <= 35) return '3rem';
    if (length <= 45) return '2.5rem';
    return '2rem';
  };

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
        minHeight: '320px',
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
        style={{ padding: '0.75rem 1.25rem' }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        
        <div className="flex items-center gap-3 relative z-10">
          <Icon 
            className={`shrink-0 text-white ${isThisCardAnnouncing ? 'animate-pulse' : ''}`}
            style={{ 
              width: '1.75rem', 
              height: '1.75rem',
              filter: `drop-shadow(0 0 8px ${iconGlow})` 
            }} 
          />
          <span 
            className="text-white font-bold tracking-wide drop-shadow-md"
            style={{ fontSize: '1.25rem' }}
          >
            {isThisCardAnnouncing ? '🔔 CHAMANDO!' : title}
          </span>
          {isThisCardAnnouncing && (
            <Megaphone 
              className="text-white animate-megaphone-shake ml-auto shrink-0 drop-shadow-lg" 
              style={{ width: '1.5rem', height: '1.5rem' }} 
            />
          )}
        </div>
      </div>
      
      {/* Content */}
      <div 
        className="flex-1 flex items-center justify-center relative"
        style={{ padding: '1.5rem' }}
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
              className={`font-black uppercase tracking-widest mt-4 ${
                isThisCardAnnouncing 
                  ? 'text-yellow-200' 
                  : isTriage 
                    ? 'text-cyan-300' 
                    : 'text-emerald-300'
              }`}
              style={{
                fontSize: '2rem',
                textShadow: '0 2px 6px rgba(0,0,0,0.6)',
              }}
            >
              {call.destination || defaultDestination}
            </p>
          </div>
        ) : (
          <div className="text-center px-4">
            {/* Waiting icon */}
            <div 
              className={`mx-auto rounded-full flex items-center justify-center animate-pulse mb-4 ${
                isTriage 
                  ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10' 
                  : 'bg-gradient-to-br from-emerald-500/20 to-green-500/10'
              }`}
              style={{ width: '5rem', height: '5rem' }}
            >
              <Icon 
                className={isTriage ? 'text-blue-400/60' : 'text-emerald-400/60'} 
                style={{ width: '2.5rem', height: '2.5rem' }} 
              />
            </div>
            
            {/* Waiting phrase */}
            <p 
              className={`text-white text-center font-black drop-shadow-lg transition-opacity duration-500 ${
                waitingPhraseVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ 
                fontSize: '2.25rem',
                lineHeight: '1.3',
                textShadow: '0 4px 12px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.2)',
                letterSpacing: '0.04em',
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
