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
    const body = await req.json().catch(() => ({}))
    
    // Health check endpoint
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
    
    // Force clear ALL cache (for voice change migrations)
    if (body.clearAll === true) {
      console.log('🗑️ Force clearing ALL TTS cache files...')
      
      let totalDeleted = 0
      const folders = ['', 'destinations', 'hours', 'names']
      
      for (const folder of folders) {
        const { data: files, error: listError } = await supabase.storage
          .from('tts-cache')
          .list(folder, { limit: 1000 })
        
        if (listError) {
          console.error(`Error listing files in ${folder}:`, listError)
          continue
        }
        
        if (files && files.length > 0) {
          // Filter out folders, only delete files
          const filePaths = files
            .filter(f => f.id && !f.name.endsWith('/'))
            .map(f => folder ? `${folder}/${f.name}` : f.name)
          
          if (filePaths.length > 0) {
            console.log(`Deleting ${filePaths.length} files from ${folder || 'root'}`)
            
            const { error: deleteError } = await supabase.storage
              .from('tts-cache')
              .remove(filePaths)
            
            if (deleteError) {
              console.error(`Error deleting files from ${folder}:`, deleteError)
            } else {
              totalDeleted += filePaths.length
            }
          }
        }
      }
      
      // Also clean up usage tracking
      const { error: usageError } = await supabase
        .from('tts_name_usage')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
      
      if (usageError) {
        console.error('Error clearing usage tracking:', usageError)
      }
      
      console.log(`✅ Cleared ${totalDeleted} total cache files`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          deleted: totalDeleted,
          message: `Cache limpo: ${totalDeleted} arquivos removidos. Novos áudios serão gerados com a voz Neural2-C.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const NAME_MAX_AGE_DAYS = 7
    const ANNOUNCEMENT_MAX_AGE_DAYS = 30

    console.log(`Starting TTS cache cleanup...`)
    console.log(`Names: removing unused files older than ${NAME_MAX_AGE_DAYS} days`)
    console.log(`Announcements: removing unused files older than ${ANNOUNCEMENT_MAX_AGE_DAYS} days`)

    const supabase_client = supabase
    let totalDeleted = 0

    // ==================== CLEAN NAMES (7 days unused) ====================
    const nameCutoff = new Date(Date.now() - NAME_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
    
    const { data: nameFiles } = await supabase_client.storage
      .from('tts-cache')
      .list('names', { limit: 1000 })

    let namesDeleted = 0
    if (nameFiles && nameFiles.length > 0) {
      // Get recent usage from tts_name_usage
      const { data: recentUsage } = await supabase_client
        .from('tts_name_usage')
        .select('name_hash')
        .gte('used_at', nameCutoff.toISOString())

      const recentHashes = new Set((recentUsage || []).map(u => u.name_hash))

      const namesToDelete = nameFiles
        .filter(f => {
          if (!f.name.endsWith('.mp3')) return false
          const hash = f.name.replace('.mp3', '')
          // Delete if NOT used recently AND file is old
          if (recentHashes.has(hash)) return false
          if (!f.created_at) return false
          return new Date(f.created_at) < nameCutoff
        })
        .map(f => `names/${f.name}`)

      if (namesToDelete.length > 0) {
        const { error } = await supabase_client.storage.from('tts-cache').remove(namesToDelete)
        if (!error) {
          namesDeleted = namesToDelete.length
          totalDeleted += namesDeleted
          console.log(`Deleted ${namesDeleted} expired name cache files`)
        }
      }
    }

    // ==================== CLEAN ANNOUNCEMENTS (30 days unused) ====================
    const annCutoff = new Date(Date.now() - ANNOUNCEMENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
    
    const { data: annFiles } = await supabase_client.storage
      .from('tts-cache')
      .list('announcements', { limit: 1000 })

    let announcementsDeleted = 0
    if (annFiles && annFiles.length > 0) {
      const annsToDelete = annFiles
        .filter(f => {
          if (!f.name.endsWith('.mp3')) return false
          if (!f.created_at) return false
          return new Date(f.created_at) < annCutoff
        })
        .map(f => `announcements/${f.name}`)

      if (annsToDelete.length > 0) {
        const { error } = await supabase_client.storage.from('tts-cache').remove(annsToDelete)
        if (!error) {
          announcementsDeleted = annsToDelete.length
          totalDeleted += announcementsDeleted
          console.log(`Deleted ${announcementsDeleted} expired announcement cache files`)
        }
      }
    }

    // ==================== CLEAN OLD ROOT FILES (legacy) ====================
    const { data: rootFiles } = await supabase_client.storage
      .from('tts-cache')
      .list('', { limit: 1000 })

    let legacyDeleted = 0
    if (rootFiles && rootFiles.length > 0) {
      const legacyToDelete = rootFiles
        .filter(f => {
          if (!f.name.endsWith('.mp3')) return false
          if (f.name.startsWith('.')) return false
          // Only delete legacy files (part_, tts_, phrase_) older than 7 days
          if (!f.created_at) return false
          return new Date(f.created_at) < nameCutoff && 
            (f.name.startsWith('part_') || f.name.startsWith('tts_') || f.name.startsWith('phrase_'))
        })
        .map(f => f.name)

      if (legacyToDelete.length > 0) {
        const { error } = await supabase_client.storage.from('tts-cache').remove(legacyToDelete)
        if (!error) {
          legacyDeleted = legacyToDelete.length
          totalDeleted += legacyDeleted
        }
      }
    }

    // Clean up old usage tracking entries (older than 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    await supabase_client
      .from('tts_name_usage')
      .delete()
      .lt('used_at', thirtyDaysAgo.toISOString())

    console.log(`✅ Cleanup complete: ${totalDeleted} files removed (names: ${namesDeleted}, announcements: ${announcementsDeleted}, legacy: ${legacyDeleted})`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: totalDeleted,
        namesDeleted,
        announcementsDeleted,
        legacyDeleted,
        message: `${totalDeleted} arquivos removidos (nomes: ${namesDeleted}, anúncios: ${announcementsDeleted}, legado: ${legacyDeleted})`
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
