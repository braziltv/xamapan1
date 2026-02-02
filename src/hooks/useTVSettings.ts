import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface TVSettings {
  // Background
  background_color: string;
  background_style: string;
  background_animation: boolean;
  // Header
  header_bg_color: string;
  header_text_color: string;
  header_logo_size: string;
  header_title_visible: boolean;
  // Clock
  clock_style: string;
  clock_color: string;
  // Cards
  card_size: string;
  card_animation: string;
  card_border_style: string;
  card_border_color: string;
  card_triage_bg: string;
  card_triage_text: string;
  card_doctor_bg: string;
  card_doctor_text: string;
  // Patient text
  patient_font_size: string;
  patient_font_weight: string;
  patient_text_transform: string;
  // Sidebar
  sidebar_visible: boolean;
  sidebar_width: string;
  sidebar_bg_color: string;
  sidebar_border_color: string;
  sidebar_items_count: number;
  // Ticker
  ticker_visible: boolean;
  ticker_bg_color: string;
  ticker_text_color: string;
  ticker_separator_color: string;
  ticker_speed: string;
  // Waiting messages
  waiting_message_visible: boolean;
  waiting_message_font_size: string;
  waiting_messages: string[];
}

export const defaultTVSettings: TVSettings = {
  // Background
  background_color: '#0a0a1a',
  background_style: 'gradient',
  background_animation: true,
  // Header
  header_bg_color: 'rgba(0, 0, 0, 0.3)',
  header_text_color: '#ffffff',
  header_logo_size: 'medium',
  header_title_visible: true,
  // Clock
  clock_style: 'digital',
  clock_color: '#38bdf8',
  // Cards
  card_size: 'large',
  card_animation: 'pulse',
  card_border_style: 'neon',
  card_border_color: '#38bdf8',
  card_triage_bg: 'linear-gradient(160deg, rgba(30,27,75,0.97) 0%, rgba(49,46,129,0.93) 50%, rgba(30,27,75,0.97) 100%)',
  card_triage_text: '#ffffff',
  card_doctor_bg: 'linear-gradient(160deg, rgba(6,78,59,0.97) 0%, rgba(4,120,87,0.93) 50%, rgba(6,78,59,0.97) 100%)',
  card_doctor_text: '#ffffff',
  // Patient text
  patient_font_size: '4xl',
  patient_font_weight: '800',
  patient_text_transform: 'uppercase',
  // Sidebar
  sidebar_visible: true,
  sidebar_width: '240px',
  sidebar_bg_color: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.95) 100%)',
  sidebar_border_color: 'rgba(99,102,241,0.4)',
  sidebar_items_count: 8,
  // Ticker
  ticker_visible: true,
  ticker_bg_color: '#1e1e2e',
  ticker_text_color: '#ffffff',
  ticker_separator_color: '#ef4444',
  ticker_speed: 'normal',
  // Waiting messages
  waiting_message_visible: true,
  waiting_message_font_size: 'base',
  waiting_messages: [
    "⏳ Aguarde um momento, já chamaremos você. Obrigado pela paciência! 🙏",
    "📋 Estamos organizando o atendimento. Em instantes, você será chamado. ✨",
    "🔔 Aguarde um momento, já chamaremos você. 😊",
  ],
};

