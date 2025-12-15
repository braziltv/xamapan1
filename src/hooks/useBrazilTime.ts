import { useState, useEffect, useRef } from 'react';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';
const TIME_API_URL = 'https://worldtimeapi.org/api/timezone/America/Sao_Paulo';
const SYNC_INTERVAL = 5 * 60 * 1000; // Sync every 5 minutes

// Global state for time offset (shared across all hook instances)
let globalTimeOffset = 0;
let lastSyncTime = 0;

async function fetchInternetTime(): Promise<number | null> {
  try {
    const response = await fetch(TIME_API_URL);
    if (!response.ok) return null;
    
    const data = await response.json();
    // WorldTimeAPI returns datetime in ISO format with timezone
    const serverTime = new Date(data.datetime).getTime();
    const localTime = Date.now();
    
    // Calculate offset between server time and local time
    return serverTime - localTime;
  } catch (error) {
    console.error('Failed to sync time from internet:', error);
    return null;
  }
}

function getAdjustedTime(): Date {
  const adjustedTimestamp = Date.now() + globalTimeOffset;
  return toZonedTime(new Date(adjustedTimestamp), BRAZIL_TIMEZONE);
}

export function useBrazilTime(updateInterval: number = 1000) {
  const [currentTime, setCurrentTime] = useState(() => getAdjustedTime());
  const [isSynced, setIsSynced] = useState(lastSyncTime > 0);
  const syncInProgressRef = useRef(false);

  // Sync time from internet
  useEffect(() => {
    const syncTime = async () => {
      if (syncInProgressRef.current) return;
      syncInProgressRef.current = true;
      
      const offset = await fetchInternetTime();
      if (offset !== null) {
        globalTimeOffset = offset;
        lastSyncTime = Date.now();
        setIsSynced(true);
        console.log(`Time synced from internet. Offset: ${offset}ms`);
      }
      
      syncInProgressRef.current = false;
    };

    // Initial sync if not synced recently
    if (Date.now() - lastSyncTime > SYNC_INTERVAL) {
      syncTime();
    }

    // Periodic sync
    const syncInterval = setInterval(syncTime, SYNC_INTERVAL);
    
    return () => clearInterval(syncInterval);
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getAdjustedTime());
    }, updateInterval);
    return () => clearInterval(timer);
  }, [updateInterval]);

  return { currentTime, isSynced };
}

// Format date in Brazil timezone
export function formatBrazilTime(date: Date, formatStr: string): string {
  const zonedDate = toZonedTime(date, BRAZIL_TIMEZONE);
  return formatTz(zonedDate, formatStr, { 
    locale: ptBR,
    timeZone: BRAZIL_TIMEZONE 
  });
}

// Get current time in Brazil timezone (with internet sync offset)
export function getBrazilTime(): Date {
  return getAdjustedTime();
}

export { BRAZIL_TIMEZONE };
