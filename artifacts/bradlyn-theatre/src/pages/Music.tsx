import { useState, useEffect, useRef, useCallback } from "react";
import {
  Music2, MapPin, Globe, TrendingUp, Play, Pause,
  SkipBack, SkipForward, Volume2, VolumeX, X, ExternalLink, ChevronRight, Search, Youtube, Maximize2,
} from "lucide-react";
import { type MusicTrack, fetchMusicTracks, fetchYouTubeId } from "@/lib/api";

function artworkUrl(url: string, size = 300) {
  return url.replace(/\d+x\d+bb/, `${size}x${size}bb`);
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function uniqTracks(arr: MusicTrack[]): MusicTrack[] {
  const seen = new Set<number>();
  return arr.filter(t => { if (seen.has(t.trackId)) return false; seen.add(t.trackId); return true; });
}

type RegionId = "africa" | "europe" | "asia" | "australia" | "americas" | "worldwide";

type Region = {
  id: RegionId;
  label: string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  tagColor: string;
  description: string;
  queries: { term: string; country?: string }[];
};

const REGIONS: Region[] = [
  {
    id: "africa",
    label: "Africa",
    icon: MapPin,
    gradient: "from-orange-500/30 to-yellow-500/30",
    iconColor: "text-orange-400",
    tagColor: "bg-orange-500/20 text-orange-300",
    description: "Afrobeats · Afropop · Highlife · Bongo Flava",
    queries: [
      { term: "afrobeats", country: "NG" },
      { term: "afropop naija", country: "NG" },
      { term: "south africa music", country: "ZA" },
      { term: "bongo flava", country: "TZ" },
      { term: "highlife", country: "GH" },
    ],
  },
  {
    id: "europe",
    label: "Europe",
    icon: Globe,
    gradient: "from-blue-500/30 to-indigo-500/30",
    iconColor: "text-blue-400",
    tagColor: "bg-blue-500/20 text-blue-300",
    description: "UK Pop · French Chanson · German Schlager · Eurodance",
    queries: [
      { term: "uk pop", country: "GB" },
      { term: "french pop", country: "FR" },
      { term: "german pop", country: "DE" },
      { term: "italian music", country: "IT" },
      { term: "spanish pop", country: "ES" },
    ],
  },
  {
    id: "asia",
    label: "Asia",
    icon: Globe,
    gradient: "from-pink-500/30 to-rose-500/30",
    iconColor: "text-pink-400",
    tagColor: "bg-pink-500/20 text-pink-300",
    description: "K-Pop · Bollywood · J-Pop · C-Pop",
    queries: [
      { term: "kpop", country: "KR" },
      { term: "jpop", country: "JP" },
      { term: "bollywood hits", country: "IN" },
      { term: "cpop", country: "CN" },
      { term: "thai pop", country: "TH" },
    ],
  },
  {
    id: "australia",
    label: "Australia & Oceania",
    icon: Globe,
    gradient: "from-teal-500/30 to-cyan-500/30",
    iconColor: "text-teal-400",
    tagColor: "bg-teal-500/20 text-teal-300",
    description: "Australian Pop · Indie · New Zealand Music",
    queries: [
      { term: "australian pop", country: "AU" },
      { term: "new zealand music", country: "NZ" },
      { term: "indie rock", country: "AU" },
    ],
  },
  {
    id: "americas",
    label: "Americas",
    icon: Globe,
    gradient: "from-purple-500/30 to-violet-500/30",
    iconColor: "text-purple-400",
    tagColor: "bg-purple-500/20 text-purple-300",
    description: "Hip-Hop · R&B · Latin · Reggae · Samba",
    queries: [
      { term: "hip hop", country: "US" },
      { term: "r&b", country: "US" },
      { term: "latin pop", country: "MX" },
      { term: "reggae", country: "JM" },
      { term: "samba funk", country: "BR" },
    ],
  },
  {
    id: "worldwide",
    label: "Worldwide",
    icon: TrendingUp,
    gradient: "from-cyan-500/30 to-purple-500/30",
    iconColor: "text-cyan-400",
    tagColor: "bg-cyan-500/20 text-cyan-300",
    description: "Global Hits · Top 40 · World Music",
    queries: [
      { term: "top 40 hits" },
      { term: "world music" },
      { term: "global pop hits" },
    ],
  },
];

function PlayingBars() {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-purple-400"
          style={{ animation: `musicBar 0.8s ease-in-out ${i * 0.15}s infinite alternate`, height: "100%" }}
        />
      ))}
    </div>
  );
}

