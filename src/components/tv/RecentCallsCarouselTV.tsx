import { useState, useEffect } from 'react';
import { Activity, Stethoscope } from 'lucide-react';
import { formatBrazilTime } from '@/hooks/useBrazilTime';

interface HistoryItem {
  id: string;
  name: string;
  type: string;
  time: Date;
}

interface RecentCallsCarouselTVProps {
  historyItems: HistoryItem[];
  currentTime: Date | null;
  maskNameAfterOneMinute: (name: string, callTime: Date, currentTime: Date) => string;
}

const ITEMS_PER_PAGE = 7;
const SLIDE_INTERVAL = 8000; // 8 seconds per page

export function RecentCallsCarouselTV({ 
  historyItems, 
  currentTime, 
  maskNameAfterOneMinute 
}: RecentCallsCarouselTVProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const totalPages = Math.ceil(historyItems.length / ITEMS_PER_PAGE);

  // Auto-slide carousel
  useEffect(() => {
    if (totalPages <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPage((prev) => (prev + 1) % totalPages);
        setIsTransitioning(false);
      }, 300);
    }, SLIDE_INTERVAL);

    return () => clearInterval(interval);
  }, [totalPages]);

  // Reset to first page when new items are added
  useEffect(() => {
    if (historyItems.length > 0) {
      setCurrentPage(0);
    }
  }, [historyItems.length]);

  const startIndex = currentPage * ITEMS_PER_PAGE;
  const visibleItems = historyItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getItemOpacity = (localIndex: number): number => {
    if (localIndex === 0) return 1;
    if (localIndex === 1) return 0.95;
    if (localIndex === 2) return 0.9;
    if (localIndex === 3) return 0.85;
    if (localIndex === 4) return 0.8;
    if (localIndex === 5) return 0.75;
    return 0.7;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Page indicator */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mb-2 shrink-0">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <div
              key={idx}
              className={`rounded-full transition-all duration-300 ${
                idx === currentPage 
                  ? 'bg-cyan-400 w-4 h-1.5' 
                  : 'bg-slate-600 w-1.5 h-1.5'
              }`}
            />
          ))}
        </div>
      )}

      {/* Items list */}
      <div 
        className={`flex-1 space-y-1 transition-all duration-300 ease-in-out ${
          isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
        }`}
      >
        {visibleItems.map((item, localIndex) => {
          const globalIndex = startIndex + localIndex;
          const isTriage = item.type === 'triage';
          const opacity = getItemOpacity(localIndex);
          const isFirst = globalIndex === 0;
          
          return (
            <div
              key={item.id}
              className={`rounded-lg ${
                isFirst 
                  ? 'bg-primary/20 border-2 border-primary/50 ring-1 ring-primary/20' 
                  : 'bg-slate-800/50 border border-slate-700/30'
              }`}
              style={{ 
                opacity, 
                padding: 'clamp(0.25rem, 0.5vh, 0.5rem) clamp(0.4rem, 0.6vw, 0.625rem)' 
              }}
            >
              <div className="flex items-center gap-2">
                {/* Icon */}
                <div 
                  className={`rounded-full flex items-center justify-center shrink-0 ${
                    isTriage ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}
                  style={{ 
                    width: 'clamp(1.25rem, 1.5vw, 1.5rem)', 
                    height: 'clamp(1.25rem, 1.5vw, 1.5rem)' 
                  }}
                >
                  {isTriage 
                    ? <Activity 
                        style={{ width: 'clamp(0.6rem, 0.7vw, 0.75rem)', height: 'clamp(0.6rem, 0.7vw, 0.75rem)' }} 
                        className="text-white" 
                      /> 
                    : <Stethoscope 
                        style={{ width: 'clamp(0.6rem, 0.7vw, 0.75rem)', height: 'clamp(0.6rem, 0.7vw, 0.75rem)' }} 
                        className="text-white" 
                      />
                  }
                </div>

                {/* Name + Badge */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <p 
                    className="tv-font-body font-bold text-white truncate" 
                    style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.85rem)' }}
                  >
                    {currentTime ? maskNameAfterOneMinute(item.name, item.time, currentTime) : item.name}
                  </p>
                  <span 
                    className={`shrink-0 px-1 py-0.5 rounded font-bold uppercase relative overflow-hidden ${
                      isTriage 
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                    style={{ fontSize: 'clamp(0.4rem, 0.5vw, 0.5rem)' }}
                  >
                    <span className="relative z-10">{isTriage ? 'Tri' : 'Méd'}</span>
                    <span className="absolute inset-0 animate-news-shine bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </span>
                </div>

                {/* Time */}
                <span 
                  className="text-slate-300 font-mono font-semibold shrink-0" 
                  style={{ fontSize: 'clamp(0.55rem, 0.75vw, 0.75rem)' }}
                >
                  {formatBrazilTime(item.time, 'HH:mm')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
