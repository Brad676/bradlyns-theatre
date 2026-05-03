import { useState, useRef, useCallback, useEffect } from "react";
import {
  Music2, MapPin, Globe, TrendingUp, Play, Pause,
  SkipBack, SkipForward, X, ChevronRight, Search,
  Download, Loader2, AlertCircle, Video, Headphones,
} from "lucide-react";
import { type MusicTrack, type MusicStreamResult, fetchMusicTracks, fetchMusicStream } from "@/lib/api";

// ─── helpers ────────────────────────────────────────────────────────────────

function artworkUrl(url: string, size = 300) {
  return url.replace(/\d+x\d+bb/, `${size}x${size}bb`);
}

function uniqTracks(arr: MusicTrack[]): MusicTrack[] {
  const seen = new Set<number>();
  return arr.filter(t => { if (seen.has(t.trackId)) return false; seen.add(t.trackId); return true; });
}

// ─── regions ────────────────────────────────────────────────────────────────

type RegionId = "africa" | "europe" | "asia" | "australia" | "americas" | "worldwide";
type Region = {
  id: RegionId; label: string; icon: React.ElementType;
  gradient: string; iconColor: string; description: string;
  queries: { term: string; country?: string }[];
};

const REGIONS: Region[] = [
  { id: "africa", label: "Africa", icon: MapPin, gradient: "from-orange-500/30 to-yellow-500/30", iconColor: "text-orange-400", description: "Afrobeats · Afropop · Highlife · Bongo Flava", queries: [{ term: "afrobeats", country: "NG" }, { term: "afropop naija", country: "NG" }, { term: "south africa music", country: "ZA" }, { term: "bongo flava", country: "TZ" }, { term: "highlife", country: "GH" }] },
  { id: "europe", label: "Europe", icon: Globe, gradient: "from-blue-500/30 to-indigo-500/30", iconColor: "text-blue-400", description: "UK Pop · French Chanson · German Schlager · Eurodance", queries: [{ term: "uk pop", country: "GB" }, { term: "french pop", country: "FR" }, { term: "german pop", country: "DE" }, { term: "italian music", country: "IT" }, { term: "spanish pop", country: "ES" }] },
  { id: "asia", label: "Asia", icon: Globe, gradient: "from-pink-500/30 to-rose-500/30", iconColor: "text-pink-400", description: "K-Pop · Bollywood · J-Pop · C-Pop", queries: [{ term: "kpop", country: "KR" }, { term: "jpop", country: "JP" }, { term: "bollywood hits", country: "IN" }, { term: "cpop", country: "CN" }, { term: "thai pop", country: "TH" }] },
  { id: "australia", label: "Australia & Oceania", icon: Globe, gradient: "from-teal-500/30 to-cyan-500/30", iconColor: "text-teal-400", description: "Australian Pop · Indie · New Zealand Music", queries: [{ term: "australian pop", country: "AU" }, { term: "new zealand music", country: "NZ" }, { term: "indie rock", country: "AU" }] },
  { id: "americas", label: "Americas", icon: Globe, gradient: "from-purple-500/30 to-violet-500/30", iconColor: "text-purple-400", description: "Hip-Hop · R&B · Latin · Reggae · Samba", queries: [{ term: "hip hop", country: "US" }, { term: "r&b", country: "US" }, { term: "latin pop", country: "MX" }, { term: "reggae", country: "JM" }, { term: "samba funk", country: "BR" }] },
  { id: "worldwide", label: "Worldwide", icon: TrendingUp, gradient: "from-cyan-500/30 to-purple-500/30", iconColor: "text-cyan-400", description: "Global Hits · Top 40 · World Music", queries: [{ term: "top 40 hits" }, { term: "world music" }, { term: "global pop hits" }] },
];

// ─── small components ────────────────────────────────────────────────────────

function PlayingBars({ color = "bg-purple-400" }: { color?: string }) {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[0, 1, 2].map(i => (
        <span key={i} className={`w-[3px] rounded-full ${color}`}
          style={{ animation: `musicBar 0.8s ease-in-out ${i * 0.15}s infinite alternate`, height: "100%" }} />
      ))}
    </div>
  );
}

