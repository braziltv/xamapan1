import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Patient, PatientPriority } from '@/types/patient';
import { startOfDay, subDays } from 'date-fns';

interface WaitTimeStats {
  avgTriageWait: number; // minutos
  avgDoctorWait: number; // minutos
  avgTotalService: number; // minutos
  loading: boolean;
}

interface PatientEstimate {
  estimatedMinutes: number;
  queuePosition: number;
  stage: 'triage' | 'doctor';
}

export function useWaitTimeEstimate(unitName: string) {
  const [stats, setStats] = useState<WaitTimeStats>({
    avgTriageWait: 15, // valor padrão
    avgDoctorWait: 20, // valor padrão
    avgTotalService: 35,
    loading: true,
  });

  // Calcular estatísticas baseadas no histórico
  const calculateStats = useCallback(async () => {
    if (!unitName) return;

    try {
      // Buscar histórico dos últimos 7 dias
      const sevenDaysAgo = startOfDay(subDays(new Date(), 7));
      
      const { data: history, error } = await supabase
        .from('call_history')
        .select('*')
        .eq('unit_name', unitName)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar histórico:', error);
        return;
      }

      if (!history || history.length === 0) {
        setStats(prev => ({ ...prev, loading: false }));
        return;
      }

      // Agrupar chamadas por hora para estimar tempo entre chamadas
      const triageCalls = history.filter(h => h.call_type === 'triage');
      const doctorCalls = history.filter(h => h.call_type === 'doctor');

      // Calcular tempo médio entre chamadas de triagem
      let avgTriageInterval = 15; // padrão 15 min
      if (triageCalls.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < triageCalls.length; i++) {
          const diff = (new Date(triageCalls[i].created_at).getTime() - 
                       new Date(triageCalls[i-1].created_at).getTime()) / (1000 * 60);
          if (diff > 0 && diff < 120) { // ignorar intervalos > 2h (pausas)
            intervals.push(diff);
          }
        }
        if (intervals.length > 0) {
          avgTriageInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
        }
      }

      // Calcular tempo médio entre chamadas de médico
      let avgDoctorInterval = 20; // padrão 20 min
      if (doctorCalls.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < doctorCalls.length; i++) {
          const diff = (new Date(doctorCalls[i].created_at).getTime() - 
                       new Date(doctorCalls[i-1].created_at).getTime()) / (1000 * 60);
          if (diff > 0 && diff < 120) {
            intervals.push(diff);
          }
        }
        if (intervals.length > 0) {
          avgDoctorInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
        }
      }

      // Limitar valores para serem razoáveis
      avgTriageInterval = Math.max(5, Math.min(60, avgTriageInterval));
      avgDoctorInterval = Math.max(5, Math.min(60, avgDoctorInterval));

      setStats({
        avgTriageWait: avgTriageInterval,
        avgDoctorWait: avgDoctorInterval,
        avgTotalService: avgTriageInterval + avgDoctorInterval,
        loading: false,
      });
    } catch (err) {
      console.error('Erro ao calcular estatísticas:', err);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [unitName]);

  useEffect(() => {
    calculateStats();
    // Recalcular a cada 5 minutos
    const interval = setInterval(calculateStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [calculateStats]);

  // Calcular estimativa para um paciente específico
  const getEstimateForPatient = useCallback((
    patient: Patient,
    allPatients: Patient[]
  ): PatientEstimate | null => {
    const { avgTriageWait, avgDoctorWait } = stats;

    // Determinar em qual fila o paciente está
    if (patient.status === 'waiting') {
      // Paciente aguardando triagem
      const waitingQueue = allPatients
        .filter(p => p.status === 'waiting')
        .sort((a, b) => {
          // Ordenar por prioridade primeiro
          const priorityOrder: Record<PatientPriority, number> = { emergency: 0, priority: 1, normal: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          // Depois por tempo de chegada
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

      const position = waitingQueue.findIndex(p => p.id === patient.id) + 1;
      
      // Ajustar tempo baseado na prioridade
      let multiplier = 1;
      if (patient.priority === 'emergency') multiplier = 0.5;
      else if (patient.priority === 'priority') multiplier = 0.75;

      const estimatedMinutes = Math.round(position * avgTriageWait * multiplier);

      return {
        estimatedMinutes,
        queuePosition: position,
        stage: 'triage',
      };
    }

    if (patient.status === 'waiting-doctor') {
      // Paciente aguardando médico
      const waitingQueue = allPatients
        .filter(p => p.status === 'waiting-doctor')
        .sort((a, b) => {
          const priorityOrder: Record<PatientPriority, number> = { emergency: 0, priority: 1, normal: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

      const position = waitingQueue.findIndex(p => p.id === patient.id) + 1;
      
      let multiplier = 1;
      if (patient.priority === 'emergency') multiplier = 0.5;
      else if (patient.priority === 'priority') multiplier = 0.75;

      const estimatedMinutes = Math.round(position * avgDoctorWait * multiplier);

      return {
        estimatedMinutes,
        queuePosition: position,
        stage: 'doctor',
      };
    }

    return null;
  }, [stats]);

  // Formatar tempo estimado para exibição
  const formatEstimate = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `~${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `~${hours}h`;
    return `~${hours}h ${mins}min`;
  };

  return {
    stats,
    getEstimateForPatient,
    formatEstimate,
    refresh: calculateStats,
  };
}
