import { Megaphone } from 'lucide-react';

interface NewsSourceBadgeProps {
  source: string;
  index: number;
}

// Modern badge configurations for each news source
const sourceConfigs: Record<string, { gradient: string; icon: string; glow: string }> = {
  '📢 Informativo': { 
    gradient: 'from-red-600 via-red-500 to-rose-500', 
    icon: '',
    glow: 'shadow-red-500/50'
  },
  'Créditos': { 
    gradient: 'from-amber-400 via-yellow-400 to-orange-400', 
    icon: '⭐',
    glow: 'shadow-amber-400/50'
  },
  'G1': { 
    gradient: 'from-red-600 via-red-500 to-rose-600', 
    icon: '🔴',
    glow: 'shadow-red-500/60'
  },
  'O Globo': { 
    gradient: 'from-blue-700 via-blue-600 to-indigo-600', 
    icon: '🌐',
    glow: 'shadow-blue-600/60'
  },
  'Itatiaia': { 
    gradient: 'from-yellow-400 via-amber-400 to-orange-400', 
    icon: '📻',
    glow: 'shadow-yellow-400/60'
  },
  'UOL': { 
    gradient: 'from-orange-500 via-orange-400 to-amber-500', 
    icon: '🟠',
    glow: 'shadow-orange-500/60'
  },
  'Folha': { 
    gradient: 'from-blue-600 via-sky-500 to-cyan-500', 
    icon: '📰',
    glow: 'shadow-blue-500/60'
  },
  'Estadão': { 
    gradient: 'from-slate-700 via-slate-600 to-zinc-600', 
    icon: '📄',
    glow: 'shadow-slate-600/60'
  },
  'CNN': { 
    gradient: 'from-red-700 via-red-600 to-rose-700', 
    icon: '📺',
    glow: 'shadow-red-600/60'
  },
  'Band': { 
    gradient: 'from-green-600 via-emerald-500 to-teal-500', 
    icon: '📡',
    glow: 'shadow-green-500/60'
  },
  'Terra': { 
    gradient: 'from-emerald-500 via-green-500 to-lime-500', 
    icon: '🌍',
    glow: 'shadow-emerald-500/60'
  },
  'IG': { 
    gradient: 'from-pink-500 via-rose-500 to-fuchsia-500', 
    icon: '💗',
    glow: 'shadow-pink-500/60'
  },
  'Correio': { 
    gradient: 'from-sky-600 via-cyan-500 to-teal-500', 
    icon: '✉️',
    glow: 'shadow-sky-500/60'
  },
  'Metrópoles': { 
    gradient: 'from-purple-600 via-violet-500 to-indigo-500', 
    icon: '🏙️',
    glow: 'shadow-purple-500/60'
  },
  'R7': { 
    gradient: 'from-green-600 via-green-500 to-emerald-500', 
    icon: '7️⃣',
    glow: 'shadow-green-500/60'
  },
  'Veja': { 
    gradient: 'from-red-500 via-rose-500 to-pink-500', 
    icon: '📕',
    glow: 'shadow-red-500/60'
  },
  'Exame': { 
    gradient: 'from-blue-800 via-blue-700 to-indigo-700', 
    icon: '📊',
    glow: 'shadow-blue-700/60'
  },
  'IstoÉ': { 
    gradient: 'from-amber-600 via-orange-500 to-red-500', 
    icon: '📰',
    glow: 'shadow-orange-500/60'
  },
};

const defaultConfig = { 
  gradient: 'from-gray-600 via-gray-500 to-slate-600', 
  icon: '📰',
  glow: 'shadow-gray-500/40'
};

export function NewsSourceBadge({ source, index }: NewsSourceBadgeProps) {
  const config = sourceConfigs[source] || defaultConfig;
  const isInformativo = source === '📢 Informativo';
  const isCreditos = source === 'Créditos';
  
  // Staggered animation delay based on index
  const animationDelay = `${(index % 10) * 0.1}s`;

  return (
    <span 
      className={`
        relative overflow-hidden
        px-2 xs:px-2.5 sm:px-3 md:px-4 lg:px-5 xl:px-6 
        py-1 xs:py-1.5 sm:py-2 md:py-2.5 
        rounded-lg sm:rounded-xl
        text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base 2xl:text-lg 3xl:text-xl 4k:text-2xl 
        font-bold inline-flex items-center gap-1.5 sm:gap-2
        bg-gradient-to-br ${config.gradient}
        ${isCreditos ? 'text-amber-950' : 'text-white'}
        shadow-lg ${config.glow}
        ring-1 ring-white/20
        animate-badge-pop
        hover:scale-105 hover:brightness-110
        transition-all duration-300
        ${isInformativo ? 'animate-pulse' : ''}
      `}
      style={{ animationDelay }}
    >
      {/* Shine effect overlay */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-badge-shine" />
      
      {isInformativo ? (
        <>
          <Megaphone className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-5 lg:h-5 xl:w-6 xl:h-6 inline animate-bounce" />
          <span className="hidden xs:inline font-extrabold tracking-wide">INFORMATIVO</span>
        </>
      ) : (
        <>
          <span className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg drop-shadow-sm">
            {config.icon}
          </span>
          <span className="font-extrabold tracking-tight drop-shadow-sm">{source}</span>
        </>
      )}
    </span>
  );
}

export function getSourceTextStyle(source: string): string {
  if (source === '📢 Informativo') return 'text-red-400 font-bold';
  if (source === 'Créditos') return 'text-amber-300';
  return 'text-white';
}