type PlayerState = { track: MusicTrack; playlist: MusicTrack[]; index: number };

function MusicCard({ track, isActive, onPlay }: { track: MusicTrack; isActive: boolean; onPlay: () => void }) {
  const art = artworkUrl(track.artworkUrl100, 300);
  return (
    <div className="flex-shrink-0 w-[140px] group cursor-pointer" onClick={onPlay}>
      <div className="relative aspect-square rounded-xl overflow-hidden mb-2 shadow-lg">
        <img src={art} alt={track.trackName} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isActive ? "bg-black/30" : "bg-black/0 group-hover:bg-black/40"}`}>
          <div className={`w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition-all duration-200 ${isActive ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"}`}>
            {isActive ? <Pause size={16} className="text-gray-900" /> : <Play size={16} className="text-gray-900 ml-0.5" />}
          </div>
        </div>
        {isActive && <div className="absolute bottom-2 left-2"><PlayingBars /></div>}
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

// ─── MusicPlayer modal ───────────────────────────────────────────────────────

type PlayerMode = "video" | "audio";

function MusicPlayer({
  state, streamInfo, streamLoading, mode, onMode, onClose, onPrev, onNext,
}: {
  state: PlayerState;
  streamInfo: MusicStreamResult | null;
  streamLoading: boolean;
  mode: PlayerMode;
  onMode: (m: PlayerMode) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { track } = state;
  const hasPrev = state.index > 0;
  const hasNext = state.index < state.playlist.length - 1;
  const art = artworkUrl(track.artworkUrl100, 600);
  const artThumb = artworkUrl(track.artworkUrl100, 80);

  // YouTube embed — autoplay=1 works because the user just clicked the card
  const embedUrl = streamInfo?.videoId
    ? `https://www.youtube-nocookie.com/embed/${streamInfo.videoId}?autoplay=1&rel=0&modestbranding=1`
    : null;

  const ytWatchUrl = streamInfo?.videoId
    ? `https://www.youtube.com/watch?v=${streamInfo.videoId}`
    : null;

  const cobaltUrl = streamInfo?.videoId
    ? `https://cobalt.tools/?u=${encodeURIComponent(`https://www.youtube.com/watch?v=${streamInfo.videoId}`)}`
    : null;

  // iTunes 30-second preview (direct MP3/M4A — always works in browser)
  const previewUrl = track.previewUrl ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <img src={artThumb} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate max-w-[160px] sm:max-w-xs">{track.trackName}</p>
            <p className="text-gray-400 text-xs truncate">{track.artistName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <div className="flex rounded-xl bg-white/8 border border-white/10 p-0.5 gap-0.5">
            <button
              onClick={() => onMode("video")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${mode === "video" ? "bg-purple-500 text-white shadow" : "text-gray-400 hover:text-white"}`}
            >
              <Video size={12} /> Video
            </button>
            <button
              onClick={() => onMode("audio")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${mode === "audio" ? "bg-purple-500 text-white shadow" : "text-gray-400 hover:text-white"}`}
            >
              <Headphones size={12} /> Audio
            </button>
          </div>

          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10" title="Close (Esc)">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Player body ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {streamLoading && mode === "video" ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 size={40} className="text-purple-400 animate-spin" />
            <p className="text-gray-400 text-sm">Finding music video…</p>
            <p className="text-gray-600 text-xs">{track.trackName} — {track.artistName}</p>
          </div>

        ) : mode === "video" && !embedUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <AlertCircle size={40} className="text-red-400" />
            <p className="text-gray-200 font-medium">Could not find this track on YouTube</p>
            <p className="text-gray-500 text-sm">{track.trackName} — {track.artistName}</p>
            {previewUrl && (
              <button onClick={() => onMode("audio")} className="mt-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition-colors">
                <Headphones size={12} className="inline mr-1" /> Try Audio Preview
              </button>
            )}
          </div>

        ) : mode === "video" ? (
          /* ── VIDEO MODE: full-screen YouTube iframe ── */
          <div className="flex-1 relative bg-black">
            <iframe
              key={`video-${streamInfo!.videoId}`}
              src={embedUrl!}
              title={track.trackName}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              style={{ border: "none" }}
            />
          </div>

        ) : (
          /* ── AUDIO MODE: album art + native audio player ── */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-gradient-to-b from-gray-900 via-black to-black gap-6">
            <div className="relative">
              <img
                src={art}
                alt={track.trackName}
                className="w-52 h-52 sm:w-64 sm:h-64 rounded-2xl object-cover shadow-2xl"
                style={{ boxShadow: "0 0 80px rgba(168,85,247,0.35), 0 20px 60px rgba(0,0,0,0.8)" }}
              />
              <div className="absolute -inset-2 rounded-[20px] border border-purple-500/20 animate-pulse" style={{ animationDuration: "2.5s" }} />
            </div>

            <div className="text-center">
              <h2 className="text-white text-xl font-bold leading-tight max-w-xs">{track.trackName}</h2>
              <p className="text-gray-400 text-sm mt-1">{track.artistName}</p>
              {track.collectionName && <p className="text-gray-600 text-xs mt-0.5 truncate max-w-xs">{track.collectionName}</p>}
            </div>

            {/* Native audio player using iTunes 30-second preview */}
            {previewUrl ? (
              <div className="w-full max-w-sm flex flex-col items-center gap-3">
                <audio
                  key={previewUrl}
                  controls
                  autoPlay
                  className="w-full"
                  style={{ accentColor: "#a855f7" }}
                >
                  <source src={previewUrl} />
                </audio>
                <p className="text-gray-600 text-xs text-center">30-second preview · Apple Music</p>
                {ytWatchUrl && (
                  <a
                    href={ytWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-medium hover:bg-white/10 transition-colors"
                  >
                    <Video size={12} /> Watch full video on YouTube
                  </a>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <AlertCircle size={28} className="text-gray-500" />
                <p className="text-gray-500 text-sm">No audio preview available</p>
                {ytWatchUrl && (
                  <a
                    href={ytWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition-colors"
                  >
                    <Video size={12} /> Open on YouTube
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-t border-white/10 gap-3">
        <div className="flex items-center gap-1">
          <button onClick={onPrev} disabled={!hasPrev} title="Previous (←)"
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed rounded-lg hover:bg-white/10">
            <SkipBack size={18} />
          </button>
          <button onClick={onNext} disabled={!hasNext} title="Next (→)"
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed rounded-lg hover:bg-white/10">
            <SkipForward size={18} />
          </button>
        </div>

        {cobaltUrl ? (
          <a
            href={cobaltUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Download audio or video — free, no login required"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition-colors"
          >
            <Download size={13} /> Download
          </a>
        ) : streamLoading ? (
          <div className="flex items-center gap-1.5 text-gray-600 text-xs">
            <Loader2 size={11} className="animate-spin" /> Loading…
          </div>
        ) : <div />}
      </div>
    </div>
  );
}

// ─── RegionSection ────────────────────────────────────────────────────────────

function RegionSection({ region, autoLoad, activeTrackId, onPlay }: {
  region: Region; autoLoad: boolean; activeTrackId: number | null;
  onPlay: (track: MusicTrack, playlist: MusicTrack[], index: number) => void;
}) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const load = useCallback(() => {
    if (loaded || loading) return;
    setLoading(true);
    Promise.all(region.queries.map(q => fetchMusicTracks(q.term, q.country, 15)))
      .then(results => { setTracks(uniqTracks(results.flat()).slice(0, 40)); setLoaded(true); })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false));
  }, [region, loaded, loading]);

  useEffect(() => {
    if (autoLoad) { load(); return; }
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) { obs.disconnect(); load(); } }, { rootMargin: "300px" });
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
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors pr-2 flex-shrink-0">
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
        <p className="text-gray-600 text-sm px-4 py-4 text-center">No tracks found.</p>
      ) : expanded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 px-4">
          {displayTracks.map((t, i) => <MusicCard key={t.trackId} track={t} isActive={activeTrackId === t.trackId} onPlay={() => onPlay(t, tracks, i)} />)}
        </div>
      ) : (
        <div className="flex gap-3 px-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {displayTracks.map((t, i) => <MusicCard key={t.trackId} track={t} isActive={activeTrackId === t.trackId} onPlay={() => onPlay(t, tracks, i)} />)}
        </div>
      )}
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Music() {
  const [activeTab, setActiveTab] = useState<RegionId>("africa");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [streamInfo, setStreamInfo] = useState<MusicStreamResult | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [playerMode, setPlayerMode] = useState<PlayerMode>("video");
  const currentTrackIdRef = useRef<number | null>(null);

  const runSearch = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    fetchMusicTracks(q.trim(), undefined, 50)
      .then(t => setSearchResults(t)).catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchDebounce.current = setTimeout(() => runSearch(val), 450);
  };

  const loadTrack = useCallback((track: MusicTrack, playlist: MusicTrack[], index: number) => {
    if (playerState?.track.trackId === track.trackId) {
      // Same track tapped again → close player
      setPlayerState(null); setStreamInfo(null); setStreamLoading(false);
      currentTrackIdRef.current = null;
      return;
    }
    currentTrackIdRef.current = track.trackId;
    setPlayerState({ track, playlist, index });
    setStreamInfo(null);
    setStreamLoading(true);

    fetchMusicStream(track.trackName, track.artistName)
      .then(result => { if (currentTrackIdRef.current === track.trackId) setStreamInfo(result); })
      .catch(() => {})
      .finally(() => { if (currentTrackIdRef.current === track.trackId) setStreamLoading(false); });
  }, [playerState]);

  const handleClose = useCallback(() => {
    setPlayerState(null); setStreamInfo(null); setStreamLoading(false);
    currentTrackIdRef.current = null;
  }, []);

  const handlePrev = useCallback(() => {
    if (!playerState || playerState.index === 0) return;
    const i = playerState.index - 1;
    loadTrack(playerState.playlist[i], playerState.playlist, i);
  }, [playerState, loadTrack]);

  const handleNext = useCallback(() => {
    if (!playerState) return;
    const i = playerState.index + 1;
    if (i < playerState.playlist.length) loadTrack(playerState.playlist[i], playerState.playlist, i);
  }, [playerState, loadTrack]);

  const activeTrackId = playerState?.track.trackId ?? null;

  return (
    <>
      <style>{`
        @keyframes musicBar {
          from { transform: scaleY(0.3); opacity: 0.6; }
          to   { transform: scaleY(1);   opacity: 1; }
        }
        .bg-white\\/8 { background-color: rgba(255,255,255,0.08); }
      `}</style>

      <div className="pt-20 pb-12">
        <div className="px-4 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/40 to-pink-500/40 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <Music2 size={22} className="text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white">Music</h1>
              <p className="text-gray-400 text-sm">Full music videos · Video & Audio modes · Africa · Global</p>
            </div>
            {playerState && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 flex-shrink-0 cursor-pointer" onClick={() => setPlayerState(s => s)}>
                <PlayingBars />
                <span className="text-purple-300 text-xs font-medium truncate max-w-[120px]">{playerState.track.trackName}</span>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-purple-500/50 transition-colors">
            <Search size={16} className="text-gray-500 flex-shrink-0" />
            <input
              type="text" value={searchQuery} onChange={e => handleSearchChange(e.target.value)}
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
                  {searchResults.map((t, i) => <MusicCard key={t.trackId} track={t} isActive={activeTrackId === t.trackId} onPlay={() => loadTrack(t, searchResults, i)} />)}
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
                    <button key={r.id} onClick={() => setActiveTab(r.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${active ? `bg-gradient-to-r ${r.gradient} border border-white/20 text-white shadow-lg` : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"}`}>
                      <Icon size={14} className={active ? r.iconColor : ""} />
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-10">
              {REGIONS.map(region => (
                <RegionSection key={region.id} region={region} autoLoad={region.id === activeTab} activeTrackId={activeTrackId} onPlay={loadTrack} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Full-screen music player */}
      {playerState && (
        <MusicPlayer
          state={playerState}
          streamInfo={streamInfo}
          streamLoading={streamLoading}
          mode={playerMode}
          onMode={setPlayerMode}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </>
  );
}
