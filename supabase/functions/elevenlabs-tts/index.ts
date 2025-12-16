import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maximum size for permanent cache in bytes (200MB)
const MAX_PERMANENT_CACHE_SIZE = 200 * 1024 * 1024;

// Split a full name into individual parts (first name, last name, third name, etc.)
// All parts are normalized to lowercase to avoid duplicate cache entries
// Handles compound names: "da", "de", "do", "dos", "das" are joined with the following word
function splitNameIntoParts(fullName: string): string[] {
  const words = fullName
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(part => part.length > 0);
  
  // Compound name connectors in Portuguese
  const connectors = new Set(['da', 'de', 'do', 'dos', 'das', 'e']);
  
  const result: string[] = [];
  let i = 0;
  
  while (i < words.length) {
    const word = words[i];
    
    // If current word is a connector and there's a next word, combine them
    if (connectors.has(word) && i + 1 < words.length) {
      // Combine connector with the following word(s)
      let combined = word;
      i++;
      
      // Keep combining while next word is also a connector
      while (i < words.length && connectors.has(words[i])) {
        combined += ' ' + words[i];
        i++;
      }
      
      // Add the final word after connectors
      if (i < words.length) {
        combined += ' ' + words[i];
        i++;
      }
      
      result.push(combined);
    } else {
      result.push(word);
      i++;
    }
  }
  
  return result;
}

