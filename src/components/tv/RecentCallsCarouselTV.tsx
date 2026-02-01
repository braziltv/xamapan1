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
    if (localIndex <= 1) return 1;
    if (localIndex <= 3) return 0.9;
    if (localIndex <= 5) return 0.8;
    return 0.7;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Subheader - matching reference design */}
      <div className="flex items-center gap-1.5 mb-2 shrink-0 px-1">
        <span className="text-cyan-500" style={{ fontSize: 'clamp(0.45rem, 0.7vw, 0.6rem)' }}>◆</span>
        <span 
          className="text-slate-400 font-semibold uppercase tracking-wider"
          style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.6rem)' }}
        >
          ÚLTIMAS CHAMADAS
        </span>
        {/* Page indicator - moved to right side */}
        {totalPages > 1 && (
          <div className="ml-auto flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-full transition-all duration-300"
                style={{
                  width: idx === currentPage ? '10px' : '4px',
                  height: '4px',
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
        className={`flex-1 space-y-1 transition-all duration-300 ease-out ${
          isTransitioning ? 'opacity-0 translate-x-3' : 'opacity-100 translate-x-0'
        }`}
      >
        {visibleItems.map((item, localIndex) => {
          const globalIndex = startIndex + localIndex;
          const isTriage = item.type === 'triage';
          const opacity = getItemOpacity(localIndex);
          
          return (
            <div
              key={item.id}
              className="rounded-xl transition-all duration-200"
              style={{ 
                opacity,
                padding: 'clamp(0.35rem, 0.6vh, 0.5rem) clamp(0.5rem, 0.8vw, 0.75rem)',
                background: 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(51,65,85,0.7) 100%)',
                border: '1px solid rgba(71,85,105,0.4)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <div className="flex items-center gap-2">
                {/* Icon badge - circular with colored background */}
                <div 
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{ 
                    width: 'clamp(1.5rem, 1.8vw, 2rem)', 
                    height: 'clamp(1.5rem, 1.8vw, 2rem)',
                    background: isTriage 
                      ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' 
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: isTriage 
                      ? '0 2px 10px rgba(99,102,241,0.5)' 
                      : '0 2px 10px rgba(16,185,129,0.5)',
                  }}
                >
                  {isTriage 
                    ? <Activity 
                        style={{ width: 'clamp(0.7rem, 0.9vw, 1rem)', height: 'clamp(0.7rem, 0.9vw, 1rem)' }} 
                        className="text-white" 
                      /> 
                    : <Stethoscope 
                        style={{ width: 'clamp(0.7rem, 0.9vw, 1rem)', height: 'clamp(0.7rem, 0.9vw, 1rem)' }} 
                        className="text-white" 
                      />
                  }
                </div>

                {/* Name + Type badge - stacked */}
                <div className="flex-1 min-w-0 flex flex-col gap-0">
                  <p 
                    className="tv-font-body font-bold text-white truncate leading-tight" 
                    style={{ 
                      fontSize: 'clamp(0.65rem, 0.95vw, 0.9rem)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                  >
                    {currentTime ? maskNameAfterOneMinute(item.name, item.time, currentTime) : item.name}
                  </p>
                  <span 
                    className="font-bold uppercase tracking-wide"
                    style={{ 
                      fontSize: 'clamp(0.4rem, 0.55vw, 0.5rem)',
                      color: isTriage ? '#a5b4fc' : '#6ee7b7',
                    }}
                  >
                    {isTriage ? 'TRIAGEM' : 'MÉDICO'}
                  </span>
                </div>

                {/* Time badge - styled pill */}
                <div 
                  className="shrink-0 rounded-lg px-2 py-1"
                  style={{
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(71,85,105,0.4)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  <span 
                    className="text-slate-200 font-mono font-bold" 
                    style={{ fontSize: 'clamp(0.55rem, 0.75vw, 0.7rem)' }}
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
