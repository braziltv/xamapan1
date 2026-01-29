import { useState, useEffect } from 'react';
import { Activity, Stethoscope, Clock } from 'lucide-react';
import { formatBrazilTime } from '@/hooks/useBrazilTime';
import { useTVResolution } from '@/hooks/useTVResolution';

interface HistoryItem {
  id: string;
  name: string;
  type: string;
  time: Date;
}

interface TVRecentCallsProps {
  historyItems: HistoryItem[];
  currentTime: Date | null;
  maskNameAfterOneMinute: (name: string, callTime: Date, currentTime: Date) => string;
  isAnnouncing: boolean;
}

const ITEMS_PER_PAGE = 5;
const SLIDE_INTERVAL = 25000; // 25 seconds

export function TVRecentCalls({ 
  historyItems, 
  currentTime, 
  maskNameAfterOneMinute,
  isAnnouncing
}: TVRecentCallsProps) {
  const { scale } = useTVResolution();
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const totalItems = Math.min(historyItems.length, 10);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Auto-slide
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

  // Reset on new items
  useEffect(() => {
    if (historyItems.length > 0) {
      setCurrentPage(0);
    }
  }, [historyItems.length]);

  const startIndex = currentPage * ITEMS_PER_PAGE;
  const visibleItems = historyItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getItemOpacity = (index: number): number => {
    if (index === 0) return 1;
    if (index === 1) return 0.92;
    if (index === 2) return 0.84;
    if (index === 3) return 0.76;
    return 0.68;
  };

  return (
    <div 
      className={`flex flex-col rounded-2xl border border-purple-500/30 transition-opacity duration-300 ${
        isAnnouncing ? 'opacity-30' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 100%)',
        padding: '1rem',
        height: '100%',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 shrink-0">
        <Clock 
          className="text-cyan-400 shrink-0 animate-pulse" 
          style={{ width: '1.5rem', height: '1.5rem' }}
        />
        <h3 
          className="tv-font-heading font-bold text-white drop-shadow-md"
          style={{ fontSize: '1.25rem' }}
        >
          Últimas Chamadas
        </h3>
        {totalPages > 1 && (
          <span 
            className="ml-auto text-slate-400 font-mono"
            style={{ fontSize: '0.875rem' }}
          >
            {currentPage + 1}/{totalPages}
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-hidden">
        {historyItems.length === 0 ? (
          <p 
            className="text-slate-500 text-center py-8"
            style={{ fontSize: '1rem' }}
          >
            Nenhuma chamada ainda
          </p>
        ) : (
          <div 
            className={`space-y-2 transition-all duration-300 ease-in-out ${
              isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
            }`}
          >
            {visibleItems.map((item, localIndex) => {
              const globalIndex = startIndex + localIndex;
              const opacity = getItemOpacity(localIndex);
              const isTriage = item.type === 'triage';
              
              return (
                <div
                  key={item.id}
                  className={`rounded-xl transition-all duration-500 ${
                    globalIndex === 0 
                      ? 'bg-primary/20 border-2 border-primary/50 ring-1 ring-primary/20' 
                      : 'bg-slate-800/50 border border-slate-700/30'
                  }`}
                  style={{ 
                    opacity,
                    padding: '0.75rem 1rem',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div 
                      className={`rounded-full flex items-center justify-center shrink-0 ${
                        isTriage ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: '2.25rem', height: '2.25rem' }}
                    >
                      {isTriage ? (
                        <Activity className="w-4 h-4 text-white" />
                      ) : (
                        <Stethoscope className="w-4 h-4 text-white" />
                      )}
                    </div>
                    
                    {/* Name + Badge */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <p 
                        className="tv-font-body font-bold text-white truncate"
                        style={{ fontSize: '1rem' }}
                      >
                        {currentTime ? maskNameAfterOneMinute(item.name, item.time, currentTime) : item.name}
                      </p>
                      <span 
                        className={`shrink-0 px-2 py-0.5 rounded font-bold uppercase tracking-wide relative overflow-hidden ${
                          isTriage 
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                        style={{ fontSize: '0.625rem' }}
                      >
                        <span className="relative z-10">{isTriage ? 'Tri' : 'Méd'}</span>
                        <span className="absolute inset-0 animate-news-shine bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      </span>
                    </div>
                    
                    {/* Time */}
                    <span 
                      className="text-slate-300 font-mono font-semibold shrink-0"
                      style={{ fontSize: '0.875rem' }}
                    >
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
