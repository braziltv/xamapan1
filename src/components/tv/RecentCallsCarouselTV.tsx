import { useState, useEffect } from 'react';
import { Activity, Stethoscope, Clock } from 'lucide-react';
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
    if (localIndex <= 1) return 1;
    if (localIndex <= 3) return 0.9;
    if (localIndex <= 5) return 0.8;
    return 0.7;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with page indicator */}
      <div className="flex items-center justify-between mb-2 shrink-0 px-1">
        <div className="flex items-center gap-1.5">
          <Clock 
            className="text-slate-400" 
            style={{ width: 'clamp(0.7rem, 0.9vw, 0.9rem)', height: 'clamp(0.7rem, 0.9vw, 0.9rem)' }} 
          />
          <span 
            className="text-slate-400 font-semibold uppercase tracking-wider"
            style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.7rem)' }}
          >
            Últimas Chamadas
          </span>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-full transition-all duration-300"
                style={{
                  width: idx === currentPage ? '12px' : '5px',
                  height: '5px',
                  background: idx === currentPage 
                    ? 'linear-gradient(90deg, #06b6d4, #6366f1)' 
                    : 'rgba(100,116,139,0.5)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Items list */}
      <div 
        className={`flex-1 space-y-1.5 transition-all duration-300 ease-out ${
          isTransitioning ? 'opacity-0 translate-x-3' : 'opacity-100 translate-x-0'
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
              className="rounded-xl transition-all duration-200 hover:scale-[1.02]"
              style={{ 
                opacity,
                padding: 'clamp(0.3rem, 0.6vh, 0.5rem) clamp(0.5rem, 0.7vw, 0.75rem)',
                background: isFirst 
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(79,70,229,0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(51,65,85,0.6) 100%)',
                border: isFirst 
                  ? '1px solid rgba(99,102,241,0.4)' 
                  : '1px solid rgba(71,85,105,0.3)',
                boxShadow: isFirst 
                  ? '0 4px 16px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.05)' 
                  : '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <div className="flex items-center gap-2">
                {/* Icon with gradient */}
                <div 
                  className="rounded-lg flex items-center justify-center shrink-0"
                  style={{ 
                    width: 'clamp(1.25rem, 1.4vw, 1.5rem)', 
                    height: 'clamp(1.25rem, 1.4vw, 1.5rem)',
                    background: isTriage 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' 
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: isTriage 
                      ? '0 2px 8px rgba(59,130,246,0.4)' 
                      : '0 2px 8px rgba(16,185,129,0.4)',
                  }}
                >
                  {isTriage 
                    ? <Activity 
                        style={{ width: 'clamp(0.55rem, 0.65vw, 0.7rem)', height: 'clamp(0.55rem, 0.65vw, 0.7rem)' }} 
                        className="text-white" 
                      /> 
                    : <Stethoscope 
                        style={{ width: 'clamp(0.55rem, 0.65vw, 0.7rem)', height: 'clamp(0.55rem, 0.65vw, 0.7rem)' }} 
                        className="text-white" 
                      />
                  }
                </div>

                {/* Name + Badge */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <p 
                    className="tv-font-body font-bold text-white truncate" 
                    style={{ 
                      fontSize: 'clamp(0.6rem, 0.85vw, 0.8rem)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                  >
                    {currentTime ? maskNameAfterOneMinute(item.name, item.time, currentTime) : item.name}
                  </p>
                  <span 
                    className="shrink-0 px-1.5 py-0.5 rounded-md font-bold uppercase relative overflow-hidden"
                    style={{ 
                      fontSize: 'clamp(0.35rem, 0.45vw, 0.45rem)',
                      background: isTriage 
                        ? 'rgba(6,182,212,0.15)' 
                        : 'rgba(16,185,129,0.15)',
                      color: isTriage ? '#22d3ee' : '#34d399',
                      border: `1px solid ${isTriage ? 'rgba(6,182,212,0.3)' : 'rgba(16,185,129,0.3)'}`,
                    }}
                  >
                    <span className="relative z-10">{isTriage ? 'Tri' : 'Méd'}</span>
                  </span>
                </div>

                {/* Time badge */}
                <div 
                  className="shrink-0 rounded-md px-1.5 py-0.5"
                  style={{
                    background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(71,85,105,0.3)',
                  }}
                >
                  <span 
                    className="text-slate-300 font-mono font-semibold" 
                    style={{ fontSize: 'clamp(0.5rem, 0.65vw, 0.65rem)' }}
                  >
                    {formatBrazilTime(item.time, 'HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Empty state */}
        {visibleItems.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p 
              className="text-slate-500 font-medium text-center"
              style={{ fontSize: 'clamp(0.6rem, 0.8vw, 0.8rem)' }}
            >
              Nenhuma chamada recente
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
