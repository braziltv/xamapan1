import { useEffect, useRef, useState, useMemo } from 'react';
import { toZonedTime } from 'date-fns-tz';

// Silence window: 22:00 → 06:00 (America/Sao_Paulo). Same range used by hourly audio.
function isSilenceHourBR(): boolean {
  try {
    const nowBR = toZonedTime(new Date(), 'America/Sao_Paulo');
    const h = nowBR.getHours();
    return h >= 22 || h < 6;
  } catch {
    const h = new Date().getHours();
    return h >= 22 || h < 6;
  }
}

interface TVVideoOverlayProps {
  urls: string[];
  enabled: boolean;
  volume: number; // 0-100
  paused: boolean; // true when a call is announcing OR during post-call cooldown
  audioUnlocked: boolean;
}

type VideoKind = 'youtube' | 'mp4' | 'unknown';

function detectKind(url: string): VideoKind {
  if (!url) return 'unknown';
  const u = url.trim().toLowerCase();
  if (u.includes('youtube.com/') || u.includes('youtu.be/')) return 'youtube';
  if (u.match(/\.(mp4|webm|ogv|mov|m4v)(\?|$)/)) return 'mp4';
  if (u.startsWith('http')) return 'mp4';
  return 'unknown';
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace('/', '').split('/')[0] || null;
    }
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const parts = u.pathname.split('/');
    const idx = parts.indexOf('embed');
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return null;
  } catch {
    return null;
  }
}

// Average duration to advance YouTube playlist when ended event isn't reliable
const YT_FALLBACK_ADVANCE_MS = 5 * 60 * 1000;

// Quality tiers (YouTube playback quality strings)
type QualityTier = 'hd720' | 'large' | 'medium' | 'small';
const QUALITY_LABEL: Record<QualityTier, string> = {
  hd720: '720p',
  large: '480p',
  medium: '360p',
  small: '240p',
};
const QUALITY_ORDER: QualityTier[] = ['hd720', 'large', 'medium', 'small'];

// Detect initial quality from Network Information API
function detectInitialQuality(): QualityTier {
  try {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (!conn) return 'hd720';
    const effectiveType: string = conn.effectiveType || '';
    const downlink: number = conn.downlink || 0; // Mbps
    const saveData: boolean = !!conn.saveData;
    if (saveData) return 'medium';
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'small';
    if (effectiveType === '3g' || (downlink > 0 && downlink < 1.5)) return 'medium';
    if (downlink > 0 && downlink < 4) return 'large';
    return 'hd720';
  } catch {
    return 'hd720';
  }
}