type PlayerState = {
  track: MusicTrack;
  playlist: MusicTrack[];
  index: number;
};

function MusicCard({
  track, isActive, isPlaying, onPlay, onFullSong,
}: {
  track: MusicTrack;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onFullSong: (t: MusicTrack) => void;
}) {
  const art = artworkUrl(track.artworkUrl100, 300);
  return (
    <div className="flex-shrink-0 w-[140px] group cursor-pointer" onClick={onPlay}>
      <div className="relative aspect-square rounded-xl overflow-hidden mb-2 shadow-lg">
        <img
          src={art}
          alt={track.trackName}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isActive ? "bg-black/30" : "bg-black/0 group-hover:bg-black/40"}`}>
          <div className={`w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition-all duration-200 ${isActive ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"}`}>
            {isActive && isPlaying ? (
              <Pause size={16} className="text-gray-900" />
            ) : (
              <Play size={16} className="text-gray-900 ml-0.5" />
            )}
          </div>
        </div>
        {/* Full song button — top-right corner on hover */}
        <button
          onClick={e => { e.stopPropagation(); onFullSong(track); }}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-red-600/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500 hover:scale-110 shadow-lg"
          title="Play full song on YouTube"
        >
          <Youtube size={13} className="text-white" />
        </button>
        {isActive && isPlaying && (
          <div className="absolute bottom-2 left-2">
            <PlayingBars />
          </div>
        )}
      </div>
      <p className="text-white text-xs font-medium leading-tight truncate">{track.trackName}</p>
      <p className="text-gray-500 text-xs truncate mt-0.5">{track.artistName}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[140px]">
      <div className="aspect-square rounded-xl bg-white/5 animate-pulse mb-2" />
      <div className="h-3 rounded bg-white/5 animate-pulse mb-1.5 w-full" />
      <div className="h-2.5 rounded bg-white/5 animate-pulse w-2/3" />
    </div>
  );
}

