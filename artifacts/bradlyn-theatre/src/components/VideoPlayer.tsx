import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, ChevronDown, ChevronUp,
} from "lucide-react";
import { apiPost, apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Props = {
  src: string;
  subjectId?: string;
  subjectType?: number;
  title?: string;
  coverUrl?: string;
  onEnded?: () => void;
};

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function VideoPlayer({ src, subjectId, subjectType, title, coverUrl, onEnded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const hideControlsRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimestampRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const tapRef = useRef<number>(0);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (user && subjectId) {
      apiGet(`user/history`).then(r => r.json()).then((history: { subjectId: string; timestampSec: number; playbackSpeed: number }[]) => {
        const entry = history.find(h => h.subjectId === subjectId);
        if (entry && entry.timestampSec > 5) {
          vid.currentTime = entry.timestampSec;
        }
        if (entry?.playbackSpeed) {
          setSpeed(entry.playbackSpeed);
          vid.playbackRate = entry.playbackSpeed;
        }
      }).catch(() => {});
    }
  }, [user, subjectId]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !user || !subjectId) return;
    saveTimestampRef.current = setInterval(() => {
      apiPost("user/history", {
        subjectId,
        subjectType: subjectType ?? 1,
        title: title ?? "",
        coverUrl: coverUrl ?? "",
        timestampSec: vid.currentTime,
        durationSec: vid.duration ?? 0,
        playbackSpeed: speed,
      }).catch(() => {});
    }, 10000);
    return () => { if (saveTimestampRef.current) clearInterval(saveTimestampRef.current); };
  }, [user, subjectId, speed]);

  const autoHideControls = () => {
    if (hideControlsRef.current) clearTimeout(hideControlsRef.current);
    setShowControls(true);
    hideControlsRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    autoHideControls();
    const onKey = (e: KeyboardEvent) => {
      const vid = videoRef.current;
      if (!vid) return;
      if (e.code === "Space") { e.preventDefault(); vid.paused ? vid.play() : vid.pause(); }
      if (e.code === "ArrowLeft") { e.preventDefault(); vid.currentTime = Math.max(0, vid.currentTime - 10); }
      if (e.code === "ArrowRight") { e.preventDefault(); vid.currentTime = Math.min(vid.duration, vid.currentTime + 10); }
      if (e.code === "KeyF") { toggleFullscreen(); }
      if (e.code === "KeyM") { vid.muted = !vid.muted; setMuted(vid.muted); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
      setFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - tapRef.current < 300) toggleFullscreen();
    tapRef.current = now;
  };

  const handleVideoClick = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) vid.play();
    else vid.pause();
    autoHideControls();
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = Number(e.target.value);
  };

  const changeSpeed = (s: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.playbackRate = s;
    setSpeed(s);
    setShowSettings(false);
  };

  const changeVolume = (v: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.volume = v;
    setVolume(v);
    setMuted(v === 0);
  };

  const savedOnEnd = useCallback(() => {
    if (user && subjectId) {
      const vid = videoRef.current;
      apiPost("user/history", {
        subjectId,
        subjectType: subjectType ?? 1,
        title: title ?? "",
        coverUrl: coverUrl ?? "",
        timestampSec: vid?.duration ?? 0,
        durationSec: vid?.duration ?? 0,
        playbackSpeed: speed,
      }).catch(() => {});
    }
    onEnded?.();
  }, [user, subjectId, speed, onEnded]);

  return (
    <div
      ref={containerRef}
      className="video-container select-none"
      style={{ cursor: showControls ? "default" : "none" }}
      onMouseMove={autoHideControls}
      onClick={handleDoubleTap}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        onClick={handleVideoClick}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const vid = videoRef.current;
          if (!vid) return;
          setCurrentTime(vid.currentTime);
          if (vid.buffered.length > 0) setBuffered(vid.buffered.end(vid.buffered.length - 1));
        }}
        onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onEnded={savedOnEnd}
        playsInline
        className="w-full h-full"
        style={{ background: "#000", outline: "none" }}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        </div>
      )}

      {showControls && (
        <div className="absolute inset-0 flex flex-col justify-between p-3" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 40%, rgba(0,0,0,0.4) 100%)" }}>
          <div className="flex items-center gap-2">
            {title && <p className="text-white font-medium text-sm">{title}</p>}
          </div>

          <div className="space-y-2">
            <div className="relative w-full h-1 bg-white/20 rounded-full cursor-pointer group">
              <div className="absolute left-0 top-0 h-full bg-white/30 rounded-full" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={seek}
                onClick={e => e.stopPropagation()}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ height: "100%" }}
              />
              <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: "var(--neon-cyan)" }} />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={e => { e.stopPropagation(); const vid = videoRef.current; if (vid) { vid.paused ? vid.play() : vid.pause(); } }} className="text-white hover:text-cyan-400 transition-colors p-1">
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button onClick={e => { e.stopPropagation(); const vid = videoRef.current; if (vid) vid.currentTime = Math.max(0, vid.currentTime - 10); }} className="text-white hover:text-cyan-400 p-1">
                <SkipBack size={16} />
              </button>
              <button onClick={e => { e.stopPropagation(); const vid = videoRef.current; if (vid) vid.currentTime = Math.min(vid.duration, vid.currentTime + 10); }} className="text-white hover:text-cyan-400 p-1">
                <SkipForward size={16} />
              </button>
              <div className="flex items-center gap-1">
                <button onClick={e => { e.stopPropagation(); const vid = videoRef.current; if (vid) { vid.muted = !vid.muted; setMuted(vid.muted); } }} className="text-white hover:text-cyan-400 p-1">
                  {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={e => { e.stopPropagation(); changeVolume(Number(e.target.value)); }} onClick={e => e.stopPropagation()} className="w-16 h-1 accent-cyan-400 cursor-pointer" />
              </div>
              <span className="text-gray-300 text-xs ml-1">{formatTime(currentTime)} / {formatTime(duration)}</span>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <button onClick={e => { e.stopPropagation(); setShowSettings(s => !s); }} className="text-white hover:text-cyan-400 p-1 flex items-center gap-1 text-xs">
                    <Settings size={14} /> {speed}x
                  </button>
                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-2 glass rounded-lg border border-white/10 overflow-hidden min-w-[100px]" onClick={e => e.stopPropagation()}>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                        <button key={s} onClick={() => changeSpeed(s)} className={`w-full text-left px-3 py-1.5 text-xs ${speed === s ? "text-cyan-400" : "text-gray-300 hover:text-white"} hover:bg-white/10`}>
                          {s}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={e => { e.stopPropagation(); toggleFullscreen(); }} className="text-white hover:text-cyan-400 p-1">
                  {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
