import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionData {
  id: string;
  unit_name: string;
  station: string;
  ip_address: string | null;
  is_tv_mode: boolean;
}

interface SessionMetrics {
  clicks: number;
  keystrokes: number;
  scrolls: number;
  pageViews: number;
  idleTime: number;
  activeTime: number;
}

const SESSION_KEY = 'user_session_id';
const METRICS_KEY = 'session_metrics';
const TV_MODE_KEY = 'session_is_tv_mode';
const HEARTBEAT_INTERVAL = 15000; // 15 seconds for regular sessions
const TV_HEARTBEAT_INTERVAL = 60000; // 60 seconds for TV mode
const IDLE_THRESHOLD = 60000; // 1 minute
const ACTIVITY_THROTTLE = 5000; // 5 seconds

export function useUserSession() {
  const sessionIdRef = useRef<string | null>(null);
  const isTvModeRef = useRef<boolean>(false);
  const lastActivityRef = useRef<Date>(new Date());
  const lastUserInteractionRef = useRef<Date>(new Date());
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTimeStartRef = useRef<Date>(new Date());
  const isIdleRef = useRef<boolean>(false);
  
  const [metrics, setMetrics] = useState<SessionMetrics>(() => {
    try {
      const saved = localStorage.getItem(METRICS_KEY);
      return saved ? JSON.parse(saved) : {
        clicks: 0,
        keystrokes: 0,
        scrolls: 0,
        pageViews: 0,
        idleTime: 0,
        activeTime: 0,
      };
    } catch {
      return {
        clicks: 0,
        keystrokes: 0,
        scrolls: 0,
        pageViews: 0,
        idleTime: 0,
        activeTime: 0,
      };
    }
  });

  // Save metrics to localStorage
  useEffect(() => {
    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
  }, [metrics]);

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
      isTvModeRef.current = isTvMode;
      localStorage.setItem(SESSION_KEY, sessionId);
      localStorage.setItem(TV_MODE_KEY, isTvMode.toString());
      
      // Reset metrics for new session
      setMetrics({
        clicks: 0,
        keystrokes: 0,
        scrolls: 0,
        pageViews: 1,
        idleTime: 0,
        activeTime: 0,
      });
      
      activeTimeStartRef.current = new Date();
      console.log('📊 Session created:', sessionId);
      
      return sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }, [getIpAddress]);

  // Update session activity with more precise tracking
  const updateActivity = useCallback(async (station?: string, forceUpdate: boolean = false) => {
    const sessionId = sessionIdRef.current || localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    const now = new Date();
    
    // Throttle updates unless forced
    if (!forceUpdate && now.getTime() - lastActivityRef.current.getTime() < ACTIVITY_THROTTLE) return;
    lastActivityRef.current = now;

    try {
      const updateData: Record<string, unknown> = {
        last_activity_at: now.toISOString(),
        is_active: true,
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

  // Record user interaction for precision tracking
  const recordInteraction = useCallback((type: 'click' | 'keystroke' | 'scroll') => {
    const now = new Date();
    lastUserInteractionRef.current = now;
    
    // If was idle, calculate idle time
    if (isIdleRef.current) {
      isIdleRef.current = false;
      activeTimeStartRef.current = now;
    }
    
    setMetrics(prev => ({
      ...prev,
      [type === 'click' ? 'clicks' : type === 'keystroke' ? 'keystrokes' : 'scrolls']: 
        prev[type === 'click' ? 'clicks' : type === 'keystroke' ? 'keystrokes' : 'scrolls'] + 1,
    }));
  }, []);

  // Record page view
  const recordPageView = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      pageViews: prev.pageViews + 1,
    }));
    updateActivity(undefined, true);
  }, [updateActivity]);

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
        
        console.log(`📊 Counter incremented: ${counter} = ${currentValue + 1}`);
      }
    } catch (error) {
      console.error('Error incrementing counter:', error);
    }
  }, []);

  // End session with final metrics
  const endSession = useCallback(async () => {
    const sessionId = sessionIdRef.current || localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    // Calculate final active time
    const now = new Date();
    const finalActiveTime = metrics.activeTime + 
      (now.getTime() - activeTimeStartRef.current.getTime()) / 1000;

    try {
      await supabase
        .from('user_sessions')
        .update({
          logout_at: now.toISOString(),
          is_active: false,
        })
        .eq('id', sessionId);

      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(METRICS_KEY);
      localStorage.removeItem(TV_MODE_KEY);
      sessionIdRef.current = null;
      isTvModeRef.current = false;
      
      console.log('📊 Session ended. Final metrics:', {
        ...metrics,
        activeTime: Math.round(finalActiveTime),
      });
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }, [metrics]);

  // Heartbeat for precise session tracking
  useEffect(() => {
    const sessionId = sessionIdRef.current || localStorage.getItem(SESSION_KEY);
    if (!sessionId) return;

    // Check if TV mode from localStorage
    const storedTvMode = localStorage.getItem(TV_MODE_KEY) === 'true';
    const isTvMode = isTvModeRef.current || storedTvMode;
    
    // Use longer interval for TV mode
    const interval = isTvMode ? TV_HEARTBEAT_INTERVAL : HEARTBEAT_INTERVAL;

    const heartbeat = async () => {
      const now = new Date();
      const timeSinceInteraction = now.getTime() - lastUserInteractionRef.current.getTime();
      
      // TV mode is always considered active (no user interaction needed)
      if (isTvMode) {
        try {
          await supabase
            .from('user_sessions')
            .update({
              last_activity_at: now.toISOString(),
              is_active: true,
            })
            .eq('id', sessionId);
          console.log('📺 TV heartbeat sent');
        } catch (error) {
          console.error('TV Heartbeat error:', error);
        }
        return;
      }
      
      // Regular session: check if user is idle
      if (timeSinceInteraction > IDLE_THRESHOLD && !isIdleRef.current) {
        isIdleRef.current = true;
        // Add active time before going idle
        const activeSeconds = (now.getTime() - activeTimeStartRef.current.getTime()) / 1000;
        setMetrics(prev => ({
          ...prev,
          activeTime: prev.activeTime + activeSeconds,
        }));
        console.log('📊 User went idle');
      } else if (timeSinceInteraction <= IDLE_THRESHOLD && isIdleRef.current) {
        isIdleRef.current = false;
        activeTimeStartRef.current = now;
        console.log('📊 User became active');
      }
      
      // Track idle time
      if (isIdleRef.current) {
        setMetrics(prev => ({
          ...prev,
          idleTime: prev.idleTime + (HEARTBEAT_INTERVAL / 1000),
        }));
      }

      // Update session in database
      try {
        await supabase
          .from('user_sessions')
          .update({
            last_activity_at: now.toISOString(),
            is_active: !isIdleRef.current,
          })
          .eq('id', sessionId);
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    };

    // Execute heartbeat immediately for TV mode
    if (isTvMode) {
      heartbeat();
    }

    heartbeatIntervalRef.current = setInterval(heartbeat, interval);
    console.log(`📊 Heartbeat started with ${interval / 1000}s interval (TV mode: ${isTvMode})`);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  // Restore session on mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem(SESSION_KEY);
    const storedTvMode = localStorage.getItem(TV_MODE_KEY) === 'true';
    
    if (storedSessionId) {
      sessionIdRef.current = storedSessionId;
      isTvModeRef.current = storedTvMode;
      // Update activity to show session is still active
      updateActivity(undefined, true);
      console.log(`📊 Session restored: ${storedSessionId} (TV mode: ${storedTvMode})`);
    }
  }, [updateActivity]);

  // Track user interactions for precision monitoring
  useEffect(() => {
    let scrollThrottle: ReturnType<typeof setTimeout> | null = null;
    
    const handleClick = () => recordInteraction('click');
    const handleKeydown = () => recordInteraction('keystroke');
    const handleScroll = () => {
      if (scrollThrottle) return;
      scrollThrottle = setTimeout(() => {
        recordInteraction('scroll');
        scrollThrottle = null;
      }, 500);
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('scroll', handleScroll);
      if (scrollThrottle) clearTimeout(scrollThrottle);
    };
  }, [recordInteraction]);

  // Track page visibility for activity updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActivity(undefined, true);
        activeTimeStartRef.current = new Date();
        isIdleRef.current = false;
        console.log('📊 Page became visible');
      } else if (document.visibilityState === 'hidden') {
        // Calculate active time before hiding
        const now = new Date();
        if (!isIdleRef.current) {
          const activeSeconds = (now.getTime() - activeTimeStartRef.current.getTime()) / 1000;
          setMetrics(prev => ({
            ...prev,
            activeTime: prev.activeTime + activeSeconds,
          }));
        }
        
        // Mark session as inactive when page is hidden
        const sessionId = sessionIdRef.current || localStorage.getItem(SESSION_KEY);
        if (sessionId) {
          supabase
            .from('user_sessions')
            .update({ 
              last_activity_at: now.toISOString(),
              is_active: false,
            })
            .eq('id', sessionId)
            .then(() => {});
        }
        console.log('📊 Page became hidden');
      }
    };

    const handleBeforeUnload = () => {
      // Mark session as inactive on page close
      const sessionId = sessionIdRef.current || localStorage.getItem(SESSION_KEY);
      if (sessionId) {
        supabase
          .from('user_sessions')
          .update({ 
            is_active: false, 
            logout_at: new Date().toISOString() 
          })
          .eq('id', sessionId)
          .then(() => {});
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
    recordPageView,
    recordInteraction,
    getSessionId: () => sessionIdRef.current || localStorage.getItem(SESSION_KEY),
    metrics,
    isIdle: isIdleRef.current,
  };
}
