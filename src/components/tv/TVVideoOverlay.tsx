import { useEffect, useRef, useState, useMemo } from 'react';

interface TVVideoOverlayProps {
  url: string;
  enabled: boolean;
  volume: number; // 0-100
  paused: boolean; // true when a call is announcing
  audioUnlocked: boolean;
}

type VideoKind = 'youtube' | 'mp4' | 'unknown';

function detectKind(url: string): VideoKind {
  if (!url) return 'unknown';
  const u = url.trim().toLowerCase();
  if (u.includes('youtube.com/') || u.includes('youtu.be/')) return 'youtube';
  if (u.match(/\.(mp4|webm|ogv|mov|m4v)(\?|$)/)) return 'mp4';
  // assume mp4 if direct link
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
    // /embed/ID
    const parts = u.pathname.split('/');
    const idx = parts.indexOf('embed');
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return null;
  } catch {
    return null;
  }
}

export function TVVideoOverlay({ url, enabled, volume, paused, audioUnlocked }: TVVideoOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const kind = useMemo(() => detectKind(url), [url]);
  const ytId = useMemo(() => (kind === 'youtube' ? extractYouTubeId(url) : null), [kind, url]);

  // Reset error state when url changes
  useEffect(() => {
    setLoadError(null);
    console.log('🎬 TVVideoOverlay config:', { url, enabled, kind, ytId });
  }, [url, enabled, kind, ytId]);

  const shouldShow = enabled && !!url && !paused && !loadError;

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
        // Autoplay blocked — try muted
        v.muted = true;
        v.play().catch(() => { /* ignore */ });
      });
    }
  }, [paused, enabled, volume, audioUnlocked, kind]);

  // YouTube iframe API control via postMessage
  useEffect(() => {
    if (kind !== 'youtube') return;
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    const send = (func: string, args: unknown[] = []) => {
      try {
        iframe.contentWindow!.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch { /* noop */ }
    };

    if (paused) {
      send('pauseVideo');
      send('mute');
    } else if (enabled) {
      if (audioUnlocked) {
        send('unMute');
        send('setVolume', [Math.max(0, Math.min(100, volume))]);
      } else {
        send('mute');
      }
      send('playVideo');
    }
  }, [paused, enabled, volume, audioUnlocked, kind]);

  if (!enabled || !url || kind === 'unknown') return null;
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
          className="w-full h-full object-cover"
          autoPlay
          loop
          playsInline
          muted={!audioUnlocked}
        />
      )}

      {kind === 'youtube' && ytId && (
        <iframe
          ref={iframeRef}
          title="TV Video"
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=1&mute=${audioUnlocked ? 0 : 1}`}
          frameBorder={0}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}
