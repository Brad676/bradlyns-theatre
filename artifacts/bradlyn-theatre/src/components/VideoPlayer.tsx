import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Download, Tv, X,
  Monitor, Wifi, Airplay, PictureInPicture2, ChevronRight, Cast,
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
  onResolutionChange?: (res: "480" | "720" | "1080") => void;
  currentResolution?: Resolution;
};

function formatTime(s: number): string {
  if (!isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function VideoPlayer({ src, subjectId, subjectType, title, coverUrl, onEnded, onResolutionChange, currentResolution }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [cssFullscreen, setCssFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [resolution, setResolution] = useState<Resolution>(currentResolution ?? "720p");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"speed" | "quality">("speed");
  const [buffered, setBuffered] = useState(0);
  const [videoLoading, setVideoLoading] = useState(true);
  const [castState, setCastState] = useState<"idle" | "connecting" | "casting">("idle");
  const [showCastModal, setShowCastModal] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  type CastStatus = { target: "airplay" | "cast" | "pip" | "mirror"; state: "searching" | "success" | "error" | "unsupported"; message: string };
  const [castStatus, setCastStatus] = useState<CastStatus | null>(null);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading">("idle");
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hideControlsRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimestampRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const tapRef = useRef<number>(0);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setPlaybackError(null);
    setFailedSrc(null);
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

    type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };
    type WebkitDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    type WebkitVid = HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitSupportsFullscreen?: boolean };

    const isNativeFs = !!(document.fullscreenElement || (document as WebkitDoc).webkitFullscreenElement);

    // Exit path
    if (isNativeFs) {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else (document as WebkitDoc).webkitExitFullscreen?.();
      } catch {}
      try { screen.orientation.unlock?.(); } catch {}
      return;
    }
    if (cssFullscreen) {
      setCssFullscreen(false);
      setFullscreen(false);
      try { screen.orientation.unlock?.(); } catch {}
      return;
    }

    // Enter path — try native fullscreen on container first
    try {
      await el.requestFullscreen();
      try { await (screen.orientation as LockableOrientation).lock?.("landscape"); } catch {}
      return;
    } catch {}

    // Try webkit native video fullscreen (iOS Safari)
    const wVid = vid as WebkitVid;
    if (wVid.webkitSupportsFullscreen && wVid.webkitEnterFullscreen) {
      try { wVid.webkitEnterFullscreen(); return; } catch {}
    }

    // CSS fallback — works in iframes / PWA / unsupported browsers
    setCssFullscreen(true);
    setFullscreen(true);
    try { await (screen.orientation as LockableOrientation).lock?.("landscape"); } catch {}
  }, [cssFullscreen]);

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
    const raw = res.replace("p", "") as "480" | "720" | "1080";
    onResolutionChange?.(raw);
  };

  useEffect(() => {
    if (currentResolution && currentResolution !== resolution) setResolution(currentResolution);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResolution]);

  const describeVideoError = () => {
    const vid = videoRef.current;
    const code = vid?.error?.code;
    if (code === MediaError.MEDIA_ERR_ABORTED) return "Playback was interrupted.";
    if (code === MediaError.MEDIA_ERR_NETWORK) return "Network error while loading the stream.";
    if (code === MediaError.MEDIA_ERR_DECODE) return "The stream format could not be decoded.";
    if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) return "This stream format is not supported.";
    return "The video could not be loaded.";
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

  type VideoWithExtras = HTMLVideoElement & {
    remote?: RemotePlayback;
    webkitShowPlaybackTargetPicker?: () => void;
  };

  // Track Remote Playback state automatically
  useEffect(() => {
    const vid = videoRef.current as VideoWithExtras | null;
    if (!vid?.remote) return;
    const remote = vid.remote;
    const onConnecting = () => setCastState("connecting");
    const onConnect = () => setCastState("casting");
    const onDisconnect = () => setCastState("idle");
    remote.addEventListener("connecting", onConnecting);
    remote.addEventListener("connect", onConnect);
    remote.addEventListener("disconnect", onDisconnect);
    return () => {
      remote.removeEventListener("connecting", onConnecting);
      remote.removeEventListener("connect", onConnect);
      remote.removeEventListener("disconnect", onDisconnect);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track Picture-in-Picture state
  useEffect(() => {
    const onEnterPiP = () => setPipActive(true);
    const onLeavePiP = () => setPipActive(false);
    document.addEventListener("enterpictureinpicture", onEnterPiP);
    document.addEventListener("leavepictureinpicture", onLeavePiP);
    return () => {
      document.removeEventListener("enterpictureinpicture", onEnterPiP);
      document.removeEventListener("leavepictureinpicture", onLeavePiP);
    };
  }, []);

  const tryAirPlay = async () => {
    const vid = videoRef.current as VideoWithExtras | null;
    if (!vid) return;
    setCastStatus({ target: "airplay", state: "searching", message: "Opening AirPlay picker…" });
    // Safari's native AirPlay picker
    if (vid.webkitShowPlaybackTargetPicker) {
      vid.webkitShowPlaybackTargetPicker();
      setCastStatus({ target: "airplay", state: "success", message: "AirPlay picker opened — select your device." });
      return;
    }
    // Remote Playback API (Safari/Chrome)
    if (vid.remote) {
      try {
        setCastState("connecting");
        await vid.remote.prompt();
        setCastState("casting");
        setCastStatus({ target: "airplay", state: "success", message: "AirPlay connected!" });
        return;
      } catch (err) {
        setCastState("idle");
        const msg = (err as Error)?.message ?? "";
        if (msg.includes("No device") || msg.includes("no device")) {
          setCastStatus({ target: "airplay", state: "error", message: "No AirPlay devices found on this network." });
        } else {
          setCastStatus({ target: "airplay", state: "unsupported", message: "AirPlay isn't available in this browser. Use Safari on iPhone, iPad, or Mac." });
        }
      }
    } else {
      setCastStatus({ target: "airplay", state: "unsupported", message: "AirPlay requires Safari on an Apple device. Open this page in Safari and try again." });
    }
  };

  const tryChromecast = async () => {
    const vid = videoRef.current as VideoWithExtras | null;
    if (!vid) return;
    setCastStatus({ target: "cast", state: "searching", message: "Looking for cast devices…" });
    if (vid.remote) {
      try {
        setCastState("connecting");
        await vid.remote.prompt();
        setCastState("casting");
        setCastStatus({ target: "cast", state: "success", message: "Connected to cast device!" });
        return;
      } catch (err) {
        setCastState("idle");
        const msg = (err as Error)?.message ?? "";
        if (msg.includes("No device") || msg.includes("cancelled") || msg.includes("cancel")) {
          setCastStatus({ target: "cast", state: "error", message: "No cast devices found, or selection was cancelled." });
        } else {
          setCastStatus({ target: "cast", state: "unsupported", message: "Chromecast requires Google Chrome. Open this page in Chrome and use the ⋮ menu → Cast." });
        }
      }
    } else {
      setCastStatus({ target: "cast", state: "unsupported", message: "Chromecast requires Google Chrome. Open in Chrome, then click ⋮ → Cast… to find your TV." });
    }
  };

  const tryPiP = async () => {
    const vid = videoRef.current;
    if (!vid) return;
    setCastStatus({ target: "pip", state: "searching", message: "Starting Picture-in-Picture…" });
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setCastStatus({ target: "pip", state: "success", message: "Picture-in-Picture closed." });
      } else if (document.pictureInPictureEnabled) {
        await vid.requestPictureInPicture();
        setCastStatus({ target: "pip", state: "success", message: "Picture-in-Picture active! The video is now floating." });
        setTimeout(() => setShowCastModal(false), 800);
      } else {
        setCastStatus({ target: "pip", state: "unsupported", message: "Picture-in-Picture isn't supported in this browser." });
      }
    } catch {
      setCastStatus({ target: "pip", state: "error", message: "Couldn't start Picture-in-Picture. Make sure a video is playing first." });
    }
  };

  const tryScreenMirror = async () => {
    setCastStatus({ target: "mirror", state: "searching", message: "Opening display picker…" });
    // Presentation API — Chrome can mirror/present to Chromecast displays & secondary screens
    if ("PresentationRequest" in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const PR = (window as any).PresentationRequest as new (urls: string[]) => { start: () => Promise<{ addEventListener: (e: string, cb: () => void) => void }> };
        const request = new PR([window.location.href]);
        const connection = await request.start();
        connection.addEventListener("close", () =>
          setCastStatus({ target: "mirror", state: "error", message: "Screen mirror disconnected." })
        );
        setCastStatus({ target: "mirror", state: "success", message: "Screen mirroring started on external display!" });
        setTimeout(() => setShowCastModal(false), 900);
        return;
      } catch (err) {
        const msg = (err as Error)?.message ?? "";
        if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("user")) {
          setCastStatus({ target: "mirror", state: "error", message: "Display selection cancelled." });
        } else {
          setCastStatus({
            target: "mirror", state: "unsupported",
            message: "No compatible display found. Use your OS: iOS → Control Center → Screen Mirroring · Android → Quick Settings → Cast · Windows → Win+K (Connect).",
          });
        }
      }
    } else {
      setCastStatus({
        target: "mirror", state: "unsupported",
        message: "Use your device OS: iOS → Control Center → Screen Mirroring · Android → Quick Settings → Cast · Windows → Win+K (Connect).",
      });
    }
  };

  const handleCastToTV = () => {
    setCastStatus(null);
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
        className={`video-container select-none${cssFullscreen ? " css-fullscreen" : ""}`}
        style={{ cursor: showControls ? "default" : "none" }}
        onMouseMove={autoHideControls}
        onTouchStart={autoHideControls}
        onClick={handleDoubleTap}
      >
        <video
          key={src}
          ref={videoRef}
          src={src}
          autoPlay
          {...{ "x-webkit-airplay": "allow" }}
          onLoadedMetadata={() => {
            const vid = videoRef.current;
            if (!vid) return;
            setDuration(vid.duration || 0);
            setVideoLoading(false);
            if (vid.paused) {
              vid.play().catch(() => {});
            }
          }}
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
          onError={() => {
            setVideoLoading(false);
            setPlaybackError(describeVideoError());
            setFailedSrc(src);
          }}
          onEnded={savedOnEnd}
          playsInline
          className="w-full h-full"
          style={{ background: "#000", outline: "none", objectFit: "cover" }}
        />

        {videoLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          </div>
        )}

        {playbackError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center">
            <div className="max-w-sm">
              <h3 className="text-white font-semibold text-lg mb-2">Playback error</h3>
              <p className="text-gray-300 text-sm">{playbackError}</p>
              {failedSrc && <p className="text-gray-500 text-[11px] mt-2 break-all">{failedSrc}</p>}
            </div>
          </div>
        )}

        {showControls && (
          <div className="absolute inset-0 flex flex-col justify-between" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 35%, rgba(0,0,0,0.4) 100%)" }}>
            <div className="flex items-center justify-between px-4 pt-3">
              {title && <p className="text-white font-medium text-sm drop-shadow truncate max-w-[70%]">{title}</p>}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-black/40 border border-white/10 ml-auto ${resolutionColor(resolution)}`}>
                {resolution}
              </span>
            </div>

            <div className="px-3 pb-3 space-y-2">
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
                <button onClick={e => { e.stopPropagation(); const vid = videoRef.current; if (vid) vid.paused ? vid.play() : vid.pause(); }} className="text-white hover:text-cyan-400 transition-colors p-1">
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
                <span className="text-gray-300 text-xs ml-1 tabular-nums">{formatTime(currentTime)} / {formatTime(duration)}</span>

                <div className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={handleCastToTV}
                    title={castState === "casting" ? "Casting to TV" : "Cast to TV"}
                    className={`p-1.5 rounded transition-colors ${castState === "casting" ? "text-cyan-400" : castState === "connecting" ? "text-yellow-400 animate-pulse" : "text-white hover:text-cyan-400"}`}
                  >
                    <Tv size={15} />
                  </button>

                  <button
                    onClick={handleDownload}
                    title="Download"
                    className={`p-1.5 rounded transition-colors ${downloadState === "downloading" ? "text-green-400 animate-pulse" : "text-white hover:text-green-400"}`}
                  >
                    <Download size={15} />
                  </button>

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
                                {resolution === res && <span className="w-1.5 h-1.5 rounded-full" style={{ background: resolution === res ? "currentColor" : "transparent" }} />}
                              </button>
                            ))}
                            <p className="text-[10px] text-gray-600 px-4 py-2 border-t border-white/5">Quality may vary by stream</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button onClick={toggleFullscreen} className="text-white hover:text-cyan-400 p-1.5 rounded transition-colors" title={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}>
                    {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { setShowCastModal(false); setCastStatus(null); }}>
          <div className="glass rounded-2xl border border-white/10 p-5 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Tv size={17} className="text-cyan-400" /> Cast to Your TV
              </h3>
              <button onClick={() => { setShowCastModal(false); setCastStatus(null); }} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X size={15} />
              </button>
            </div>
            <p className="text-gray-500 text-[11px] mb-3">Click an option — you'll see a result immediately.</p>

            {/* Live status feedback banner */}
            {castStatus && (
              <div className={`mb-3 rounded-xl px-3 py-2.5 text-xs flex items-start gap-2 border ${
                castStatus.state === "searching" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-300" :
                castStatus.state === "success"   ? "bg-green-500/10  border-green-500/20  text-green-300"  :
                castStatus.state === "error"     ? "bg-red-500/10    border-red-500/20    text-red-300"    :
                "bg-white/5 border-white/10 text-gray-400"
              }`}>
                {castStatus.state === "searching" && <span className="w-3 h-3 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin flex-shrink-0 mt-0.5" />}
                {castStatus.state === "success"   && <span className="text-green-400 flex-shrink-0">✓</span>}
                {castStatus.state === "error"     && <span className="text-red-400 flex-shrink-0">✕</span>}
                {castStatus.state === "unsupported" && <span className="text-gray-400 flex-shrink-0">ℹ</span>}
                <span className="leading-relaxed">{castStatus.message}</span>
              </div>
            )}

            <div className="space-y-1.5">
              {/* AirPlay */}
              <button
                onClick={tryAirPlay}
                className={`flex items-center gap-3 w-full rounded-xl p-3 transition-all text-left group border ${
                  castStatus?.target === "airplay" && castStatus.state === "success"
                    ? "bg-cyan-500/20 border-cyan-500/40"
                    : "bg-white/5 hover:bg-cyan-500/10 border-white/5 hover:border-cyan-500/30"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  {castStatus?.target === "airplay" && castStatus.state === "searching"
                    ? <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                    : <Airplay size={15} className="text-cyan-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">AirPlay</p>
                  <p className="text-gray-500 text-[11px]">iPhone · iPad · Mac · Apple TV</p>
                </div>
                <ChevronRight size={13} className="text-gray-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
              </button>

              {/* Chromecast */}
              <button
                onClick={tryChromecast}
                className={`flex items-center gap-3 w-full rounded-xl p-3 transition-all text-left group border ${
                  castStatus?.target === "cast" && castStatus.state === "success"
                    ? "bg-purple-500/20 border-purple-500/40"
                    : "bg-white/5 hover:bg-purple-500/10 border-white/5 hover:border-purple-500/30"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  {castStatus?.target === "cast" && castStatus.state === "searching"
                    ? <span className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                    : <Cast size={15} className="text-purple-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">Chromecast / Smart TV</p>
                  <p className="text-gray-500 text-[11px]">Requires Google Chrome on desktop</p>
                </div>
                <ChevronRight size={13} className="text-gray-600 group-hover:text-purple-400 transition-colors flex-shrink-0" />
              </button>

              {/* Picture-in-Picture */}
              <button
                onClick={tryPiP}
                disabled={!document.pictureInPictureEnabled}
                className={`flex items-center gap-3 w-full rounded-xl p-3 transition-all text-left group border disabled:opacity-40 disabled:cursor-not-allowed ${
                  pipActive || (castStatus?.target === "pip" && castStatus.state === "success")
                    ? "bg-green-500/20 border-green-500/40"
                    : "bg-white/5 hover:bg-green-500/10 border-white/5 hover:border-green-500/30"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  {castStatus?.target === "pip" && castStatus.state === "searching"
                    ? <span className="w-4 h-4 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
                    : <PictureInPicture2 size={15} className={pipActive ? "text-green-300" : "text-green-400"} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">
                    Picture-in-Picture
                    {pipActive && <span className="ml-1.5 text-[10px] text-green-400 font-normal">● Active</span>}
                  </p>
                  <p className="text-gray-500 text-[11px]">Float video in a window while you browse</p>
                </div>
                <ChevronRight size={13} className="text-gray-600 group-hover:text-green-400 transition-colors flex-shrink-0" />
              </button>

              {/* Screen Mirror — Presentation API + OS fallback */}
              <button
                onClick={tryScreenMirror}
                className={`flex items-center gap-3 w-full rounded-xl p-3 transition-all text-left group border ${
                  castStatus?.target === "mirror" && castStatus.state === "success"
                    ? "bg-orange-500/20 border-orange-500/40"
                    : "bg-white/5 hover:bg-orange-500/10 border-white/5 hover:border-orange-500/30"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  {castStatus?.target === "mirror" && castStatus.state === "searching"
                    ? <span className="w-4 h-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                    : <Monitor size={15} className="text-orange-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">Screen Mirror</p>
                  <p className="text-gray-500 text-[11px]">iOS · Android · Windows · Secondary display</p>
                </div>
                <ChevronRight size={13} className="text-gray-600 group-hover:text-orange-400 transition-colors flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
