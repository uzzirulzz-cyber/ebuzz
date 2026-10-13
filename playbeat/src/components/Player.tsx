import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Copy, RotateCcw } from 'lucide-react';
import Hls from 'hls.js';
import type { CatalogChannel } from '../lib/catalog';

type Props = {
  channel: CatalogChannel | null;
  onClose: () => void;
};

const TAG_LABELS: Record<string, string> = {
  geo: 'geo-blocked', sd: 'SD', youtube: 'YouTube', twitch: 'Twitch',
  not247: 'not 24/7', vpn: 'VPN',
};

export default function Player({ channel, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<string>('');
  const [useProxy, setUseProxy] = useState<boolean>(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!channel) return;
    setUseProxy(channel.u ? /^http:\/\//i.test(channel.u) : false);
  }, [channel, retryNonce]);

  useEffect(() => {
    if (!channel || !channel.u) return;
    if (channel.y || /youtube\.com|youtu\.be|twitch\.tv/i.test(channel.u)) {
      setStatus('This channel is distributed through ' +
        (/twitch/i.test(channel.u) ? 'Twitch' : 'YouTube') +
        ', which blocks direct embedding. Open it on the provider.');
      return;
    }
    const url = useProxy ? '/api/proxy?url=' + encodeURIComponent(channel.u) : channel.u;
    const video = videoRef.current;
    if (!video) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;

    setStatus(useProxy ? 'Loading via proxy…' : 'Loading…');

    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 20 });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('');
        video.play().catch(() => setStatus('Press play to start.'));
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) setStatus('Stream error: ' + (data.details ?? 'unknown'));
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.play().catch(() => {});
    } else {
      setStatus('This browser cannot play HLS without hls.js.');
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [channel, useProxy, retryNonce]);

  const copyUrl = async () => {
    if (!channel) return;
    try {
      await navigator.clipboard.writeText(channel.u ?? '');
      setStatus('Copied URL ✓');
    } catch {
      setStatus('Clipboard not available');
    }
  };

  return (
    <AnimatePresence>
      {channel && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="bg-[#11141c] border border-white/5 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
          >
            <header className="flex items-center gap-3 p-4 border-b border-white/5">
              {channel.l ? (
                <img src={channel.l} alt="" className="w-11 h-11 rounded-lg object-contain bg-white p-1 shrink-0"
                     onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.4'; }} />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-white/5" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold tracking-tight truncate">{channel.n}</h3>
                <p className="text-xs text-slate-400 truncate">
                  {[channel.g, channel.q, channel.s === 'ftv' ? 'Free-TV' : 'iptv-org',
                    channel.c?.toUpperCase()].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close player"
                      className="text-slate-400 hover:text-white p-2 rounded-md">
                <X size={18} />
              </button>
            </header>

            <div className="relative aspect-video bg-black">
              <video ref={videoRef} controls playsInline preload="none" className="w-full h-full" />
              {!channel.u && (
                <div className="absolute inset-0 grid place-content-center text-slate-400 p-6 text-center">
                  <p>No stream URL on record.</p>
                </div>
              )}
            </div>

            <footer className="flex items-center gap-2 flex-wrap p-4 border-t border-white/5">
              <button onClick={copyUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500">
                <Copy size={14} /> Copy URL
              </button>
              <button onClick={() => { setUseProxy((v) => !v); setRetryNonce((n) => n + 1); }}
                      className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ' +
                        (useProxy
                          ? 'border-blue-500 text-blue-400'
                          : 'border-white/10 text-slate-300 hover:border-blue-500')}>
                {useProxy ? '✓' : <RotateCcw size={14} />} {useProxy ? 'Proxy on' : 'Retry via proxy'}
              </button>
              {channel.u && (
                <a href={channel.u} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 text-sm hover:border-blue-500">
                  <ExternalLink size={14} /> Open direct ↗
                </a>
              )}
              <span className="text-xs text-slate-500 ml-auto">{status}</span>
            </footer>

            {channel.t && channel.t.length > 0 && (
              <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                {channel.t.map((t) => (
                  <span key={t} className="text-[10px] uppercase tracking-wider bg-white/5 text-slate-400 rounded px-2 py-0.5">
                    {TAG_LABELS[t] ?? t}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
