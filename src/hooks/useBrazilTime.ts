import { useState, useEffect } from 'react';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

export function useBrazilTime(updateInterval: number = 1000) {
  const [currentTime, setCurrentTime] = useState(() => 
    toZonedTime(new Date(), BRAZIL_TIMEZONE)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(toZonedTime(new Date(), BRAZIL_TIMEZONE));
    }, updateInterval);
    return () => clearInterval(timer);
  }, [updateInterval]);

  return currentTime;
}

// Format date in Brazil timezone
export function formatBrazilTime(date: Date, formatStr: string): string {
  const zonedDate = toZonedTime(date, BRAZIL_TIMEZONE);
  return formatTz(zonedDate, formatStr, { 
    locale: ptBR,
    timeZone: BRAZIL_TIMEZONE 
  });
}

// Get current time in Brazil timezone
export function getBrazilTime(): Date {
  return toZonedTime(new Date(), BRAZIL_TIMEZONE);
}

export { BRAZIL_TIMEZONE };
