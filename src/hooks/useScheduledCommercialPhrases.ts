import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ScheduledCommercialPhrase {
  id: string;
  unit_name: string;
  phrase_content: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  display_order: number;
}

export function useScheduledCommercialPhrases(unitName: string | null) {
  const [activePhrases, setActivePhrases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isWithinSchedule = useCallback((phrase: ScheduledCommercialPhrase): boolean => {
    const now = new Date();
    const today = now.getDay(); // 0-6, Sunday = 0
    
    // Check if today is in the days_of_week
    if (!phrase.days_of_week.includes(today)) {
      return false;
    }
    
    // Check valid_from and valid_until
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const validFrom = new Date(phrase.valid_from);
    const validUntil = new Date(phrase.valid_until);
    
    if (todayDate < validFrom || todayDate > validUntil) {
      return false;
    }
    
    // Check time range
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = phrase.start_time.slice(0, 5).split(':').map(Number);
    const [endHour, endMin] = phrase.end_time.slice(0, 5).split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }, []);

  const loadActivePhrases = useCallback(async () => {
    if (!unitName) {
      setActivePhrases([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('scheduled_commercial_phrases')
        .select('*')
        .eq('unit_name', unitName)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Filter phrases that are within their schedule
      const validPhrases = (data || [])
        .filter(phrase => isWithinSchedule(phrase))
        .map(phrase => phrase.phrase_content);

      setActivePhrases(validPhrases);
    } catch (err) {
      console.error('Error loading scheduled commercial phrases:', err);
      setActivePhrases([]);
    } finally {
      setLoading(false);
    }
  }, [unitName, isWithinSchedule]);

  // Initial load
  useEffect(() => {
    loadActivePhrases();
  }, [loadActivePhrases]);

  // Refresh every minute to check for schedule changes
  useEffect(() => {
    const interval = setInterval(loadActivePhrases, 60000);
    return () => clearInterval(interval);
  }, [loadActivePhrases]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!unitName) return;

    const channel = supabase
      .channel(`scheduled-phrases-${unitName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_commercial_phrases',
        },
        (payload) => {
          const data = payload.new as { unit_name?: string };
          if (data?.unit_name === unitName || (payload.old as any)?.unit_name === unitName) {
            loadActivePhrases();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitName, loadActivePhrases]);

  return {
    activePhrases,
    loading,
    reload: loadActivePhrases,
  };
}
