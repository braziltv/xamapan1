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
const SLIDE_INTERVAL = 30000; // 30 seconds

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

  // Calculate opacity based on item position (more visible fade-out effect)
  const getItemOpacity = (globalIndex: number): number => {
    if (globalIndex === 0) return 1;
    if (globalIndex === 1) return 0.95;
    if (globalIndex === 2) return 0.88;
    if (globalIndex === 3) return 0.8;
    return 0.75;
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
                  className={`p-1 xs:p-1.5 sm:p-2 md:p-2.5 lg:p-3 xl:p-3.5 2xl:p-4 3xl:p-5 4k:p-6 rounded xs:rounded-md sm:rounded-lg lg:rounded-xl transition-all duration-500 ${
                    globalIndex === 0 
                      ? 'bg-primary/25 border-2 border-primary/50 ring-2 ring-primary/30 shadow-lg shadow-primary/20' 
                      : 'bg-slate-700/60 border border-slate-600/30'
                  }`}
                  style={{ 
                    opacity,
                    animationDelay: `${localIndex * 50}ms`,
                  }}
                >
                  <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 lg:gap-3">
                    <div className={`w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 3xl:w-12 3xl:h-12 4k:w-14 4k:h-14 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                      item.type === 'triage' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}>
                      {item.type === 'triage' ? (
                        <Activity className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-4.5 lg:h-4.5 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 3xl:w-7 3xl:h-7 4k:w-9 4k:h-9 text-white" />
                      ) : (
                        <Stethoscope className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-4.5 lg:h-4.5 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 3xl:w-7 3xl:h-7 4k:w-9 4k:h-9 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="tv-font-body font-bold text-white truncate text-[7px] xs:text-[8px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base 2xl:text-lg 3xl:text-xl 4k:text-2xl drop-shadow-sm">
                        {currentTime ? maskNameAfterOneMinute(item.name, item.time, currentTime) : item.name}
                      </p>
                      <p className="tv-font-body text-slate-300 text-[6px] xs:text-[7px] sm:text-[8px] md:text-[10px] lg:text-xs xl:text-sm 2xl:text-base 3xl:text-lg 4k:text-xl">
                        {item.type === 'triage' ? 'Triagem' : 'Médico'}
                      </p>
                    </div>
                    <span className="text-slate-300 font-mono font-semibold shrink-0 text-[6px] xs:text-[7px] sm:text-[8px] md:text-[10px] lg:text-xs xl:text-sm 2xl:text-base 3xl:text-lg 4k:text-xl">
                      {formatBrazilTime(item.time, 'HH:mm')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
