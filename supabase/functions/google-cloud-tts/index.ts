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

// Vozes disponíveis no Google Cloud TTS para pt-BR
const VOICES: Record<string, { languageCode: string; name: string; ssmlGender: string }> = {
  // Vozes Femininas
  'pt-BR-Neural2-A': { languageCode: 'pt-BR', name: 'pt-BR-Neural2-A', ssmlGender: 'FEMALE' },
  'pt-BR-Neural2-C': { languageCode: 'pt-BR', name: 'pt-BR-Neural2-C', ssmlGender: 'FEMALE' },
  'pt-BR-Wavenet-A': { languageCode: 'pt-BR', name: 'pt-BR-Wavenet-A', ssmlGender: 'FEMALE' },
  'pt-BR-Wavenet-C': { languageCode: 'pt-BR', name: 'pt-BR-Wavenet-C', ssmlGender: 'FEMALE' },
  'pt-BR-Standard-A': { languageCode: 'pt-BR', name: 'pt-BR-Standard-A', ssmlGender: 'FEMALE' },
  'pt-BR-Standard-C': { languageCode: 'pt-BR', name: 'pt-BR-Standard-C', ssmlGender: 'FEMALE' },
  // Vozes Masculinas
  'pt-BR-Neural2-B': { languageCode: 'pt-BR', name: 'pt-BR-Neural2-B', ssmlGender: 'MALE' },
  'pt-BR-Wavenet-B': { languageCode: 'pt-BR', name: 'pt-BR-Wavenet-B', ssmlGender: 'MALE' },
  'pt-BR-Standard-B': { languageCode: 'pt-BR', name: 'pt-BR-Standard-B', ssmlGender: 'MALE' },
};

// Vozes padrão por gênero
const DEFAULT_VOICES = {
  female: 'pt-BR-Neural2-A',
  male: 'pt-BR-Neural2-B'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { text, voice = 'female', voiceName, speakingRate = 1.0, concatenate } = body;

    // Modo concatenado: nome + destino em uma única frase natural
    let finalText = text;
    if (concatenate) {
      const { name, prefix, destination } = concatenate;
      // Construir frase: "Nome. Por favor, dirija-se ao/à Destino."
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
      // Usar voz específica se fornecida
      selectedVoiceName = voiceName;
    } else if (voice === 'male') {
      selectedVoiceName = DEFAULT_VOICES.male;
    } else {
      selectedVoiceName = DEFAULT_VOICES.female;
    }
    
    const selectedVoice = VOICES[selectedVoiceName];

    console.log(`[google-cloud-tts] Gerando áudio para: "${finalText}" com voz ${selectedVoiceName}`);

    // Carregar credenciais
    const credentialsJson = Deno.env.get('GOOGLE_CLOUD_CREDENTIALS');
    if (!credentialsJson) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS not configured');
    }

    const credentials = JSON.parse(credentialsJson);
    
    // Obter access token
    const accessToken = await getAccessToken(credentials);

    // Chamar Google Cloud TTS API
    const ttsResponse = await fetch(
      'https://texttospeech.googleapis.com/v1/text:synthesize',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: { text: finalText },
          voice: selectedVoice,
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speakingRate,
            pitch: 0,
            volumeGainDb: 0
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
