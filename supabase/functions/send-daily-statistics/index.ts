import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallHistoryRecord {
  id: string;
  patient_name: string;
  call_type: string;
  destination: string | null;
  created_at: string;
  unit_name: string;
}

interface PatientCallRecord {
  id: string;
  status: string;
  call_type: string;
  completed_at: string | null;
  created_at: string;
}

interface UserSessionRecord {
  id: string;
  is_active: boolean;
  login_at: string;
  unit_name: string;
}

function getBrazilDate(): { today: string; startOfDay: string; endOfDay: string; sevenDaysAgo: string } {
  const now = new Date();
  // Get Brazil time offset (-3 hours from UTC)
  const brazilOffset = -3 * 60; // in minutes
  const utcOffset = now.getTimezoneOffset();
  const brazilTime = new Date(now.getTime() + (utcOffset + brazilOffset) * 60000);
  
  const today = brazilTime.toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00-03:00`;
  const endOfDay = `${today}T23:59:59-03:00`;
  
  // Calculate 7 days ago
  const sevenDaysAgoDate = new Date(brazilTime);
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
  const sevenDaysAgo = sevenDaysAgoDate.toISOString().split('T')[0];
  
  return { today, startOfDay, endOfDay, sevenDaysAgo };
}

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { today, startOfDay, endOfDay, sevenDaysAgo } = getBrazilDate();
    
    console.log('📊 Starting daily statistics report...');
    console.log(`Date: ${today}, 7 days ago: ${sevenDaysAgo}`);

    // ========== DAILY DATA ==========
    
    // Get call history for today
    const { data: todayCallHistory, error: callError } = await supabase
      .from('call_history')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (callError) {
      console.error('Error fetching call history:', callError);
    }

    const callHistory: CallHistoryRecord[] = todayCallHistory || [];

    // Get patients currently in queue
    const { data: patientsInQueue, error: queueError } = await supabase
      .from('patient_calls')
      .select('*')
      .in('status', ['waiting', 'active']);

    if (queueError) {
      console.error('Error fetching patients in queue:', queueError);
    }

    // Get completed patients today
    const { data: completedPatients, error: completedError } = await supabase
      .from('patient_calls')
      .select('*')
      .eq('status', 'completed')
      .gte('completed_at', startOfDay)
      .lte('completed_at', endOfDay);

    if (completedError) {
      console.error('Error fetching completed patients:', completedError);
    }

    // Get user sessions
    const { data: allSessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .gte('login_at', startOfDay);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
    }

    const sessions: UserSessionRecord[] = allSessions || [];

    // Calculate daily statistics
    const totalCalls = callHistory.length;
    const triageCalls = callHistory.filter(c => c.call_type === 'triage').length;
    const doctorCalls = callHistory.filter(c => c.call_type === 'doctor').length;
    const otherCalls = totalCalls - triageCalls - doctorCalls;

    // Calls by hour
    const callsByHour: Record<string, number> = {};
    callHistory.forEach(call => {
      const hour = new Date(call.created_at).getHours().toString().padStart(2, '0');
      callsByHour[hour] = (callsByHour[hour] || 0) + 1;
    });

    // Calls by destination
    const callsByDestination: Record<string, number> = {};
    callHistory.forEach(call => {
      const dest = call.destination || 'Padrão';
      callsByDestination[dest] = (callsByDestination[dest] || 0) + 1;
    });

    // Calls by type
    const callsByType: Record<string, number> = {};
    callHistory.forEach(call => {
      const type = call.call_type || 'Outros';
      callsByType[type] = (callsByType[type] || 0) + 1;
    });

    // Peak hour
    let peakHour = '00';
    let peakHourCalls = 0;
    Object.entries(callsByHour).forEach(([hour, count]) => {
      if (count > peakHourCalls) {
        peakHour = hour;
        peakHourCalls = count;
      }
    });

    // Active sessions
    const activeSessions = sessions.filter(s => s.is_active).length;
    const totalSessionsToday = sessions.length;

    // Average calls per hour (considering working hours 7-22)
    const workingHours = 15;
    const averageCallsPerHour = totalCalls / workingHours;

    const detailedStatistics = {
      date: formatDateBR(today),
      totalCalls,
      triageCalls,
      doctorCalls,
      otherCalls,
      callsByHour,
      callsByDestination,
      callsByType,
      activeSessions,
      totalSessionsToday,
      patientsInQueue: patientsInQueue?.length || 0,
      completedToday: completedPatients?.length || 0,
      averageCallsPerHour,
      peakHour,
      peakHourCalls,
    };

    console.log('Daily statistics calculated:', detailedStatistics);

    // Send daily report to Telegram
    const dailyReportResponse = await supabase.functions.invoke('telegram-alert', {
      body: {
        type: 'detailed_daily_report',
        detailedStatistics,
      },
    });

    console.log('Daily report sent:', dailyReportResponse.data);

    // ========== WEEKLY DATA ==========
    
    // Get call history for last 7 days
    const { data: weeklyCallHistory, error: weeklyCallError } = await supabase
      .from('call_history')
      .select('*')
      .gte('created_at', `${sevenDaysAgo}T00:00:00-03:00`)
      .lte('created_at', endOfDay);

    if (weeklyCallError) {
      console.error('Error fetching weekly call history:', weeklyCallError);
    }

    const weeklyHistory: CallHistoryRecord[] = weeklyCallHistory || [];

    // Get weekly sessions
    const { data: weeklySessions, error: weeklySessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .gte('login_at', `${sevenDaysAgo}T00:00:00-03:00`);

    if (weeklySessionsError) {
      console.error('Error fetching weekly sessions:', weeklySessionsError);
    }

    // Get weekly completed patients
    const { data: weeklyCompleted, error: weeklyCompletedError } = await supabase
      .from('patient_calls')
      .select('*')
      .eq('status', 'completed')
      .gte('completed_at', `${sevenDaysAgo}T00:00:00-03:00`);

    if (weeklyCompletedError) {
      console.error('Error fetching weekly completed:', weeklyCompletedError);
    }

    // Calculate weekly statistics
    const weeklyTotalCalls = weeklyHistory.length;
    const weeklyTriageCalls = weeklyHistory.filter(c => c.call_type === 'triage').length;
    const weeklyDoctorCalls = weeklyHistory.filter(c => c.call_type === 'doctor').length;
    const weeklyOtherCalls = weeklyTotalCalls - weeklyTriageCalls - weeklyDoctorCalls;

    // Calls by day of week
    const dayNames: Record<number, string> = {
      0: 'Domingo',
      1: 'Segunda',
      2: 'Terça',
      3: 'Quarta',
      4: 'Quinta',
      5: 'Sexta',
      6: 'Sábado',
    };

    const callsByDay: Record<string, number> = {};
    weeklyHistory.forEach(call => {
      const dayOfWeek = new Date(call.created_at).getDay();
      const dayName = dayNames[dayOfWeek];
      callsByDay[dayName] = (callsByDay[dayName] || 0) + 1;
    });

    // Weekly calls by destination
    const weeklyCallsByDestination: Record<string, number> = {};
    weeklyHistory.forEach(call => {
      const dest = call.destination || 'Padrão';
      weeklyCallsByDestination[dest] = (weeklyCallsByDestination[dest] || 0) + 1;
    });

    // Busiest day
    let busiestDay = 'N/A';
    let busiestDayCalls = 0;
    Object.entries(callsByDay).forEach(([day, count]) => {
      if (count > busiestDayCalls) {
        busiestDay = day;
        busiestDayCalls = count;
      }
    });

    const averageCallsPerDay = weeklyTotalCalls / 7;

    const weeklyStatistics = {
      startDate: formatDateBR(sevenDaysAgo),
      endDate: formatDateBR(today),
      totalCalls: weeklyTotalCalls,
      triageCalls: weeklyTriageCalls,
      doctorCalls: weeklyDoctorCalls,
      otherCalls: weeklyOtherCalls,
      callsByDay,
      callsByDestination: weeklyCallsByDestination,
      averageCallsPerDay,
      busiestDay,
      busiestDayCalls,
      totalSessions: weeklySessions?.length || 0,
      totalCompletedPatients: weeklyCompleted?.length || 0,
    };

    console.log('Weekly statistics calculated:', weeklyStatistics);

    // Send weekly report to Telegram
    const weeklyReportResponse = await supabase.functions.invoke('telegram-alert', {
      body: {
        type: 'weekly_report',
        weeklyStatistics,
      },
    });

    console.log('Weekly report sent:', weeklyReportResponse.data);

    // ========== CLEANUP OLD DATA (60 DAYS RETENTION) ==========
    
    console.log('🧹 Starting data cleanup (60 days retention)...');

    // Calculate 60 days ago for data retention
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

    // Delete call history older than 60 days
    const { data: deletedCallHistory, error: deleteCallError } = await supabase
      .from('call_history')
      .delete()
      .lt('created_at', `${sixtyDaysAgoStr}T00:00:00-03:00`)
      .select('id');

    if (deleteCallError) {
      console.error('Error deleting old call history:', deleteCallError);
    }

    const callHistoryDeleted = deletedCallHistory?.length || 0;
    console.log(`Deleted ${callHistoryDeleted} old call history records (>60 days)`);

    // Delete completed patient calls older than 60 days
    const { data: deletedPatientCalls, error: deletePatientError } = await supabase
      .from('patient_calls')
      .delete()
      .eq('status', 'completed')
      .lt('completed_at', `${sixtyDaysAgoStr}T00:00:00-03:00`)
      .select('id');

    if (deletePatientError) {
      console.error('Error deleting old patient calls:', deletePatientError);
    }

    const patientCallsDeleted = deletedPatientCalls?.length || 0;
    console.log(`Deleted ${patientCallsDeleted} old patient calls (>60 days)`);

    // Compact old statistics using the database function (60 days)
    const { data: compactResult, error: compactError } = await supabase
      .rpc('compact_old_statistics', { days_to_keep: 60 });

    if (compactError) {
      console.error('Error compacting statistics:', compactError);
    }

    const statisticsCompacted = compactResult || 0;
    console.log(`Compacted ${statisticsCompacted} old statistics records (>60 days)`);

    // Delete old user sessions (older than 60 days)
    const { error: deleteSessionsError } = await supabase
      .from('user_sessions')
      .delete()
      .lt('login_at', `${sixtyDaysAgoStr}T00:00:00-03:00`);

    if (deleteSessionsError) {
      console.error('Error deleting old sessions:', deleteSessionsError);
    }

    // Delete old health history (older than 60 days)
    const { error: deleteHealthError } = await supabase
      .from('edge_function_health_history')
      .delete()
      .lt('checked_at', `${sixtyDaysAgoStr}T00:00:00-03:00`);

    if (deleteHealthError) {
      console.error('Error deleting old health history:', deleteHealthError);
    }

    // Delete old error logs (older than 60 days)
    const { error: deleteErrorLogsError } = await supabase
      .from('system_error_logs')
      .delete()
      .lt('created_at', `${sixtyDaysAgoStr}T00:00:00-03:00`);

    if (deleteErrorLogsError) {
      console.error('Error deleting old error logs:', deleteErrorLogsError);
    }

    // Delete old chat messages (older than 60 days)
    const { error: deleteChatError } = await supabase
      .from('chat_messages')
      .delete()
      .lt('created_at', `${sixtyDaysAgoStr}T00:00:00-03:00`);

    if (deleteChatError) {
      console.error('Error deleting old chat messages:', deleteChatError);
    }

    // Delete old test history (older than 60 days)
    const { error: deleteTestHistoryError } = await supabase
      .from('test_history')
      .delete()
      .lt('executed_at', `${sixtyDaysAgoStr}T00:00:00-03:00`);

    if (deleteTestHistoryError) {
      console.error('Error deleting old test history:', deleteTestHistoryError);
    }

    // Delete old statistics_daily (older than 60 days)
    const { error: deleteStatsDailyError } = await supabase
      .from('statistics_daily')
      .delete()
      .lt('date', sixtyDaysAgoStr);

    if (deleteStatsDailyError) {
      console.error('Error deleting old daily statistics:', deleteStatsDailyError);
    }

    // Send cleanup report to Telegram
    const cleanupReportResponse = await supabase.functions.invoke('telegram-alert', {
      body: {
        type: 'cleanup_report',
        cleanupReport: {
          callHistoryDeleted,
          patientCallsDeleted,
          statisticsCompacted,
        },
      },
    });

    console.log('Cleanup report sent:', cleanupReportResponse.data);

    // ========== RESPONSE ==========

    return new Response(
      JSON.stringify({ 
        success: true, 
        dailyStatistics: detailedStatistics,
        weeklyStatistics,
        cleanup: {
          callHistoryDeleted,
          patientCallsDeleted,
          statisticsCompacted,
        },
        telegramReports: {
          dailySent: dailyReportResponse.data?.success || false,
          weeklySent: weeklyReportResponse.data?.success || false,
          cleanupSent: cleanupReportResponse.data?.success || false,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in daily statistics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
