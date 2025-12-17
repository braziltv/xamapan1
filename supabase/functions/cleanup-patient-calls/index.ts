import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting automatic patient calls cleanup...')

    // 1. Apagar todos os atendimentos finalizados (status = 'completed')
    const { data: completedDeleted, error: completedError } = await supabase
      .from('patient_calls')
      .delete()
      .eq('status', 'completed')
      .select('id')

    if (completedError) {
      console.error('Error deleting completed calls:', completedError)
      throw completedError
    }

    const completedCount = completedDeleted?.length || 0
    console.log(`Deleted ${completedCount} completed patient calls`)

    // 2. Apagar atendimentos em aberto com mais de 2 horas de inatividade
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const { data: inactiveDeleted, error: inactiveError } = await supabase
      .from('patient_calls')
      .delete()
      .neq('status', 'completed')
      .lt('created_at', twoHoursAgo)
      .select('id')

    if (inactiveError) {
      console.error('Error deleting inactive calls:', inactiveError)
      throw inactiveError
    }

    const inactiveCount = inactiveDeleted?.length || 0
    console.log(`Deleted ${inactiveCount} inactive patient calls (> 2 hours old)`)

    // 3. Apagar histórico de chamadas com mais de 24 horas
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: historyDeleted, error: historyError } = await supabase
      .from('call_history')
      .delete()
      .lt('created_at', twentyFourHoursAgo)
      .select('id')

    if (historyError) {
      console.error('Error deleting old call history:', historyError)
      throw historyError
    }

    const historyCount = historyDeleted?.length || 0
    console.log(`Deleted ${historyCount} old call history entries (> 24 hours)`)

    // 4. Apagar pacientes inativos há mais de 15 dias (sem movimentação)
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()

    const { data: oldPatientsDeleted, error: oldPatientsError } = await supabase
      .from('patient_calls')
      .delete()
      .lt('created_at', fifteenDaysAgo)
      .select('id')

    if (oldPatientsError) {
      console.error('Error deleting old inactive patients:', oldPatientsError)
      throw oldPatientsError
    }

    const oldPatientsCount = oldPatientsDeleted?.length || 0
    console.log(`Deleted ${oldPatientsCount} old inactive patients (> 15 days)`)

    // 5. Apagar mensagens de chat com mais de 24 horas
    const { data: chatDeleted, error: chatError } = await supabase
      .from('chat_messages')
      .delete()
      .lt('created_at', twentyFourHoursAgo)
      .select('id')

    if (chatError) {
      console.error('Error deleting old chat messages:', chatError)
      throw chatError
    }

    const chatCount = chatDeleted?.length || 0
    console.log(`Deleted ${chatCount} old chat messages (> 24 hours)`)

    const totalDeleted = completedCount + inactiveCount + historyCount + oldPatientsCount + chatCount

    console.log(`Cleanup complete. Total deleted: ${totalDeleted}`)

    return new Response(
      JSON.stringify({
        success: true,
        completedDeleted: completedCount,
        inactiveDeleted: inactiveCount,
        historyDeleted: historyCount,
        oldPatientsDeleted: oldPatientsCount,
        chatMessagesDeleted: chatCount,
        totalDeleted,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Cleanup error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
