import { Megaphone } from 'lucide-react';

interface NewsItem {
  title: string;
  link: string;
  source: string;
}

interface CommercialPhrase {
  id: string;
  phrase_content: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_active: boolean;
  display_order: number;
}

interface CNNStyleNewsTickerProps {
  newsItems: NewsItem[];
  commercialPhrases: CommercialPhrase[];
  currentTime: Date | null;
  isAnnouncing?: boolean;
}

export function CNNStyleNewsTicker({
  newsItems,
  commercialPhrases,
  currentTime,
  isAnnouncing = false,
}: CNNStyleNewsTickerProps) {
  if (newsItems.length === 0) return null;

  // Build items array with commercial phrases interleaved
  const buildItemsArray = () => {
    const creditItem = { 
      title: 'Solução Criada Por Kalebe Gomes',
      source: 'Créditos', 
      link: '' 
    };
    
    const commercialItems = commercialPhrases.map(phrase => ({
      title: phrase.phrase_content,
      source: '📢 Informativo',
      link: '',
      isCommercial: true,
    }));

    const itemsWithExtras: Array<typeof newsItems[0] & { isCommercial?: boolean }> = [];
    let commercialIndex = 0;

    newsItems.forEach((item, index) => {
      itemsWithExtras.push(item);
      
      if ((index + 1) % 5 === 0 && commercialIndex < commercialItems.length) {
        itemsWithExtras.push(commercialItems[commercialIndex]);
        commercialIndex++;
      }
      
      if ((index + 1) % 5 === 0) {
        itemsWithExtras.push(creditItem);
      }
    });
    
    while (commercialIndex < commercialItems.length) {
      itemsWithExtras.push(commercialItems[commercialIndex]);
      commercialIndex++;
    }

    return itemsWithExtras;
  };

  const items = buildItemsArray();

  // Get source-specific styling with unique colors and animations
  const getSourceStyle = (source: string): { badge: string; text: string; icon?: string } => {
    if (source === '📢 Informativo') return { 
      badge: 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white shadow-lg shadow-red-700/50 animate-pulse', 
      text: 'text-lime-400 font-bold',
    };
    if (source === 'Créditos') return { 
      badge: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 shadow-lg shadow-amber-500/50 animate-pulse', 
      text: 'text-white font-bold animate-pulse',
    };
    // Globo / G1 - Red with glow effect
    if (source === 'G1' || source === 'O Globo') return { 
      badge: 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white shadow-lg shadow-red-500/60 ring-1 ring-red-400/50', 
      text: 'text-red-100',
      icon: '🔴',
    };
    // UOL - Vibrant orange
    if (source === 'UOL') return { 
      badge: 'bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 text-white shadow-lg shadow-orange-500/60 ring-1 ring-orange-400/50', 
      text: 'text-orange-100',
      icon: '🟠',
    };
    // Folha - Blue professional
    if (source === 'Folha') return { 
      badge: 'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/60 ring-1 ring-blue-400/50', 
      text: 'text-blue-100',
      icon: '🔵',
    };
    // Estadão - Elegant dark
    if (source === 'Estadão') return { 
      badge: 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 text-white shadow-lg shadow-slate-500/60 ring-1 ring-slate-400/50', 
      text: 'text-slate-100',
      icon: '⚫',
    };
    // CNN - Breaking news red
    if (source === 'CNN') return { 
      badge: 'bg-gradient-to-r from-red-800 via-red-700 to-red-600 text-white shadow-lg shadow-red-600/60 ring-1 ring-red-500/50 animate-[pulse_2s_ease-in-out_infinite]', 
      text: 'text-red-100',
      icon: '📺',
    };
    // Band - Fresh green
    if (source === 'Band') return { 
      badge: 'bg-gradient-to-r from-green-700 via-green-600 to-emerald-500 text-white shadow-lg shadow-green-500/60 ring-1 ring-green-400/50', 
      text: 'text-green-100',
      icon: '🟢',
    };
    // Terra - Teal nature
    if (source === 'Terra') return { 
      badge: 'bg-gradient-to-r from-teal-600 via-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/60 ring-1 ring-emerald-400/50', 
      text: 'text-emerald-100',
      icon: '🌍',
    };
    // IG - Pink vibrant
    if (source === 'IG') return { 
      badge: 'bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 text-white shadow-lg shadow-pink-500/60 ring-1 ring-pink-400/50', 
      text: 'text-pink-100',
      icon: '💗',
    };
    // Itatiaia - Gold yellow
    if (source === 'Itatiaia') return { 
      badge: 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-400 text-yellow-950 shadow-lg shadow-yellow-500/60 ring-1 ring-yellow-400/50', 
      text: 'text-yellow-100',
      icon: '📻',
    };
    // Correio - Sky blue
    if (source === 'Correio') return { 
      badge: 'bg-gradient-to-r from-sky-600 via-cyan-500 to-sky-500 text-white shadow-lg shadow-sky-500/60 ring-1 ring-sky-400/50', 
      text: 'text-sky-100',
      icon: '📰',
    };
    // Metrópoles - Purple modern
    if (source === 'Metrópoles') return { 
      badge: 'bg-gradient-to-r from-purple-700 via-violet-600 to-purple-500 text-white shadow-lg shadow-purple-500/60 ring-1 ring-purple-400/50', 
      text: 'text-purple-100',
      icon: '🟣',
    };
    // Google News - Multi-color
    if (source === 'Google' || source === 'Google News') return { 
      badge: 'bg-gradient-to-r from-blue-500 via-red-500 via-yellow-400 to-green-500 text-white shadow-lg shadow-blue-500/40 ring-1 ring-white/30', 
      text: 'text-blue-100',
      icon: '🔍',
    };
    // Default
    return { 
      badge: 'bg-gradient-to-r from-gray-700 via-gray-600 to-gray-500 text-white shadow-lg shadow-gray-500/40', 
      text: 'text-gray-100',
    };
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 shrink-0 transition-opacity duration-300 ${isAnnouncing ? 'opacity-30' : 'opacity-100'}`}>
      {/* CNN-style two-row footer */}
      <div className="flex flex-col">
        {/* Bottom ticker row - scrolling news */}
        <div className="flex items-stretch h-8 xs:h-10 sm:h-12 md:h-14 lg:h-16 xl:h-[4.5rem] 2xl:h-20 3xl:h-24">
          {/* Scrolling News Section - Dark background like CNN */}
          <div className="flex-1 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 overflow-hidden flex items-center relative">
            {/* Top red accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] sm:h-[3px] lg:h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
            
            {/* Gradient fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-4 xs:w-6 sm:w-8 md:w-12 lg:w-16 xl:w-20 bg-gradient-to-r from-gray-900 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-4 xs:w-6 sm:w-8 md:w-12 lg:w-16 xl:w-20 bg-gradient-to-l from-gray-900 to-transparent z-10" />
            
            {/* Scrolling content - GPU accelerated */}
            <div className="animate-marquee whitespace-nowrap inline-flex py-1 will-change-transform" style={{ transform: 'translateZ(0)' }}>
              {[...items, ...items].map((item, index) => {
                const style = getSourceStyle(item.source);
                return (
                  <span key={index} className="mx-3 sm:mx-4 lg:mx-6 xl:mx-8 inline-flex items-center gap-1.5 sm:gap-2 lg:gap-3 font-semibold tracking-wide text-xs sm:text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl group" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                    {/* Source Badge with unique styling */}
                    <span className={`px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] lg:text-xs xl:text-sm 2xl:text-base font-bold inline-flex items-center gap-1.5 shrink-0 transition-transform duration-300 hover:scale-105 ${style.badge}`}>
                      {item.source === 'Créditos' ? (
                        <>
                          <span className="animate-spin-slow">⭐</span>
                          <span className="hidden sm:inline">CRÉDITOS</span>
                        </>
                      ) : item.source === '📢 Informativo' ? (
                        <>
                          <Megaphone className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 inline animate-bounce" />
                          <span className="hidden sm:inline">INFORMATIVO</span>
                        </>
                      ) : (
                        <>
                          {style.icon && <span className="text-[10px] sm:text-xs lg:text-sm">{style.icon}</span>}
                          <span>{item.source}</span>
                        </>
                      )}
                    </span>
                    {/* News title with source-specific color */}
                    <span className={`transition-colors duration-300 ${style.text}`}>
                      {item.title}
                    </span>
                    {/* Separator arrow */}
                    <span className="text-red-500 mx-2 sm:mx-3 text-sm sm:text-base lg:text-lg xl:text-xl shrink-0 animate-pulse">▸</span>
                  </span>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