export function TVVideoOverlay({ urls, enabled, volume, paused, audioUnlocked }: TVVideoOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quality, setQuality] = useState<QualityTier>(() => detectInitialQuality());
  const stallCountRef = useRef(0);
  const lastDowngradeAtRef = useRef(0);
  const [silenceHour, setSilenceHour] = useState<boolean>(() => isSilenceHourBR());

  // Re-check silence window every 30s
  useEffect(() => {
    const check = () => setSilenceHour(isSilenceHourBR());
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  const downgradeQuality = (reason: string) => {
    const now = Date.now();
    // Cooldown: don't downgrade more than once per 15s
    if (now - lastDowngradeAtRef.current < 15000) return;
    setQuality((curr) => {
      const idx = QUALITY_ORDER.indexOf(curr);
      if (idx >= QUALITY_ORDER.length - 1) return curr; // already lowest
      const next = QUALITY_ORDER[idx + 1];
      lastDowngradeAtRef.current = now;
      console.log(`🎬⬇️ Conexão lenta (${reason}) — reduzindo qualidade ${QUALITY_LABEL[curr]} → ${QUALITY_LABEL[next]}`);
      return next;
    });
  };

  // React to live network changes
  useEffect(() => {
    const conn = (navigator as any).connection;
    if (!conn || typeof conn.addEventListener !== 'function') return;
    const onChange = () => {
      const target = detectInitialQuality();
      const targetIdx = QUALITY_ORDER.indexOf(target);
      setQuality((curr) => {
        const currIdx = QUALITY_ORDER.indexOf(curr);
        // Only downgrade automatically; don't upgrade silently mid-playback
        return targetIdx > currIdx ? target : curr;
      });
    };
    conn.addEventListener('change', onChange);
    return () => conn.removeEventListener('change', onChange);
  }, []);

  const validUrls = useMemo(
    () => (Array.isArray(urls) ? urls : []).map((u) => (u || '').trim()).filter(Boolean),
    [urls]
  );

  const safeIndex = validUrls.length ? currentIndex % validUrls.length : 0;
  const url = validUrls[safeIndex] || '';
  const kind = useMemo(() => detectKind(url), [url]);
  const ytId = useMemo(() => (kind === 'youtube' ? extractYouTubeId(url) : null), [kind, url]);

  // Reset error when current url changes
  useEffect(() => {
    setLoadError(null);
    console.log('🎬 TVVideoOverlay current:', { index: safeIndex, total: validUrls.length, url, kind });
  }, [url, kind, safeIndex, validUrls.length]);

  // If url count shrinks, clamp index
  useEffect(() => {
    if (validUrls.length === 0) return;
    if (currentIndex >= validUrls.length) setCurrentIndex(0);
  }, [validUrls.length, currentIndex]);

  const advance = () => {
    if (validUrls.length <= 1) {
      // restart same video
      const v = videoRef.current;
      if (v) {
        try { v.currentTime = 0; v.play().catch(() => {}); } catch { /* noop */ }
      }
      return;
    }
    setCurrentIndex((i) => (i + 1) % validUrls.length);
  };

  const shouldShow = enabled && validUrls.length > 0 && !paused && !loadError && !silenceHour;

  // Smooth fade in/out
  useEffect(() => {
    if (shouldShow) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [shouldShow]);

  // HTML5 video control
  useEffect(() => {
    const v = videoRef.current;
    if (!v || kind !== 'mp4') return;

    v.volume = audioUnlocked ? Math.max(0, Math.min(1, volume / 100)) : 0;
    v.muted = !audioUnlocked;

    if (paused || silenceHour) {
      try { v.pause(); } catch { /* noop */ }
    } else if (enabled) {
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => { /* ignore */ });
      });
    }
  }, [paused, enabled, volume, audioUnlocked, kind, url, silenceHour]);

  // YouTube iframe API control via postMessage + fallback advance timer
  useEffect(() => {
    if (kind !== 'youtube') return;
    const iframe = iframeRef.current;

    const send = (func: string, args: unknown[] = []) => {
      try {
        iframe?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch { /* noop */ }
    };

    if (paused || silenceHour) {
      send('pauseVideo');
      send('mute');
      return;
    }
    if (enabled) {
      if (audioUnlocked) {
        send('unMute');
        send('setVolume', [Math.max(0, Math.min(100, volume))]);
      } else {
        send('mute');
      }
      // Apply current dynamic quality (auto-downgrades on slow connections)
      send('setPlaybackQuality', [quality]);
      send('playVideo');
      // Re-apply quality cap after play (YouTube may auto-bump quality)
      setTimeout(() => send('setPlaybackQuality', [quality]), 1500);
      setTimeout(() => send('setPlaybackQuality', [quality]), 5000);
    }

    // Fallback timer to rotate playlist when more than one URL
    if (validUrls.length > 1 && !paused) {
      const t = setTimeout(() => advance(), YT_FALLBACK_ADVANCE_MS);
      return () => clearTimeout(t);
    }
  }, [paused, enabled, volume, audioUnlocked, kind, url, validUrls.length, quality]);

  // Listen to YouTube infoDelivery messages to detect buffering and downgrade
  useEffect(() => {
    if (kind !== 'youtube') return;
    let bufferingSince = 0;
    const onMessage = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return;
      if (!ev.data.includes('youtube')) return;
      try {
        const data = JSON.parse(ev.data);
        const info = data?.info;
        if (!info) return;
        // playerState: 3 = buffering, 1 = playing
        if (info.playerState === 3) {
          if (!bufferingSince) bufferingSince = Date.now();
          // If buffering for > 4s, downgrade
          else if (Date.now() - bufferingSince > 4000) {
            downgradeQuality('buffering YouTube');
            bufferingSince = 0;
          }
        } else if (info.playerState === 1) {
          bufferingSince = 0;
        }
      } catch { /* noop */ }
    };
    window.addEventListener('message', onMessage);
    // Ask YouTube to start sending state updates
    const iframe = iframeRef.current;
    try {
      iframe?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
        '*'
      );
    } catch { /* noop */ }
    return () => window.removeEventListener('message', onMessage);
  }, [kind, url]);

  if (!enabled || validUrls.length === 0 || kind === 'unknown') return null;
  if (!visible && !shouldShow) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black transition-opacity duration-300 ease-out"
      style={{
        opacity: shouldShow ? 1 : 0,
        pointerEvents: shouldShow ? 'auto' : 'none',
      }}
      aria-hidden={!shouldShow}
    >
      {kind === 'mp4' && (
        <video
          ref={videoRef}
          src={url}
          key={url}
          className="w-full h-full object-cover"
          autoPlay
          loop={validUrls.length === 1}
          playsInline
          muted={!audioUnlocked}
          preload={quality === 'small' || quality === 'medium' ? 'metadata' : 'auto'}
          onWaiting={() => {
            stallCountRef.current += 1;
            console.warn(`🎬⏳ Vídeo travou (stall #${stallCountRef.current}) — qualidade atual ${QUALITY_LABEL[quality]}`);
            // After 2 stalls in same session, downgrade
            if (stallCountRef.current >= 2) {
              downgradeQuality('stall MP4');
              stallCountRef.current = 0;
            }
          }}
          onEnded={() => {
            stallCountRef.current = 0;
            if (validUrls.length > 1) advance();
          }}
          onError={(e) => {
            const v = e.currentTarget;
            const code = v.error?.code;
            console.error('🎬❌ Video error:', { code, message: v.error?.message, url });
            // If playlist has more, skip to next instead of erroring out
            if (validUrls.length > 1) {
              advance();
            } else {
              setLoadError(`Falha ao carregar vídeo (código ${code}).`);
            }
          }}
          onLoadedData={() => console.log('🎬✅ Video carregado:', url)}
        />
      )}

      {kind === 'youtube' && ytId && (
        <iframe
          ref={iframeRef}
          key={`${url}-${quality}`}
          title="TV Video"
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&loop=${validUrls.length === 1 ? 1 : 0}&playlist=${ytId}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=1&mute=${audioUnlocked ? 0 : 1}&vq=${quality}&hd=0`}
          frameBorder={0}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}

      {/* Subtle quality indicator — only visible briefly when downgrading */}
      {quality !== 'hd720' && (
        <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/60 text-white/80 text-xs font-mono pointer-events-none">
          {QUALITY_LABEL[quality]} • conexão lenta
        </div>
      )}
    </div>
  );
}
