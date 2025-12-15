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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const maxAgeMinutes = 45
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000)

    console.log(`Cleaning up TTS cache files older than ${maxAgeMinutes} minutes (before ${cutoffTime.toISOString()})...`)

    // List all files in the tts-cache bucket
    const { data: files, error: listError } = await supabase.storage
      .from('tts-cache')
      .list('', { limit: 1000 })

    if (listError) {
      console.error('Error listing files:', listError)
      throw listError
    }

    if (!files || files.length === 0) {
      console.log('No files in TTS cache')
      return new Response(
        JSON.stringify({ success: true, deleted: 0, message: 'Nenhum arquivo no cache' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter files older than 45 minutes based on created_at metadata
    // IMPORTANT: Skip files with "phrase_" prefix - these are permanent destination phrase caches
    const filesToDelete = files.filter(file => {
      if (!file.created_at) return false
      if (file.name.startsWith('phrase_')) return false // Never delete permanent phrase cache
      const fileCreatedAt = new Date(file.created_at)
      return fileCreatedAt < cutoffTime
    })

    if (filesToDelete.length === 0) {
      console.log('No old files to delete')
      return new Response(
        JSON.stringify({ success: true, deleted: 0, message: 'Nenhum arquivo antigo para remover' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete old files
    const filePaths = filesToDelete.map(f => f.name)
    console.log(`Deleting ${filePaths.length} old TTS cache files:`, filePaths)

    const { error: deleteError } = await supabase.storage
      .from('tts-cache')
      .remove(filePaths)

    if (deleteError) {
      console.error('Error deleting files:', deleteError)
      throw deleteError
    }

    console.log(`Successfully deleted ${filePaths.length} old TTS cache files`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: filePaths.length,
        message: `${filePaths.length} arquivos de cache removidos`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in cleanup-tts-cache:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
