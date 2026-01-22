import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Texto para horas (0-23) - estilo brasileiro conversacional
function getHourText(hour: number): string {
  if (hour === 0) return 'meia-noite';
  if (hour === 1) return 'uma hora';
  if (hour === 2) return 'duas horas';
  if (hour === 12) return 'meio-dia';
  
  const hoursText: { [key: number]: string } = {
    3: 'três horas',
    4: 'quatro horas',
    5: 'cinco horas',
    6: 'seis horas',
    7: 'sete horas',
    8: 'oito horas',
    9: 'nove horas',
    10: 'dez horas',
    11: 'onze horas',
    13: 'treze horas',
    14: 'catorze horas',
    15: 'quinze horas',
    16: 'dezesseis horas',
    17: 'dezessete horas',
    18: 'dezoito horas',
    19: 'dezenove horas',
    20: 'vinte horas',
    21: 'vinte e uma horas',
    22: 'vinte e duas horas',
    23: 'vinte e três horas',
  };
  return hoursText[hour] || `${hour} horas`;
}

// Texto para minutos (0-59) - estilo brasileiro conversacional
function getMinuteText(minute: number): string {
  if (minute === 0) return '';
  if (minute === 15) return 'e quinze';
  if (minute === 30) return 'e meia';
  if (minute === 45) return 'e quarenta e cinco';
  if (minute === 1) return 'e um';
  
  const minutesText: { [key: number]: string } = {
    2: 'e dois', 3: 'e três', 4: 'e quatro', 5: 'e cinco',
    6: 'e seis', 7: 'e sete', 8: 'e oito', 9: 'e nove', 10: 'e dez',
    11: 'e onze', 12: 'e doze', 13: 'e treze', 14: 'e catorze',
    16: 'e dezesseis', 17: 'e dezessete', 18: 'e dezoito', 19: 'e dezenove',
    20: 'e vinte', 21: 'e vinte e um', 22: 'e vinte e dois', 23: 'e vinte e três',
    24: 'e vinte e quatro', 25: 'e vinte e cinco', 26: 'e vinte e seis',
    27: 'e vinte e sete', 28: 'e vinte e oito', 29: 'e vinte e nove',
    31: 'e trinta e um', 32: 'e trinta e dois', 33: 'e trinta e três',
    34: 'e trinta e quatro', 35: 'e trinta e cinco', 36: 'e trinta e seis',
    37: 'e trinta e sete', 38: 'e trinta e oito', 39: 'e trinta e nove',
    40: 'e quarenta', 41: 'e quarenta e um', 42: 'e quarenta e dois',
    43: 'e quarenta e três', 44: 'e quarenta e quatro',
    46: 'e quarenta e seis', 47: 'e quarenta e sete', 48: 'e quarenta e oito',
    49: 'e quarenta e nove', 50: 'e cinquenta', 51: 'e cinquenta e um',
    52: 'e cinquenta e dois', 53: 'e cinquenta e três', 54: 'e cinquenta e quatro',
    55: 'e cinquenta e cinco', 56: 'e cinquenta e seis', 57: 'e cinquenta e sete',
    58: 'e cinquenta e oito', 59: 'e cinquenta e nove',
  };
  return minutesText[minute] || `e ${minute}`;
}

// Cria JWT para autenticação Google Cloud
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

  // Parse PEM private key
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

