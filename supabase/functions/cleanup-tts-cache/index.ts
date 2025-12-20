import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Maximum size for permanent cache in bytes (200MB)
const MAX_PERMANENT_CACHE_SIZE = 200 * 1024 * 1024;

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
          service: 'cleanup-tts-cache',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const maxAgeDays = 7 // 7 dias para cache temporário
    const cutoffTime = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)

    console.log(`Starting TTS cache cleanup...`)
    console.log(`Temporary cache: removing files older than ${maxAgeDays} days (before ${cutoffTime.toISOString()})`)

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
        JSON.stringify({ success: true, deleted: 0, permanentDeleted: 0, message: 'Nenhum arquivo no cache' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Separate permanent and temporary files
    const permanentFiles = files.filter(f => f.name.startsWith('phrase_'))
    const temporaryFiles = files.filter(f => f.name.startsWith('part_') || f.name.startsWith('tts_'))

    console.log(`Found ${permanentFiles.length} permanent files and ${temporaryFiles.length} temporary files`)

    // Calculate permanent cache size
    let permanentCacheSize = 0
    for (const file of permanentFiles) {
      permanentCacheSize += file.metadata?.size || 0
    }
    console.log(`Permanent cache size: ${(permanentCacheSize / 1024 / 1024).toFixed(2)}MB / ${MAX_PERMANENT_CACHE_SIZE / 1024 / 1024}MB limit`)

    let permanentDeleted = 0

    // Check if permanent cache exceeds limit
    if (permanentCacheSize > MAX_PERMANENT_CACHE_SIZE) {
      console.log(`Permanent cache exceeds limit, cleaning up least used entries...`)

      // Get usage counts for all parts from last 20 days
      const twentyDaysAgo = new Date()
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20)

      const { data: usageData, error: usageError } = await supabase
        .from('tts_name_usage')
        .select('name_hash, name_text')
        .gte('used_at', twentyDaysAgo.toISOString())

      if (usageError) {
        console.error('Error fetching usage data:', usageError)
      } else {
        // Count usage per hash
        const usageCounts: Record<string, number> = {}
        for (const entry of usageData || []) {
          usageCounts[entry.name_hash] = (usageCounts[entry.name_hash] || 0) + 1
        }

        // Sort permanent files by usage (least used first)
        const sortedPermanentFiles = permanentFiles
          .map(f => {
            const hash = f.name.replace('phrase_', '').replace('.mp3', '')
            return {
              name: f.name,
              hash,
              usageCount: usageCounts[hash] || 0,
              size: f.metadata?.size || 0
            }
          })
          .sort((a, b) => a.usageCount - b.usageCount)

        // Delete 50% least used files
        const filesToDelete = sortedPermanentFiles.slice(0, Math.ceil(sortedPermanentFiles.length / 2))

        if (filesToDelete.length > 0) {
          const filePaths = filesToDelete.map(f => f.name)
          console.log(`Deleting ${filePaths.length} least used permanent cache files:`)
          filesToDelete.forEach(f => console.log(`  - ${f.name} (usage: ${f.usageCount})`))

          const { error: deleteError } = await supabase.storage
            .from('tts-cache')
            .remove(filePaths)

          if (deleteError) {
            console.error('Error deleting permanent files:', deleteError)
          } else {
            permanentDeleted = filePaths.length
            console.log(`Successfully deleted ${permanentDeleted} permanent cache files`)
          }
        }
      }
    }

    // Delete old temporary files (older than 30 days)
    const tempFilesToDelete = temporaryFiles.filter(file => {
      if (!file.created_at) return false
      const fileCreatedAt = new Date(file.created_at)
      return fileCreatedAt < cutoffTime
    })

    let tempDeleted = 0

    if (tempFilesToDelete.length > 0) {
      const filePaths = tempFilesToDelete.map(f => f.name)
      console.log(`Deleting ${filePaths.length} old temporary TTS cache files`)

      const { error: deleteError } = await supabase.storage
        .from('tts-cache')
        .remove(filePaths)

      if (deleteError) {
        console.error('Error deleting temporary files:', deleteError)
      } else {
        tempDeleted = filePaths.length
        console.log(`Successfully deleted ${tempDeleted} temporary cache files`)
      }
    } else {
      console.log('No old temporary files to delete')
    }

    // Clean up old usage tracking entries (older than 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { error: cleanupError, count: usageDeleted } = await supabase
      .from('tts_name_usage')
      .delete()
      .lt('used_at', thirtyDaysAgo.toISOString())

    if (cleanupError) {
      console.error('Error cleaning up old usage tracking:', cleanupError)
    } else {
      console.log(`Cleaned up ${usageDeleted || 0} old usage tracking entries`)
    }

    const totalDeleted = tempDeleted + permanentDeleted

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: totalDeleted,
        tempDeleted,
        permanentDeleted,
        permanentCacheSize: `${(permanentCacheSize / 1024 / 1024).toFixed(2)}MB`,
        message: `${totalDeleted} arquivos removidos (${tempDeleted} temporários, ${permanentDeleted} permanentes)`
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
