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

// Get just the hash part for tracking usage
function getNameHash(text: string): string {
  const normalizedText = text.toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return String(Math.abs(hash));
}

// Check if a name has been used frequently and should be promoted to permanent cache
async function checkAndPromoteFrequentName(
  supabase: any,
  nameHash: string,
  nameText: string,
  currentCacheKey: string
): Promise<boolean> {
  try {
    // Count usage in the last 20 days
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    
    const { count, error: countError } = await supabase
      .from('tts_name_usage')
      .select('*', { count: 'exact', head: true })
      .eq('name_hash', nameHash)
      .gte('used_at', twentyDaysAgo.toISOString());
    
    if (countError) {
      console.error('Error counting name usage:', countError);
      return false;
    }
    
    console.log(`Name hash ${nameHash} used ${count} times in last 20 days`);
    
    // If used more than 5 times, promote to permanent cache
    if (count && count >= 5) {
      const permanentKey = `phrase_${nameHash}.mp3`;
      
      // Check if permanent cache already exists
      const { data: existingPermanent } = await supabase.storage
        .from('tts-cache')
        .download(permanentKey);
      
      if (!existingPermanent) {
        // Copy from temporary to permanent cache
        const { data: tempFile } = await supabase.storage
          .from('tts-cache')
          .download(currentCacheKey);
        
        if (tempFile) {
          const audioBuffer = await tempFile.arrayBuffer();
          await supabase.storage
            .from('tts-cache')
            .upload(permanentKey, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });
          console.log(`Promoted ${nameText} to permanent cache: ${permanentKey}`);
        }
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in checkAndPromoteFrequentName:', error);
    return false;
  }
}

// Track name usage in database
async function trackNameUsage(supabase: any, nameHash: string, nameText: string): Promise<void> {
  try {
    await supabase.from('tts_name_usage').insert({
      name_hash: nameHash,
      name_text: nameText.toLowerCase(),
    });
    console.log(`Tracked usage for name hash: ${nameHash}`);
  } catch (error) {
    console.error('Error tracking name usage:', error);
  }
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
      const cacheKey = generateCacheKey(clearCache, false);
      
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
    const nameHash = getNameHash(text);
    console.log(`TTS request for: "${text}" (cache key: ${cacheKey}, permanent: ${isPermanent})`);

    const supabase = supabaseUrl && supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey) 
      : null;

    // For non-permanent caches (patient names), check if permanent version exists first
    if (!isPermanent && supabase) {
      const permanentKey = `phrase_${nameHash}.mp3`;
      const { data: permanentFile } = await supabase.storage
        .from('tts-cache')
        .download(permanentKey);
      
      if (permanentFile) {
        console.log(`Permanent cache HIT for: ${permanentKey}`);
        const audioBuffer = await permanentFile.arrayBuffer();
        
        // Track usage even for permanent cache hits
        await trackNameUsage(supabase, nameHash, text);
        
        return new Response(audioBuffer, {
          headers: {
            ...corsHeaders,
            "Content-Type": "audio/mpeg",
            "X-Cache": "HIT-PERMANENT",
          },
        });
      }
    }

    // Check if cached audio exists (temporary or permanent based on isPermanent flag)
    if (supabase) {
      const { data: existingFile } = await supabase.storage
        .from('tts-cache')
        .download(cacheKey);
      
      if (existingFile) {
        console.log(`Cache HIT for: ${cacheKey}`);
        const audioBuffer = await existingFile.arrayBuffer();
        
        // For non-permanent, track usage and check for promotion
        if (!isPermanent) {
          await trackNameUsage(supabase, nameHash, text);
          await checkAndPromoteFrequentName(supabase, nameHash, text, cacheKey);
        }
        
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
    if (supabase) {
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

      // For non-permanent, track usage
      if (!isPermanent) {
        await trackNameUsage(supabase, nameHash, text);
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
