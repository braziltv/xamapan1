import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FrequentPatientData {
  name: string;
  visitCount: number;
  lastVisit: string;
}

const FREQUENT_THRESHOLD = 3; // 3+ visitas = frequente
const DAYS_TO_CHECK = 30; // Últimos 30 dias

export function useFrequentPatients(unitName: string) {
  const [frequentPatients, setFrequentPatients] = useState<Map<string, FrequentPatientData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchFrequentPatients = useCallback(async () => {
    if (!unitName) return;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - DAYS_TO_CHECK);

      const { data, error } = await supabase
        .from('call_history')
        .select('patient_name, created_at')
        .eq('unit_name', unitName)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching frequent patients:', error);
        return;
      }

      // Contar visitas por paciente (case insensitive)
      const patientVisits = new Map<string, { count: number; lastVisit: string }>();
      
      data?.forEach(record => {
        const normalizedName = record.patient_name.toLowerCase().trim();
        const existing = patientVisits.get(normalizedName);
        
        if (existing) {
          existing.count++;
        } else {
          patientVisits.set(normalizedName, {
            count: 1,
            lastVisit: record.created_at
          });
        }
      });

      // Filtrar apenas pacientes frequentes
      const frequent = new Map<string, FrequentPatientData>();
      patientVisits.forEach((value, key) => {
        if (value.count >= FREQUENT_THRESHOLD) {
          frequent.set(key, {
            name: key,
            visitCount: value.count,
            lastVisit: value.lastVisit
          });
        }
      });

      setFrequentPatients(frequent);
    } catch (err) {
      console.error('Error in useFrequentPatients:', err);
    } finally {
      setIsLoading(false);
    }
  }, [unitName]);

  useEffect(() => {
    fetchFrequentPatients();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchFrequentPatients, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchFrequentPatients]);

  const isFrequentPatient = useCallback((patientName: string): FrequentPatientData | null => {
    const normalizedName = patientName.toLowerCase().trim();
    return frequentPatients.get(normalizedName) || null;
  }, [frequentPatients]);

  return {
    isFrequentPatient,
    frequentPatients,
    isLoading,
    refetch: fetchFrequentPatients
  };
}