export function useTVSettings(unitId?: string) {
  const [settings, setSettings] = useState<TVSettings>(defaultTVSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!unitId) {
      setSettings(defaultTVSettings);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tv_customization')
        .select('*')
        .eq('unit_id', unitId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar configurações da TV:', error);
        setSettings(defaultTVSettings);
      } else if (data) {
        // Merge with defaults to ensure all fields exist
        const waitingMessages = data.waiting_messages as Json;
        setSettings({
          background_color: data.background_color || defaultTVSettings.background_color,
          background_style: data.background_style || defaultTVSettings.background_style,
          background_animation: data.background_animation ?? defaultTVSettings.background_animation,
          header_bg_color: data.header_bg_color || defaultTVSettings.header_bg_color,
          header_text_color: data.header_text_color || defaultTVSettings.header_text_color,
          header_logo_size: data.header_logo_size || defaultTVSettings.header_logo_size,
          header_title_visible: data.header_title_visible ?? defaultTVSettings.header_title_visible,
          clock_style: data.clock_style || defaultTVSettings.clock_style,
          clock_color: data.clock_color || defaultTVSettings.clock_color,
          card_size: data.card_size || defaultTVSettings.card_size,
          card_animation: data.card_animation || defaultTVSettings.card_animation,
          card_border_style: data.card_border_style || defaultTVSettings.card_border_style,
          card_border_color: data.card_border_color || defaultTVSettings.card_border_color,
          card_triage_bg: data.card_triage_bg || defaultTVSettings.card_triage_bg,
          card_triage_text: data.card_triage_text || defaultTVSettings.card_triage_text,
          card_doctor_bg: data.card_doctor_bg || defaultTVSettings.card_doctor_bg,
          card_doctor_text: data.card_doctor_text || defaultTVSettings.card_doctor_text,
          patient_font_size: data.patient_font_size || defaultTVSettings.patient_font_size,
          patient_font_weight: data.patient_font_weight || defaultTVSettings.patient_font_weight,
          patient_text_transform: data.patient_text_transform || defaultTVSettings.patient_text_transform,
          sidebar_visible: data.sidebar_visible ?? defaultTVSettings.sidebar_visible,
          sidebar_width: data.sidebar_width || defaultTVSettings.sidebar_width,
          sidebar_bg_color: data.sidebar_bg_color || defaultTVSettings.sidebar_bg_color,
          sidebar_border_color: data.sidebar_border_color || defaultTVSettings.sidebar_border_color,
          sidebar_items_count: data.sidebar_items_count || defaultTVSettings.sidebar_items_count,
          ticker_visible: data.ticker_visible ?? defaultTVSettings.ticker_visible,
          ticker_bg_color: data.ticker_bg_color || defaultTVSettings.ticker_bg_color,
          ticker_text_color: data.ticker_text_color || defaultTVSettings.ticker_text_color,
          ticker_separator_color: data.ticker_separator_color || defaultTVSettings.ticker_separator_color,
          ticker_speed: data.ticker_speed || defaultTVSettings.ticker_speed,
          waiting_message_visible: data.waiting_message_visible ?? defaultTVSettings.waiting_message_visible,
          waiting_message_font_size: data.waiting_message_font_size || defaultTVSettings.waiting_message_font_size,
          waiting_messages: Array.isArray(waitingMessages) 
            ? waitingMessages.map(m => String(m))
            : defaultTVSettings.waiting_messages,
        });
      } else {
        // No customization found for this unit, use defaults
        setSettings(defaultTVSettings);
      }
    } catch (e) {
      console.error('Erro ao buscar configurações da TV:', e);
      setSettings(defaultTVSettings);
    }
    setLoading(false);
  }, [unitId]);

  // Listen for realtime updates to refresh settings
  useEffect(() => {
    if (!unitId) return;

    fetchSettings();

    // Subscribe to changes in tv_customization for this unit
    const channel = supabase
      .channel(`tv-customization-${unitId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tv_customization',
          filter: `unit_id=eq.${unitId}`,
        },
        () => {
          console.log('📺 TV customization updated, refreshing...');
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitId, fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
}

// Helper to get card header gradient based on type and settings
export function getCardHeaderStyle(
  type: 'triage' | 'doctor',
  isAnnouncing: boolean,
  settings: TVSettings
): React.CSSProperties {
  if (isAnnouncing) {
    // Yellow/orange when actively calling
    return {
      background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #f59e0b 100%)',
    };
  }
  
  if (type === 'triage') {
    return {
      background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)',
    };
  }
  
  return {
    background: 'linear-gradient(135deg, #047857 0%, #10b981 50%, #34d399 100%)',
  };
}

// Helper to get sidebar width value
export function getSidebarWidth(settings: TVSettings): string {
  const width = settings.sidebar_width;
  if (width === '280px') return 'minmax(160px, 200px)';
  if (width === '380px') return 'minmax(220px, 280px)';
  return 'minmax(180px, 240px)'; // default 320px
}

// Helper to get ticker speed duration
export function getTickerDuration(speed: string): string {
  if (speed === 'slow') return '2500s';
  if (speed === 'fast') return '1500s';
  return '2000s'; // normal
}
