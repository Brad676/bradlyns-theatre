import { useState, useEffect, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, AlertTriangle, ChevronLeft, ChevronRight, Tv, Loader2 } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { externalFetch, apiGet, getStreamUrl } from "@/lib/api";
import { type Subject } from "@/lib/api";

type Episode = { episode: number; title: string };
type Season = { season: number; episodes: Episode[] };
type EpisodeData = { seasons: Season[] };

export default function Watch() {
  const [, params] = useRoute("/watch/:id");
  const [location] = useLocation();
  const subjectId = params?.id ?? "";

  const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
  const seasonParam = parseInt(searchParams.get("season") ?? "1", 10) || 1;
  const episodeParam = parseInt(searchParams.get("episode") ?? "1", 10) || 1;

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<"480" | "720" | "1080">("720");
  const [episodeData, setEpisodeData] = useState<EpisodeData | null>(null);
  const [currentSeason, setCurrentSeason] = useState(seasonParam);
  const [currentEpisode, setCurrentEpisode] = useState(episodeParam);
  const [, navigate] = useLocation();

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
        const s = data.data?.subject ?? null;
        setSubject(s);
        const isSer = s?.subjectType === 2;
        if (isSer) {
          apiGet(`proxy/episodes/${subjectId}?title=${encodeURIComponent(s?.title ?? "")}`)
            .then(r => r.json())
            .then((raw: unknown) => {
              // Normalize: handle both { seasons: [] } and { data: { seasons: [] } } shapes
              const r2 = raw as { seasons?: Season[]; data?: { seasons?: Season[] } };
              const normalized: EpisodeData = { seasons: r2.seasons ?? r2.data?.seasons ?? [] };
              setEpisodeData(normalized);
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

  useEffect(() => {
    setCurrentSeason(seasonParam);
    setCurrentEpisode(episodeParam);
    if (subjectId && subject) {
      const isSer = subject.subjectType === 2;
      resolveStream(subjectId, isSer ? seasonParam : undefined, isSer ? episodeParam : undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonParam, episodeParam]);

  const goToEpisode = (season: number, episode: number) => {
    setCurrentSeason(season);
    setCurrentEpisode(episode);
    navigate(`/watch/${subjectId}?season=${season}&episode=${episode}`);
  };

  const allSeasons = episodeData?.seasons ?? [];
  const currentSeasonData = allSeasons.find(s => s.season === currentSeason);
  const allEpisodes = currentSeasonData?.episodes ?? [];
  const currentEpisodeData = allEpisodes.find(e => e.episode === currentEpisode);
  const totalEpisodesInSeason = allEpisodes.length;
  const hasPrev = currentEpisode > 1 || currentSeason > 1;
  const hasNext = currentEpisode < totalEpisodesInSeason || currentSeason < allSeasons.length;

  const displayTitle = isSeries
    ? `${subject?.title ?? ""} — S${currentSeason}:E${currentEpisode}${currentEpisodeData?.title ? ` · ${currentEpisodeData.title}` : ""}`
    : subject?.title;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 glass absolute top-0 left-0 right-0 z-10">
        <Link href={subject ? `/detail/${subjectId}` : "/"}>
          <button className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-sm transition-colors">
            <ArrowLeft size={18} />
            <span className="hidden sm:inline truncate max-w-[160px]">{subject?.title ?? "Back"}</span>
          </button>
        </Link>
        {displayTitle && (
          <p className="text-white text-sm font-medium truncate flex-1 text-center">{displayTitle}</p>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center pt-12">
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
              coverUrl={subject?.cover?.url}
              currentResolution={`${resolution}p` as "480p" | "720p" | "1080p"}
              onResolutionChange={handleResolutionChange}
              onEnded={isSeries && hasNext ? () => goToEpisode(currentSeason, currentEpisode + 1) : undefined}
            />
          </div>
        ) : null}
      </div>

      {isSeries && episodeData && (
        <div className="glass border-t border-white/5">
          {/* Season tabs + Prev/Next */}
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                if (currentEpisode > 1) {
                  goToEpisode(currentSeason, currentEpisode - 1);
                } else if (currentSeason > 1) {
                  const prevSeason = allSeasons.find(s => s.season === currentSeason - 1);
                  const lastEp = prevSeason?.episodes.at(-1)?.episode ?? 1;
                  goToEpisode(currentSeason - 1, lastEp);
                }
              }}
              disabled={!hasPrev}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              <ChevronLeft size={14} /> Prev
            </button>

            {/* Season selector */}
            <div className="flex gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
              {allSeasons.map(s => (
                <button
                  key={s.season}
                  onClick={() => goToEpisode(s.season, 1)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentSeason === s.season
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-gray-500 hover:text-white border border-transparent hover:border-white/10"
                  }`}
                >
                  Season {s.season}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-sm text-white font-medium flex-shrink-0">
              <Tv size={14} className="text-cyan-400" />
              S{currentSeason} · E{currentEpisode}
              {loading && <Loader2 size={13} className="animate-spin text-cyan-400 ml-1" />}
            </div>

            <button
              onClick={() => {
                if (currentEpisode < totalEpisodesInSeason) {
                  goToEpisode(currentSeason, currentEpisode + 1);
                } else {
                  const nextSeasonData = allSeasons.find(s => s.season === currentSeason + 1);
                  if (nextSeasonData) goToEpisode(currentSeason + 1, 1);
                }
              }}
              disabled={!hasNext}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>

          {/* Episode grid for current season */}
          <div className="max-w-6xl mx-auto px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {allEpisodes.map(ep => (
                <button
                  key={ep.episode}
                  onClick={() => goToEpisode(currentSeason, ep.episode)}
                  title={ep.title || `Episode ${ep.episode}`}
                  className={`flex-shrink-0 w-10 h-10 rounded-lg border text-xs font-bold transition-all ${
                    currentEpisode === ep.episode
                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_8px_rgba(0,243,255,0.2)]"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  {ep.episode}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
