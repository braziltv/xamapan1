import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Voice for marketing: Chirp 3 HD Kore (pt-BR)
const MARKETING_VOICE = 'pt-BR-Chirp3-HD-Kore';

// Helper functions for JWT creation
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
  const keyView = new Uint8Array(keyBuffer);
  keyView.set(binaryDer);
  
  return await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function sign(data: string, privateKey: CryptoKey): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(data)
  );
  return new Uint8Array(signatureBuffer);
}

async function createJWT(credentials: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: credentials.token_uri,
    iat: now,
    exp: now + 3600
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const privateKey = await importPrivateKey(credentials.private_key);
  const signature = await sign(signatureInput, privateKey);
  const encodedSignature = base64UrlEncode(signature);

  return `${signatureInput}.${encodedSignature}`;
}

async function getAccessToken(credentials: any): Promise<string> {
  const jwt = await createJWT(credentials);
  
  const response = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[generate-marketing-audio] Erro ao obter access token:', error);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function generateAudioWithChirp3Kore(text: string, credentials: any): Promise<ArrayBuffer> {
  const accessToken = await getAccessToken(credentials);

  console.log(`[generate-marketing-audio] Gerando áudio com voz ${MARKETING_VOICE}: "${text.substring(0, 50)}..."`);

  const response = await fetch(
    'https://texttospeech.googleapis.com/v1/text:synthesize',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'pt-BR',
          name: MARKETING_VOICE,
          ssmlGender: 'FEMALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.92, // Slightly slower for natural, conversational pacing
          pitch: -1.0, // Lower pitch for warmer, more human tone
          volumeGainDb: 2.0, // Enhanced volume for clarity in public spaces
          effectsProfileId: ['large-home-entertainment-class-device'] // Optimized audio profile
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[generate-marketing-audio] Erro da API Google:', error);
    throw new Error(`Google Cloud TTS error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const audioBytes = base64Decode(data.audioContent);
  
  const audioBuffer = new ArrayBuffer(audioBytes.length);
  const audioView = new Uint8Array(audioBuffer);
  audioView.set(audioBytes);

  return audioBuffer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, announcementId, text, unitName, force } = body;

    // Health check
    if (body.healthCheck === true) {
      return new Response(
        JSON.stringify({ 
          status: 'healthy', 
          service: 'generate-marketing-audio',
          voice: MARKETING_VOICE,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Action: Delete single audio file
    if (action === 'delete-audio') {
      if (!announcementId) {
        throw new Error('announcementId is required');
      }

      const cacheFileName = `announcements/announcement_${announcementId}.mp3`;
      
      const { error: deleteError } = await supabase.storage
        .from('tts-cache')
        .remove([cacheFileName]);

      if (deleteError) {
        console.error(`[generate-marketing-audio] Delete error: ${deleteError.message}`);
      } else {
        console.log(`[generate-marketing-audio] 🗑️ Deleted: ${cacheFileName}`);
      }

      return new Response(
        JSON.stringify({ 
          success: !deleteError, 
          deleted: cacheFileName,
          error: deleteError?.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Cleanup expired announcements
    if (action === 'cleanup-expired') {
      const today = new Date().toISOString().split('T')[0];
      
      // Find expired announcements with cached audio
      const { data: expiredAnnouncements, error: fetchError } = await supabase
        .from('scheduled_announcements')
        .select('id, audio_cache_url')
        .lt('valid_until', today)
        .not('audio_cache_url', 'is', null);

      if (fetchError) {
        throw new Error(`Fetch error: ${fetchError.message}`);
      }

      if (!expiredAnnouncements || expiredAnnouncements.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'No expired announcements with cached audio',
            cleaned: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let cleaned = 0;
      const results: any[] = [];

      for (const announcement of expiredAnnouncements) {
        const cacheFileName = `announcements/announcement_${announcement.id}.mp3`;
        
        // Delete audio file
        const { error: deleteError } = await supabase.storage
          .from('tts-cache')
          .remove([cacheFileName]);

        if (!deleteError) {
          // Clear cache URL in database
          await supabase
            .from('scheduled_announcements')
            .update({ audio_cache_url: null, audio_generated_at: null })
            .eq('id', announcement.id);

          cleaned++;
          results.push({ id: announcement.id, status: 'cleaned' });
          console.log(`[generate-marketing-audio] 🧹 Cleaned expired: ${announcement.id}`);
        } else {
          results.push({ id: announcement.id, status: 'error', error: deleteError.message });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          total: expiredAnnouncements.length,
          cleaned,
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Delete all orphaned audio files (files without matching announcement)
    if (action === 'cleanup-orphaned') {
      // List all files in announcements folder
      const { data: files, error: listError } = await supabase.storage
        .from('tts-cache')
        .list('announcements');

      if (listError) {
        throw new Error(`List error: ${listError.message}`);
      }

      if (!files || files.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'No announcement audio files found',
            cleaned: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all announcement IDs
      const { data: announcements, error: fetchError } = await supabase
        .from('scheduled_announcements')
        .select('id');

      if (fetchError) {
        throw new Error(`Fetch error: ${fetchError.message}`);
      }

      const activeIds = new Set((announcements || []).map(a => a.id));
      const orphanedFiles: string[] = [];

      // Find orphaned files
      for (const file of files) {
        const match = file.name.match(/announcement_(.+)\.mp3/);
        if (match) {
          const announcementId = match[1];
          if (!activeIds.has(announcementId)) {
            orphanedFiles.push(`announcements/${file.name}`);
          }
        }
      }

      if (orphanedFiles.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'No orphaned files found',
            cleaned: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete orphaned files
      const { error: deleteError } = await supabase.storage
        .from('tts-cache')
        .remove(orphanedFiles);

      console.log(`[generate-marketing-audio] 🧹 Cleaned ${orphanedFiles.length} orphaned files`);

      return new Response(
        JSON.stringify({ 
          success: !deleteError, 
          cleaned: orphanedFiles.length,
          files: orphanedFiles,
          error: deleteError?.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load credentials for audio generation actions
    const credentialsJson = Deno.env.get('GOOGLE_CLOUD_CREDENTIALS');
    if (!credentialsJson) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS not configured');
    }
    const credentials = JSON.parse(credentialsJson);

    // Action: Generate single announcement audio
    if (action === 'generate-single') {
      if (!announcementId || !text) {
        throw new Error('announcementId and text are required');
      }

      const audioBuffer = await generateAudioWithChirp3Kore(text, credentials);
      const cacheFileName = `announcements/announcement_${announcementId}.mp3`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('tts-cache')
        .upload(cacheFileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload error: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tts-cache')
        .getPublicUrl(cacheFileName);

      // Update announcement record
      const { error: updateError } = await supabase
        .from('scheduled_announcements')
        .update({
          audio_cache_url: urlData.publicUrl,
          audio_generated_at: new Date().toISOString()
        })
        .eq('id', announcementId);

      if (updateError) {
        console.error('[generate-marketing-audio] Update error:', updateError);
      }

      console.log(`[generate-marketing-audio] ✅ Generated: ${cacheFileName}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          url: urlData.publicUrl,
          voice: MARKETING_VOICE
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Generate all announcements for a unit
    if (action === 'generate-all') {
      if (!unitName) {
        throw new Error('unitName is required');
      }

      // Fetch all active announcements for the unit
      const { data: announcements, error: fetchError } = await supabase
        .from('scheduled_announcements')
        .select('id, text_content, audio_cache_url')
        .eq('unit_name', unitName)
        .eq('is_active', true);

      if (fetchError) {
        throw new Error(`Fetch error: ${fetchError.message}`);
      }

      if (!announcements || announcements.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'No active announcements found',
            generated: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let generated = 0;
      const results: any[] = [];

      for (const announcement of announcements) {
        // Skip if already has cache and force is not set
        if (announcement.audio_cache_url && !force) {
          console.log(`[generate-marketing-audio] Skipping (already cached): ${announcement.id}`);
          results.push({ id: announcement.id, status: 'skipped', reason: 'already_cached' });
          continue;
        }

        try {
          const audioBuffer = await generateAudioWithChirp3Kore(announcement.text_content, credentials);
          const cacheFileName = `announcements/announcement_${announcement.id}.mp3`;

          const { error: uploadError } = await supabase.storage
            .from('tts-cache')
            .upload(cacheFileName, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true
            });

          if (uploadError) {
            results.push({ id: announcement.id, status: 'error', error: uploadError.message });
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('tts-cache')
            .getPublicUrl(cacheFileName);

          await supabase
            .from('scheduled_announcements')
            .update({
              audio_cache_url: urlData.publicUrl,
              audio_generated_at: new Date().toISOString()
            })
            .eq('id', announcement.id);

          generated++;
          results.push({ id: announcement.id, status: 'success', url: urlData.publicUrl });

          console.log(`[generate-marketing-audio] ✅ Generated: ${announcement.id}`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
          console.error(`[generate-marketing-audio] Error for ${announcement.id}:`, err);
          results.push({ id: announcement.id, status: 'error', error: String(err) });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          voice: MARKETING_VOICE,
          total: announcements.length,
          generated,
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: just generate audio and return it
    if (text) {
      const audioBuffer = await generateAudioWithChirp3Kore(text, credentials);
      
      return new Response(audioBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg'
        }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request. Use action: generate-single, generate-all, delete-audio, cleanup-expired, cleanup-orphaned, or provide text' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-marketing-audio] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
