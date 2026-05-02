import { useEffect, useRef, useState, useMemo } from 'react';

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

export function TVVideoOverlay({ urls, enabled, volume, paused, audioUnlocked }: TVVideoOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const shouldShow = enabled && validUrls.length > 0 && !paused && !loadError;

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

    if (paused) {
      try { v.pause(); } catch { /* noop */ }
    } else if (enabled) {
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => { /* ignore */ });
      });
    }
  }, [paused, enabled, volume, audioUnlocked, kind, url]);

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

    if (paused) {
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
      // Cap quality to 720p to save bandwidth on low-quality internet connections
      send('setPlaybackQuality', ['hd720']);
      send('playVideo');
      // Re-apply quality cap after play (YouTube may auto-bump quality)
      setTimeout(() => send('setPlaybackQuality', ['hd720']), 1500);
      setTimeout(() => send('setPlaybackQuality', ['hd720']), 5000);
    }

    // Fallback timer to rotate playlist when more than one URL
    if (validUrls.length > 1 && !paused) {
      const t = setTimeout(() => advance(), YT_FALLBACK_ADVANCE_MS);
      return () => clearTimeout(t);
    }
  }, [paused, enabled, volume, audioUnlocked, kind, url, validUrls.length]);

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
          onEnded={() => {
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
          key={url}
          title="TV Video"
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&loop=${validUrls.length === 1 ? 1 : 0}&playlist=${ytId}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=1&mute=${audioUnlocked ? 0 : 1}`}
          frameBorder={0}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}