function MiniPlayer({
  state, isPlaying, currentTime, duration, volume, muted,
  onPlayPause, onSeek, onClose, onPrev, onNext, onVolume, onMute, onFullSong,
}: {
  state: PlayerState;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  onPlayPause: () => void;
  onSeek: (t: number) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onVolume: (v: number) => void;
  onMute: () => void;
  onFullSong: (t: MusicTrack) => void;
}) {
  const { track } = state;
  const art = artworkUrl(track.artworkUrl100, 80);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 shadow-2xl">
      <div
        className="h-0.5 bg-white/10 cursor-pointer"
        onClick={e => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          onSeek(((e.clientX - rect.left) / rect.width) * (duration || 30));
        }}
      >
        <div className="h-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 max-w-5xl mx-auto">
        <img src={art} alt={track.trackName} className="w-11 h-11 rounded-lg object-cover flex-shrink-0 shadow" />

        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">{track.trackName}</p>
          <p className="text-gray-400 text-xs truncate">{track.artistName}</p>
          <p className="text-gray-600 text-[10px] truncate">{track.collectionName}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onPrev} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Previous">
            <SkipBack size={16} />
          </button>
          <button
            onClick={onPlayPause}
            className="w-9 h-9 rounded-full bg-purple-500 hover:bg-purple-400 flex items-center justify-center transition-colors flex-shrink-0"
          >
            {isPlaying ? <Pause size={15} className="text-white" /> : <Play size={15} className="text-white ml-0.5" />}
          </button>
          <button onClick={onNext} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Next">
            <SkipForward size={16} />
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          <span className="text-gray-500 text-[10px] tabular-nums w-8 text-right">{formatTime(currentTime)}</span>
          <span className="text-gray-600 text-[10px]">/</span>
          <span className="text-gray-500 text-[10px] tabular-nums w-8">{formatTime(duration || 30)}</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          <button onClick={onMute} className="p-1 text-gray-400 hover:text-white transition-colors">
            {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
            onChange={e => onVolume(Number(e.target.value))}
            className="w-16 h-1 accent-purple-500 cursor-pointer"
          />
        </div>

        <button
          onClick={() => onFullSong(state.track)}
          className="p-1.5 text-red-500 hover:text-red-400 transition-colors flex-shrink-0"
          title="Play full song on YouTube"
        >
          <Youtube size={15} />
        </button>

        {track.trackViewUrl && (
          <a
            href={track.trackViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 hover:text-white transition-colors flex-shrink-0"
            title="Open in Apple Music"
          >
            <ExternalLink size={13} />
          </a>
        )}

        <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white transition-colors flex-shrink-0">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function RegionSection({
  region, autoLoad, playerState, isPlaying,
  onPlay, onFullSong,
}: {
  region: Region;
  autoLoad: boolean;
  playerState: PlayerState | null;
  isPlaying: boolean;
  onPlay: (track: MusicTrack, playlist: MusicTrack[], index: number) => void;
  onFullSong: (t: MusicTrack) => void;
}) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const load = useCallback(() => {
    if (loaded || loading) return;
    setLoading(true);
    Promise.all(
      region.queries.map(q => fetchMusicTracks(q.term, q.country, 15))
    ).then(results => {
      setTracks(uniqTracks(results.flat()).slice(0, 40));
      setLoaded(true);
    }).catch(() => setLoaded(true))
      .finally(() => setLoading(false));
  }, [region, loaded, loading]);

  useEffect(() => {
    if (autoLoad) { load(); return; }
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) { obs.disconnect(); load(); } },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [autoLoad, load]);

  const Icon = region.icon;
  const displayTracks = expanded ? tracks : tracks.slice(0, 14);

  return (
    <section ref={sectionRef} className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${region.gradient} border border-white/10 flex items-center justify-center flex-shrink-0`}>
            <Icon size={17} className={region.iconColor} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">{region.label}</h2>
            <p className="text-gray-500 text-xs leading-tight mt-0.5">{region.description}</p>
          </div>
        </div>
        {loaded && tracks.length > 14 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors pr-2 flex-shrink-0"
          >
            {expanded ? "Show less" : `+${tracks.length - 14} more`}
            <ChevronRight size={13} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>

      {loading || !loaded ? (
        <div className="flex gap-3 px-4 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-gray-600 text-sm px-4 py-4 text-center">No tracks found for this region.</p>
      ) : expanded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 px-4">
          {displayTracks.map((t, i) => (
            <MusicCard
              key={t.trackId}
              track={t}
              isActive={playerState?.track.trackId === t.trackId}
              isPlaying={playerState?.track.trackId === t.trackId && isPlaying}
              onPlay={() => { onPlay(t, tracks, i); onFullSong(t); }}
              onFullSong={onFullSong}
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 px-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {displayTracks.map((t, i) => (
            <MusicCard
              key={t.trackId}
              track={t}
              isActive={playerState?.track.trackId === t.trackId}
              isPlaying={playerState?.track.trackId === t.trackId && isPlaying}
              onPlay={() => { onPlay(t, tracks, i); onFullSong(t); }}
              onFullSong={onFullSong}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Music() {
  const [activeTab, setActiveTab] = useState<RegionId>("africa");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ytModal, setYtModal] = useState<{ track: MusicTrack; videoId: string | null; loading: boolean } | null>(null);

  const handleFullSong = async (track: MusicTrack) => {
    setYtModal({ track, videoId: null, loading: true });
    const result = await fetchYouTubeId(track.trackName, track.artistName);
    setYtModal(prev => prev ? { ...prev, videoId: result?.videoId ?? null, loading: false } : null);
  };

  const runMusicSearch = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    fetchMusicTracks(q.trim(), undefined, 50)
      .then(tracks => setSearchResults(tracks))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchDebounce.current = setTimeout(() => runMusicSearch(val), 450);
  };

  const loadTrack = useCallback((track: MusicTrack, playlist: MusicTrack[], index: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playerState?.track.trackId === track.trackId) {
      audio.paused ? audio.play().catch(() => {}) : audio.pause();
      return;
    }
    audio.src = track.previewUrl ?? "";
    audio.volume = muted ? 0 : volume;
    audio.play().catch(() => {});
    setPlayerState({ track, playlist, index });
    setIsPlaying(true);
    setCurrentTime(0);
  }, [playerState, volume, muted]);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(isFinite(audio.duration) ? audio.duration : 30);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setPlayerState(prev => {
        if (!prev) return null;
        const next = prev.index + 1;
        if (next < prev.playlist.length) {
          const nextTrack = prev.playlist[next];
          audio.src = nextTrack.previewUrl ?? "";
          audio.play().catch(() => {});
          return { track: nextTrack, playlist: prev.playlist, index: next };
        }
        return prev;
      });
      setCurrentTime(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  };

  const handleSeek = (t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const handleVolume = (v: number) => {
    const audio = audioRef.current;
    if (audio) audio.volume = v;
    setVolume(v);
    setMuted(v === 0);
  };

  const handleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    audio.volume = next ? 0 : volume;
    setMuted(next);
  };

  const handlePrev = () => {
    if (!playerState || playerState.index === 0) return;
    const prev = playerState.index - 1;
    loadTrack(playerState.playlist[prev], playerState.playlist, prev);
  };

  const handleNext = () => {
    if (!playerState) return;
    const next = playerState.index + 1;
    if (next < playerState.playlist.length) {
      loadTrack(playerState.playlist[next], playerState.playlist, next);
    }
  };

  const handleClose = () => {
    audioRef.current?.pause();
    setPlayerState(null);
    setIsPlaying(false);
  };

  return (
    <>
      <style>{`
        @keyframes musicBar {
          from { transform: scaleY(0.3); opacity: 0.6; }
          to   { transform: scaleY(1);   opacity: 1; }
        }
      `}</style>

      <div className={`pt-20 pb-${playerState ? "24" : "12"}`}>
        <div className="px-4 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/40 to-pink-500/40 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <Music2 size={22} className="text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white">Music</h1>
              <p className="text-gray-400 text-sm">Live previews · Africa · Europe · Asia · Americas · Worldwide</p>
            </div>
            {playerState && isPlaying && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 flex-shrink-0">
                <PlayingBars />
                <span className="text-purple-300 text-xs font-medium truncate max-w-[120px]">{playerState.track.trackName}</span>
              </div>
            )}
          </div>

          {/* Search box */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-purple-500/50 transition-colors">
            <Search size={16} className="text-gray-500 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search songs, artists, albums…"
              className="bg-transparent flex-1 text-white placeholder-gray-600 outline-none text-sm"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="text-gray-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Search results */}
        {searchQuery ? (
          <div className="px-4">
            {searchLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {Array.from({ length: 16 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-12">No tracks found for "{searchQuery}"</p>
            ) : (
              <>
                <p className="text-gray-500 text-xs mb-4">{searchResults.length} tracks for "{searchQuery}"</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {searchResults.map((t, i) => (
                    <MusicCard
                      key={t.trackId}
                      track={t}
                      isActive={playerState?.track.trackId === t.trackId}
                      isPlaying={playerState?.track.trackId === t.trackId && isPlaying}
                      onPlay={() => { loadTrack(t, searchResults, i); handleFullSong(t); }}
                      onFullSong={handleFullSong}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Region tabs */}
            <div className="px-4 mb-6 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-2 min-w-max">
                {REGIONS.map(r => {
                  const Icon = r.icon;
                  const active = r.id === activeTab;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveTab(r.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        active
                          ? `bg-gradient-to-r ${r.gradient} border border-white/20 text-white shadow-lg`
                          : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Icon size={14} className={active ? r.iconColor : ""} />
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-10">
              {REGIONS.map(region => (
                <RegionSection
                  key={region.id}
                  region={region}
                  autoLoad={region.id === activeTab}
                  playerState={playerState}
                  isPlaying={isPlaying}
                  onPlay={loadTrack}
                  onFullSong={handleFullSong}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {playerState && (
        <MiniPlayer
          state={playerState}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          muted={muted}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
          onVolume={handleVolume}
          onMute={handleMute}
          onFullSong={handleFullSong}
        />
      )}

      {/* YouTube full-song modal */}
      {ytModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setYtModal(null)}
        >
          <div
            className="glass rounded-2xl border border-white/10 shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <img
                src={artworkUrl(ytModal.track.artworkUrl100, 48)}
                alt={ytModal.track.trackName}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{ytModal.track.trackName}</p>
                <p className="text-gray-400 text-xs truncate">{ytModal.track.artistName}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {ytModal.videoId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${ytModal.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                    title="Open in YouTube"
                  >
                    <Maximize2 size={14} />
                  </a>
                )}
                <button onClick={() => setYtModal(null)} className="p-1.5 text-gray-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Player area */}
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              {ytModal.loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30">
                  <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                  <p className="text-gray-400 text-sm">Finding full song…</p>
                </div>
              ) : ytModal.videoId ? (
                <iframe
                  key={ytModal.videoId}
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${ytModal.videoId}?autoplay=1&rel=0`}
                  title={ytModal.track.trackName}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 px-6 text-center">
                  <Youtube size={32} className="text-red-500/60" />
                  <p className="text-gray-300 text-sm">Couldn't find this song on YouTube automatically.</p>
                  <a
                    href={`https://music.youtube.com/search?q=${encodeURIComponent(`${ytModal.track.trackName} ${ytModal.track.artistName}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors font-medium"
                  >
                    Search on YouTube Music
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
