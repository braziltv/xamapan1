// Re-uploads existing marketing images with cacheControl up to end of their month
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows, error } = await supabase
    .from("marketing_images")
    .select("storage_path, month");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  const now = new Date();
  const year = now.getFullYear();
  let ok = 0, fail = 0;
  const errors: string[] = [];

  for (const row of rows || []) {
    const path = row.storage_path as string;
    const month = row.month as number;
    try {
      // primeiro dia do mês seguinte ao da imagem
      const endOfMonth = new Date(year, month, 1, 0, 0, 0);
      const seconds = Math.max(3600, Math.floor((endOfMonth.getTime() - now.getTime()) / 1000));

      const dl = await supabase.storage.from("marketing-images").download(path);
      if (dl.error || !dl.data) throw new Error(dl.error?.message || "download null");
      const up = await supabase.storage.from("marketing-images").update(path, dl.data, {
        contentType: dl.data.type || "image/webp",
        cacheControl: String(seconds),
        upsert: true,
      });
      if (up.error) throw new Error(up.error.message);
      ok++;
    } catch (e) {
      fail++;
      errors.push(`${path}: ${(e as Error).message}`);
    }
  }

  return new Response(JSON.stringify({ ok, fail, errors }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
