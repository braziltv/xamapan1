import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface TVCustomization {
  id: string;
  unit_id: string;
  preset_name: string | null;
  // Background
  background_color: string | null;
  background_style: string | null;
  background_animation: boolean | null;
  // Header
  header_bg_color: string | null;
  header_text_color: string | null;
  header_logo_size: string | null;
  header_title_visible: boolean | null;
  // Clock
  clock_style: string | null;
  clock_color: string | null;
  // Cards
  card_size: string | null;
  card_animation: string | null;
  card_border_style: string | null;
  card_border_color: string | null;
  card_triage_bg: string | null;
  card_triage_text: string | null;
  card_doctor_bg: string | null;
  card_doctor_text: string | null;
  // Patient text
  patient_font_size: string | null;
  patient_font_weight: string | null;
  patient_text_transform: string | null;
  // Sidebar
  sidebar_visible: boolean | null;
  sidebar_width: string | null;
  sidebar_bg_color: string | null;
  sidebar_border_color: string | null;
  sidebar_items_count: number | null;
  // Ticker
  ticker_visible: boolean | null;
  ticker_bg_color: string | null;
  ticker_text_color: string | null;
  ticker_separator_color: string | null;
  ticker_speed: string | null;
  // Waiting messages
  waiting_message_visible: boolean | null;
  waiting_message_font_size: string | null;
  waiting_messages: string[] | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export const defaultCustomization: Omit<TVCustomization, 'id' | 'unit_id' | 'created_at' | 'updated_at'> = {
  preset_name: 'Padrão',
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
  card_triage_bg: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
  card_triage_text: '#ffffff',
  card_doctor_bg: 'linear-gradient(135deg, #059669, #10b981)',
  card_doctor_text: '#ffffff',
  // Patient text
  patient_font_size: '4xl',
  patient_font_weight: '800',
  patient_text_transform: 'uppercase',
  // Sidebar
  sidebar_visible: true,
  sidebar_width: '320px',
  sidebar_bg_color: 'rgba(0, 0, 0, 0.4)',
  sidebar_border_color: '#38bdf8',
  sidebar_items_count: 8,
  // Ticker
  ticker_visible: true,
  ticker_bg_color: '#1e1e2e',
  ticker_text_color: '#ffffff',
  ticker_separator_color: '#ef4444',
  ticker_speed: 'normal',
  // Waiting messages
  waiting_message_visible: true,
  waiting_message_font_size: 'xl',
  waiting_messages: [
    'Aguarde sua vez, estamos te chamando em breve!',
    'Mantenha seu documento em mãos',
    'Fique atento ao painel de chamadas'
  ],
};

export const presets: Record<string, Partial<typeof defaultCustomization>> = {
  'Padrão': defaultCustomization,
  'Moderno Escuro': {
    ...defaultCustomization,
    background_color: '#0f0f23',
    background_style: 'solid',
    card_border_style: 'minimal',
    clock_style: 'minimal',
  },
  'Clássico Azul': {
    ...defaultCustomization,
    background_color: '#1e3a5f',
    header_bg_color: '#0d2137',
    card_triage_bg: 'linear-gradient(135deg, #1e40af, #3b82f6)',
    card_doctor_bg: 'linear-gradient(135deg, #14532d, #22c55e)',
    clock_color: '#60a5fa',
    card_border_color: '#60a5fa',
  },
  'Saúde Verde': {
    ...defaultCustomization,
    background_color: '#0a2818',
    header_bg_color: '#052e16',
    card_triage_bg: 'linear-gradient(135deg, #065f46, #10b981)',
    card_doctor_bg: 'linear-gradient(135deg, #1e3a5f, #3b82f6)',
    clock_color: '#34d399',
    card_border_color: '#34d399',
    sidebar_border_color: '#34d399',
  },
  'Elegante Roxo': {
    ...defaultCustomization,
    background_color: '#1a0a2e',
    header_bg_color: '#0f0518',
    card_triage_bg: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    card_doctor_bg: 'linear-gradient(135deg, #be185d, #ec4899)',
    clock_color: '#c084fc',
    card_border_color: '#c084fc',
    sidebar_border_color: '#c084fc',
  },
  'Alto Contraste': {
    ...defaultCustomization,
    background_color: '#000000',
    background_animation: false,
    header_bg_color: '#000000',
    card_triage_bg: '#ffffff',
    card_triage_text: '#000000',
    card_doctor_bg: '#ffff00',
    card_doctor_text: '#000000',
    clock_color: '#ffffff',
    card_border_color: '#ffffff',
    sidebar_border_color: '#ffffff',
    ticker_bg_color: '#000000',
  },
};

export function useTVCustomization(unitId?: string) {
  const [customization, setCustomization] = useState<TVCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCustomization = useCallback(async () => {
    if (!unitId) {
      setCustomization(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('tv_customization')
      .select('*')
      .eq('unit_id', unitId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar customização:', error);
      toast.error('Erro ao carregar configurações da TV');
    } else if (data) {
      // Convert waiting_messages from Json to string[]
      const waitingMessages = data.waiting_messages as Json;
      setCustomization({
        ...data,
        waiting_messages: Array.isArray(waitingMessages) 
          ? waitingMessages.map(m => String(m))
          : null,
      });
    } else {
      // Create default customization for this unit
      await createDefaultCustomization(unitId);
    }
    setLoading(false);
  }, [unitId]);

  const createDefaultCustomization = async (unitId: string) => {
    const { data, error } = await supabase
      .from('tv_customization')
      .insert({
        unit_id: unitId,
        ...defaultCustomization,
        waiting_messages: defaultCustomization.waiting_messages as unknown as Json,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar customização padrão:', error);
    } else if (data) {
      const waitingMessages = data.waiting_messages as Json;
      setCustomization({
        ...data,
        waiting_messages: Array.isArray(waitingMessages) 
          ? waitingMessages.map(m => String(m))
          : null,
      });
    }
  };

  const updateCustomization = async (updates: Partial<TVCustomization>) => {
    if (!unitId || !customization) return false;

    setSaving(true);
    
    // Convert waiting_messages to Json for database
    const dbUpdates: Record<string, unknown> = { ...updates };
    if ('waiting_messages' in updates) {
      dbUpdates.waiting_messages = updates.waiting_messages as unknown as Json;
    }
    
    const { error } = await supabase
      .from('tv_customization')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('unit_id', unitId);

    if (error) {
      console.error('Erro ao salvar customização:', error);
      toast.error('Erro ao salvar configurações');
      setSaving(false);
      return false;
    }

    setCustomization(prev => prev ? { ...prev, ...updates } : null);
    setSaving(false);
    return true;
  };

  const applyPreset = async (presetName: string) => {
    const preset = presets[presetName];
    if (!preset) return false;

    const success = await updateCustomization({
      ...preset,
      preset_name: presetName,
    } as Partial<TVCustomization>);

    if (success) {
      toast.success(`Preset "${presetName}" aplicado!`);
    }
    return success;
  };

  const triggerTVReload = async () => {
    try {
      const response = await supabase.functions.invoke('tv-reload-command', {
        body: { action: 'reload' },
      });
      
      if (response.error) throw response.error;
      toast.success('Comando de atualização enviado para as TVs!');
      return true;
    } catch (error) {
      console.error('Erro ao enviar comando:', error);
      toast.error('Erro ao enviar comando para as TVs');
      return false;
    }
  };

  useEffect(() => {
    fetchCustomization();
  }, [fetchCustomization]);

  return {
    customization,
    loading,
    saving,
    updateCustomization,
    applyPreset,
    triggerTVReload,
    refetch: fetchCustomization,
  };
}
