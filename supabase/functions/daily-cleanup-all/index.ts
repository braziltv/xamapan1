// Consolidated daily cleanup — runs 5 stages sequentially (07:30 UTC daily)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STAGES = [
  'cleanup-patient-calls',
  'cleanup-duplicates',
  'cleanup-tts-cache',
  'cleanup-inactive-sessions',
  'compact-statistics',
] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    if (body.healthCheck === true) {
      return new Response(
        JSON.stringify({ status: 'healthy', service: 'daily-cleanup-all', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const results: Record<string, unknown> = {};
    const startedAt = Date.now();

    for (const stage of STAGES) {
      const stageStart = Date.now();
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/${stage}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
          },
          body: JSON.stringify({}),
        });
        const data = await res.json().catch(() => ({}));
        results[stage] = { ok: res.ok, status: res.status, ms: Date.now() - stageStart, data };
        console.log(`[daily-cleanup-all] ${stage}: ${res.status} in ${Date.now() - stageStart}ms`);
      } catch (e) {
        results[stage] = { ok: false, ms: Date.now() - stageStart, error: String(e) };
        console.error(`[daily-cleanup-all] ${stage} failed:`, e);
      }
    }

    // Stage 6: cleanup audit_events (api_key_usage + system_test TTL)
    try {
      const stageStart = Date.now();
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/cleanup_audit_events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
        body: '{}',
      });
      const data = await res.json().catch(() => null);
      results['cleanup-audit-events'] = { ok: res.ok, status: res.status, ms: Date.now() - stageStart, deleted: data };
    } catch (e) {
      results['cleanup-audit-events'] = { ok: false, error: String(e) };
    }

    return new Response(
      JSON.stringify({ success: true, totalMs: Date.now() - startedAt, stages: results, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
