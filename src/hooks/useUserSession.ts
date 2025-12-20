import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionData {
  id: string;
  unit_name: string;
  station: string;
  ip_address: string | null;
  is_tv_mode: boolean;
}

const SESSION_KEY = 'user_session_id';

export function useUserSession() {
  const sessionIdRef = useRef<string | null>(null);
  const lastActivityRef = useRef<Date>(new Date());

  // Get user's IP address
  const getIpAddress = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || null;
    } catch {
      return null;
    }
  }, []);

  // Create a new session
  const createSession = useCallback(async (
    unitName: string,
    station: string = 'login',
    isTvMode: boolean = false
  ): Promise<string | null> => {
    try {
      const ipAddress = await getIpAddress();
      const userAgent = navigator.userAgent;

      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          unit_name: unitName,
          station,
          ip_address: ipAddress,
          user_agent: userAgent,
          is_tv_mode: isTvMode,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return null;
      }

      const sessionId = data.id;
      sessionIdRef.current = sessionId;
      localStorage.setItem(SESSION_KEY, sessionId);
      
      return sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }, [getIpAddress]);

  // Update session activity
  const updateActivity = useCallback(async (station?: string) => {
    const sessionId = sessionIdRef.current || localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    const now = new Date();
    // Throttle updates to every 30 seconds
    if (now.getTime() - lastActivityRef.current.getTime() < 30000) return;
    lastActivityRef.current = now;

    try {
      const updateData: Record<string, unknown> = {
        last_activity_at: now.toISOString(),
      };

      if (station) {
        updateData.station = station;
      }

      await supabase
        .from('user_sessions')
        .update(updateData)
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  }, []);

  // Increment counters
  const incrementCounter = useCallback(async (
    counter: 'voice_calls_count' | 'tts_calls_count' | 'registrations_count' | 'messages_sent'
  ) => {
    const sessionId = sessionIdRef.current || localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    try {
      // First get current value
      const { data } = await supabase
        .from('user_sessions')
        .select(counter)
        .eq('id', sessionId)
        .single();

      if (data) {
        const currentValue = (data as Record<string, number>)[counter] || 0;
        await supabase
          .from('user_sessions')
          .update({ 
            [counter]: currentValue + 1,
            last_activity_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      }
    } catch (error) {
      console.error('Error incrementing counter:', error);
    }
  }, []);

  // End session
  const endSession = useCallback(async () => {
    const sessionId = sessionIdRef.current || localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    try {
      await supabase
        .from('user_sessions')
        .update({
          logout_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', sessionId);

      localStorage.removeItem(SESSION_KEY);
      sessionIdRef.current = null;
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem(SESSION_KEY);
    if (storedSessionId) {
      sessionIdRef.current = storedSessionId;
      // Update activity to show session is still active
      updateActivity();
    }
  }, [updateActivity]);

  // Track page visibility for activity updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
      }
    };

    const handleBeforeUnload = () => {
      // Mark session as inactive on page close
      const sessionId = sessionIdRef.current || localStorage.getItem(SESSION_KEY);
      if (sessionId) {
        // Use sendBeacon for reliable delivery on page unload
        const data = JSON.stringify({ is_active: false, logout_at: new Date().toISOString() });
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionId}`,
          data
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updateActivity]);

  return {
    createSession,
    updateActivity,
    incrementCounter,
    endSession,
    getSessionId: () => sessionIdRef.current || localStorage.getItem(SESSION_KEY),
  };
}
