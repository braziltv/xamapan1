import { Megaphone } from 'lucide-react';
import { NewsSourceBadge, getSourceTextStyle } from './NewsSourceBadge';

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

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 shrink-0 transition-opacity duration-300 ${isAnnouncing ? 'opacity-30' : 'opacity-100'}`}>
      {/* CNN-style ticker footer */}
      <div className="flex flex-col">
        {/* Bottom ticker row - scrolling news */}
        <div className="flex items-stretch h-8 xs:h-10 sm:h-12 md:h-14 lg:h-16 xl:h-18 2xl:h-20 3xl:h-24 4k:h-28">
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
                <span 
                  key={index} 
                  className="mx-2 xs:mx-3 sm:mx-4 md:mx-5 lg:mx-6 xl:mx-8 inline-flex items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 font-semibold tracking-wide text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl 4k:text-4xl" 
                  style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}
                >
                  <NewsSourceBadge source={item.source} index={index} />
                  <span className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${getSourceTextStyle(item.source)}`}>
                    {item.title}
                  </span>
                  <span className="text-red-500 mx-2 xs:mx-3 sm:mx-4 text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl">▸</span>
                </span>
              ))}
              {/* Duplicate for seamless loop */}
              {items.map((item, index) => (
                <span 
                  key={`dup-${index}`} 
                  className="mx-2 xs:mx-3 sm:mx-4 md:mx-5 lg:mx-6 xl:mx-8 inline-flex items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 font-semibold tracking-wide text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl 4k:text-4xl" 
                  style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}
                >
                  <NewsSourceBadge source={item.source} index={index + items.length} />
                  <span className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${getSourceTextStyle(item.source)}`}>
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
