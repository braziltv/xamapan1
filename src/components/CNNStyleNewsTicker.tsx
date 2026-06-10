import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

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

// Limite máximo de manchetes processadas (otimização de performance)
const MAX_NEWS_ITEMS = 25;
// Velocidade do ticker em pixels por segundo (equivalente ao animate-marquee 120s)
const SPEED_PX_PER_SEC = 90;
// Margem fora da viewport para pré-montar itens (evita "pop-in")
const OVERSCAN_PX = 200;

type TickerItem = NewsItem & { isCommercial?: boolean; _key: string };

export function CNNStyleNewsTicker({
  newsItems,
  commercialPhrases,
  currentTime,
  isAnnouncing = false,
}: CNNStyleNewsTickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [itemWidths, setItemWidths] = useState<number[]>([]);
  const [scrollX, setScrollX] = useState(0);

  // Build items array with commercial phrases interleaved
  const items: TickerItem[] = useMemo(() => {
    if (newsItems.length === 0) return [];
    const limitedNews = newsItems.slice(0, MAX_NEWS_ITEMS);

    const creditItem: TickerItem = {
      title: 'Solução Criada Por Kalebe Gomes',
      source: 'Créditos',
      link: '',
      _key: 'credit',
    };

    const commercialItems: TickerItem[] = commercialPhrases.map((phrase, i) => ({
      title: phrase.phrase_content,
      source: '📢 Informativo',
      link: '',
      isCommercial: true,
      _key: `com-${phrase.id ?? i}`,
    }));

    const out: TickerItem[] = [];
    let commercialIndex = 0;

    limitedNews.forEach((item, index) => {
      out.push({ ...item, _key: `n-${index}` });

      if ((index + 1) % 5 === 0 && commercialIndex < commercialItems.length) {
        out.push({ ...commercialItems[commercialIndex], _key: `${commercialItems[commercialIndex]._key}-${index}` });
        commercialIndex++;
      }

      if ((index + 1) % 5 === 0) {
        out.push({ ...creditItem, _key: `credit-${index}` });
      }
    });

    while (commercialIndex < commercialItems.length) {
      out.push({ ...commercialItems[commercialIndex], _key: `${commercialItems[commercialIndex]._key}-tail` });
      commercialIndex++;
    }

    return out;
  }, [newsItems, commercialPhrases]);

  // Mede a largura do container (observa resize)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mede largura de cada item após render off-screen
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    const widths = children.map(c => c.offsetWidth);
    setItemWidths(widths);
  }, [items]);

  // Posições acumuladas e largura total do conteúdo (uma cópia)
  const { positions, totalWidth } = useMemo(() => {
    const pos: number[] = [];
    let acc = 0;
    for (let i = 0; i < itemWidths.length; i++) {
      pos.push(acc);
      acc += itemWidths[i];
    }
    return { positions: pos, totalWidth: acc };
  }, [itemWidths]);

  // Animação por requestAnimationFrame (pausa quando isAnnouncing)
  useEffect(() => {
    if (totalWidth === 0 || containerWidth === 0) return;
    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!isAnnouncing) {
        setScrollX(prev => {
          let next = prev + SPEED_PX_PER_SEC * dt;
          if (next >= totalWidth) next -= totalWidth;
          return next;
        });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [totalWidth, containerWidth, isAnnouncing]);

  // Determina itens visíveis (virtualização): janela [scrollX - overscan, scrollX + container + overscan]
  // Como o conteúdo faz loop, considera duas cópias adjacentes.
  const visible = useMemo(() => {
    if (totalWidth === 0 || itemWidths.length === 0) return [];
    const winStart = scrollX - OVERSCAN_PX;
    const winEnd = scrollX + containerWidth + OVERSCAN_PX;

    const out: Array<{ item: TickerItem; x: number; key: string }> = [];

    // Renderiza duas cópias virtuais (offset 0 e offset = totalWidth) para loop contínuo
    for (let copy = 0; copy < 2; copy++) {
      const offset = copy * totalWidth;
      for (let i = 0; i < items.length; i++) {
        const x = positions[i] + offset;
        const w = itemWidths[i];
        if (x + w >= winStart && x <= winEnd) {
          out.push({ item: items[i], x: x - scrollX, key: `${copy}-${items[i]._key}` });
        }
      }
    }
    return out;
  }, [scrollX, containerWidth, totalWidth, items, positions, itemWidths]);

  if (newsItems.length === 0) return null;

  // Estilo por fonte (estático, sem animações)
  const getSourceStyle = (source: string): { badge: string; text: string } => {
    if (source === '📢 Informativo') return { badge: 'bg-red-700 text-white', text: 'text-lime-400 font-bold' };
    if (source === 'Créditos') return { badge: 'bg-amber-500 text-amber-950', text: 'text-white font-bold' };
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

  const renderItem = (item: TickerItem) => {
    const style = getSourceStyle(item.source);
    return (
      <span
        className="inline-flex items-center gap-1.5 sm:gap-2 lg:gap-3 font-semibold tracking-wide text-xs sm:text-sm lg:text-base xl:text-lg 2xl:text-xl 3xl:text-2xl px-3 sm:px-4 lg:px-6 xl:px-8"
        style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}
      >
        <span className={`px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] lg:text-xs xl:text-sm 2xl:text-base font-bold inline-flex items-center gap-1.5 shrink-0 ${style.badge}`}>
          {item.source === 'Créditos' ? (
            <span className="hidden sm:inline">CRÉDITOS</span>
          ) : item.source === '📢 Informativo' ? (
            <span className="hidden sm:inline">INFORMATIVO</span>
          ) : (
            <span>{item.source}</span>
          )}
        </span>
        <span className={style.text}>{item.title}</span>
        <span className="ml-3 sm:ml-4 lg:ml-6 shrink-0 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-red-600">
          ▶
        </span>
      </span>
    );
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 shrink-0 transition-opacity duration-300 ${isAnnouncing ? 'opacity-30' : 'opacity-100'}`}>
      <div className="flex flex-col">
        <div className="flex items-stretch h-8 xs:h-10 sm:h-12 md:h-14 lg:h-16 xl:h-[4.5rem] 2xl:h-20 3xl:h-24">
          <div ref={containerRef} className="flex-1 bg-gray-900 overflow-hidden flex items-center relative">
            {/* Linha vermelha superior */}
            <div className="absolute top-0 left-0 right-0 h-[2px] sm:h-[3px] lg:h-1 bg-red-600" />

            {/* Fades laterais */}
            <div className="absolute left-0 top-0 bottom-0 w-4 xs:w-6 sm:w-8 md:w-12 lg:w-16 xl:w-20 bg-gradient-to-r from-gray-900 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-4 xs:w-6 sm:w-8 md:w-12 lg:w-16 xl:w-20 bg-gradient-to-l from-gray-900 to-transparent z-10" />

            {/* Camada de medição (oculta, fora da viewport) — usada apenas para medir largura dos itens */}
            <div
              ref={measureRef}
              aria-hidden
              className="absolute whitespace-nowrap"
              style={{
                visibility: 'hidden',
                pointerEvents: 'none',
                left: 0,
                top: 0,
                transform: 'translateX(-99999px)',
              }}
            >
              {items.map(item => (
                <span key={`m-${item._key}`} className="inline-block">
                  {renderItem(item)}
                </span>
              ))}
            </div>

            {/* Viewport virtualizada — apenas itens visíveis no DOM */}
            <div
              className="absolute inset-0"
              style={{
                willChange: 'contents',
                contain: 'strict',
              }}
            >
              {visible.map(({ item, x, key }) => (
                <div
                  key={key}
                  className="absolute top-1/2 whitespace-nowrap"
                  style={{
                    transform: `translate3d(${Math.round(x)}px, -50%, 0)`,
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  {renderItem(item)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
