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
    if (source === 'Créditos') return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950';
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
        <div className="flex items-stretch h-8 xs:h-10 sm:h-12 md:h-14 lg:h-16 xl:h-18 2xl:h-20 3xl:h-24">
          {/* Scrolling News Section - Dark background like CNN */}
          <div className="flex-1 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 overflow-hidden flex items-center relative">
            {/* Top red accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] sm:h-[3px] lg:h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
            
            {/* Gradient fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-4 xs:w-6 sm:w-8 md:w-12 lg:w-16 xl:w-20 bg-gradient-to-r from-gray-900 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-4 xs:w-6 sm:w-8 md:w-12 lg:w-16 xl:w-20 bg-gradient-to-l from-gray-900 to-transparent z-10" />
            
            {/* Scrolling content */}
            <div className="animate-marquee whitespace-nowrap inline-flex py-1">
              {items.map((item, index) => (
                <span key={index} className="mx-2 xs:mx-3 sm:mx-4 md:mx-5 lg:mx-6 xl:mx-8 inline-flex items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 font-semibold tracking-wide text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                  <span className={`px-1.5 xs:px-2 sm:px-2.5 md:px-3 lg:px-4 xl:px-5 py-0.5 xs:py-1 sm:py-1.5 md:py-2 rounded-sm sm:rounded text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base 2xl:text-lg 3xl:text-xl font-bold inline-flex items-center gap-1 ${getSourceStyle(item.source)} ${item.source === '📢 Informativo' ? 'animate-pulse' : ''}`}>
                    {item.source === 'Créditos' ? '⭐' : item.source === '📢 Informativo' ? (
                      <>
                        <Megaphone className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-5 lg:h-5 xl:w-6 xl:h-6 inline animate-bounce" />
                        <span className="hidden xs:inline">INFORMATIVO</span>
                      </>
                    ) : item.source}
                  </span>
                  <span className={`drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
                    item.source === '📢 Informativo' ? 'text-red-400 font-bold' : 
                    item.source === 'Créditos' ? 'text-amber-300' : 
                    'text-white'
                  }`}>
                    {item.title}
                  </span>
                  <span className="text-red-500 mx-2 xs:mx-3 sm:mx-4 text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl">▸</span>
                </span>
              ))}
              {/* Duplicate for seamless loop */}
              {items.map((item, index) => (
                <span key={`dup-${index}`} className="mx-2 xs:mx-3 sm:mx-4 md:mx-5 lg:mx-6 xl:mx-8 inline-flex items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 font-semibold tracking-wide text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                  <span className={`px-1.5 xs:px-2 sm:px-2.5 md:px-3 lg:px-4 xl:px-5 py-0.5 xs:py-1 sm:py-1.5 md:py-2 rounded-sm sm:rounded text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base 2xl:text-lg 3xl:text-xl font-bold inline-flex items-center gap-1 ${getSourceStyle(item.source)} ${item.source === '📢 Informativo' ? 'animate-pulse' : ''}`}>
                    {item.source === 'Créditos' ? '⭐' : item.source === '📢 Informativo' ? (
                      <>
                        <Megaphone className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-5 lg:h-5 xl:w-6 xl:h-6 inline animate-bounce" />
                        <span className="hidden xs:inline">INFORMATIVO</span>
                      </>
                    ) : item.source}
                  </span>
                  <span className={`drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
                    item.source === '📢 Informativo' ? 'text-red-400 font-bold' : 
                    item.source === 'Créditos' ? 'text-amber-300' : 
                    'text-white'
                  }`}>
                    {item.title}
                  </span>
                  <span className="text-red-500 mx-2 xs:mx-3 sm:mx-4 text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl">▸</span>
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
