import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== ACCESS TOKEN CACHE ====================
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getCachedAccessToken(credentials: any): Promise<string> {
  const now = Date.now();
  // Reuse token if still valid (with 5 min margin)
  if (cachedAccessToken && now < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedAccessToken;
  }
  
  console.log('[google-cloud-tts] Generating new access token...');
  const jwt = await createJWT(credentials);
  
  const response = await fetch(credentials.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[google-cloud-tts] Token error:', error);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  // Token valid for 1 hour, cache for 50 minutes
  tokenExpiresAt = now + 50 * 60 * 1000;
  console.log('[google-cloud-tts] Access token cached for 50 minutes');
  return cachedAccessToken!;
}

// ==================== JWT / CRYPTO ====================
async function createJWT(credentials: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: credentials.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await importPrivateKey(credentials.private_key);
  const signature = await sign(signInput, privateKey);
  const encodedSignature = base64UrlEncode(signature);

  return `${signInput}.${encodedSignature}`;
}

function base64UrlEncode(data: string | Uint8Array): string {
  const base64 = typeof data === 'string'
    ? btoa(data)
    : btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  const binaryDer = base64Decode(pemContents);
  const keyBuffer = new ArrayBuffer(binaryDer.length);
  new Uint8Array(keyBuffer).set(binaryDer);
  return await crypto.subtle.importKey('pkcs8', keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

async function sign(data: string, privateKey: CryptoKey): Promise<Uint8Array> {
  const buf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(data));
  return new Uint8Array(buf);
}

// ==================== HASH UTIL ====================
async function hashText(text: string, voiceName: string, rate: number): Promise<string> {
  const input = `${text}_${voiceName}_${rate}`;
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// ==================== VOICE CONFIG ====================
const VOICES: Record<string, { languageCode: string; name: string; ssmlGender: string }> = {
  'pt-BR-Chirp3-HD-Aoede': { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' },
  'pt-BR-Chirp3-HD-Kore': { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Kore', ssmlGender: 'FEMALE' },
  'pt-BR-Chirp3-HD-Leda': { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Leda', ssmlGender: 'FEMALE' },
  'pt-BR-Chirp3-HD-Zephyr': { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Zephyr', ssmlGender: 'FEMALE' },
  'pt-BR-Chirp3-HD-Charon': { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Charon', ssmlGender: 'MALE' },
  'pt-BR-Chirp3-HD-Orus': { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Orus', ssmlGender: 'MALE' },
  'pt-BR-Chirp3-HD-Puck': { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Puck', ssmlGender: 'MALE' },
  'pt-BR-Chirp3-HD-Fenrir': { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Fenrir', ssmlGender: 'MALE' },
  'pt-BR-Chirp3-HD-Erinome': { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Erinome', ssmlGender: 'FEMALE' },
  'pt-BR-Neural2-A': { languageCode: 'pt-BR', name: 'pt-BR-Neural2-A', ssmlGender: 'FEMALE' },
  'pt-BR-Neural2-C': { languageCode: 'pt-BR', name: 'pt-BR-Neural2-C', ssmlGender: 'FEMALE' },
  'pt-BR-Neural2-B': { languageCode: 'pt-BR', name: 'pt-BR-Neural2-B', ssmlGender: 'MALE' },
  'pt-BR-Wavenet-A': { languageCode: 'pt-BR', name: 'pt-BR-Wavenet-A', ssmlGender: 'FEMALE' },
  'pt-BR-Wavenet-B': { languageCode: 'pt-BR', name: 'pt-BR-Wavenet-B', ssmlGender: 'MALE' },
  'pt-BR-Wavenet-C': { languageCode: 'pt-BR', name: 'pt-BR-Wavenet-C', ssmlGender: 'FEMALE' },
  'pt-BR-Standard-A': { languageCode: 'pt-BR', name: 'pt-BR-Standard-A', ssmlGender: 'FEMALE' },
  'pt-BR-Standard-B': { languageCode: 'pt-BR', name: 'pt-BR-Standard-B', ssmlGender: 'MALE' },
  'pt-BR-Standard-C': { languageCode: 'pt-BR', name: 'pt-BR-Standard-C', ssmlGender: 'FEMALE' },
};

function isChirp3HD(voiceName: string): boolean {
  return voiceName.includes('Chirp3-HD');
}

const DEFAULT_VOICES = {
  female: 'pt-BR-Chirp3-HD-Aoede',
  male: 'pt-BR-Chirp3-HD-Charon'
};

// ==================== SSML ====================
function convertToNaturalSSML(text: string): string {
  let ssml = text;
  ssml = ssml.replace(/\.\s*(por favor|Por favor)/g, '.<break time="150ms"/> $1');
  ssml = ssml.replace(/,\s*/g, ',<break time="90ms"/> ');
  ssml = ssml.replace(/,?\s*(em caso de dúvidas)/gi, '.<break time="125ms"/> $1');
  ssml = ssml.replace(/(dirija-se\s+(?:ao|à))\s+/g, '$1 <break time="50ms"/>');
  return `<speak>${ssml}</speak>`;
}

// ==================== CACHE LOGIC ====================
// Cache types: 
//   names/{hash}.mp3 → patient names, TTL 30 days unused
//   announcements/{hash}.mp3 → custom announcements, TTL 30 days unused
//   destinations/{hash}.mp3 → destination phrases, permanent
//   time/ → hour/minute audio, permanent

async function tryGetFromCache(
  supabase: any,
  folder: string,
  hash: string,
  maxAgeMinutes: number // 0 = permanent (no expiry check)
): Promise<Uint8Array | null> {
  try {
    const fileName = `${hash}.mp3`;
    
    // Check if file exists
    const { data: files } = await supabase.storage
      .from('tts-cache')
      .list(folder, { search: fileName });
    
    if (!files || files.length === 0) return null;
    
    const file = files.find((f: any) => f.name === fileName);
    if (!file) return null;
    
    // Check TTL if not permanent
    if (maxAgeMinutes > 0 && file.created_at) {
      const fileAge = Date.now() - new Date(file.created_at).getTime();
      const maxAgeMs = maxAgeMinutes * 60 * 1000;
      if (fileAge > maxAgeMs) {
        console.log(`[cache] Expired: ${folder}/${fileName} (age: ${Math.round(fileAge / 60000)}min, max: ${maxAgeMinutes}min)`);
        // Delete expired file
        await supabase.storage.from('tts-cache').remove([`${folder}/${fileName}`]);
        return null;
      }
    }
    
    // Download the cached file
    const { data, error } = await supabase.storage
      .from('tts-cache')
      .download(`${folder}/${fileName}`);
    
    if (error || !data) return null;
    
    const buffer = await data.arrayBuffer();
    console.log(`[cache] HIT: ${folder}/${fileName} (${buffer.byteLength} bytes)`);
    return new Uint8Array(buffer);
  } catch (e) {
    console.warn(`[cache] Error checking ${folder}/${hash}:`, e);
    return null;
  }
}

async function saveToCache(
  supabase: any,
  folder: string,
  hash: string,
  audioBytes: Uint8Array
): Promise<void> {
  try {
    const filePath = `${folder}/${hash}.mp3`;
    const { error } = await supabase.storage
      .from('tts-cache')
      .upload(filePath, audioBytes, {
        contentType: 'audio/mpeg',
        upsert: true,
      });
    
    if (error) {
      console.warn(`[cache] Save error ${filePath}:`, error.message);
    } else {
      console.log(`[cache] SAVED: ${filePath} (${audioBytes.length} bytes)`);
    }
  } catch (e) {
    console.warn(`[cache] Save error:`, e);
  }
}

// ==================== MAIN HANDLER ====================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Health check
    if (body.healthCheck === true) {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'google-cloud-tts',
          timestamp: new Date().toISOString(),
          hasCredentials: !!Deno.env.get('GOOGLE_CLOUD_CREDENTIALS'),
          tokenCached: cachedAccessToken !== null && Date.now() < tokenExpiresAt,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text, voice = 'female', voiceName, speakingRate = 1.0, concatenate, cacheType } = body;

    // Determine voice
    let selectedVoiceName: string;
    if (voiceName && VOICES[voiceName]) {
      selectedVoiceName = voiceName;
    } else if (voice === 'male') {
      selectedVoiceName = DEFAULT_VOICES.male;
    } else {
      selectedVoiceName = DEFAULT_VOICES.female;
    }

    const selectedVoice = VOICES[selectedVoiceName];
    const useChirp3 = isChirp3HD(selectedVoiceName);
    const finalRate = useChirp3 ? Math.min(speakingRate, 0.95) : speakingRate * 0.95;

    // Build final text
    let finalText = text;
    if (concatenate) {
      const { name, prefix, destination } = concatenate;
      const cleanName = name?.trim() || '';
      const cleanPrefix = prefix?.trim() || '';
      const cleanDestination = destination?.trim() || '';
      finalText = cleanPrefix ? `${cleanPrefix} ${cleanName}. ${cleanDestination}` : `${cleanName}. ${cleanDestination}`;
      console.log(`[google-cloud-tts] Concatenate mode: "${finalText}"`);
    }

    if (!finalText) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==================== CACHE CHECK ====================
    // Determine cache folder and TTL based on cacheType or auto-detect
    let cacheFolder: string | null = null;
    let cacheTTLMinutes = 0;
    
    // cacheType can be: 'name' (60min), 'announcement' (24h=1440min), 'none' (skip cache)
    if (cacheType === 'name') {
      cacheFolder = 'names';
      cacheTTLMinutes = 43200; // 30 days
    } else if (cacheType === 'announcement') {
      cacheFolder = 'announcements';
      cacheTTLMinutes = 43200; // 30 days
    } else if (cacheType !== 'none' && !concatenate) {
      if (finalText.length <= 60) {
        cacheFolder = 'names';
        cacheTTLMinutes = 43200; // 30 days
      } else {
        cacheFolder = 'announcements';
        cacheTTLMinutes = 43200; // 30 days
      }
    } else if (cacheType !== 'none' && concatenate) {
      // For concatenated calls, don't cache the full thing (name+dest)
      // The name part should be cached separately by the client
      cacheFolder = null;
    }

    // Initialize Supabase for cache operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to serve from cache
    if (cacheFolder) {
      const hash = await hashText(finalText, selectedVoiceName, finalRate);
      const cached = await tryGetFromCache(supabase, cacheFolder, hash, cacheTTLMinutes);
      
      if (cached) {
        // Track usage for names
        if (cacheFolder === 'names') {
          supabase.from('tts_name_usage').insert({
            name_hash: hash,
            name_text: finalText.substring(0, 100),
          }).then(() => {}).catch(() => {});
        }
        
        return new Response(cached.buffer, {
          headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'X-Cache': 'HIT' }
        });
      }
    }

    // ==================== GENERATE AUDIO ====================
    const credentialsJson = Deno.env.get('GOOGLE_CLOUD_CREDENTIALS');
    if (!credentialsJson) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS not configured');
    }
    const credentials = JSON.parse(credentialsJson);
    const accessToken = await getCachedAccessToken(credentials);

    const ssmlText = convertToNaturalSSML(finalText);
    console.log(`[google-cloud-tts] Generating: "${finalText}" voice=${selectedVoiceName}`);

    const ttsResponse = await fetch(
      'https://texttospeech.googleapis.com/v1/text:synthesize',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { ssml: ssmlText },
          voice: selectedVoice,
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: finalRate,
            ...(useChirp3 ? {} : { pitch: -1.2 }),
            volumeGainDb: 1.0,
            effectsProfileId: ['large-home-entertainment-class-device'],
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error('[google-cloud-tts] API error:', error);
      
      // If token expired, clear cache and retry once
      if (ttsResponse.status === 401) {
        console.log('[google-cloud-tts] Token expired, clearing cache...');
        cachedAccessToken = null;
        tokenExpiresAt = 0;
      }
      
      throw new Error(`Google Cloud TTS error: ${ttsResponse.status} - ${error}`);
    }

    const ttsData = await ttsResponse.json();
    const audioBytes = base64Decode(ttsData.audioContent);
    const audioBuffer = new ArrayBuffer(audioBytes.length);
    const audioView = new Uint8Array(audioBuffer);
    audioView.set(audioBytes);

    console.log(`[google-cloud-tts] Generated ${audioBytes.length} bytes`);

    // ==================== SAVE TO CACHE ====================
    if (cacheFolder) {
      const hash = await hashText(finalText, selectedVoiceName, finalRate);
      // Save in background (don't block response)
      saveToCache(supabase, cacheFolder, hash, audioView).catch(() => {});
      
      // Track usage for names
      if (cacheFolder === 'names') {
        supabase.from('tts_name_usage').insert({
          name_hash: hash,
          name_text: finalText.substring(0, 100),
        }).then(() => {}).catch(() => {});
      }
    }

    return new Response(audioBuffer, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'X-Cache': 'MISS' }
    });

  } catch (error) {
    console.error('[google-cloud-tts] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
