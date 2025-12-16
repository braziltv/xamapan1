import { useState, useEffect } from 'react';

export function useElapsedTime(startTime: Date | string) {
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
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [startTime]);

  return elapsed;
}

export function formatElapsedTime(startTime: Date | string): string {
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
}
