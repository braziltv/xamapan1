import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();

    if (!text) {
      throw new Error("Text is required");
    }

    const ELEVENLABS_API_KEY_1 = Deno.env.get("ELEVENLABS_API_KEY");
    const ELEVENLABS_API_KEY_2 = Deno.env.get("ELEVENLABS_API_KEY_2");
    
    // Randomly select one of the two API keys
    const availableKeys = [ELEVENLABS_API_KEY_1, ELEVENLABS_API_KEY_2].filter((key): key is string => Boolean(key));
    if (availableKeys.length === 0) {
      throw new Error("No ELEVENLABS_API_KEY configured");
    }
    const ELEVENLABS_API_KEY = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    
    console.log(`Using API key ${ELEVENLABS_API_KEY_1 === ELEVENLABS_API_KEY ? '1' : '2'}`);

    console.log(`Generating TTS for: "${text}"`);

    // Use Lucas voice - male, good for Portuguese
    const selectedVoiceId = voiceId || "SVgp5d1fyFQRW1eQbwkq"; // Lucas

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
    console.log(`Audio generated successfully, size: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
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
