import { useState, useEffect, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  ArrowLeft, AlertTriangle, ChevronLeft, ChevronRight,
  Tv, Loader2, List, X, Play, Clock,
} from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { externalFetch, apiGet, getStreamUrl } from "@/lib/api";
import { type Subject } from "@/lib/api";

type Episode    = { episode: number; title: string; duration?: string };
type Season     = { season: number; episodes: Episode[] };
type EpisodeData = { seasons: Season[] };

export default function Watch() {
  const [, params]   = useRoute("/watch/:id");
  const [location]   = useLocation();
  const subjectId    = params?.id ?? "";

  const searchParams  = new URLSearchParams(location.split("?")[1] ?? "");
  const seasonParam   = parseInt(searchParams.get("season")  ?? "1", 10) || 1;
  const episodeParam  = parseInt(searchParams.get("episode") ?? "1", 10) || 1;

  const [streamUrl, setStreamUrl]         = useState<string | null>(null);
  const [subject, setSubject]             = useState<Subject | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [resolution, setResolution]       = useState<"480" | "720" | "1080">("720");
  const [episodeData, setEpisodeData]     = useState<EpisodeData | null>(null);
  const [currentSeason, setCurrentSeason]   = useState(seasonParam);
  const [currentEpisode, setCurrentEpisode] = useState(episodeParam);
  const [panelOpen, setPanelOpen]           = useState(false);
  const [panelSeason, setPanelSeason]       = useState(seasonParam);
  const [, navigate] = useLocation();
  const activeEpRef  = useRef<HTMLButtonElement | null>(null);

  const isSeries = subject?.subjectType === 2;

  const resolveStream = async (id: string, season?: number, ep?: number, res?: "480" | "720" | "1080") => {
    setLoading(true);
    setError(null);
    setStreamUrl(null);
    try {
      const stream = await getStreamUrl(id, season, ep, res ?? resolution, "En");
      if (!stream) throw new Error("no stream url");
      setStreamUrl(stream);
    } catch {
      setError("This title is currently unavailable. The stream resolver failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResolutionChange = (res: "480" | "720" | "1080") => {
    setResolution(res);
    if (!subjectId) return;
    const isSer = subject?.subjectType === 2;
    resolveStream(subjectId, isSer ? currentSeason : undefined, isSer ? currentEpisode : undefined, res);
  };

  // Initial load
  useEffect(() => {
    if (!subjectId) return;
    setSubject(null);
    setEpisodeData(null);
    setStreamUrl(null);
    setError(null);
    setLoading(true);

    externalFetch("detail", { subjectId })
      .then((d: unknown) => {
        const data = d as { data: { subject: Subject } };
        const s    = data.data?.subject ?? null;
        setSubject(s);
        const isSer = s?.subjectType === 2;
        if (isSer) {
          apiGet(`proxy/episodes/${subjectId}?title=${encodeURIComponent(s?.title ?? "")}`)
            .then(r => r.json())
            .then((raw: unknown) => {
              const r2 = raw as { seasons?: Season[]; data?: { seasons?: Season[] } };
              const seasons = r2.seasons ?? r2.data?.seasons ?? [];
              setEpisodeData({ seasons: Array.isArray(seasons) ? seasons : [] });
            })
            .catch(() => {});
        }
        resolveStream(subjectId, isSer ? seasonParam : undefined, isSer ? episodeParam : undefined);
      }).catch(() => {
        setError("Could not load title details.");
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  // URL param changes (episode navigation)
  useEffect(() => {
    setCurrentSeason(seasonParam);
    setCurrentEpisode(episodeParam);
    setPanelSeason(seasonParam);
    if (subjectId && subject) {
      const isSer = subject.subjectType === 2;
      resolveStream(subjectId, isSer ? seasonParam : undefined, isSer ? episodeParam : undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonParam, episodeParam]);

  // Auto-scroll active episode into view when panel opens
  useEffect(() => {
    if (panelOpen && activeEpRef.current) {
      setTimeout(() => activeEpRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
    }
  }, [panelOpen, currentEpisode, currentSeason]);

  const goToEpisode = (season: number, episode: number) => {
    setCurrentSeason(season);
    setCurrentEpisode(episode);
    setPanelSeason(season);
    navigate(`/watch/${subjectId}?season=${season}&episode=${episode}`);
  };

  const allSeasons        = episodeData?.seasons ?? [];
  const panelSeasonData   = allSeasons.find(s => s.season === panelSeason);
  const panelEpisodes     = panelSeasonData?.episodes ?? [];
  const currentSeasonData = allSeasons.find(s => s.season === currentSeason);
  const allEpisodes       = currentSeasonData?.episodes ?? [];
  const currentEpisodeData = allEpisodes.find(e => e.episode === currentEpisode);
  const totalInSeason      = allEpisodes.length;
  const hasPrev = currentEpisode > 1 || currentSeason > 1;
  const hasNext = currentEpisode < totalInSeason || currentSeason < allSeasons.length;

  const displayTitle = isSeries
    ? `${subject?.title ?? ""} — S${currentSeason}:E${currentEpisode}${currentEpisodeData?.title ? ` · ${currentEpisodeData.title}` : ""}`
    : subject?.title;

  const goPrev = () => {
    if (currentEpisode > 1) {
      goToEpisode(currentSeason, currentEpisode - 1);
    } else if (currentSeason > 1) {
      const prevSeason = allSeasons.find(s => s.season === currentSeason - 1);
      const lastEp = prevSeason?.episodes.at(-1)?.episode ?? 1;
      goToEpisode(currentSeason - 1, lastEp);
    }
  };

  const goNext = () => {
    if (currentEpisode < totalInSeason) {
      goToEpisode(currentSeason, currentEpisode + 1);
    } else {
      const nextSeason = allSeasons.find(s => s.season === currentSeason + 1);
      if (nextSeason) goToEpisode(currentSeason + 1, 1);
    }
  };

  const coverUrl = subject?.cover?.url ?? "";

  return (
    <div className="min-h-screen bg-black flex flex-col">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-3 glass absolute top-0 left-0 right-0 z-20">
        <Link href={subject ? `/detail/${subjectId}?season=${currentSeason}&episode=${currentEpisode}` : "/"}>
          <button className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-sm transition-colors">
            <ArrowLeft size={18} />
            <span className="hidden sm:inline truncate max-w-[160px]">{subject?.title ?? "Back"}</span>
          </button>
        </Link>
        {displayTitle && (
          <p className="text-white text-sm font-medium truncate flex-1 text-center">{displayTitle}</p>
        )}
        {isSeries && episodeData && (
          <button
            onClick={() => setPanelOpen(o => !o)}
            className={`flex items-center gap-1.5 p-1.5 rounded-lg transition-colors flex-shrink-0 ml-auto text-sm ${
              panelOpen ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-cyan-400 hover:bg-white/10"
            }`}
            title="All Episodes"
          >
            <List size={18} />
            <span className="hidden sm:inline text-xs font-medium">Episodes</span>
          </button>
        )}
      </div>

      {/* ── Main content + side panel ── */}
      <div className="flex flex-1 pt-12 min-h-0">

        {/* Video area */}
        <div className={`flex-1 flex items-center justify-center transition-all duration-300 ${panelOpen ? "sm:pr-80" : ""}`}>
          {loading ? (
            <div className="text-center">
              <Loader2 size={40} className="text-cyan-400 mx-auto mb-3 animate-spin" />
              <p className="text-gray-400 text-sm">Loading stream…</p>
            </div>
          ) : error ? (
            <div className="text-center max-w-md mx-auto px-4">
              <AlertTriangle size={40} className="text-yellow-500 mx-auto mb-4" />
              <h2 className="text-white font-bold text-xl mb-2">Streaming Unavailable</h2>
              <p className="text-gray-400 text-sm mb-6">{error}</p>
              <Link href={`/detail/${subjectId}`}>
                <button className="neon-btn px-6 py-2.5 rounded-lg font-medium">Back to Details</button>
              </Link>
            </div>
          ) : streamUrl ? (
            <div className="w-full max-w-6xl">
              <VideoPlayer
                src={streamUrl}
                subjectId={subjectId}
                subjectType={subject?.subjectType ?? 1}
                title={displayTitle}
                coverUrl={coverUrl}
                currentResolution={`${resolution}p` as "480p" | "720p" | "1080p"}
                onResolutionChange={handleResolutionChange}
                onEnded={isSeries && hasNext ? goNext : undefined}
              />
            </div>
          ) : null}
        </div>

        {/* ── Episode side panel ── */}
        {isSeries && episodeData && panelOpen && (
          <div className="fixed sm:absolute right-0 top-12 bottom-0 w-full sm:w-80 glass border-l border-white/10 flex flex-col z-30 overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Tv size={15} className="text-cyan-400" />
                <span className="text-white font-semibold text-sm">Episodes</span>
                <span className="text-gray-500 text-xs">· S{currentSeason} E{currentEpisode}</span>
              </div>
              <button onClick={() => setPanelOpen(false)} className="text-gray-500 hover:text-white p-1 rounded transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Season selector */}
            {allSeasons.length > 1 && (
              <div className="px-3 pt-3 pb-2 flex-shrink-0">
                {allSeasons.length <= 8 ? (
                  <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {allSeasons.map(s => (
                      <button
                        key={s.season}
                        onClick={() => setPanelSeason(s.season)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          panelSeason === s.season
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "text-gray-500 hover:text-white border border-white/10 hover:border-white/20"
                        }`}
                      >
                        S{s.season} <span className="text-[10px] opacity-60">{s.episodes.length}ep</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <select
                    value={panelSeason}
                    onChange={e => setPanelSeason(Number(e.target.value))}
                    className="w-full bg-white/10 border border-white/15 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
                    style={{ background: "#0d1426" }}
                  >
                    {allSeasons.map(s => (
                      <option key={s.season} value={s.season} style={{ background: "#0a0f1f" }}>
                        Season {s.season} ({s.episodes.length} episodes)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Episode list */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {panelEpisodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <Tv size={20} className="text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">Coming Soon</p>
                  <p className="text-gray-700 text-xs mt-0.5">No episodes for this season yet</p>
                </div>
              ) : panelEpisodes.map(ep => {
                const isPlaying = panelSeason === currentSeason && ep.episode === currentEpisode;
                return (
                  <button
                    key={ep.episode}
                    ref={isPlaying ? activeEpRef : null}
                    onClick={() => goToEpisode(panelSeason, ep.episode)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group ${
                      isPlaying
                        ? "bg-cyan-500/10 border-l-2 border-cyan-400"
                        : "hover:bg-white/5 border-l-2 border-transparent"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-14 h-10 rounded-md overflow-hidden relative bg-gray-800">
                      {coverUrl ? (
                        <img src={coverUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {isPlaying ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/20">
                          <Play size={12} fill="currentColor" className="text-cyan-400" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play size={12} fill="white" className="text-white" />
                        </div>
                      )}
                      <span className="absolute bottom-0.5 left-1 text-[9px] text-gray-300 font-bold">E{ep.episode}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isPlaying ? "text-cyan-400" : "text-gray-200 group-hover:text-white"}`}>
                        {ep.title || `Episode ${ep.episode}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-gray-600 text-[10px]">S{panelSeason} · E{ep.episode}</p>
                        {ep.duration && (
                          <span className="flex items-center gap-0.5 text-[10px] text-gray-600">
                            <Clock size={8} /> {ep.duration}
                          </span>
                        )}
                        {isPlaying && loading && <Loader2 size={9} className="animate-spin text-cyan-400" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Panel footer — Prev / Next */}
            <div className="flex gap-2 px-4 py-3 border-t border-white/10 flex-shrink-0">
              <button
                onClick={goPrev}
                disabled={!hasPrev}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={goNext}
                disabled={!hasNext}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom bar (always visible for series) ── */}
      {isSeries && episodeData && (
        <div className="glass border-t border-white/5 z-10 flex-shrink-0">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
            {/* Prev */}
            <button
              onClick={goPrev}
              disabled={!hasPrev}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              <ChevronLeft size={13} /> Prev
            </button>

            {/* Season pills */}
            <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {allSeasons.map(s => (
                <button
                  key={s.season}
                  onClick={() => goToEpisode(s.season, 1)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    currentSeason === s.season
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-gray-600 hover:text-white border border-transparent hover:border-white/10"
                  }`}
                >
                  S{s.season}
                </button>
              ))}
            </div>

            {/* Current info */}
            <div className="flex items-center gap-1.5 text-xs text-white font-medium flex-shrink-0 ml-auto">
              <Tv size={12} className="text-cyan-400" />
              <span>S{currentSeason} E{currentEpisode}</span>
              {currentEpisodeData?.duration && (
                <span className="flex items-center gap-0.5 text-gray-500 ml-1">
                  <Clock size={10} /> {currentEpisodeData.duration}
                </span>
              )}
              {loading && <Loader2 size={11} className="animate-spin text-cyan-400 ml-1" />}
            </div>

            {/* Toggle panel */}
            <button
              onClick={() => setPanelOpen(o => !o)}
              className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                panelOpen
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                  : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              }`}
            >
              <List size={13} />
              <span className="hidden sm:inline">All Episodes</span>
            </button>

            {/* Next */}
            <button
              onClick={goNext}
              disabled={!hasNext}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>

          {/* Episode number strip for current season */}
          {allEpisodes.length > 0 && (
            <div className="max-w-6xl mx-auto px-4 pb-2">
              <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {allEpisodes.map(ep => (
                  <button
                    key={ep.episode}
                    onClick={() => goToEpisode(currentSeason, ep.episode)}
                    title={ep.title || `Episode ${ep.episode}`}
                    className={`flex-shrink-0 w-9 h-9 rounded-lg border text-xs font-bold transition-all ${
                      currentEpisode === ep.episode
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_8px_rgba(0,243,255,0.2)]"
                        : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {ep.episode}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
