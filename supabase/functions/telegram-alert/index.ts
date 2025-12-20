import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || '';
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';

interface DailyStatistics {
  totalCalls: number;
  triageCalls: number;
  doctorCalls: number;
  patientsInQueue: number;
  completedToday: number;
}

interface DetailedStatistics {
  date: string;
  totalCalls: number;
  triageCalls: number;
  doctorCalls: number;
  otherCalls: number;
  callsByHour: Record<string, number>;
  callsByDestination: Record<string, number>;
  callsByType: Record<string, number>;
  activeSessions: number;
  totalSessionsToday: number;
  patientsInQueue: number;
  completedToday: number;
  averageCallsPerHour: number;
  peakHour: string;
  peakHourCalls: number;
}

interface WeeklyStatistics {
  startDate: string;
  endDate: string;
  totalCalls: number;
  triageCalls: number;
  doctorCalls: number;
  otherCalls: number;
  callsByDay: Record<string, number>;
  callsByDestination: Record<string, number>;
  averageCallsPerDay: number;
  busiestDay: string;
  busiestDayCalls: number;
  totalSessions: number;
  totalCompletedPatients: number;
}

interface AlertPayload {
  type: 'health_check_failure' | 'daily_statistics' | 'detailed_daily_report' | 'weekly_report' | 'cleanup_report';
  functionName?: string;
  functionLabel?: string;
  errorMessage?: string;
  statistics?: DailyStatistics;
  detailedStatistics?: DetailedStatistics;
  weeklyStatistics?: WeeklyStatistics;
  cleanupReport?: {
    callHistoryDeleted: number;
    patientCallsDeleted: number;
    statisticsCompacted: number;
  };
}

async function sendTelegramMessage(message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram credentials not configured');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const result = await response.json();
    console.log('Telegram response:', result);
    return result.ok === true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

function formatHealthCheckAlert(payload: AlertPayload): string {
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return `🚨 <b>ALERTA: Edge Function com Falha</b>

📍 <b>Função:</b> ${payload.functionLabel || payload.functionName}
❌ <b>Erro:</b> ${payload.errorMessage || 'Erro desconhecido'}
🕐 <b>Horário:</b> ${timestamp}

⚠️ Verifique o painel de monitoramento para mais detalhes.`;
}

function formatDailyStatistics(payload: AlertPayload): string {
  const stats = payload.statistics;
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  
  if (!stats) {
    return `📊 <b>Estatísticas Diárias</b>\n\nNenhuma estatística disponível.`;
  }

  return `📊 <b>Estatísticas Diárias - Xama Pan</b>

🕐 <b>Relatório de:</b> ${timestamp}

📈 <b>Resumo do Dia:</b>
• Total de Chamadas: <b>${stats.totalCalls}</b>
• Triagem: <b>${stats.triageCalls}</b>
• Médico: <b>${stats.doctorCalls}</b>

👥 <b>Status Atual:</b>
• Na Fila: <b>${stats.patientsInQueue}</b>
• Concluídos Hoje: <b>${stats.completedToday}</b>

✅ Sistema funcionando normalmente.`;
}

function getInstitutionalHeader(): string {
  return `⚠️ <b>Aviso Institucional</b>
🗂️ Os relatórios a seguir foram elaborados pelo Aplicativo Xama Pan.
💻 Programa criado por Kalebe Gomes.
⏱️ As informações apresentadas correspondem aos dados disponíveis no momento da apuração.

━━━━━━━━━━━━━━━━━━━━━

`;
}

function formatDetailedDailyReport(payload: AlertPayload): string {
  const stats = payload.detailedStatistics;
  
  if (!stats) {
    return `📊 <b>Relatório Diário Detalhado</b>\n\nNenhuma estatística disponível.`;
  }

  // Format calls by hour
  const hourlyBreakdown = Object.entries(stats.callsByHour)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([hour, count]) => `  ${hour}h: ${count}`)
    .join('\n') || '  Nenhuma chamada';

  // Format calls by destination
  const destinationBreakdown = Object.entries(stats.callsByDestination)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([dest, count]) => `  • ${dest}: ${count}`)
    .join('\n') || '  Nenhum destino registrado';

  // Format calls by type
  const typeBreakdown = Object.entries(stats.callsByType)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => `  • ${type}: ${count}`)
    .join('\n') || '  Nenhum tipo registrado';

  return `${getInstitutionalHeader()}📊 <b>RELATÓRIO DIÁRIO DETALHADO</b>
📅 <b>Data:</b> ${stats.date}

━━━━━━━━━━━━━━━━━━━━━

📈 <b>RESUMO GERAL</b>
• Total de Chamadas: <b>${stats.totalCalls}</b>
• Triagem: <b>${stats.triageCalls}</b>
• Médico: <b>${stats.doctorCalls}</b>
• Outros: <b>${stats.otherCalls}</b>
• Média por Hora: <b>${stats.averageCallsPerHour.toFixed(1)}</b>

🏆 <b>HORÁRIO DE PICO</b>
• ${stats.peakHour}h com <b>${stats.peakHourCalls}</b> chamadas

━━━━━━━━━━━━━━━━━━━━━

🕐 <b>CHAMADAS POR HORA</b>
${hourlyBreakdown}

━━━━━━━━━━━━━━━━━━━━━

📍 <b>CHAMADAS POR DESTINO</b>
${destinationBreakdown}

━━━━━━━━━━━━━━━━━━━━━

📋 <b>CHAMADAS POR TIPO</b>
${typeBreakdown}

━━━━━━━━━━━━━━━━━━━━━

👥 <b>SESSÕES</b>
• Sessões Ativas: <b>${stats.activeSessions}</b>
• Total de Sessões Hoje: <b>${stats.totalSessionsToday}</b>

━━━━━━━━━━━━━━━━━━━━━

📋 <b>FILA</b>
• Na Fila: <b>${stats.patientsInQueue}</b>
• Concluídos Hoje: <b>${stats.completedToday}</b>

✅ Relatório gerado automaticamente.`;
}

