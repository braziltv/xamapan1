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

// Limite máximo de manchetes no DOM para economizar GPU/memória em TVs antigas
const MAX_NEWS_ITEMS = 25;

export function CNNStyleNewsTicker({
  newsItems,
  commercialPhrases,
  currentTime,
  isAnnouncing = false,
}: CNNStyleNewsTickerProps) {
  if (newsItems.length === 0) return null;

  // Limita o número de manchetes processadas (otimização de performance)
  const limitedNews = newsItems.slice(0, MAX_NEWS_ITEMS);

  // Build items array with commercial phrases interleaved
  const buildItemsArray = () => {
    const creditItem = {
      title: 'Solução Criada Por Kalebe Gomes',
      source: 'Créditos',
      link: '',
    };

    const commercialItems = commercialPhrases.map(phrase => ({
      title: phrase.phrase_content,
      source: '📢 Informativo',
      link: '',
      isCommercial: true,
    }));

    const itemsWithExtras: Array<typeof limitedNews[0] & { isCommercial?: boolean }> = [];
    let commercialIndex = 0;

    limitedNews.forEach((item, index) => {
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

  // Estilo simplificado por fonte - sem animações contínuas (economia de GPU)
  const getSourceStyle = (source: string): { badge: string; text: string } => {
    if (source === '📢 Informativo') return {
      badge: 'bg-red-700 text-white',
      text: 'text-lime-400 font-bold',
    };
    if (source === 'Créditos') return {
      badge: 'bg-amber-500 text-amber-950',
      text: 'text-white font-bold',
    };
    if (source === 'G1' || source === 'O Globo') return {
      badge: 'bg-red-600 text-white',
      text: 'text-red-100',
    };
    if (source === 'UOL') return {
      badge: 'bg-orange-600 text-white',
      text: 'text-orange-100',
    };
    if (source === 'Folha') return {
      badge: 'bg-blue-700 text-white',
      text: 'text-blue-100',
    };
    if (source === 'Estadão') return {
      badge: 'bg-slate-700 text-white',
      text: 'text-slate-100',
    };
    if (source === 'CNN') return {
      badge: 'bg-red-800 text-white',
      text: 'text-red-100',
    };
    if (source === 'Band') return {
      badge: 'bg-green-700 text-white',
      text: 'text-green-100',
    };
    if (source === 'Terra') return {
      badge: 'bg-teal-600 text-white',
      text: 'text-emerald-100',
    };
    if (source === 'IG') return {
      badge: 'bg-pink-600 text-white',
      text: 'text-pink-100',
    };
    if (source === 'Itatiaia') return {
      badge: 'bg-yellow-500 text-yellow-950',
      text: 'text-yellow-100',
    };
    if (source === 'Correio') return {
      badge: 'bg-sky-600 text-white',
      text: 'text-sky-100',
    };
    if (source === 'Metrópoles') return {
      badge: 'bg-purple-700 text-white',
      text: 'text-purple-100',
    };
    if (source === 'Google' || source === 'Google News') return {
      badge: 'bg-blue-600 text-white',
      text: 'text-blue-100',
    };
    return {
      badge: 'bg-gray-700 text-white',
      text: 'text-gray-100',
    };
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 shrink-0 transition-opacity duration-300 ${isAnnouncing ? 'opacity-30' : 'opacity-100'}`}>
      <div className="flex flex-col">
        <div className="flex items-stretch h-8 xs:h-10 sm:h-12 md:h-14 lg:h-16 xl:h-[4.5rem] 2xl:h-20 3xl:h-24">
          {/* Fundo sólido (sem gradiente) - economia de GPU */}
          <div className="flex-1 bg-gray-900 overflow-hidden flex items-center relative">
            {/* Linha vermelha superior */}
            <div className="absolute top-0 left-0 right-0 h-[2px] sm:h-[3px] lg:h-1 bg-red-600" />

            {/* Fades laterais */}
            <div className="absolute left-0 top-0 bottom-0 w-4 xs:w-6 sm:w-8 md:w-12 lg:w-16 xl:w-20 bg-gradient-to-r from-gray-900 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-4 xs:w-6 sm:w-8 md:w-12 lg:w-16 xl:w-20 bg-gradient-to-l from-gray-900 to-transparent z-10" />

            {/* Conteúdo rolante - GPU acelerado via translate3d + will-change */}
            <div
              className="animate-marquee whitespace-nowrap inline-flex py-1"
              style={{
                willChange: 'transform',
                transform: 'translate3d(0,0,0)',
                backfaceVisibility: 'hidden',
              }}
            >
              {[...items, ...items].map((item, index) => {
                const style = getSourceStyle(item.source);
                return (
                  <span
                    key={index}
                    className="mx-3 sm:mx-4 lg:mx-6 xl:mx-8 inline-flex items-center gap-1.5 sm:gap-2 lg:gap-3 font-semibold tracking-wide text-xs sm:text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl"
                    style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}
                  >
                    {/* Badge da fonte - estático, sem gradientes/animações */}
                    <span className={`px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] lg:text-xs xl:text-sm 2xl:text-base font-bold inline-flex items-center gap-1.5 shrink-0 ${style.badge}`}>
                      {item.source === 'Créditos' ? (
                        <span className="hidden sm:inline">CRÉDITOS</span>
                      ) : item.source === '📢 Informativo' ? (
                        <span className="hidden sm:inline">INFORMATIVO</span>
                      ) : (
                        <span>{item.source}</span>
                      )}
                    </span>
                    {/* Título da notícia */}
                    <span className={style.text}>
                      {item.title}
                    </span>
                    {/* Separador - estático (sem pulse) */}
                    <span className="mx-3 sm:mx-4 lg:mx-6 shrink-0 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-red-600">
                      ▶
                    </span>
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
