// Client-side TTS cache check.
// Performs a HEAD on the public tts-cache Storage URL before calling the
// google-cloud-tts edge function. If the file exists, returns its public URL
// directly (audio elements can stream it without spinning up the function).
//
// Hash MUST match supabase/functions/google-cloud-tts/index.ts -> hashText():
//   sha256(`${text}_${voiceName}_${rate}`) hex, first 16 chars.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type TTSCacheFolder = 'names' | 'announcements' | 'destinations' | 'time';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function ttsHash(text: string, voiceName: string, rate: number): Promise<string> {
  const hex = await sha256Hex(`${text}_${voiceName}_${rate}`);
  return hex.substring(0, 16);
}

function publicUrl(folder: TTSCacheFolder, hash: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/tts-cache/${folder}/${hash}.mp3`;
}

/** Returns the cached public URL if the object exists, else null. */
export async function checkTTSCache(
  text: string,
  voiceName: string,
  rate: number,
  folder: TTSCacheFolder
): Promise<string | null> {
  try {
    const hash = await ttsHash(text, voiceName, rate);
    const url = publicUrl(folder, hash);
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

export interface GetTTSOptions {
  text: string;
  voiceName: string;
  rate?: number;
  cacheType?: 'name' | 'announcement' | 'none';
}

/**
 * Resolve a TTS audio source. Tries the public cache first (HEAD); on miss,
 * calls the edge function and returns an object URL for the generated audio.
 */
export async function getTTSAudioURL({
  text,
  voiceName,
  rate = 1.0,
  cacheType,
}: GetTTSOptions): Promise<string> {
  // Auto-detect folder (mirrors edge function logic)
  const folder: TTSCacheFolder =
    cacheType === 'announcement' ? 'announcements' :
    cacheType === 'name' ? 'names' :
    text.length <= 60 ? 'names' : 'announcements';

  if (cacheType !== 'none') {
    const cachedUrl = await checkTTSCache(text, voiceName, rate, folder);
    if (cachedUrl) return cachedUrl;
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/google-cloud-tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ text, voiceName, speakingRate: rate, cacheType }),
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
