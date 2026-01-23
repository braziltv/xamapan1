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
  // Portais principais
  'G1': { 
    gradient: 'from-red-600 via-red-500 to-rose-600', 
    icon: '🔴',
    glow: 'shadow-red-500/60'
  },
  'GE': { 
    gradient: 'from-green-600 via-green-500 to-emerald-500', 
    icon: '⚽',
    glow: 'shadow-green-500/60'
  },
  'ESPN': { 
    gradient: 'from-red-700 via-red-600 to-rose-600', 
    icon: '🏀',
    glow: 'shadow-red-600/60'
  },
  'Folha': { 
    gradient: 'from-blue-600 via-sky-500 to-cyan-500', 
    icon: '📰',
    glow: 'shadow-blue-500/60'
  },
  'Google': { 
    gradient: 'from-blue-500 via-red-500 to-yellow-500', 
    icon: '🔍',
    glow: 'shadow-blue-500/60'
  },
  'CNN': { 
    gradient: 'from-red-700 via-red-600 to-rose-700', 
    icon: '📺',
    glow: 'shadow-red-600/60'
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
  'Exame': { 
    gradient: 'from-blue-800 via-blue-700 to-indigo-700', 
    icon: '📊',
    glow: 'shadow-blue-700/60'
  },
  // Tecnologia
  'Olhar Digital': { 
    gradient: 'from-cyan-600 via-blue-500 to-indigo-500', 
    icon: '👁️',
    glow: 'shadow-cyan-500/60'
  },
  'Canaltech': { 
    gradient: 'from-orange-600 via-orange-500 to-amber-500', 
    icon: '💻',
    glow: 'shadow-orange-500/60'
  },
  'Tecnoblog': { 
    gradient: 'from-teal-600 via-cyan-500 to-blue-500', 
    icon: '🔧',
    glow: 'shadow-teal-500/60'
  },
  'TechTudo': { 
    gradient: 'from-blue-600 via-blue-500 to-cyan-500', 
    icon: '⚙️',
    glow: 'shadow-blue-500/60'
  },
  // Economia
  'InfoMoney': { 
    gradient: 'from-green-700 via-emerald-600 to-teal-600', 
    icon: '💰',
    glow: 'shadow-green-600/60'
  },
  'Valor': { 
    gradient: 'from-amber-700 via-orange-600 to-yellow-600', 
    icon: '📈',
    glow: 'shadow-amber-600/60'
  },
  // Saúde
  'iG Saúde': { 
    gradient: 'from-pink-600 via-rose-500 to-red-500', 
    icon: '🏥',
    glow: 'shadow-pink-500/60'
  },
  'VivaBem': { 
    gradient: 'from-lime-600 via-green-500 to-emerald-500', 
    icon: '💚',
    glow: 'shadow-lime-500/60'
  },
  // Outros
  'Notícias ao Minuto': { 
    gradient: 'from-red-600 via-rose-500 to-pink-500', 
    icon: '⏱️',
    glow: 'shadow-red-500/60'
  },
  'ONU News': { 
    gradient: 'from-sky-600 via-blue-500 to-indigo-500', 
    icon: '🌍',
    glow: 'shadow-sky-500/60'
  },
  'Agência Brasil': { 
    gradient: 'from-green-600 via-yellow-500 to-blue-500', 
    icon: '🇧🇷',
    glow: 'shadow-green-500/60'
  },
  'Inovação Tec': { 
    gradient: 'from-violet-600 via-purple-500 to-fuchsia-500', 
    icon: '🚀',
    glow: 'shadow-violet-500/60'
  },
  'Intercept': { 
    gradient: 'from-slate-700 via-gray-600 to-zinc-600', 
    icon: '🔎',
    glow: 'shadow-slate-600/60'
  },
  'Opera Mundi': { 
    gradient: 'from-indigo-600 via-blue-500 to-sky-500', 
    icon: '🌐',
    glow: 'shadow-indigo-500/60'
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
        group
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
        hover:scale-110 hover:brightness-125 hover:shadow-2xl hover:ring-2 hover:ring-white/40
        hover:-translate-y-0.5 hover:rotate-1
        active:scale-105 active:brightness-110
        transition-all duration-300 ease-out
        cursor-pointer
        ${isInformativo ? 'animate-pulse' : ''}
      `}
      style={{ animationDelay }}
    >
      {/* Ambient glow on hover */}
      <span className={`
        absolute -inset-1 rounded-xl opacity-0 blur-md
        bg-gradient-to-br ${config.gradient}
        group-hover:opacity-60
        transition-opacity duration-300
      `} />
      
      {/* Continuous shine effect */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-news-shine rounded-lg" />
      
      {/* Hover shine sweep */}
      <span className="
        absolute inset-0 
        bg-gradient-to-r from-transparent via-white/40 to-transparent 
        -translate-x-full
        group-hover:translate-x-full
        transition-transform duration-700 ease-out
        rounded-lg
      " />
      
        {isInformativo ? (
          <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
            <Megaphone className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-5 lg:h-5 xl:w-6 xl:h-6 inline animate-bounce group-hover:animate-none group-hover:scale-110 transition-transform" />
            <span className="hidden xs:inline font-extrabold tracking-wide">INFORMATIVO</span>
          </span>
        ) : (
          <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg drop-shadow-sm group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300">
              {config.icon}
            </span>
            <span className="font-extrabold tracking-tight drop-shadow-sm group-hover:tracking-normal transition-all duration-300">{source}</span>
          </span>
        )}
      </span>
  );
}

export function getSourceTextStyle(source: string): string {
  if (source === '📢 Informativo') return 'text-red-400 font-bold';
  if (source === 'Créditos') return 'text-amber-300';
  return 'text-white';
}
