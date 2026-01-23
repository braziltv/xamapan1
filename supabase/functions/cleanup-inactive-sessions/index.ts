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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse optional parameters
    const body = await req.json().catch(() => ({}))
    const inactiveMinutes = body.inactiveMinutes || 10 // Default: 10 minutes for TV sessions
    const inactiveHours = body.inactiveHours || 2 // Default: 2 hours for regular sessions
    const patientInactiveMinutes = body.patientInactiveMinutes || 10 // Default: 10 minutes for patients in active status

    const now = new Date()
    
    // Calculate today's start in Brazil timezone (UTC-3)
    const brazilOffset = -3 * 60 * 60 * 1000
    const brazilNow = new Date(now.getTime() + brazilOffset)
    const todayStart = new Date(brazilNow)
    todayStart.setUTCHours(3, 0, 0, 0) // 00:00 Brazil time = 03:00 UTC
    
    // Calculate cutoff times
    const tvCutoff = new Date(now.getTime() - inactiveMinutes * 60 * 1000)
    const regularCutoff = new Date(now.getTime() - inactiveHours * 60 * 60 * 1000)
    const patientInactiveCutoff = new Date(now.getTime() - patientInactiveMinutes * 60 * 1000)

    console.log(`Cleaning up sessions inactive since:`)
    console.log(`- TV sessions: ${tvCutoff.toISOString()} (${inactiveMinutes} min)`)
    console.log(`- Regular sessions: ${regularCutoff.toISOString()} (${inactiveHours} hours)`)
    console.log(`- Inactive patients: ${patientInactiveCutoff.toISOString()} (${patientInactiveMinutes} min)`)
    console.log(`- Today start (Brazil): ${todayStart.toISOString()}`)

    // ========== PATIENT CALLS CLEANUP ==========
    
    // 1. Delete patient_calls from previous days (not today)
    const { data: deletedOldPatients, error: oldPatientsError } = await supabase
      .from('patient_calls')
      .delete()
      .in('status', ['waiting', 'active'])
      .lt('created_at', todayStart.toISOString())
      .select('id, patient_name, unit_name')

    if (oldPatientsError) {
      console.error('Error deleting old patients:', oldPatientsError)
    }

    const oldPatientsDeleted = deletedOldPatients?.length || 0
    console.log(`Deleted ${oldPatientsDeleted} patient calls from previous days`)

    // 2. Delete inactive 'active' patient calls (>10 min without update)
    const { data: deletedInactiveActivePatients, error: inactiveActivePatientsError } = await supabase
      .from('patient_calls')
      .delete()
      .eq('status', 'active')
      .lt('created_at', patientInactiveCutoff.toISOString())
      .select('id, patient_name, unit_name, call_type')

    if (inactiveActivePatientsError) {
      console.error('Error deleting inactive active patients:', inactiveActivePatientsError)
    }

    const inactiveActivePatientsDeleted = deletedInactiveActivePatients?.length || 0
    console.log(`Deleted ${inactiveActivePatientsDeleted} inactive 'active' patient calls (>10 min)`)

    // 3. Delete inactive 'waiting' patient calls (>10 min without being called)
    const { data: deletedInactiveWaitingPatients, error: inactiveWaitingPatientsError } = await supabase
      .from('patient_calls')
      .delete()
      .eq('status', 'waiting')
      .lt('created_at', patientInactiveCutoff.toISOString())
      .select('id, patient_name, unit_name, call_type')

    if (inactiveWaitingPatientsError) {
      console.error('Error deleting inactive waiting patients:', inactiveWaitingPatientsError)
    }

    const inactiveWaitingPatientsDeleted = deletedInactiveWaitingPatients?.length || 0
    console.log(`Deleted ${inactiveWaitingPatientsDeleted} inactive 'waiting' patient calls (>10 min)`)

    const inactivePatientsDeleted = inactiveActivePatientsDeleted + inactiveWaitingPatientsDeleted

    // ========== USER SESSIONS CLEANUP ==========

    // Count sessions before cleanup
    const { count: beforeCount } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Delete inactive TV sessions (stricter timeout)
    const { data: deletedTvSessions, error: tvError } = await supabase
      .from('user_sessions')
      .delete()
      .eq('is_active', true)
      .eq('is_tv_mode', true)
      .lt('last_activity_at', tvCutoff.toISOString())
      .select('id, unit_name, station')

    if (tvError) {
      console.error('Error deleting TV sessions:', tvError)
    }

    // Delete inactive regular sessions (more lenient timeout)
    const { data: deletedRegularSessions, error: regularError } = await supabase
      .from('user_sessions')
      .delete()
      .eq('is_active', true)
      .eq('is_tv_mode', false)
      .lt('last_activity_at', regularCutoff.toISOString())
      .select('id, unit_name, station')

    if (regularError) {
      console.error('Error deleting regular sessions:', regularError)
    }

    // Also mark very old sessions as inactive instead of deleting (for history)
    const historyRetentionDays = 7
    const historyCutoff = new Date(now.getTime() - historyRetentionDays * 24 * 60 * 60 * 1000)
    
    const { data: archivedSessions, error: archiveError } = await supabase
      .from('user_sessions')
      .update({ is_active: false, logout_at: now.toISOString() })
      .eq('is_active', true)
      .lt('last_activity_at', historyCutoff.toISOString())
      .select('id')

    if (archiveError) {
      console.error('Error archiving old sessions:', archiveError)
    }

    // Count sessions after cleanup
    const { count: afterCount } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const tvDeleted = deletedTvSessions?.length || 0
    const regularDeleted = deletedRegularSessions?.length || 0
    const archived = archivedSessions?.length || 0
    const totalSessionsCleaned = tvDeleted + regularDeleted + archived

    const summary = {
      success: true,
      timestamp: now.toISOString(),
      patient_cleanup: {
        old_patients_deleted: oldPatientsDeleted,
        inactive_patients_deleted: inactivePatientsDeleted,
        total_patients_cleaned: oldPatientsDeleted + inactivePatientsDeleted,
      },
      session_cleanup: {
        tv_sessions_deleted: tvDeleted,
        regular_sessions_deleted: regularDeleted,
        sessions_archived: archived,
        total_cleaned: totalSessionsCleaned,
      },
      sessions: {
        before: beforeCount || 0,
        after: afterCount || 0,
      },
      thresholds: {
        tv_inactive_minutes: inactiveMinutes,
        regular_inactive_hours: inactiveHours,
        patient_inactive_minutes: patientInactiveMinutes,
        archive_after_days: historyRetentionDays,
      }
    }

    console.log('Cleanup completed:', JSON.stringify(summary))

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in cleanup-inactive-sessions:', error)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
