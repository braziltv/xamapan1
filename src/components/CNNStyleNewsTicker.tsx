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
          <div className="flex items-stretch h-10 xs:h-12 sm:h-14 md:h-16 lg:h-20 xl:h-24 2xl:h-28 3xl:h-32 4k:h-40">
          {/* Scrolling News Section - Dark background like CNN */}
          <div className="flex-1 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 overflow-hidden flex items-center relative">
            {/* Top red accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] sm:h-[3px] lg:h-1 xl:h-1.5 3xl:h-2 4k:h-3 bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
            
            {/* Gradient fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-6 xs:w-8 sm:w-12 md:w-16 lg:w-20 xl:w-24 3xl:w-32 4k:w-40 bg-gradient-to-r from-gray-900 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-6 xs:w-8 sm:w-12 md:w-16 lg:w-20 xl:w-24 3xl:w-32 4k:w-40 bg-gradient-to-l from-gray-900 to-transparent z-10" />
            
            {/* Scrolling content */}
            <div className="animate-marquee whitespace-nowrap inline-flex py-1.5 sm:py-2 lg:py-3 4k:py-4">
              {items.map((item, index) => (
                <span key={index} className="mx-3 xs:mx-4 sm:mx-5 md:mx-6 lg:mx-8 xl:mx-10 3xl:mx-12 4k:mx-16 inline-flex items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 3xl:gap-8 4k:gap-10 font-semibold tracking-wide text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl 3xl:text-5xl 4k:text-6xl" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                  <span className={`px-2 xs:px-2.5 sm:px-3 md:px-4 lg:px-5 xl:px-6 3xl:px-8 4k:px-10 py-1 xs:py-1.5 sm:py-2 md:py-2.5 lg:py-3 xl:py-3.5 3xl:py-4 4k:py-5 rounded sm:rounded-md lg:rounded-lg text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl 4k:text-3xl font-bold inline-flex items-center gap-1.5 sm:gap-2 lg:gap-3 4k:gap-4 ${getSourceStyle(item.source)} ${item.source === '📢 Informativo' ? 'animate-pulse' : ''}`}>
                    {item.source === 'Créditos' ? '⭐' : item.source === '📢 Informativo' ? (
                      <>
                        <Megaphone className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 3xl:w-8 3xl:h-8 4k:w-10 4k:h-10 inline animate-bounce text-white" />
                        <span className="hidden xs:inline text-white">INFORMATIVO</span>
                      </>
                    ) : item.source}
                  </span>
                  <span className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                    item.source === '📢 Informativo' ? 'text-white font-bold' : 
                    item.source === 'Créditos' ? 'text-amber-300' : 
                    'text-white'
                  }`}>
                    {item.title}
                  </span>
                  <span className="text-red-500 mx-3 xs:mx-4 sm:mx-5 lg:mx-6 xl:mx-8 3xl:mx-10 4k:mx-12 text-sm sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 3xl:text-4xl 4k:text-5xl">▸</span>
                </span>
              ))}
              {/* Duplicate for seamless loop */}
              {items.map((item, index) => (
                <span key={`dup-${index}`} className="mx-3 xs:mx-4 sm:mx-5 md:mx-6 lg:mx-8 xl:mx-10 3xl:mx-12 4k:mx-16 inline-flex items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 3xl:gap-8 4k:gap-10 font-semibold tracking-wide text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl 3xl:text-5xl 4k:text-6xl" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                  <span className={`px-2 xs:px-2.5 sm:px-3 md:px-4 lg:px-5 xl:px-6 3xl:px-8 4k:px-10 py-1 xs:py-1.5 sm:py-2 md:py-2.5 lg:py-3 xl:py-3.5 3xl:py-4 4k:py-5 rounded sm:rounded-md lg:rounded-lg text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl 4k:text-3xl font-bold inline-flex items-center gap-1.5 sm:gap-2 lg:gap-3 4k:gap-4 ${getSourceStyle(item.source)} ${item.source === '📢 Informativo' ? 'animate-pulse' : ''}`}>
                    {item.source === 'Créditos' ? '⭐' : item.source === '📢 Informativo' ? (
                      <>
                        <Megaphone className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 3xl:w-8 3xl:h-8 4k:w-10 4k:h-10 inline animate-bounce text-white" />
                        <span className="hidden xs:inline text-white">INFORMATIVO</span>
                      </>
                    ) : item.source}
                  </span>
                  <span className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                    item.source === '📢 Informativo' ? 'text-white font-bold' : 
                    item.source === 'Créditos' ? 'text-amber-300' : 
                    'text-white'
                  }`}>
                    {item.title}
                  </span>
                  <span className="text-red-500 mx-3 xs:mx-4 sm:mx-5 lg:mx-6 xl:mx-8 3xl:mx-10 4k:mx-12 text-sm sm:text-lg md:text-xl lg:text-2xl xl:text-3xl 3xl:text-4xl 4k:text-5xl">▸</span>
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
