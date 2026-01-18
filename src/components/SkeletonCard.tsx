import { cn } from '@/lib/utils';

interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  showAvatar?: boolean;
  showHeader?: boolean;
}

export function SkeletonCard({ 
  lines = 3, 
  showAvatar = false,
  showHeader = true,
  className,
  ...props
}: SkeletonCardProps) {
  return (
    <div 
      className={cn(
        "rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 animate-pulse",
        className
      )}
      {...props}
    >
      {showHeader && (
        <div className="flex items-center gap-3 mb-4">
          {showAvatar && (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600/50 to-slate-700/50 shimmer-skeleton" />
          )}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gradient-to-r from-slate-600/50 via-slate-500/30 to-slate-600/50 rounded-md w-3/4 shimmer-skeleton" />
            <div className="h-3 bg-gradient-to-r from-slate-700/50 via-slate-600/30 to-slate-700/50 rounded-md w-1/2 shimmer-skeleton" />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {[...Array(lines)].map((_, i) => (
          <div 
            key={i}
            className="h-3 bg-gradient-to-r from-slate-700/50 via-slate-600/30 to-slate-700/50 rounded-md shimmer-skeleton"
            style={{ 
              width: `${100 - (i * 15)}%`,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {[...Array(count)].map((_, i) => (
        <SkeletonCard 
          key={i} 
          lines={2} 
          showHeader={false}
          className="animate-cascade-in"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

export function SkeletonStats({ className = '' }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {[...Array(3)].map((_, i) => (
        <div 
          key={i}
          className="rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-3 animate-pulse"
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          <div className="h-8 w-16 bg-gradient-to-r from-slate-600/50 via-slate-500/30 to-slate-600/50 rounded-md mb-2 mx-auto shimmer-skeleton" />
          <div className="h-3 w-20 bg-gradient-to-r from-slate-700/50 via-slate-600/30 to-slate-700/50 rounded-md mx-auto shimmer-skeleton" />
        </div>
      ))}
    </div>
  );
}
