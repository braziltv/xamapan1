import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ScheduledAnnouncement {
  id: string;
  unit_name: string;
  title: string;
  text_content: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  interval_minutes: number;
  repeat_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  last_played_at: string | null;
}

interface UseScheduledAnnouncementsProps {
  unitName: string | null;
  audioUnlocked: boolean;
  isSpeaking: boolean;
  voice: string;
  onPlayAnnouncement: (text: string, repeatCount: number) => Promise<void>;
}

export function useScheduledAnnouncements({
  unitName,
  audioUnlocked,
  isSpeaking,
  voice,
  onPlayAnnouncement,
}: UseScheduledAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<ScheduledAnnouncement[]>([]);
  const lastCheckRef = useRef<Record<string, number>>({});
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load announcements from database
  const loadAnnouncements = useCallback(async () => {
    if (!unitName) return;

    try {
      const { data, error } = await supabase
        .from('scheduled_announcements')
        .select('*')
        .eq('unit_name', unitName)
        .eq('is_active', true);

      if (error) {
        console.error('Error loading scheduled announcements:', error);
        return;
      }

      console.log('📢 Loaded scheduled announcements:', data?.length || 0);
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error loading scheduled announcements:', err);
    }
  }, [unitName]);

  // Check if current time is within announcement schedule
  const isWithinSchedule = useCallback((announcement: ScheduledAnnouncement): boolean => {
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday
    const currentDate = now.toISOString().split('T')[0];
    
    // Check if today is in days_of_week
    if (!announcement.days_of_week.includes(today)) {
      return false;
    }

    // Check if within valid date range
    if (currentDate < announcement.valid_from || currentDate > announcement.valid_until) {
      return false;
    }

    // Check if within time window
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const startTime = announcement.start_time.slice(0, 5);
    const endTime = announcement.end_time.slice(0, 5);

    if (currentTime < startTime || currentTime > endTime) {
      return false;
    }

    return true;
  }, []);

  // Check if it's time to play an announcement
  const shouldPlayNow = useCallback((announcement: ScheduledAnnouncement): boolean => {
    const now = Date.now();
    const lastPlayed = lastCheckRef.current[announcement.id] || 0;
    const intervalMs = announcement.interval_minutes * 60 * 1000;

    // If never played or enough time has passed
    if (now - lastPlayed >= intervalMs) {
      return true;
    }

    return false;
  }, []);

  // Update last_played_at in database
  const updateLastPlayed = useCallback(async (announcementId: string) => {
    try {
      await supabase
        .from('scheduled_announcements')
        .update({ last_played_at: new Date().toISOString() })
        .eq('id', announcementId);
    } catch (err) {
      console.error('Error updating last_played_at:', err);
    }
  }, []);

  // Check and play announcements
  const checkAnnouncements = useCallback(async () => {
    if (!audioUnlocked || isSpeaking || announcements.length === 0) {
      return;
    }

    for (const announcement of announcements) {
      if (isWithinSchedule(announcement) && shouldPlayNow(announcement)) {
        console.log('📢 Playing scheduled announcement:', announcement.title);
        
        // Mark as played immediately to prevent duplicate plays
        lastCheckRef.current[announcement.id] = Date.now();
        
        try {
          await onPlayAnnouncement(announcement.text_content, announcement.repeat_count);
          await updateLastPlayed(announcement.id);
        } catch (err) {
          console.error('Error playing scheduled announcement:', err);
        }
        
        // Only play one announcement at a time
        break;
      }
    }
  }, [audioUnlocked, isSpeaking, announcements, isWithinSchedule, shouldPlayNow, onPlayAnnouncement, updateLastPlayed]);

  // Load announcements on mount and when unit changes
  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!unitName) return;

    const channel = supabase
      .channel(`scheduled-announcements-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_announcements',
        },
        (payload) => {
          const newData = payload.new as ScheduledAnnouncement | undefined;
          if (newData?.unit_name === unitName || !newData) {
            console.log('📢 Scheduled announcements changed, reloading...');
            loadAnnouncements();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitName, loadAnnouncements]);

  // Check for announcements every minute
  useEffect(() => {
    if (!audioUnlocked) return;

    // Check immediately
    checkAnnouncements();

    // Then check every minute
    checkIntervalRef.current = setInterval(checkAnnouncements, 60000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [audioUnlocked, checkAnnouncements]);

  return {
    announcements,
    reload: loadAnnouncements,
  };
}