// Generate a cache key from the text
// isPermanent: if true, uses "phrase_" prefix for permanent cache (not auto-deleted)
// Normalizes text to lowercase to avoid duplicate cache entries for same name with different casing
function generateCacheKey(text: string, isPermanent: boolean = false): string {
  const normalizedText = text.toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const prefix = isPermanent ? 'phrase_' : 'part_';
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

// Calculate total size of permanent cache
async function getPermanentCacheSize(supabase: any): Promise<number> {
  try {
    const { data: files, error } = await supabase.storage
      .from('tts-cache')
      .list('', { limit: 1000 });
    
    if (error || !files) return 0;
    
    const permanentFiles = files.filter((f: any) => f.name.startsWith('phrase_'));
    const totalSize = permanentFiles.reduce((acc: number, f: any) => {
      return acc + (f.metadata?.size || 0);
    }, 0);
    
    console.log(`Permanent cache size: ${(totalSize / 1024 / 1024).toFixed(2)}MB (${permanentFiles.length} files)`);
    return totalSize;
  } catch (error) {
    console.error('Error calculating cache size:', error);
    return 0;
  }
}

// Clean up least used entries when cache exceeds limit
async function cleanupCacheIfNeeded(supabase: any): Promise<void> {
  try {
    const cacheSize = await getPermanentCacheSize(supabase);
    
    if (cacheSize < MAX_PERMANENT_CACHE_SIZE) {
      return;
    }
    
    console.log(`Cache size ${(cacheSize / 1024 / 1024).toFixed(2)}MB exceeds limit of ${MAX_PERMANENT_CACHE_SIZE / 1024 / 1024}MB, cleaning up...`);
    
    // Get usage counts for all name parts from last 20 days
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    
    const { data: usageData, error: usageError } = await supabase
      .from('tts_name_usage')
      .select('name_hash, name_text')
      .gte('used_at', twentyDaysAgo.toISOString());
    
    if (usageError || !usageData) {
      console.error('Error fetching usage data:', usageError);
      return;
    }
    
    // Count usage per hash
    const usageCounts: Record<string, number> = {};
    for (const entry of usageData) {
      usageCounts[entry.name_hash] = (usageCounts[entry.name_hash] || 0) + 1;
    }
    
    // Get permanent cache files
    const { data: files, error: filesError } = await supabase.storage
      .from('tts-cache')
      .list('', { limit: 1000 });
    
    if (filesError || !files) return;
    
    const permanentFiles = files
      .filter((f: any) => f.name.startsWith('phrase_'))
      .map((f: any) => {
        const hash = f.name.replace('phrase_', '').replace('.mp3', '');
        return {
          name: f.name,
          hash,
          usageCount: usageCounts[hash] || 0,
          size: f.metadata?.size || 0
        };
      })
      .sort((a: any, b: any) => a.usageCount - b.usageCount);
    
    // Delete 50% least used files
    const filesToDelete = permanentFiles.slice(0, Math.ceil(permanentFiles.length / 2));
    
    if (filesToDelete.length === 0) return;
    
    const filePaths = filesToDelete.map((f: any) => f.name);
    console.log(`Deleting ${filePaths.length} least used permanent cache files`);
    
    const { error: deleteError } = await supabase.storage
      .from('tts-cache')
      .remove(filePaths);
    
    if (deleteError) {
      console.error('Error deleting files:', deleteError);
    } else {
      console.log(`Successfully deleted ${filePaths.length} cache files to free space`);
    }
  } catch (error) {
    console.error('Error in cleanupCacheIfNeeded:', error);
  }
}

// Check if a name part has been used frequently and should be promoted to permanent cache
async function checkAndPromoteFrequentPart(
  supabase: any,
  partHash: string,
  partText: string,
  currentCacheKey: string
): Promise<boolean> {
  try {
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    
    const { count, error: countError } = await supabase
      .from('tts_name_usage')
      .select('*', { count: 'exact', head: true })
      .eq('name_hash', partHash)
      .gte('used_at', twentyDaysAgo.toISOString());
    
    if (countError) {
      console.error('Error counting part usage:', countError);
      return false;
    }
    
    console.log(`Part "${partText}" (hash ${partHash}) used ${count} times in last 20 days`);
    
    if (count && count >= 5) {
      const permanentKey = `phrase_${partHash}.mp3`;
      
      const { data: existingPermanent } = await supabase.storage
        .from('tts-cache')
        .download(permanentKey);
      
      if (!existingPermanent) {
        // Check cache size before promoting
        await cleanupCacheIfNeeded(supabase);
        
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
          console.log(`Promoted "${partText}" to permanent cache: ${permanentKey}`);
        }
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in checkAndPromoteFrequentPart:', error);
    return false;
  }
}

// Track name part usage in database
async function trackPartUsage(supabase: any, partHash: string, partText: string): Promise<void> {
  try {
    await supabase.from('tts_name_usage').insert({
      name_hash: partHash,
      name_text: partText.toLowerCase(),
    });
    console.log(`Tracked usage for part: "${partText}" (hash: ${partHash})`);
  } catch (error) {
    console.error('Error tracking part usage:', error);
  }
}

// Test a single API key
async function testApiKey(keyName: string, apiKey: string | undefined): Promise<{ keyName: string; working: boolean; error?: string }> {
  if (!apiKey) {
    return { keyName, working: false, error: "Not configured" };
  }
  
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/onwK4e9ZLuTAKqWW03F9`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "teste",
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
        }),
      }
    );
    
    if (response.ok) {
      return { keyName, working: true };
    } else {
      const errorText = await response.text();
      return { keyName, working: false, error: `Status ${response.status}: ${errorText.substring(0, 100)}` };
    }
  } catch (error) {
    return { keyName, working: false, error: String(error) };
  }
}

// Get or generate audio for a single name part or phrase
async function getOrGenerateAudio(
  supabase: any,
  text: string,
  isPermanent: boolean,
  apiKey: string,
  voiceId: string
): Promise<ArrayBuffer> {
  const cacheKey = generateCacheKey(text, isPermanent);
  const partHash = getNameHash(text);
  
  // Check permanent cache first for non-permanent requests
  if (!isPermanent && supabase) {
    const permanentKey = `phrase_${partHash}.mp3`;
    const { data: permanentFile } = await supabase.storage
      .from('tts-cache')
      .download(permanentKey);
    
    if (permanentFile) {
      console.log(`Permanent cache HIT for: "${text}" (${permanentKey})`);
      return permanentFile.arrayBuffer();
    }
  }
  
  // Check regular cache
  if (supabase) {
    const { data: existingFile } = await supabase.storage
      .from('tts-cache')
      .download(cacheKey);
    
    if (existingFile) {
      console.log(`Cache HIT for: "${text}" (${cacheKey})`);
      return existingFile.arrayBuffer();
    }
  }
  
  // Generate new audio
  console.log(`Generating audio for: "${text}"`);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
        language_code: "pt-BR",  // Português Brasileiro
        voice_settings: {
          stability: 0.85,          // Alta estabilidade para voz consistente
          similarity_boost: 0.80,   // Boa similaridade com a voz original
          style: 0.1,               // Pouco estilo para locução mais natural
          use_speaker_boost: true,  // Clareza e nitidez aprimoradas
          speed: 0.95,              // Velocidade ligeiramente mais lenta para clareza
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  
  // Cache the generated audio
  if (supabase) {
    await supabase.storage
      .from('tts-cache')
      .upload(cacheKey, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });
    console.log(`Cached: "${text}" as ${cacheKey}`);
  }
  
  return audioBuffer;
}

// Concatenate multiple MP3 audio buffers
function concatenateAudioBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  
  return result.buffer;
}

// Generate a short silence audio buffer (approximately 150ms of silence)
// This creates a minimal valid MP3 frame with silence
function generateSilenceBuffer(): ArrayBuffer {
  // Short silence MP3 frame - creates a brief pause between segments
  // This is a minimal MP3 frame that produces silence
  const silenceData = new Uint8Array([
    0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  return silenceData.buffer;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    const { text, voiceId, unitName, clearCache, isPermanentCache, testAllKeys, concatenate } = await req.json();

    const supabase = supabaseUrl && supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey) 
      : null;

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    // Daniel voice - clear, authoritative male voice that works well with Portuguese
    const selectedVoiceId = voiceId || "onwK4e9ZLuTAKqWW03F9";

    // Handle concatenation mode: combine name parts + prefix + destination
    if (concatenate && supabase && ELEVENLABS_API_KEY) {
      const { name, prefix, destination } = concatenate;
      console.log(`Concatenation request: name="${name}", prefix="${prefix}", destination="${destination}"`);
      
      const audioBuffers: ArrayBuffer[] = [];
      const namePartBuffers: ArrayBuffer[] = [];
      let apiCallsMade = 0;
      const silenceBuffer = generateSilenceBuffer();
      
      // Helper function to get or generate audio for a part with caching
      async function getPartAudio(part: string, isPermanent: boolean): Promise<{ audio: ArrayBuffer; fromCache: boolean }> {
        const partHash = getNameHash(part);
        const partCacheKey = generateCacheKey(part, isPermanent);
        
        // Track part usage for non-permanent parts
        if (!isPermanent) {
          await trackPartUsage(supabase!, partHash, part);
        }
        
        // Check permanent cache first
        const permanentKey = `phrase_${partHash}.mp3`;
        const { data: permanentFile } = await supabase!.storage
          .from('tts-cache')
          .download(permanentKey);
        
        if (permanentFile) {
          console.log(`Part "${part}" found in permanent cache (${permanentKey})`);
          return { audio: await permanentFile.arrayBuffer(), fromCache: true };
        }
        
        // Check temporary cache
        const { data: tempFile } = await supabase!.storage
          .from('tts-cache')
          .download(partCacheKey);
        
        if (tempFile) {
          console.log(`Part "${part}" found in temporary cache (${partCacheKey})`);
          
          // Check for promotion to permanent cache
          if (!isPermanent) {
            await checkAndPromoteFrequentPart(supabase!, partHash, part, partCacheKey);
          }
          
          return { audio: await tempFile.arrayBuffer(), fromCache: true };
        }
        
        // Generate new audio
        console.log(`Generating audio for part: "${part}"`);
        const partAudio = await getOrGenerateAudio(supabase!, part, isPermanent, ELEVENLABS_API_KEY!, selectedVoiceId);
        
        // Check for promotion to permanent cache
        if (!isPermanent) {
          await checkAndPromoteFrequentPart(supabase!, partHash, part, partCacheKey);
        }
        
        return { audio: partAudio, fromCache: false };
      }
      
      // Split name into parts and process each separately
      if (name) {
        const nameParts = splitNameIntoParts(name);
        console.log(`Name "${name}" split into ${nameParts.length} parts: [${nameParts.map(p => `"${p}"`).join(', ')}]`);
        
        for (let i = 0; i < nameParts.length; i++) {
          const part = nameParts[i];
          const { audio, fromCache } = await getPartAudio(part, false);
          
          namePartBuffers.push(audio);
          if (!fromCache) apiCallsMade++;
          
          // Add brief silence between name parts (except after last part)
          if (i < nameParts.length - 1) {
            namePartBuffers.push(silenceBuffer);
          }
        }
        
        // Add all name parts to main buffer
        audioBuffers.push(...namePartBuffers);
      }
      
      // Add silence before destination phrase for natural pause
      if (audioBuffers.length > 0 && destination) {
        audioBuffers.push(silenceBuffer);
        audioBuffers.push(silenceBuffer); // Double silence for emphasis
      }
      
      // Get prefix audio (always from permanent cache) - if provided
      if (prefix) {
        const { audio, fromCache } = await getPartAudio(prefix, true);
        audioBuffers.push(audio);
        if (!fromCache) apiCallsMade++;
      }
      
      // Get destination audio (always from permanent cache)
      if (destination) {
        const { audio, fromCache } = await getPartAudio(destination, true);
        audioBuffers.push(audio);
        if (!fromCache) apiCallsMade++;
      }
      
      // Concatenate all audio segments
      const combinedAudio = concatenateAudioBuffers(audioBuffers);
      const segmentCount = audioBuffers.filter(b => b.byteLength > 200).length; // Count real segments, not silence
      console.log(`Concatenated audio: ${segmentCount} segments (${audioBuffers.length} total with silence), ${combinedAudio.byteLength} bytes, ${apiCallsMade} API calls made`);
      
      // Track API usage if any calls were made
      if (apiCallsMade > 0) {
        await supabase.from("api_key_usage").insert({
          api_key_index: 1,
          unit_name: unitName || "Desconhecido"
        });
      }
      
      return new Response(combinedAudio, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "X-Cache": apiCallsMade > 0 ? "PARTIAL" : "HIT",
          "X-Segments": String(segmentCount),
          "X-API-Calls": String(apiCallsMade),
          "X-Name-Parts": name ? String(splitNameIntoParts(name).length) : "0",
        },
      });
    }

    // Test all API keys if requested
    if (testAllKeys) {
      const key1 = Deno.env.get("ELEVENLABS_API_KEY");
      const key2 = Deno.env.get("ELEVENLABS_API_KEY_2");
      const key3 = Deno.env.get("ELEVENLABS_API_KEY_3");
      
      console.log("Testing all ElevenLabs API keys...");
      
      const results = await Promise.all([
        testApiKey("ELEVENLABS_API_KEY", key1),
        testApiKey("ELEVENLABS_API_KEY_2", key2),
        testApiKey("ELEVENLABS_API_KEY_3", key3),
      ]);
      
      console.log("API Key test results:", JSON.stringify(results, null, 2));
      
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle cache clearing request
    if (clearCache && supabase) {
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
    const partHash = getNameHash(text);
    console.log(`TTS request for: "${text}" (cache key: ${cacheKey}, permanent: ${isPermanent})`);

    // For non-permanent caches (patient names), check if permanent version exists first
    if (!isPermanent && supabase) {
      const permanentKey = `phrase_${partHash}.mp3`;
      const { data: permanentFile } = await supabase.storage
        .from('tts-cache')
        .download(permanentKey);
      
      if (permanentFile) {
        console.log(`Permanent cache HIT for: ${permanentKey}`);
        const audioBuffer = await permanentFile.arrayBuffer();
        
        // Track usage even for permanent cache hits
        await trackPartUsage(supabase, partHash, text);
        
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
          await trackPartUsage(supabase, partHash, text);
          await checkAndPromoteFrequentPart(supabase, partHash, text, cacheKey);
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

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    console.log("Using ELEVENLABS_API_KEY");

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
          language_code: "pt-BR",  // Português Brasileiro
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
        await trackPartUsage(supabase, partHash, text);
      }

      // Track API key usage
      await supabase.from("api_key_usage").insert({
        api_key_index: 1,
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
