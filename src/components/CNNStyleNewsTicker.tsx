// Lightweight CNN-style news ticker optimized for TV hardware

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

  // Get source-specific styling - lightweight, no shadows/rings/animate-pulse for GPU performance
  const getSourceStyle = (source: string): { badge: string; text: string } => {
    if (source === '📢 Informativo') return { 
      badge: 'bg-red-700 text-white', 
      text: 'text-lime-400 font-bold',
    };
    if (source === 'Créditos') return { 
      badge: 'bg-amber-500 text-amber-950', 
      text: 'text-white font-bold',
    };
    if (source === 'G1' || source === 'O Globo') return { badge: 'bg-red-600 text-white', text: 'text-red-100' };
    if (source === 'UOL') return { badge: 'bg-orange-600 text-white', text: 'text-orange-100' };
    if (source === 'Folha') return { badge: 'bg-blue-700 text-white', text: 'text-blue-100' };
    if (source === 'Estadão') return { badge: 'bg-slate-700 text-white', text: 'text-slate-100' };
    if (source === 'CNN') return { badge: 'bg-red-800 text-white', text: 'text-red-100' };
    if (source === 'Band') return { badge: 'bg-green-700 text-white', text: 'text-green-100' };
    if (source === 'Terra') return { badge: 'bg-teal-600 text-white', text: 'text-emerald-100' };
    if (source === 'IG') return { badge: 'bg-pink-600 text-white', text: 'text-pink-100' };
    if (source === 'Itatiaia') return { badge: 'bg-yellow-500 text-yellow-950', text: 'text-yellow-100' };
    if (source === 'Correio') return { badge: 'bg-sky-600 text-white', text: 'text-sky-100' };
    if (source === 'Metrópoles') return { badge: 'bg-purple-700 text-white', text: 'text-purple-100' };
    if (source === 'Google' || source === 'Google News') return { badge: 'bg-blue-600 text-white', text: 'text-blue-100' };
    return { badge: 'bg-gray-700 text-white', text: 'text-gray-100' };
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 shrink-0 transition-opacity duration-300 ${isAnnouncing ? 'opacity-30' : 'opacity-100'}`}>
      <div className="bg-gray-900 overflow-hidden h-10 sm:h-12 lg:h-16 xl:h-20 2xl:h-24 flex items-center relative">
        {/* Top red line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-600" />

        {/* Scrolling content */}
        <div className="animate-marquee whitespace-nowrap inline-flex">
          {[...items, ...items].map((item, index) => {
            const style = getSourceStyle(item.source);
            return (
              <span key={index} className="mx-4 lg:mx-6 inline-flex items-center gap-2 lg:gap-3 font-semibold text-xs sm:text-sm lg:text-base xl:text-lg 2xl:text-xl" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                <span className={`px-2 lg:px-3 py-0.5 lg:py-1 rounded text-[9px] lg:text-xs xl:text-sm font-bold shrink-0 ${style.badge}`}>
                  {item.source === 'Créditos' ? 'CRÉDITOS' : item.source === '📢 Informativo' ? 'INFORMATIVO' : item.source}
                </span>
                <span className={style.text}>{item.title}</span>
                <span className="mx-2 lg:mx-4 shrink-0 text-red-600 font-bold">▶</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
