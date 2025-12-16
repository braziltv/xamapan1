import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ElapsedTimeDisplayProps {
  startTime: Date | string;
  className?: string;
}

export function ElapsedTimeDisplay({ startTime, className = '' }: ElapsedTimeDisplayProps) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diffMs = now - start;
      
      const minutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${remainingMinutes}min`;
      }
      return `${minutes}min`;
    };

    setElapsed(calculateElapsed());
    
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full ${className}`}>
      <Clock className="w-3 h-3 text-red-500" />
      {elapsed}
    </span>
  );
}