// Obtém access token do Google Cloud
async function getAccessToken(credentials: any): Promise<string> {
  const jwt = await createJWT(credentials);
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Gera áudio usando Google Cloud TTS - Chirp 3: HD (Erinome - Female)
async function generateAudioWithGoogle(text: string): Promise<ArrayBuffer> {
  const credentialsJson = Deno.env.get('GOOGLE_CLOUD_CREDENTIALS');
  if (!credentialsJson) {
    throw new Error('GOOGLE_CLOUD_CREDENTIALS not configured');
  }

  const credentials = JSON.parse(credentialsJson);
  const accessToken = await getAccessToken(credentials);

  console.log(`[Chirp3-HD Erinome] Generating audio for: "${text}"`);

  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: 'pt-BR',
        name: 'pt-BR-Chirp3-HD-Erinome', // Chirp 3: HD - Erinome (Female)
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.90, // Slower for clear, natural time announcements
        pitch: -0.8, // Warmer, more human-like tone
        volumeGainDb: 1.5, // Enhanced clarity
        effectsProfileId: ['large-home-entertainment-class-device'], // Optimized for TV/speakers
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google TTS API error: ${response.status} - ${errorText}`);
    throw new Error(`Google TTS API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Google retorna o áudio em base64
  const audioContent = data.audioContent;
  const binaryString = atob(audioContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  console.log(`[Chirp3-HD Erinome] Generated ${bytes.length} bytes for: "${text}"`);
  return bytes.buffer;
}

// Função para deletar todos os arquivos de cache de tempo
async function deleteTimeCache(supabase: any): Promise<{ deleted: number; errors: string[] }> {
  const results = { deleted: 0, errors: [] as string[] };
  
  // Listar todos os arquivos na pasta time
  const { data: files, error: listError } = await supabase.storage
    .from('tts-cache')
    .list('time');
  
  if (listError) {
    results.errors.push(`List error: ${listError.message}`);
    return results;
  }

  if (!files || files.length === 0) {
    console.log('No files to delete in time folder');
    return results;
  }

  // Deletar cada arquivo
  for (const file of files) {
    const filePath = `time/${file.name}`;
    const { error: deleteError } = await supabase.storage
      .from('tts-cache')
      .remove([filePath]);
    
    if (deleteError) {
      results.errors.push(`Delete ${filePath}: ${deleteError.message}`);
    } else {
      results.deleted++;
      console.log(`Deleted: ${filePath}`);
    }
  }

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse body safely - default to generate-all if no body
    let action = 'generate-all';
    let hour: number | undefined;
    let minute: number | undefined;
    let force = false;
    let healthCheck = false;
    
    try {
      const body = await req.text();
      if (body && body.trim()) {
        const parsed = JSON.parse(body);
        action = parsed.action || 'generate-all';
        hour = parsed.hour;
        minute = parsed.minute;
        force = parsed.force || false;
        healthCheck = parsed.healthCheck || false;
      }
    } catch {
      // Use defaults if parsing fails
      console.log('No body or invalid JSON, using defaults');
    }
    
    // Health check endpoint
    if (healthCheck === true) {
      return new Response(
        JSON.stringify({ 
          status: 'healthy', 
          service: 'generate-hour-audio',
          timestamp: new Date().toISOString(),
          hasCredentials: !!Deno.env.get('GOOGLE_CLOUD_CREDENTIALS')
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Deletar cache antigo e regenerar tudo
    if (action === 'delete-and-regenerate') {
      console.log('Starting delete-and-regenerate process...');
      
      // Primeiro deletar tudo
      const deleteResults = await deleteTimeCache(supabase);
      console.log(`Deleted ${deleteResults.deleted} files`);
      
      // Agora regenerar tudo com Google TTS
      const genResults = { hours: 0, minutes: 0, minutos_word: false, failed: 0, errors: [] as string[] };
      
      // Gerar horas (0-23)
      for (let h = 0; h < 24; h++) {
        const cacheKey = `h_${h.toString().padStart(2, '0')}.mp3`;
        try {
          const text = getHourText(h);
          const audioBuffer = await generateAudioWithGoogle(text);
          
          const { error: uploadError } = await supabase.storage
            .from('tts-cache')
            .upload(`time/${cacheKey}`, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          if (uploadError) {
            genResults.failed++;
            genResults.errors.push(`${cacheKey}: ${uploadError.message}`);
          } else {
            console.log(`Generated hour ${h}: "${text}"`);
            genResults.hours++;
          }
          await new Promise(resolve => setTimeout(resolve, 200)); // Menor delay para Google
        } catch (error) {
          genResults.failed++;
          genResults.errors.push(`h_${h}: ${error}`);
        }
      }

      // Gerar minutos (1-59)
      for (let m = 1; m < 60; m++) {
        const cacheKey = `m_${m.toString().padStart(2, '0')}.mp3`;
        try {
          const text = getMinuteText(m);
          const audioBuffer = await generateAudioWithGoogle(text);
          
          const { error: uploadError } = await supabase.storage
            .from('tts-cache')
            .upload(`time/${cacheKey}`, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          if (uploadError) {
            genResults.failed++;
            genResults.errors.push(`${cacheKey}: ${uploadError.message}`);
          } else {
            console.log(`Generated minute ${m}: "${text}"`);
            genResults.minutes++;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          genResults.failed++;
          genResults.errors.push(`m_${m}: ${error}`);
        }
      }

      // Gerar palavra "minutos"
      try {
        const audioBuffer = await generateAudioWithGoogle('minutos');
        await supabase.storage
          .from('tts-cache')
          .upload('time/minutos.mp3', audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          });
        console.log('Generated minutos word');
        genResults.minutos_word = true;
      } catch (error) {
        genResults.failed++;
        genResults.errors.push(`minutos: ${error}`);
      }

      return new Response(JSON.stringify({
        action: 'delete-and-regenerate',
        deleted: deleteResults,
        generated: genResults,
        total: genResults.hours + genResults.minutes + (genResults.minutos_word ? 1 : 0),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gerar todos os áudios de horas (24 arquivos)
    if (action === 'generate-hours') {
      const results = { success: 0, failed: 0, skipped: 0, errors: [] as string[] };

      for (let h = 0; h < 24; h++) {
        const cacheKey = `h_${h.toString().padStart(2, '0')}.mp3`;
        
        if (!force) {
          const { data: existingFile } = await supabase.storage
            .from('tts-cache')
            .list('time', { search: cacheKey });
          
          if (existingFile && existingFile.some(f => f.name === cacheKey)) {
            console.log(`Skipping ${cacheKey} - already exists`);
            results.skipped++;
            continue;
          }
        }

        try {
          const text = getHourText(h);
          const audioBuffer = await generateAudioWithGoogle(text);
          
          const { error: uploadError } = await supabase.storage
            .from('tts-cache')
            .upload(`time/${cacheKey}`, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          if (uploadError) {
            results.failed++;
            results.errors.push(`${cacheKey}: ${uploadError.message}`);
          } else {
            console.log(`Generated hour ${h}: "${text}"`);
            results.success++;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.failed++;
          results.errors.push(`h_${h}: ${error}`);
        }
      }

      return new Response(JSON.stringify({ type: 'hours', ...results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gerar todos os áudios de minutos (59 arquivos)
    if (action === 'generate-minutes') {
      const results = { success: 0, failed: 0, skipped: 0, errors: [] as string[] };

      for (let m = 1; m < 60; m++) {
        const cacheKey = `m_${m.toString().padStart(2, '0')}.mp3`;
        
        if (!force) {
          const { data: existingFile } = await supabase.storage
            .from('tts-cache')
            .list('time', { search: cacheKey });
          
          if (existingFile && existingFile.some(f => f.name === cacheKey)) {
            console.log(`Skipping ${cacheKey} - already exists`);
            results.skipped++;
            continue;
          }
        }

        try {
          const text = getMinuteText(m);
          const audioBuffer = await generateAudioWithGoogle(text);
          
          const { error: uploadError } = await supabase.storage
            .from('tts-cache')
            .upload(`time/${cacheKey}`, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          if (uploadError) {
            results.failed++;
            results.errors.push(`${cacheKey}: ${uploadError.message}`);
          } else {
            console.log(`Generated minute ${m}: "${text}"`);
            results.success++;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.failed++;
          results.errors.push(`m_${m}: ${error}`);
        }
      }

      return new Response(JSON.stringify({ type: 'minutes', ...results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gerar a palavra "minutos" para o cache
    if (action === 'generate-minutos-word') {
      const cacheKey = 'minutos.mp3';
      
      if (!force) {
        const { data: existingFile } = await supabase.storage
          .from('tts-cache')
          .list('time', { search: cacheKey });
        
        if (existingFile && existingFile.some(f => f.name === cacheKey)) {
          return new Response(JSON.stringify({ success: true, skipped: true, message: 'minutos already exists' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      try {
        const audioBuffer = await generateAudioWithGoogle('minutos');
        
        const { error: uploadError } = await supabase.storage
          .from('tts-cache')
          .upload(`time/${cacheKey}`, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          });

        if (uploadError) {
          return new Response(JSON.stringify({ success: false, error: uploadError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Generated minutos word audio');
        return new Response(JSON.stringify({ success: true, message: 'minutos generated' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Gerar todos (horas + minutos + palavra "minutos" = 84 arquivos total)
    if (action === 'generate-all') {
      const results = { hours: 0, minutes: 0, minutos_word: false, failed: 0, skipped: 0, errors: [] as string[] };

      // Gerar horas
      for (let h = 0; h < 24; h++) {
        const cacheKey = `h_${h.toString().padStart(2, '0')}.mp3`;
        
        if (!force) {
          const { data: existingFile } = await supabase.storage
            .from('tts-cache')
            .list('time', { search: cacheKey });
          
          if (existingFile && existingFile.some(f => f.name === cacheKey)) {
            results.skipped++;
            continue;
          }
        }

        try {
          const text = getHourText(h);
          const audioBuffer = await generateAudioWithGoogle(text);
          
          await supabase.storage
            .from('tts-cache')
            .upload(`time/${cacheKey}`, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          console.log(`Generated hour ${h}: "${text}"`);
          results.hours++;
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.failed++;
          results.errors.push(`h_${h}: ${error}`);
        }
      }

      // Gerar minutos
      for (let m = 1; m < 60; m++) {
        const cacheKey = `m_${m.toString().padStart(2, '0')}.mp3`;
        
        if (!force) {
          const { data: existingFile } = await supabase.storage
            .from('tts-cache')
            .list('time', { search: cacheKey });
          
          if (existingFile && existingFile.some(f => f.name === cacheKey)) {
            results.skipped++;
            continue;
          }
        }

        try {
          const text = getMinuteText(m);
          const audioBuffer = await generateAudioWithGoogle(text);
          
          await supabase.storage
            .from('tts-cache')
            .upload(`time/${cacheKey}`, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          console.log(`Generated minute ${m}: "${text}"`);
          results.minutes++;
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.failed++;
          results.errors.push(`m_${m}: ${error}`);
        }
      }

      // Gerar palavra "minutos"
      const minutosKey = 'minutos.mp3';
      if (!force) {
        const { data: existingFile } = await supabase.storage
          .from('tts-cache')
          .list('time', { search: minutosKey });
        
        if (existingFile && existingFile.some(f => f.name === minutosKey)) {
          results.skipped++;
        } else {
          try {
            const audioBuffer = await generateAudioWithGoogle('minutos');
            await supabase.storage
              .from('tts-cache')
              .upload(`time/${minutosKey}`, audioBuffer, {
                contentType: 'audio/mpeg',
                upsert: true,
              });
            console.log('Generated minutos word');
            results.minutos_word = true;
          } catch (error) {
            results.failed++;
            results.errors.push(`minutos: ${error}`);
          }
        }
      } else {
        try {
          const audioBuffer = await generateAudioWithGoogle('minutos');
          await supabase.storage
            .from('tts-cache')
            .upload(`time/${minutosKey}`, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });
          console.log('Generated minutos word');
          results.minutos_word = true;
        } catch (error) {
          results.failed++;
          results.errors.push(`minutos: ${error}`);
        }
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obter URLs públicas para reprodução
    if (action === 'get-urls' && hour !== undefined && minute !== undefined) {
      const hourKey = `time/h_${hour.toString().padStart(2, '0')}.mp3`;
      const { data: hourUrl } = supabase.storage.from('tts-cache').getPublicUrl(hourKey);

      let minuteUrl = null;
      if (minute > 0) {
        const minuteKey = `time/m_${minute.toString().padStart(2, '0')}.mp3`;
        const { data: mUrl } = supabase.storage.from('tts-cache').getPublicUrl(minuteKey);
        minuteUrl = mUrl.publicUrl;
      }

      return new Response(JSON.stringify({ hourUrl: hourUrl.publicUrl, minuteUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obter URLs assinadas (gera sob demanda se não existir)
    if (action === 'get-signed-urls' && hour !== undefined && minute !== undefined) {
      const expiresIn = 60 * 60;

      const ensureSignedUrl = async (filePath: string, generate: () => Promise<ArrayBuffer>) => {
        const first = await supabase.storage.from('tts-cache').createSignedUrl(filePath, expiresIn);
        if (first.data?.signedUrl) return first.data.signedUrl;

        console.warn('Signed URL missing, generating on-demand:', filePath);
        const audioBuffer = await generate();
        await supabase.storage.from('tts-cache').upload(filePath, audioBuffer, { 
          contentType: 'audio/mpeg', 
          upsert: true 
        });

        const second = await supabase.storage.from('tts-cache').createSignedUrl(filePath, expiresIn);
        if (!second.data?.signedUrl) throw second.error ?? new Error('Failed to create signed URL');
        return second.data.signedUrl;
      };

      try {
        const hourPath = `time/h_${hour.toString().padStart(2, '0')}.mp3`;
        const hourUrl = await ensureSignedUrl(hourPath, () => 
          generateAudioWithGoogle(getHourText(hour))
        );

        let minuteUrl: string | null = null;
        if (minute > 0) {
          const minutePath = `time/m_${minute.toString().padStart(2, '0')}.mp3`;
          minuteUrl = await ensureSignedUrl(minutePath, () => 
            generateAudioWithGoogle(getMinuteText(minute))
          );
        }

        return new Response(JSON.stringify({ hourUrl, minuteUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error('Error ensuring signed URLs:', e);
        return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-hour-audio:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
