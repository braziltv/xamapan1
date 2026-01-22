import { useState, useEffect } from 'react';
import { Activity, Stethoscope, Clock } from 'lucide-react';
import { formatBrazilTime } from '@/hooks/useBrazilTime';

interface HistoryItem {
  id: string;
  name: string;
  type: string;
  time: Date;
}

interface RecentCallsCarouselProps {
  historyItems: HistoryItem[];
  currentTime: Date | null;
  maskNameAfterOneMinute: (name: string, callTime: Date, currentTime: Date) => string;
  isAnnouncing?: boolean;
}

const ITEMS_PER_PAGE = 4;
const SLIDE_INTERVAL = 12000; // 12 seconds

export function RecentCallsCarousel({ 
  historyItems, 
  currentTime, 
  maskNameAfterOneMinute,
  isAnnouncing = false
}: RecentCallsCarouselProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Calculate total pages
  const totalItems = Math.min(historyItems.length, 10); // Limit to 10 items
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Auto-slide effect
  useEffect(() => {
    if (totalPages <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentPage((prev) => (prev + 1) % totalPages);
        setIsTransitioning(false);
      }, 300); // Transition duration
    }, SLIDE_INTERVAL);

    return () => clearInterval(interval);
  }, [totalPages]);

  // Reset to first page when new items arrive
  useEffect(() => {
    if (historyItems.length > 0) {
      setCurrentPage(0);
    }
  }, [historyItems.length]);

  // Get items for current page
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const visibleItems = historyItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Calculate opacity based on item position (fade-out effect for older items)
  const getItemOpacity = (globalIndex: number): number => {
    if (globalIndex === 0) return 1;
    if (globalIndex === 1) return 0.9;
    if (globalIndex === 2) return 0.75;
    if (globalIndex === 3) return 0.6;
    return 0.5;
  };

  return (
    <div className={`col-span-3 flex glass-3d tv-card animate-history-glow tv-card-3d p-0.5 xs:p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 2xl:p-3.5 3xl:p-4 4k:p-6 flex-col min-h-0 border border-purple-500/20 transition-opacity duration-300 ${isAnnouncing ? 'opacity-30' : 'opacity-100'}`}>
      {/* Header with page indicator */}
      <div className="flex items-center justify-between mb-0.5 xs:mb-1 sm:mb-1.5 lg:mb-2 shrink-0">
        <h3 className="tv-font-heading font-bold text-white flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 lg:gap-2 text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base 2xl:text-lg 3xl:text-xl 4k:text-2xl drop-shadow-md">
          <Clock className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 3xl:w-7 3xl:h-7 4k:w-8 4k:h-8 text-cyan-400 shrink-0 animate-pulse" />
          <span className="shimmer-text">Últimas Chamadas</span>
        </h3>
        
        {/* Page dots indicator */}
        {totalPages > 1 && (
          <div className="flex items-center gap-0.5 xs:gap-1">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <div
                key={idx}
                className={`rounded-full transition-all duration-300 ${
                  idx === currentPage 
                    ? 'w-1.5 h-1.5 xs:w-2 xs:h-2 sm:w-2.5 sm:h-2.5 bg-cyan-400' 
                    : 'w-1 h-1 xs:w-1.5 xs:h-1.5 sm:w-2 sm:h-2 bg-slate-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Carousel content */}
      <div className="flex-1 overflow-hidden relative">
        {historyItems.length === 0 ? (
          <p className="text-slate-500 text-center py-1 sm:py-2 lg:py-3 xl:py-4 text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs xl:text-sm 2xl:text-base 3xl:text-lg 4k:text-xl">
            Nenhuma chamada ainda
          </p>
        ) : (
          <div 
            className={`space-y-0.5 xs:space-y-0.5 sm:space-y-1 md:space-y-1 lg:space-y-1.5 xl:space-y-2 2xl:space-y-2.5 3xl:space-y-3 transition-all duration-300 ease-in-out ${
              isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
            }`}
          >
            {visibleItems.map((item, localIndex) => {
              const globalIndex = startIndex + localIndex;
              const opacity = getItemOpacity(globalIndex);
              
              return (
                <div
                  key={item.id}
                  className={`p-0.5 xs:p-1 sm:p-1.5 md:p-1.5 lg:p-2 xl:p-2.5 2xl:p-3 3xl:p-3.5 4k:p-4 rounded xs:rounded sm:rounded-md lg:rounded-lg transition-all duration-500 ${
                    globalIndex === 0 
                      ? 'bg-primary/20 border border-primary/40 ring-1 ring-primary/20' 
                      : 'bg-slate-700/50'
                  }`}
                  style={{ 
                    opacity,
                    animationDelay: `${localIndex * 50}ms`,
                    transform: `scale(${1 - (globalIndex * 0.01)})`
                  }}
                >
                  <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 lg:gap-2">
                    <div className={`w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 3xl:w-9 3xl:h-9 4k:w-12 4k:h-12 rounded-full flex items-center justify-center shrink-0 ${
                      item.type === 'triage' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}>
                      {item.type === 'triage' ? (
                        <Activity className="w-1.5 h-1.5 xs:w-2 xs:h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 3xl:w-6 3xl:h-6 4k:w-8 4k:h-8 text-white" />
                      ) : (
                        <Stethoscope className="w-1.5 h-1.5 xs:w-2 xs:h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 3xl:w-6 3xl:h-6 4k:w-8 4k:h-8 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="tv-font-body font-semibold text-white truncate text-[6px] xs:text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] xl:text-xs 2xl:text-sm 3xl:text-base 4k:text-lg">
                        {currentTime ? maskNameAfterOneMinute(item.name, item.time, currentTime) : item.name}
                      </p>
                      <p className="tv-font-body text-slate-400 text-[5px] xs:text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-xs 3xl:text-sm 4k:text-base">
                        {item.type === 'triage' ? 'Triagem' : 'Médico'}
                      </p>
                    </div>
                    <span className="text-slate-400 font-mono shrink-0 text-[5px] xs:text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] xl:text-[10px] 2xl:text-xs 3xl:text-sm 4k:text-base">
                      {formatBrazilTime(item.time, 'HH:mm')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress bar for next slide */}
      {totalPages > 1 && (
        <div className="mt-1 xs:mt-1.5 sm:mt-2 h-0.5 xs:h-1 bg-slate-700/50 rounded-full overflow-hidden shrink-0">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full animate-carousel-progress"
            style={{ 
              animationDuration: `${SLIDE_INTERVAL}ms`,
              animationIterationCount: 'infinite'
            }}
          />
        </div>
      )}
    </div>
  );
}
