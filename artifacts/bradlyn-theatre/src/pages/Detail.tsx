import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Play, Plus, Check, Share2, Twitter, Facebook, ExternalLink, Star, Clock, Calendar, Globe, Tv, ChevronDown, ChevronUp, List } from "lucide-react";
import { Carousel } from "@/components/Carousel";
import { StarRating } from "@/components/StarRating";
import { type Subject, type Staff, externalFetch, apiPost, apiDelete, apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

type Episode = { episode: number; title: string };
type Season = { season: number; episodes: Episode[] };
type EpisodeData = { seasons: Season[] };

export default function Detail() {
  const [, params] = useRoute("/detail/:id");
  const subjectId = params?.id ?? "";
  const [subject, setSubject] = useState<(Subject & { stars?: Staff[]; totalSeasons?: number; totalEpisodes?: number }) | null>(null);
  const [richDetail, setRichDetail] = useState<Subject | null>(null);
  const [recommendations, setRecommendations] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [inList, setInList] = useState(false);

  // Series episode/season state
  const [episodeData, setEpisodeData] = useState<EpisodeData | null>(null);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [showEpisodes, setShowEpisodes] = useState(false);

  const [showTrailer, setShowTrailer] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    setSubject(null);
    setShowTrailer(false);
    setEpisodeData(null);
    setShowEpisodes(false);
    setSelectedSeason(1);
    Promise.all([
      externalFetch("detail", { subjectId }),
      externalFetch("rich-detail", { subjectId }),
      externalFetch("recommend", { subjectId, page: 1, perPage: 20 }),
    ]).then(([det, rich, rec]) => {
      const d = det as { data: { subject: Subject & { stars: Staff[]; totalSeasons?: number; totalEpisodes?: number } } };
      const r = rich as { data: Subject & { trailerUrl?: string } };
      const rec2 = rec as { data: { items: Subject[] } };
      setSubject(d.data?.subject ?? null);
      setRichDetail(r.data ?? null);
      setRecommendations(rec2.data?.items ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [subjectId]);

  useEffect(() => {
    if (!user || !subjectId) return;
    apiGet(`user/watchlist/${subjectId}`)
      .then(r => r.json())
      .then((d: { inWatchlist: boolean }) => setInList(d.inWatchlist))
      .catch(() => {});
  }, [user, subjectId]);

  const loadEpisodes = async () => {
    if (episodeData) { setShowEpisodes(e => !e); return; }
    setEpisodesLoading(true);
    try {
      const res = await apiGet(`proxy/episodes/${subjectId}?title=${encodeURIComponent(subject?.title ?? "")}`);
      const data: EpisodeData = await res.json();
      setEpisodeData(data);
      setShowEpisodes(true);
    } catch {
      toast("Could not load episode list", "warning");
    } finally {
      setEpisodesLoading(false);
    }
  };

  const toggleList = async () => {
    if (!user) { toast("Please login", "warning"); return; }
    if (inList) {
      await apiDelete(`user/watchlist/${subjectId}`);
      setInList(false);
      toast("Removed from My List", "info");
    } else {
      await apiPost("user/watchlist", {
        subjectId,
        subjectType: subject?.subjectType,
        title: subject?.title,
        coverUrl: subject?.cover?.url ?? "",
        genre: subject?.genre ?? "",
        releaseDate: subject?.releaseDate ?? "",
        imdbRating: subject?.imdbRatingValue ?? "",
      });
      setInList(true);
      toast("Added to My List!", "success");
    }
  };

  const share = (platform: string) => {
    const url = window.location.href;
    const text = encodeURIComponent(`Watch "${subject?.title}" on Bradlyn's Theatre`);
    if (platform === "copy") { navigator.clipboard.writeText(url); toast("Link copied!", "success"); }
    else if (platform === "twitter") window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, "_blank");
    else if (platform === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
  };

  const trailerUrl = richDetail?.trailerUrl ?? (subject?.trailer as { videoAddress?: { url?: string } } | null)?.videoAddress?.url;
  const isSeries = subject?.subjectType === 2;
  const currentSeasonData = episodeData?.seasons.find(s => s.season === selectedSeason);

  if (loading) {
    return (
      <div className="pt-20 max-w-5xl mx-auto px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-white/5 rounded-xl" />
          <div className="h-8 bg-white/5 rounded w-1/2" />
          <div className="h-4 bg-white/5 rounded w-full" />
          <div className="h-4 bg-white/5 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!subject) return <div className="pt-20 px-4 text-center text-gray-400">Title not found</div>;

  const bgImg = subject.stills?.url ?? subject.cover?.url ?? "";
  const genres = (subject.genre ?? "").split(",");

  return (
    <div className="pt-14 pb-12">
      <div className="relative w-full h-72 overflow-hidden">
        {bgImg ? (
          <img src={bgImg} alt={subject.title} className="w-full h-full object-cover" />
        ) : <div className="w-full h-full bg-gray-900" />}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0a0f1f 40%, rgba(10,15,31,0.3) 100%)" }} />
        {trailerUrl && showTrailer && (
          <div className="absolute inset-0 z-10">
            <video src={trailerUrl} autoPlay controls className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-24 relative z-10">
        <div className="flex gap-6 items-end mb-6">
          <div className="flex-shrink-0 w-32 rounded-lg overflow-hidden shadow-2xl border border-white/10">
            {subject.cover?.url ? (
              <img src={subject.cover.url} alt={subject.title} className="w-full" style={{ aspectRatio: "2/3", objectFit: "cover" }} />
            ) : <div className="w-full bg-gray-800" style={{ aspectRatio: "2/3" }} />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white mb-1">{subject.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-2">
              {subject.releaseDate && <span className="flex items-center gap-1"><Calendar size={13} /> {subject.releaseDate.slice(0, 4)}</span>}
              {isSeries && subject.totalSeasons && <span className="flex items-center gap-1"><Tv size={13} /> {subject.totalSeasons} Season{subject.totalSeasons > 1 ? "s" : ""}</span>}
              {isSeries && subject.totalEpisodes && <span className="flex items-center gap-1"><List size={13} /> {subject.totalEpisodes} Episodes</span>}
              {subject.duration && !isSeries && <span className="flex items-center gap-1"><Clock size={13} /> {Math.floor(subject.duration / 60)}m</span>}
              {subject.countryName && <span className="flex items-center gap-1"><Globe size={13} /> {subject.countryName}</span>}
              {subject.imdbRatingValue && Number(subject.imdbRatingValue) > 0 && (
                <span className="flex items-center gap-1 text-yellow-400 font-medium"><Star size={13} fill="currentColor" /> {subject.imdbRatingValue}/10</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {genres.filter(Boolean).map(g => (
                <span key={g} className="text-xs px-2 py-0.5 rounded-full border border-white/15 text-gray-300">{g.trim()}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link href={`/watch/${subjectId}`}>
            <button className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-colors">
              <Play size={16} fill="black" /> {isSeries ? "Play S1 E1" : "Watch Now"}
            </button>
          </Link>
          {trailerUrl && (
            <button onClick={() => setShowTrailer(t => !t)} className="flex items-center gap-2 neon-btn px-5 py-2.5 rounded-lg font-medium text-sm">
              <Play size={14} /> {showTrailer ? "Hide Trailer" : "Play Trailer"}
            </button>
          )}
          <button onClick={toggleList} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg text-sm">
            {inList ? <Check size={16} className="text-cyan-400" /> : <Plus size={16} />}
            {inList ? "In My List" : "My List"}
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => share("copy")} className="p-2.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg" title="Copy link"><ExternalLink size={16} /></button>
            <button onClick={() => share("twitter")} className="p-2.5 bg-white/10 hover:bg-white/20 text-blue-400 rounded-lg" title="Share on X"><Twitter size={16} /></button>
            <button onClick={() => share("facebook")} className="p-2.5 bg-white/10 hover:bg-white/20 text-blue-600 rounded-lg" title="Share on Facebook"><Facebook size={16} /></button>
          </div>
        </div>

        {subject.description && (
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2">Synopsis</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{subject.description}</p>
          </div>
        )}

        {/* ── Series: Seasons & Episodes ── */}
        {isSeries && (
          <div className="mb-6">
            <button
              onClick={loadEpisodes}
              disabled={episodesLoading}
              className="flex items-center gap-2 neon-btn px-5 py-2.5 rounded-lg font-medium text-sm mb-4 w-full sm:w-auto"
            >
              <Tv size={15} />
              {episodesLoading ? "Loading episodes…" : showEpisodes ? "Hide Episodes" : "Browse Episodes"}
              {!episodesLoading && (showEpisodes ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
            </button>

            {showEpisodes && episodeData && (
              <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                {/* Season tabs */}
                <div className="flex gap-1 p-3 border-b border-white/10 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {episodeData.seasons.map(s => (
                    <button
                      key={s.season}
                      onClick={() => setSelectedSeason(s.season)}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedSeason === s.season
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      Season {s.season}
                    </button>
                  ))}
                </div>

                {/* Episode list */}
                <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                  {currentSeasonData?.episodes.map(ep => (
                    <Link key={ep.episode} href={`/watch/${subjectId}?season=${selectedSeason}&episode=${ep.episode}`}>
                      <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors group text-left">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 text-sm font-bold group-hover:border-cyan-500/30 group-hover:text-cyan-400 transition-colors flex-shrink-0">
                          {ep.episode}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">
                            {ep.title || `Episode ${ep.episode}`}
                          </p>
                          <p className="text-gray-500 text-xs">S{selectedSeason} · E{ep.episode}</p>
                        </div>
                        <Play size={14} className="text-gray-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {richDetail?.dubs && richDetail.dubs.length > 1 && (
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2">Available Versions</h3>
            <div className="flex flex-wrap gap-2">
              {richDetail.dubs.map((dub) => (
                <Link key={dub.subjectId} href={`/detail/${dub.subjectId}`}>
                  <span className={`text-xs px-3 py-1.5 rounded-full cursor-pointer ${dub.subjectId === subjectId ? "neon-border text-cyan-400" : "border border-white/15 text-gray-300 hover:border-white/30"}`}>
                    {dub.lanName}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-white font-semibold mb-2">Your Rating</h3>
          <StarRating subjectId={subjectId} />
        </div>

        {subject.stars && subject.stars.length > 0 && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-3">Cast</h3>
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {subject.stars.slice(0, 12).map(s => (
                <Link key={s.staffId} href={`/staff/${s.staffId}`}>
                  <div className="flex-shrink-0 w-20 cursor-pointer group text-center">
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt={s.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-1 border-2 border-white/10 group-hover:border-cyan-500/50 transition-colors" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-700 mx-auto mb-1 flex items-center justify-center text-gray-400 text-lg">{s.name[0]}</div>
                    )}
                    <p className="text-white text-xs font-medium truncate">{s.name}</p>
                    {s.character && <p className="text-gray-500 text-xs truncate">{s.character}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {recommendations.length > 0 && (
          <Carousel title="More Like This" subjects={recommendations} />
        )}
      </div>
    </div>
  );
}
