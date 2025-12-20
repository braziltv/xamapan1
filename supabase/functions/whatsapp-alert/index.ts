import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertPayload {
  type: 'test' | 'system_status' | 'daily_report' | 'weekly_report' | 'custom';
  message?: string;
  unitName?: string;
  detailedStatistics?: {
    date: string;
    totalCalls: number;
    triageCalls: number;
    doctorCalls: number;
    callsByHour: Record<string, number>;
    callsByDestination: Record<string, number>;
    callTypes: Record<string, number>;
  };
  weeklyStatistics?: {
    startDate: string;
    endDate: string;
    totalCalls: number;
    triageCalls: number;
    doctorCalls: number;
    avgCallsPerDay: number;
    peakDay: string;
    peakDayCount: number;
    callsByDestination: Record<string, number>;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CALLMEBOT_API_KEY = Deno.env.get('CALLMEBOT_API_KEY');
    const WHATSAPP_PHONE = Deno.env.get('WHATSAPP_PHONE');

    if (!CALLMEBOT_API_KEY || !WHATSAPP_PHONE) {
      console.error('Missing WhatsApp configuration');
      return new Response(
        JSON.stringify({ 
          error: 'WhatsApp not configured',
          details: 'CALLMEBOT_API_KEY and WHATSAPP_PHONE must be set'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const payload: AlertPayload = await req.json();
    console.log('WhatsApp Alert payload:', JSON.stringify(payload));

    let message = '';

    switch (payload.type) {
      case 'test':
        message = formatTestMessage();
        break;
      case 'system_status':
        message = formatSystemStatus(payload);
        break;
      case 'daily_report':
        message = formatDailyReport(payload);
        break;
      case 'weekly_report':
        message = formatWeeklyReport(payload);
        break;
      case 'custom':
        message = payload.message || 'Mensagem sem conteúdo';
        break;
      default:
        message = payload.message || 'Alerta do sistema Xama Pan';
    }

    // CallMeBot API - free WhatsApp messaging service
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${encodedMessage}&apikey=${CALLMEBOT_API_KEY}`;

    console.log('Sending WhatsApp message via CallMeBot...');
    
    const response = await fetch(url, {
      method: 'GET',
    });

    const responseText = await response.text();
    console.log('CallMeBot response:', responseText);

    if (response.ok || responseText.includes('Message queued')) {
      console.log('WhatsApp message sent successfully');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'WhatsApp message sent successfully',
          response: responseText
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.error('Failed to send WhatsApp message:', responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send message',
          response: responseText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in whatsapp-alert function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function formatTestMessage(): string {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return `🧪 *TESTE DE CONEXÃO*

📱 WhatsApp Alert funcionando!
⏰ ${now}

✅ Sistema Xama Pan conectado com sucesso.

---
💻 Programa criado por Kalebe Gomes`;
}

function formatSystemStatus(payload: AlertPayload): string {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return `⚠️ *AVISO DO SISTEMA*

📍 Unidade: ${payload.unitName || 'Não especificada'}
⏰ ${now}

${payload.message || '✅ Sistema funcionando normalmente.'}

---
💻 Xama Pan`;
}

function formatDailyReport(payload: AlertPayload): string {
  const stats = payload.detailedStatistics;
  
  if (!stats) {
    return `📊 *RELATÓRIO DIÁRIO*

⚠️ Dados estatísticos não disponíveis.`;
  }

  const callsByHour = Object.entries(stats.callsByHour || {})
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([hour, count]) => `${hour}h: ${count}`)
    .join(' | ') || 'Sem dados';

  const topDestinations = Object.entries(stats.callsByDestination || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([dest, count]) => `• ${dest}: ${count}`)
    .join('\n') || 'Sem dados';

  return `📊 *RELATÓRIO DIÁRIO*
📅 ${stats.date}

━━━━━━━━━━━━━━━━━
📈 *RESUMO GERAL*
• Total de Chamadas: ${stats.totalCalls}
• Triagem: ${stats.triageCalls}
• Médico: ${stats.doctorCalls}

━━━━━━━━━━━━━━━━━
⏰ *CHAMADAS POR HORA*
${callsByHour}

━━━━━━━━━━━━━━━━━
📍 *TOP DESTINOS*
${topDestinations}

---
💻 Xama Pan - Kalebe Gomes`;
}

function formatWeeklyReport(payload: AlertPayload): string {
  const stats = payload.weeklyStatistics;
  
  if (!stats) {
    return `📊 *RELATÓRIO SEMANAL*

⚠️ Dados estatísticos não disponíveis.`;
  }

  const topDestinations = Object.entries(stats.callsByDestination || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([dest, count]) => `• ${dest}: ${count}`)
    .join('\n') || 'Sem dados';

  return `📊 *RELATÓRIO SEMANAL*
📅 ${stats.startDate} a ${stats.endDate}

━━━━━━━━━━━━━━━━━
📈 *RESUMO GERAL*
• Total de Chamadas: ${stats.totalCalls}
• Triagem: ${stats.triageCalls}
• Médico: ${stats.doctorCalls}
• Média/Dia: ${stats.avgCallsPerDay.toFixed(1)}

━━━━━━━━━━━━━━━━━
🏆 *DIA DE PICO*
${stats.peakDay}: ${stats.peakDayCount} chamadas

━━━━━━━━━━━━━━━━━
📍 *TOP DESTINOS*
${topDestinations}

---
💻 Xama Pan - Kalebe Gomes`;
}
