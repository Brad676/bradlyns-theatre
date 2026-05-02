import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Download, Tv, X,
  Monitor, Wifi, Airplay,
} from "lucide-react";
import { apiPost, apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Resolution = "480p" | "720p" | "1080p";

type Props = {
  src: string;
  subjectId?: string;
  subjectType?: number;
  title?: string;
  coverUrl?: string;
  onEnded?: () => void;
};

function formatTime(s: number): string {
  if (!isFinite(s)) return "0:00";
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
  const [resolution, setResolution] = useState<Resolution>("720p");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"speed" | "quality">("speed");
  const [buffered, setBuffered] = useState(0);
  const [videoLoading, setVideoLoading] = useState(true);
  const [castState, setCastState] = useState<"idle" | "connecting" | "casting">("idle");
  const [showCastModal, setShowCastModal] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading">("idle");
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
        if (entry && entry.timestampSec > 5) vid.currentTime = entry.timestampSec;
        if (entry?.playbackSpeed) { setSpeed(entry.playbackSpeed); vid.playbackRate = entry.playbackSpeed; }
      }).catch(() => {});
    }
  }, [user, subjectId]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !user || !subjectId) return;
    saveTimestampRef.current = setInterval(() => {
      apiPost("user/history", {
        subjectId, subjectType: subjectType ?? 1, title: title ?? "",
        coverUrl: coverUrl ?? "", timestampSec: vid.currentTime,
        durationSec: vid.duration ?? 0, playbackSpeed: speed,
      }).catch(() => {});
    }, 10000);
    return () => { if (saveTimestampRef.current) clearInterval(saveTimestampRef.current); };
  }, [user, subjectId, speed]);

  const autoHideControls = useCallback(() => {
    if (hideControlsRef.current) clearTimeout(hideControlsRef.current);
    setShowControls(true);
    hideControlsRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;
    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else {
          type WebkitVid = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
          const wvid = vid as WebkitVid;
          if (wvid.webkitEnterFullscreen) wvid.webkitEnterFullscreen();
        }
        try {
          type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };
          await (screen.orientation as LockableOrientation).lock?.("landscape");
        } catch {}
      } else {
        await document.exitFullscreen();
        try { screen.orientation.unlock?.(); } catch {}
      }
    } catch {}
  }, []);

  useEffect(() => {
    autoHideControls();
    const onKey = (e: KeyboardEvent) => {
      const vid = videoRef.current;
      if (!vid) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); vid.paused ? vid.play() : vid.pause(); }
      if (e.code === "ArrowLeft") { e.preventDefault(); vid.currentTime = Math.max(0, vid.currentTime - 10); }
      if (e.code === "ArrowRight") { e.preventDefault(); vid.currentTime = Math.min(vid.duration, vid.currentTime + 10); }
      if (e.code === "KeyF") toggleFullscreen();
      if (e.code === "KeyM") { vid.muted = !vid.muted; setMuted(vid.muted); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [autoHideControls, toggleFullscreen]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - tapRef.current < 300) toggleFullscreen();
    tapRef.current = now;
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.paused ? vid.play() : vid.pause();
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

  const changeResolution = (res: Resolution) => {
    setResolution(res);
    setShowSettings(false);
  };

  const handleDownload = () => {
    if (downloadState === "downloading") return;
    setDownloadState("downloading");
    const a = document.createElement("a");
    a.href = src;
    a.download = `${title ?? "video"}.mp4`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloadState("idle"), 3000);
  };

  const handleCastToTV = async () => {
    const vid = videoRef.current;
    if (!vid) return;
    type VideoWithRemote = HTMLVideoElement & {
      remote?: { prompt: () => Promise<void> };
    };
    const vr = vid as VideoWithRemote;
    if (vr.remote) {
      try {
        setCastState("connecting");
        await vr.remote.prompt();
        setCastState("casting");
        return;
      } catch {
        setCastState("idle");
      }
    }
    setShowCastModal(true);
  };

  const savedOnEnd = useCallback(() => {
    if (user && subjectId) {
      const vid = videoRef.current;
      apiPost("user/history", {
        subjectId, subjectType: subjectType ?? 1, title: title ?? "",
        coverUrl: coverUrl ?? "", timestampSec: vid?.duration ?? 0,
        durationSec: vid?.duration ?? 0, playbackSpeed: speed,
      }).catch(() => {});
    }
    onEnded?.();
  }, [user, subjectId, speed, onEnded]);

  const resolutionColor = (res: Resolution) => {
    if (res === "1080p") return "text-cyan-400";
    if (res === "720p") return "text-green-400";
    return "text-yellow-400";
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`video-container select-none ${fullscreen ? "video-fullscreen" : ""}`}
        style={{ cursor: showControls ? "default" : "none" }}
        onMouseMove={autoHideControls}
        onTouchStart={autoHideControls}
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
          onWaiting={() => setVideoLoading(true)}
          onCanPlay={() => setVideoLoading(false)}
          onLoadedData={() => setVideoLoading(false)}
          onEnded={savedOnEnd}
          playsInline
          className="w-full h-full"
          style={{ background: "#000", outline: "none" }}
        />

        {videoLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          </div>
        )}

        {showControls && (
          <div className="absolute inset-0 flex flex-col justify-between" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 35%, rgba(0,0,0,0.4) 100%)" }}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 pt-3">
              {title && <p className="text-white font-medium text-sm drop-shadow truncate max-w-[70%]">{title}</p>}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-black/40 border border-white/10 ml-auto ${resolutionColor(resolution)}`}>
                {resolution}
              </span>
            </div>

            {/* Bottom controls */}
            <div className="px-3 pb-3 space-y-2">
              {/* Progress bar */}
              <div className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer group">
                <div className="absolute left-0 top-0 h-full bg-white/25 rounded-full" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
                <input
                  type="range" min={0} max={duration || 100} value={currentTime}
                  onChange={seek} onClick={e => e.stopPropagation()}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-full z-10"
                />
                <div className="absolute left-0 top-0 h-full rounded-full transition-all" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: "var(--neon-cyan)" }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
              </div>

              <div className="flex items-center gap-2">
                {/* Play/pause */}
                <button onClick={e => { e.stopPropagation(); const vid = videoRef.current; if (vid) vid.paused ? vid.play() : vid.pause(); }} className="text-white hover:text-cyan-400 transition-colors p-1">
                  {playing ? <Pause size={20} /> : <Play size={20} />}
                </button>
                {/* Skip */}
                <button onClick={e => { e.stopPropagation(); const vid = videoRef.current; if (vid) vid.currentTime = Math.max(0, vid.currentTime - 10); }} className="text-white hover:text-cyan-400 p-1">
                  <SkipBack size={16} />
                </button>
                <button onClick={e => { e.stopPropagation(); const vid = videoRef.current; if (vid) vid.currentTime = Math.min(vid.duration, vid.currentTime + 10); }} className="text-white hover:text-cyan-400 p-1">
                  <SkipForward size={16} />
                </button>
                {/* Volume */}
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); const vid = videoRef.current; if (vid) { vid.muted = !vid.muted; setMuted(vid.muted); } }} className="text-white hover:text-cyan-400 p-1">
                    {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={e => { e.stopPropagation(); changeVolume(Number(e.target.value)); }} onClick={e => e.stopPropagation()} className="w-16 h-1 accent-cyan-400 cursor-pointer" />
                </div>
                {/* Time */}
                <span className="text-gray-300 text-xs ml-1 tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>

                {/* Right side controls */}
                <div className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {/* Cast */}
                  <button
                    onClick={handleCastToTV}
                    title={castState === "casting" ? "Casting to TV" : "Cast to TV"}
                    className={`p-1.5 rounded transition-colors ${castState === "casting" ? "text-cyan-400" : castState === "connecting" ? "text-yellow-400 animate-pulse" : "text-white hover:text-cyan-400"}`}
                  >
                    <Tv size={15} />
                  </button>

                  {/* Download */}
                  <button
                    onClick={handleDownload}
                    title="Download"
                    className={`p-1.5 rounded transition-colors ${downloadState === "downloading" ? "text-green-400 animate-pulse" : "text-white hover:text-green-400"}`}
                  >
                    <Download size={15} />
                  </button>

                  {/* Settings */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSettings(s => !s)}
                      className="text-white hover:text-cyan-400 p-1.5 flex items-center gap-1 text-xs rounded transition-colors"
                    >
                      <Settings size={14} />
                    </button>
                    {showSettings && (
                      <div className="absolute bottom-full right-0 mb-2 glass rounded-xl border border-white/10 overflow-hidden w-48 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex border-b border-white/10">
                          <button onClick={() => setSettingsTab("speed")} className={`flex-1 py-2 text-xs font-medium transition-colors ${settingsTab === "speed" ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-white"}`}>Speed</button>
                          <button onClick={() => setSettingsTab("quality")} className={`flex-1 py-2 text-xs font-medium transition-colors ${settingsTab === "quality" ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-white"}`}>Quality</button>
                        </div>
                        {settingsTab === "speed" && (
                          <div>
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                              <button key={s} onClick={() => changeSpeed(s)} className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between ${speed === s ? "text-cyan-400 bg-cyan-500/10" : "text-gray-300 hover:text-white hover:bg-white/10"}`}>
                                <span>{s === 1 ? "Normal" : `${s}×`}</span>
                                {speed === s && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                              </button>
                            ))}
                          </div>
                        )}
                        {settingsTab === "quality" && (
                          <div>
                            {(["1080p", "720p", "480p"] as Resolution[]).map(res => (
                              <button key={res} onClick={() => changeResolution(res)} className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between ${resolution === res ? "bg-white/5" : "hover:bg-white/10"}`}>
                                <span className={resolution === res ? resolutionColor(res) : "text-gray-300"}>
                                  {res}
                                  {res === "1080p" && <span className="ml-1.5 text-[10px] text-purple-400">HD</span>}
                                  {res === "720p" && <span className="ml-1.5 text-[10px] text-green-500">SD</span>}
                                  {res === "480p" && <span className="ml-1.5 text-[10px] text-yellow-500">Low</span>}
                                </span>
                                {resolution === res && <span className={`w-1.5 h-1.5 rounded-full`} style={{ background: resolution === res ? "currentColor" : "transparent" }} />}
                              </button>
                            ))}
                            <p className="text-[10px] text-gray-600 px-4 py-2 border-t border-white/5">Quality may vary by stream</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen */}
                  <button onClick={toggleFullscreen} className="text-white hover:text-cyan-400 p-1.5 rounded transition-colors" title={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}>
                    {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cast to TV modal */}
      {showCastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowCastModal(false)}>
          <div className="glass rounded-2xl border border-white/10 p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Tv size={18} className="text-cyan-400" /> Cast to Your TV
              </h3>
              <button onClick={() => setShowCastModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">Choose how to watch on your big screen:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                <Airplay size={18} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-semibold">AirPlay (iPhone / Mac)</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">Tap the AirPlay icon in your browser and select your Apple TV or AirPlay device.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                <Monitor size={18} className="text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-semibold">Chromecast (Android / Chrome)</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">Open this page in Chrome, click the three-dot menu → Cast, then choose your Chromecast or Smart TV.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                <Wifi size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-semibold">Screen Mirror</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">Use your device's built-in screen mirroring to display the full screen on your TV wirelessly.</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowCastModal(false)} className="mt-5 w-full neon-btn py-2.5 rounded-xl text-sm font-semibold">Got it</button>
          </div>
        </div>
      )}
    </>
  );
}
