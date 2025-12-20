import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Health check endpoint
    const body = await req.json().catch(() => ({}))
    if (body.healthCheck === true) {
      return new Response(
        JSON.stringify({ 
          status: 'healthy', 
          service: 'compact-statistics',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting automatic data compaction (keeping last 30 days)...')

    // Call the compact function with 30 days retention
    const { data, error } = await supabase.rpc('compact_old_statistics', { 
      days_to_keep: 30 
    })

    if (error) {
      console.error('Compaction error:', error)
      throw error
    }

    console.log(`Compaction completed. Deleted ${data} old records.`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_records: data,
        message: `Compactação concluída. ${data} registros antigos removidos.`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in compact-statistics:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
