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

  const getSourceStyle = (source: string) => {
    if (source === '📢 Informativo') return 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-red-700/50';
    if (source === 'Créditos') return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 animate-pulse';
    if (source === 'G1') return 'bg-red-600 text-white';
    if (source === 'O Globo') return 'bg-blue-700 text-white';
    if (source === 'Itatiaia') return 'bg-yellow-500 text-yellow-950';
    if (source === 'UOL') return 'bg-orange-600 text-white';
    if (source === 'Folha') return 'bg-blue-600 text-white';
    if (source === 'Estadão') return 'bg-slate-700 text-white';
    if (source === 'CNN') return 'bg-red-700 text-white';
    if (source === 'Band') return 'bg-green-700 text-white';
    if (source === 'Terra') return 'bg-emerald-600 text-white';
    if (source === 'IG') return 'bg-pink-600 text-white';
    if (source === 'Correio') return 'bg-sky-700 text-white';
    if (source === 'Metrópoles') return 'bg-purple-700 text-white';
    return 'bg-gray-600 text-white';
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
              {[...items, ...items].map((item, index) => (
                <span key={index} className="mx-3 sm:mx-4 lg:mx-6 xl:mx-8 inline-flex items-center gap-1.5 sm:gap-2 lg:gap-3 font-semibold tracking-wide text-xs sm:text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                  <span className={`px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 rounded text-[9px] sm:text-[10px] lg:text-xs xl:text-sm 2xl:text-base font-bold inline-flex items-center gap-1 shrink-0 ${getSourceStyle(item.source)}`}>
                    {item.source === 'Créditos' ? '⭐' : item.source === '📢 Informativo' ? (
                      <>
                        <Megaphone className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 inline" />
                        <span className="hidden sm:inline">INFORMATIVO</span>
                      </>
                    ) : item.source}
                  </span>
                  <span className={`${
                    item.source === '📢 Informativo' ? 'text-red-400 font-bold' : 
                    item.source === 'Créditos' ? 'text-white font-bold animate-pulse' : 
                    'text-white'
                  }`}>
                    {item.title}
                  </span>
                  <span className="text-red-500 mx-2 sm:mx-3 text-sm sm:text-base lg:text-lg xl:text-xl shrink-0">▸</span>
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
