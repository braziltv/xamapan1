import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as base64Decode, encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para criar JWT para autenticação com Google Cloud
async function createJWT(credentials: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: credentials.token_uri,
    iat: now,
    exp: now + 3600 // Token válido por 1 hora
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Importar a chave privada
  const privateKey = await importPrivateKey(credentials.private_key);
  
  // Assinar
  const signature = await sign(signatureInput, privateKey);
  const encodedSignature = base64UrlEncode(signature);

  return `${signatureInput}.${encodedSignature}`;
}

function base64UrlEncode(data: string | Uint8Array): string {
  const base64 = typeof data === 'string' 
    ? btoa(data) 
    : btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remover header/footer do PEM
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  const binaryDer = base64Decode(pemContents);
  
  // Criar ArrayBuffer explícito
  const keyBuffer = new ArrayBuffer(binaryDer.length);
  const keyView = new Uint8Array(keyBuffer);
  keyView.set(binaryDer);
  
  return await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
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

// Obter access token usando JWT
async function getAccessToken(credentials: any): Promise<string> {
  const jwt = await createJWT(credentials);
  
  const response = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[google-cloud-tts] Erro ao obter access token:', error);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Vozes disponíveis no Gemini 2.5 Flash TTS para pt-BR
const VOICES: Record<string, { languageCode: string; name: string; ssmlGender: string }> = {
  // Vozes Gemini 2.5 Flash TTS (mais baratas e naturais)
  'Aoede': { languageCode: 'pt-BR', name: 'Aoede', ssmlGender: 'FEMALE' },
  'Kore': { languageCode: 'pt-BR', name: 'Kore', ssmlGender: 'FEMALE' },
  'Leda': { languageCode: 'pt-BR', name: 'Leda', ssmlGender: 'FEMALE' },
  'Zephyr': { languageCode: 'pt-BR', name: 'Zephyr', ssmlGender: 'FEMALE' },
  'Charon': { languageCode: 'pt-BR', name: 'Charon', ssmlGender: 'MALE' },
  'Orus': { languageCode: 'pt-BR', name: 'Orus', ssmlGender: 'MALE' },
  'Puck': { languageCode: 'pt-BR', name: 'Puck', ssmlGender: 'MALE' },
  'Fenrir': { languageCode: 'pt-BR', name: 'Fenrir', ssmlGender: 'MALE' },
  'Erinome': { languageCode: 'pt-BR', name: 'Erinome', ssmlGender: 'FEMALE' },
  'Achernar': { languageCode: 'pt-BR', name: 'Achernar', ssmlGender: 'FEMALE' },
  // Manter compatibilidade com nomes antigos (mapeiam para Gemini TTS)
  'pt-BR-Chirp3-HD-Aoede': { languageCode: 'pt-BR', name: 'Aoede', ssmlGender: 'FEMALE' },
  'pt-BR-Chirp3-HD-Kore': { languageCode: 'pt-BR', name: 'Kore', ssmlGender: 'FEMALE' },
  'pt-BR-Chirp3-HD-Leda': { languageCode: 'pt-BR', name: 'Leda', ssmlGender: 'FEMALE' },
  'pt-BR-Chirp3-HD-Zephyr': { languageCode: 'pt-BR', name: 'Zephyr', ssmlGender: 'FEMALE' },
  'pt-BR-Chirp3-HD-Charon': { languageCode: 'pt-BR', name: 'Charon', ssmlGender: 'MALE' },
  'pt-BR-Chirp3-HD-Orus': { languageCode: 'pt-BR', name: 'Orus', ssmlGender: 'MALE' },
  'pt-BR-Chirp3-HD-Puck': { languageCode: 'pt-BR', name: 'Puck', ssmlGender: 'MALE' },
  'pt-BR-Chirp3-HD-Fenrir': { languageCode: 'pt-BR', name: 'Fenrir', ssmlGender: 'MALE' },
  'pt-BR-Chirp3-HD-Erinome': { languageCode: 'pt-BR', name: 'Erinome', ssmlGender: 'FEMALE' },
};

// Gemini 2.5 Flash TTS endpoint (location-specific)
const TTS_ENDPOINT = 'https://us-central1-texttospeech.googleapis.com/v1beta1/text:synthesize';

// Vozes padrão por gênero (Gemini 2.5 Flash TTS)
const DEFAULT_VOICES = {
  female: 'Aoede',
  male: 'Charon'
};

// Converter texto para SSML com pausas e entonação naturais
function convertToNaturalSSML(text: string): string {
  let ssml = text;
  ssml = ssml.replace(/\.\s*(por favor|Por favor)/g, '.<break time="150ms"/> $1');
  ssml = ssml.replace(/,\s*/g, ',<break time="90ms"/> ');
  ssml = ssml.replace(/,?\s*(em caso de dúvidas)/gi, '.<break time="125ms"/> $1');
  ssml = ssml.replace(/(dirija-se\s+(?:ao|à))\s+/g, '$1 <break time="50ms"/>');
  return `<speak>${ssml}</speak>`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Health check endpoint
    if (body.healthCheck === true) {
      return new Response(
        JSON.stringify({ 
          status: 'healthy', 
          service: 'google-cloud-tts',
          timestamp: new Date().toISOString(),
          hasCredentials: !!Deno.env.get('GOOGLE_CLOUD_CREDENTIALS')
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { text, voice = 'female', voiceName, speakingRate = 1.0, concatenate } = body;

    // Modo concatenado: nome + destino em uma única frase natural
    let finalText = text;
    if (concatenate) {
      const { name, prefix, destination } = concatenate;
      const cleanName = name?.trim() || '';
      const cleanPrefix = prefix?.trim() || '';
      const cleanDestination = destination?.trim() || '';
      
      if (cleanPrefix) {
        finalText = `${cleanPrefix} ${cleanName}. ${cleanDestination}`;
      } else {
        finalText = `${cleanName}. ${cleanDestination}`;
      }
      console.log(`[google-cloud-tts] Concatenate mode: "${finalText}"`);
    }

    if (!finalText) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determinar qual voz usar
    let selectedVoiceName: string;
    
    if (voiceName && VOICES[voiceName]) {
      selectedVoiceName = voiceName;
    } else if (voice === 'male') {
      selectedVoiceName = DEFAULT_VOICES.male;
    } else {
      selectedVoiceName = DEFAULT_VOICES.female;
    }
    
    const selectedVoice = VOICES[selectedVoiceName];

    // Converter texto para SSML com pausas naturais para soar mais humano
    const ssmlText = convertToNaturalSSML(finalText);

    console.log(`[google-cloud-tts] Gerando áudio para: "${finalText}" com voz ${selectedVoice.name} (Gemini 2.5 Flash TTS)`);
    // Carregar credenciais
    const credentialsJson = Deno.env.get('GOOGLE_CLOUD_CREDENTIALS');
    if (!credentialsJson) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS not configured');
    }

    const credentials = JSON.parse(credentialsJson);
    const accessToken = await getAccessToken(credentials);

    // Taxa de fala: 0.95 para ritmo natural
    const finalRate = Math.min(speakingRate, 0.95);

    // Chamar Gemini 2.5 Flash TTS API com SSML
    const ttsResponse = await fetch(
      TTS_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: { ssml: ssmlText },
          voice: selectedVoice,
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: finalRate,
            // Gemini 2.5 Flash TTS não suporta pitch
            volumeGainDb: 1.0,
            effectsProfileId: ['large-home-entertainment-class-device']
          }
        })
      }
    );

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error('[google-cloud-tts] Erro da API:', error);
      throw new Error(`Google Cloud TTS error: ${ttsResponse.status} - ${error}`);
    }

    const ttsData = await ttsResponse.json();
    
    // O áudio vem em base64
    const audioBytes = base64Decode(ttsData.audioContent);
    
    // Criar ArrayBuffer explícito para Response
    const audioBuffer = new ArrayBuffer(audioBytes.length);
    const audioView = new Uint8Array(audioBuffer);
    audioView.set(audioBytes);

    console.log(`[google-cloud-tts] Áudio gerado com sucesso: ${audioBytes.length} bytes`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg'
      }
    });

  } catch (error) {
    console.error('[google-cloud-tts] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
