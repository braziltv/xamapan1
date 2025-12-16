import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Alice - voz feminina popular em português
const VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2';

function formatHourText(hour: number, minute: number): string {
  const hourText = hour === 1 ? 'uma hora' : 
                   hour === 0 ? 'meia noite' :
                   hour === 12 ? 'meio dia' :
                   `${hour} horas`;
  
  if (minute === 0) {
    if (hour === 0) return 'meia noite';
    if (hour === 12) return 'meio dia';
    return hourText;
  }
  
  const minuteText = minute === 1 ? 'um minuto' : 
                     minute === 30 ? 'e meia' :
                     `e ${minute} minutos`;
  
  if (hour === 0) return `meia noite ${minuteText}`;
  if (hour === 12) return `meio dia ${minuteText}`;
  
  return `${hourText} ${minuteText}`;
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

    if (action === 'generate-all') {
      // Generate all hour audios (0-23 hours, 0-59 minutes)
      const results: { success: number; failed: number; errors: string[] } = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m++) {
          const cacheKey = `hour_${h.toString().padStart(2, '0')}_${m.toString().padStart(2, '0')}.mp3`;
          
          // Check if already exists
          const { data: existingFile } = await supabase.storage
            .from('tts-cache')
            .list('hours', { search: cacheKey });
          
          if (existingFile && existingFile.length > 0) {
            console.log(`Skipping ${cacheKey} - already exists`);
            results.success++;
            continue;
          }

          try {
            const text = formatHourText(h, m);
            const audioBuffer = await generateAudio(text, ELEVENLABS_API_KEY);
            
            const { error: uploadError } = await supabase.storage
              .from('tts-cache')
              .upload(`hours/${cacheKey}`, audioBuffer, {
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
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get' && hour !== undefined && minute !== undefined) {
      const cacheKey = `hours/hour_${hour.toString().padStart(2, '0')}_${minute.toString().padStart(2, '0')}.mp3`;
      
      // Try to get from cache
      const { data: audioData, error: downloadError } = await supabase.storage
        .from('tts-cache')
        .download(cacheKey);

      if (!downloadError && audioData) {
        const arrayBuffer = await audioData.arrayBuffer();
        return new Response(arrayBuffer, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'audio/mpeg',
            'X-Cache': 'HIT',
          },
        });
      }

      // Generate on-demand if not cached
      const text = formatHourText(hour, minute);
      const audioBuffer = await generateAudio(text, ELEVENLABS_API_KEY);
      
      // Cache it
      await supabase.storage
        .from('tts-cache')
        .upload(cacheKey, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      return new Response(audioBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'X-Cache': 'MISS',
        },
      });
    }

    if (action === 'get-url' && hour !== undefined && minute !== undefined) {
      const cacheKey = `hours/hour_${hour.toString().padStart(2, '0')}_${minute.toString().padStart(2, '0')}.mp3`;
      
      const { data: publicUrl } = supabase.storage
        .from('tts-cache')
        .getPublicUrl(cacheKey);

      return new Response(JSON.stringify({ url: publicUrl.publicUrl }), {
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