function formatWeeklyReport(payload: AlertPayload): string {
  const stats = payload.weeklyStatistics;
  
  if (!stats) {
    return `📊 <b>Relatório Semanal</b>\n\nNenhuma estatística disponível.`;
  }

  // Format calls by day
  const dayNames: Record<string, string> = {
    '0': 'Domingo',
    '1': 'Segunda',
    '2': 'Terça',
    '3': 'Quarta',
    '4': 'Quinta',
    '5': 'Sexta',
    '6': 'Sábado',
  };

  const dailyBreakdown = Object.entries(stats.callsByDay)
    .map(([day, count]) => `  • ${dayNames[day] || day}: ${count}`)
    .join('\n') || '  Nenhum dado';

  // Format calls by destination
  const destinationBreakdown = Object.entries(stats.callsByDestination)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([dest, count]) => `  • ${dest}: ${count}`)
    .join('\n') || '  Nenhum destino registrado';

  return `${getInstitutionalHeader()}📊 <b>RELATÓRIO SEMANAL</b>
📅 <b>Período:</b> ${stats.startDate} a ${stats.endDate}

━━━━━━━━━━━━━━━━━━━━━

📈 <b>RESUMO DA SEMANA</b>
• Total de Chamadas: <b>${stats.totalCalls}</b>
• Triagem: <b>${stats.triageCalls}</b>
• Médico: <b>${stats.doctorCalls}</b>
• Outros: <b>${stats.otherCalls}</b>
• Média por Dia: <b>${stats.averageCallsPerDay.toFixed(1)}</b>

🏆 <b>DIA MAIS MOVIMENTADO</b>
• ${stats.busiestDay} com <b>${stats.busiestDayCalls}</b> chamadas

━━━━━━━━━━━━━━━━━━━━━

📅 <b>CHAMADAS POR DIA</b>
${dailyBreakdown}

━━━━━━━━━━━━━━━━━━━━━

📍 <b>TOP DESTINOS DA SEMANA</b>
${destinationBreakdown}

━━━━━━━━━━━━━━━━━━━━━

👥 <b>TOTAIS DA SEMANA</b>
• Total de Sessões: <b>${stats.totalSessions}</b>
• Pacientes Concluídos: <b>${stats.totalCompletedPatients}</b>

✅ Relatório gerado automaticamente.`;
}

function formatCleanupReport(payload: AlertPayload): string {
  const report = payload.cleanupReport;
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  
  if (!report) {
    return `🧹 <b>Relatório de Limpeza</b>\n\nNenhum dado disponível.`;
  }

  return `🧹 <b>LIMPEZA DE DADOS CONCLUÍDA</b>
🕐 <b>Horário:</b> ${timestamp}

━━━━━━━━━━━━━━━━━━━━━

🗑️ <b>REGISTROS REMOVIDOS</b>
• Histórico de Chamadas: <b>${report.callHistoryDeleted}</b>
• Chamadas de Pacientes: <b>${report.patientCallsDeleted}</b>
• Estatísticas Compactadas: <b>${report.statisticsCompacted}</b>

✅ Limpeza automática concluída com sucesso.`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: AlertPayload = await req.json();
    console.log('Received alert payload:', payload);

    let message = '';
    
    switch (payload.type) {
      case 'health_check_failure':
        message = formatHealthCheckAlert(payload);
        break;
      case 'daily_statistics':
        message = formatDailyStatistics(payload);
        break;
      case 'detailed_daily_report':
        message = formatDetailedDailyReport(payload);
        break;
      case 'weekly_report':
        message = formatWeeklyReport(payload);
        break;
      case 'cleanup_report':
        message = formatCleanupReport(payload);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid alert type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const success = await sendTelegramMessage(message);

    return new Response(
      JSON.stringify({ success, message: success ? 'Alert sent' : 'Failed to send alert' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing alert:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
