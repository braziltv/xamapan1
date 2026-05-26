import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONE_YEAR = '31536000';

async function listAllFiles(supabase: any, bucket: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [''];
  while (stack.length) {
    const dir = stack.pop()!;
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(dir, {
        limit: 1000, offset, sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const item of data) {
        const path = dir ? `${dir}/${item.name}` : item.name;
        if (item.id === null || item.metadata === null) stack.push(path);
        else out.push(path);
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const bucket = url.searchParams.get('bucket') || 'marketing-images';
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const limit = parseInt(url.searchParams.get('limit') || '40', 10);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const files = await listAllFiles(supabase, bucket);
    const slice = files.slice(offset, offset + limit);
    let ok = 0, fail = 0;
    const errors: string[] = [];

    for (const path of slice) {
      try {
        const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(path);
        if (dlErr || !blob) { fail++; errors.push(`${path}: ${dlErr?.message}`); continue; }
        const contentType = blob.type || (path.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream');
        const buf = await blob.arrayBuffer();
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, buf, {
          contentType, upsert: true, cacheControl: ONE_YEAR,
        });
        if (upErr) { fail++; errors.push(`${path}: ${upErr.message}`); } else ok++;
      } catch (e) {
        fail++; errors.push(`${path}: ${e}`);
      }
    }

    const next = offset + limit;
    return new Response(JSON.stringify({
      bucket, total: files.length, processed: slice.length, ok, fail,
      nextOffset: next < files.length ? next : null,
      errors: errors.slice(0, 5),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
