import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Alice - voz feminina popular em português
const VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2';

// Texto para horas (0-23)
function getHourText(hour: number): string {
  if (hour === 0) return 'meia noite';
  if (hour === 1) return 'uma hora';
  if (hour === 12) return 'meio dia';
  return `${hour} horas`;
}

// Texto para minutos (0-59)
function getMinuteText(minute: number): string {
  if (minute === 0) return ''; // Não precisa de áudio para minuto 0
  if (minute === 1) return 'e um minuto';
  if (minute === 30) return 'e meia';
  return `e ${minute} minutos`;
}

async function generateAudio(text: string, apiKey: string): Promise<ArrayBuffer> {
  console.log(`Generating audio for: "${text}"`);
  
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        output_format: 'mp3_44100_128',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  return await response.arrayBuffer();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, hour, minute } = await req.json();
    
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY_HOURS');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY_HOURS not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Gerar todos os áudios de horas (24 arquivos)
    if (action === 'generate-hours') {
      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (let h = 0; h < 24; h++) {
        const cacheKey = `h_${h.toString().padStart(2, '0')}.mp3`;
        
        // Check if already exists
        const { data: existingFile } = await supabase.storage
          .from('tts-cache')
          .list('time', { search: cacheKey });
        
        if (existingFile && existingFile.some(f => f.name === cacheKey)) {
          console.log(`Skipping ${cacheKey} - already exists`);
          results.success++;
          continue;
        }

        try {
          const text = getHourText(h);
          const audioBuffer = await generateAudio(text, ELEVENLABS_API_KEY);
          
          const { error: uploadError } = await supabase.storage
            .from('tts-cache')
            .upload(`time/${cacheKey}`, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          if (uploadError) {
            console.error(`Upload error for ${cacheKey}:`, uploadError);
            results.failed++;
            results.errors.push(`${cacheKey}: ${uploadError.message}`);
          } else {
            console.log(`Successfully generated ${cacheKey}`);
            results.success++;
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error generating ${cacheKey}:`, error);
          results.failed++;
          results.errors.push(`${cacheKey}: ${errorMsg}`);
        }
      }

      return new Response(JSON.stringify({ type: 'hours', ...results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gerar todos os áudios de minutos (59 arquivos - minuto 0 não precisa)
    if (action === 'generate-minutes') {
      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (let m = 1; m < 60; m++) {
        const cacheKey = `m_${m.toString().padStart(2, '0')}.mp3`;
        
        // Check if already exists
        const { data: existingFile } = await supabase.storage
          .from('tts-cache')
          .list('time', { search: cacheKey });
        
        if (existingFile && existingFile.some(f => f.name === cacheKey)) {
          console.log(`Skipping ${cacheKey} - already exists`);
          results.success++;
          continue;
        }

        try {
          const text = getMinuteText(m);
          const audioBuffer = await generateAudio(text, ELEVENLABS_API_KEY);
          
          const { error: uploadError } = await supabase.storage
            .from('tts-cache')
            .upload(`time/${cacheKey}`, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          if (uploadError) {
            console.error(`Upload error for ${cacheKey}:`, uploadError);
            results.failed++;
            results.errors.push(`${cacheKey}: ${uploadError.message}`);
          } else {
            console.log(`Successfully generated ${cacheKey}`);
            results.success++;
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error generating ${cacheKey}:`, error);
          results.failed++;
          results.errors.push(`${cacheKey}: ${errorMsg}`);
        }
      }

      return new Response(JSON.stringify({ type: 'minutes', ...results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gerar todos (horas + minutos = 83 arquivos total)
    if (action === 'generate-all') {
      const results = { hours: 0, minutes: 0, failed: 0, errors: [] as string[] };

      // Gerar horas
      for (let h = 0; h < 24; h++) {
        const cacheKey = `h_${h.toString().padStart(2, '0')}.mp3`;
        
        const { data: existingFile } = await supabase.storage
          .from('tts-cache')
          .list('time', { search: cacheKey });
        
        if (existingFile && existingFile.some(f => f.name === cacheKey)) {
          results.hours++;
          continue;
        }

        try {
          const text = getHourText(h);
          const audioBuffer = await generateAudio(text, ELEVENLABS_API_KEY);
          
          await supabase.storage
            .from('tts-cache')
            .upload(`time/${cacheKey}`, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

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
        
        const { data: existingFile } = await supabase.storage
          .from('tts-cache')
          .list('time', { search: cacheKey });
        
        if (existingFile && existingFile.some(f => f.name === cacheKey)) {
          results.minutes++;
          continue;
        }

        try {
          const text = getMinuteText(m);
          const audioBuffer = await generateAudio(text, ELEVENLABS_API_KEY);
          
          await supabase.storage
            .from('tts-cache')
            .upload(`time/${cacheKey}`, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });

          results.minutes++;
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.failed++;
          results.errors.push(`m_${m}: ${error}`);
        }
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obter URLs para reprodução concatenada
    if (action === 'get-urls' && hour !== undefined && minute !== undefined) {
      const hourKey = `time/h_${hour.toString().padStart(2, '0')}.mp3`;
      
      const { data: hourUrl } = supabase.storage
        .from('tts-cache')
        .getPublicUrl(hourKey);

      let minuteUrl = null;
      if (minute > 0) {
        const minuteKey = `time/m_${minute.toString().padStart(2, '0')}.mp3`;
        const { data: mUrl } = supabase.storage
          .from('tts-cache')
          .getPublicUrl(minuteKey);
        minuteUrl = mUrl.publicUrl;
      }

      return new Response(JSON.stringify({ 
        hourUrl: hourUrl.publicUrl, 
        minuteUrl 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generate-hour-audio:', error);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
