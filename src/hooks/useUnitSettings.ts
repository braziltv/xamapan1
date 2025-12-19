import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnitSettings {
  patient_call_voice: string | null;
  commercial_phrase_1: string | null;
  commercial_phrase_2: string | null;
  commercial_phrase_3: string | null;
}

const DEFAULT_VOICE = 'pt-BR-Chirp3-HD-Achernar';

export function useUnitSettings(unitName: string | null) {
  const [settings, setSettings] = useState<UnitSettings>({ 
    patient_call_voice: null,
    commercial_phrase_1: null,
    commercial_phrase_2: null,
    commercial_phrase_3: null,
  });
  const [loading, setLoading] = useState(true);

  // Fetch current settings
  const fetchSettings = useCallback(async () => {
    if (!unitName) return;
    
    try {
      const { data, error } = await supabase
        .from('unit_settings')
        .select('patient_call_voice, commercial_phrase_1, commercial_phrase_2, commercial_phrase_3')
        .eq('unit_name', unitName)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching unit settings:', error);
        return;
      }
      
      if (data) {
        console.log('📡 Loaded unit settings:', data);
        setSettings({ 
          patient_call_voice: data.patient_call_voice,
          commercial_phrase_1: data.commercial_phrase_1,
          commercial_phrase_2: data.commercial_phrase_2,
          commercial_phrase_3: data.commercial_phrase_3,
        });
      }
    } catch (err) {
      console.error('Error fetching unit settings:', err);
    } finally {
      setLoading(false);
    }
  }, [unitName]);

  // Update voice setting
  const updateVoice = useCallback(async (voice: string) => {
    if (!unitName) return false;
    
    try {
      const { error } = await supabase
        .from('unit_settings')
        .upsert(
          { unit_name: unitName, patient_call_voice: voice },
          { onConflict: 'unit_name' }
        );
      
      if (error) {
        console.error('Error updating voice setting:', error);
        return false;
      }
      
      console.log('✅ Voice setting synced to database:', voice);
      setSettings(prev => ({ ...prev, patient_call_voice: voice }));
      return true;
    } catch (err) {
      console.error('Error updating voice setting:', err);
      return false;
    }
  }, [unitName]);

  // Update commercial phrases
  const updateCommercialPhrases = useCallback(async (phrases: { phrase1: string; phrase2: string; phrase3: string }) => {
    if (!unitName) return false;
    
    try {
      const { error } = await supabase
        .from('unit_settings')
        .upsert(
          { 
            unit_name: unitName, 
            commercial_phrase_1: phrases.phrase1 || null,
            commercial_phrase_2: phrases.phrase2 || null,
            commercial_phrase_3: phrases.phrase3 || null,
          },
          { onConflict: 'unit_name' }
        );
      
      if (error) {
        console.error('Error updating commercial phrases:', error);
        return false;
      }
      
      console.log('✅ Commercial phrases synced to database');
      setSettings(prev => ({ 
        ...prev, 
        commercial_phrase_1: phrases.phrase1 || null,
        commercial_phrase_2: phrases.phrase2 || null,
        commercial_phrase_3: phrases.phrase3 || null,
      }));
      return true;
    } catch (err) {
      console.error('Error updating commercial phrases:', err);
      return false;
    }
  }, [unitName]);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!unitName) return;

    console.log('📡 Setting up realtime subscription for unit_settings:', unitName);
    
    // Use a simple channel name without special characters
    const channelName = `unit-settings-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unit_settings',
        },
        (payload) => {
          // Filter by unit_name in the callback to avoid filter encoding issues
          const newData = payload.new as { 
            unit_name?: string; 
            patient_call_voice?: string;
            commercial_phrase_1?: string;
            commercial_phrase_2?: string;
            commercial_phrase_3?: string;
          };
          if (newData?.unit_name === unitName) {
            console.log('📡 Unit settings changed (realtime):', payload);
            setSettings({
              patient_call_voice: newData.patient_call_voice ?? null,
              commercial_phrase_1: newData.commercial_phrase_1 ?? null,
              commercial_phrase_2: newData.commercial_phrase_2 ?? null,
              commercial_phrase_3: newData.commercial_phrase_3 ?? null,
            });
            // Also update localStorage for immediate local fallback
            if (newData.patient_call_voice !== undefined) {
              localStorage.setItem('patientCallVoice', newData.patient_call_voice || DEFAULT_VOICE);
              // Dispatch event for other components
              window.dispatchEvent(new CustomEvent('voiceSettingChanged', { 
                detail: { voice: newData.patient_call_voice || DEFAULT_VOICE } 
              }));
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Unit settings subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Unit settings subscription error:', err);
        } else {
          console.log('📡 Unit settings subscription status:', status);
        }
      });

    return () => {
      console.log('📡 Removing unit_settings subscription');
      supabase.removeChannel(channel);
    };
  }, [unitName]);

  const voice = settings.patient_call_voice || DEFAULT_VOICE;
  const commercialPhrases = [
    settings.commercial_phrase_1,
    settings.commercial_phrase_2,
    settings.commercial_phrase_3,
  ].filter(Boolean) as string[];

  return {
    voice,
    updateVoice,
    commercialPhrases,
    updateCommercialPhrases,
    loading,
  };
}
