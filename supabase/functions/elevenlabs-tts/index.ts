import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get the API key index for the current day (rotates daily)
function getDailyKeyIndex(totalKeys: number): number {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const diff = today.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const seed = dayOfYear + today.getFullYear();
  return seed % totalKeys;
}

// Generate a cache key from the text
// isPermanent: if true, uses "phrase_" prefix for permanent cache (not auto-deleted)
// Normalizes text to lowercase to avoid duplicate cache entries for same name with different casing
function generateCacheKey(text: string, isPermanent: boolean = false): string {
  // Normalize to lowercase to prevent duplicate cache entries
  const normalizedText = text.toLowerCase();
  // Simple hash for filename
  let hash = 0;
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const prefix = isPermanent ? 'phrase_' : 'tts_';
  return `${prefix}${Math.abs(hash)}.mp3`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    const { text, voiceId, unitName, clearCache, isPermanentCache } = await req.json();

    // Handle cache clearing request
    if (clearCache && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const cacheKey = generateCacheKey(clearCache, false); // Never clear permanent cache via this method
      
      const { error } = await supabase.storage
        .from('tts-cache')
        .remove([cacheKey]);
      
      if (error) {
        console.log(`Cache clear failed for ${cacheKey}:`, error.message);
      } else {
        console.log(`Cache cleared for: ${cacheKey}`);
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!text) {
      throw new Error("Text is required");
    }

    // Use permanent cache prefix for destination phrases (won't be auto-deleted)
    const isPermanent = isPermanentCache === true;
    const cacheKey = generateCacheKey(text, isPermanent);
    console.log(`TTS request for: "${text}" (cache key: ${cacheKey}, permanent: ${isPermanent})`);

    // Check if cached audio exists
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: existingFile } = await supabase.storage
        .from('tts-cache')
        .download(cacheKey);
      
      if (existingFile) {
        console.log(`Cache HIT for: ${cacheKey}`);
        const audioBuffer = await existingFile.arrayBuffer();
        
        return new Response(audioBuffer, {
          headers: {
            ...corsHeaders,
            "Content-Type": "audio/mpeg",
            "X-Cache": "HIT",
          },
        });
      }
      
      console.log(`Cache MISS for: ${cacheKey}`);
    }

    // Usar apenas a chave 2 (as outras estão bloqueadas)
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_2");
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY_2 not configured");
    }

    console.log("Using ELEVENLABS_API_KEY_2");

    const selectedVoiceId = voiceId || "SVgp5d1fyFQRW1eQbwkq";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`Audio generated, size: ${audioBuffer.byteLength} bytes`);

    // Save to cache
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error: uploadError } = await supabase.storage
        .from('tts-cache')
        .upload(cacheKey, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });
      
      if (uploadError) {
        console.error(`Failed to cache audio:`, uploadError.message);
      } else {
        console.log(`Audio cached as: ${cacheKey}`);
      }

      // Track API key usage
      await supabase.from("api_key_usage").insert({
        api_key_index: 2,
        unit_name: unitName || "Desconhecido"
      });
    }

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "X-Cache": "MISS",
      },
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in elevenlabs-tts function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
