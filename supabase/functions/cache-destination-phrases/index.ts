import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fixed voice for patient calls
const FIXED_VOICE_ID = 'pt-BR-Neural2-C';
const FIXED_SPEAKING_RATE = 1.0;

// Generate destination phrase with correct article (ao/à)
function generateDestinationPhrase(destinationName: string): string {
  const lowerName = destinationName.toLowerCase();
  
  // Keywords that use feminine article "à"
  const feminineKeywords = ['sala', 'triagem', 'enfermaria', 'recepção', 'farmácia', 'emergência'];
  const useFeminine = feminineKeywords.some(kw => lowerName.startsWith(kw));
  
  return `Por favor, dirija-se ${useFeminine ? 'à' : 'ao'} ${destinationName}`;
}

// Generate hash for cache key
async function hashPhrase(phrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${phrase}_${FIXED_VOICE_ID}_${FIXED_SPEAKING_RATE}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// Create JWT for Google Cloud authentication
async function createJWT(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signInput = `${headerB64}.${payloadB64}`;

  const pemContents = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${signInput}.${sigB64}`;
}

// Get Google Cloud access token
async function getAccessToken(credentials: any): Promise<string> {
  const jwt = await createJWT(credentials);
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await tokenResponse.json();
  return data.access_token;
}

// Generate TTS audio using Google Cloud
async function generateTTSAudio(text: string, accessToken: string): Promise<Uint8Array> {
  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: 'pt-BR',
        name: FIXED_VOICE_ID,
        ssmlGender: 'FEMALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: FIXED_SPEAKING_RATE,
        pitch: 0,
        volumeGainDb: 0
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google TTS error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const audioContent = data.audioContent;
  
  // Decode base64 to Uint8Array
  const binaryString = atob(audioContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { unitId, force = false } = body;

    // Health check
    if (body.healthCheck === true) {
      return new Response(
        JSON.stringify({ 
          status: 'healthy', 
          service: 'cache-destination-phrases',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!unitId) {
      return new Response(
        JSON.stringify({ error: 'unitId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[cache-destination-phrases] Starting for unit: ${unitId}, force: ${force}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch destinations for the unit
    const { data: destinations, error: destError } = await supabase
      .from('destinations')
      .select('name, display_name')
      .eq('unit_id', unitId)
      .eq('is_active', true);

    if (destError) {
      throw new Error(`Failed to fetch destinations: ${destError.message}`);
    }

    if (!destinations || destinations.length === 0) {
      console.log('[cache-destination-phrases] No destinations found for unit');
      return new Response(
        JSON.stringify({ success: true, cached: 0, skipped: 0, message: 'No destinations found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[cache-destination-phrases] Found ${destinations.length} destinations`);

    // Get Google Cloud credentials
    const credentialsJson = Deno.env.get('GOOGLE_CLOUD_CREDENTIALS');
    if (!credentialsJson) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS not configured');
    }
    const credentials = JSON.parse(credentialsJson);
    const accessToken = await getAccessToken(credentials);

    // Generate and cache phrases
    const results = { cached: 0, skipped: 0, errors: [] as string[] };

    for (const dest of destinations) {
      const destinationName = dest.display_name || dest.name;
      const phrase = generateDestinationPhrase(destinationName);
      const hash = await hashPhrase(phrase);
      const fileName = `destinations/${hash}.mp3`;

      try {
        // Check if already cached (unless force)
        if (!force) {
          const { data: existingFile } = await supabase.storage
            .from('tts-cache')
            .list('destinations', { search: `${hash}.mp3` });

          if (existingFile && existingFile.length > 0) {
            console.log(`[cache-destination-phrases] Skipping "${phrase}" (already cached)`);
            results.skipped++;
            continue;
          }
        }

        // Generate audio
        console.log(`[cache-destination-phrases] Generating: "${phrase}"`);
        const audioBuffer = await generateTTSAudio(phrase, accessToken);

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('tts-cache')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (uploadError) {
          console.error(`[cache-destination-phrases] Upload error for "${phrase}":`, uploadError);
          results.errors.push(`${destinationName}: ${uploadError.message}`);
          continue;
        }

        console.log(`[cache-destination-phrases] ✅ Cached: "${phrase}"`);
        results.cached++;

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[cache-destination-phrases] Error for "${destinationName}":`, errorMsg);
        results.errors.push(`${destinationName}: ${errorMsg}`);
      }
    }

    console.log(`[cache-destination-phrases] Complete: ${results.cached} cached, ${results.skipped} skipped, ${results.errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        cached: results.cached,
        skipped: results.skipped,
        errors: results.errors.length > 0 ? results.errors : undefined,
        totalDestinations: destinations.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[cache-destination-phrases] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
