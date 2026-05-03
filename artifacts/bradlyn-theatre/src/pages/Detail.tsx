import { useState, useEffect } from "react";
import { useRoute, Link, useLocation, useSearch } from "wouter";
import {
  Play, Plus, Check, Twitter, Facebook, ExternalLink,
  Star, Clock, Calendar, Globe, Tv, Loader2,
} from "lucide-react";
import { Carousel } from "@/components/Carousel";
import { StarRating } from "@/components/StarRating";
import { type Subject, type Staff, externalFetch, apiPost, apiDelete, apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

type Episode     = { episode: number; title: string; duration?: string };
type Season      = { season: number; episodes: Episode[] };
type EpisodeData = { seasons: Season[] };

export default function Detail() {
  const [, params] = useRoute("/detail/:id");
  const search     = useSearch();
  const subjectId  = params?.id ?? "";

  // Active season/episode from URL — set when user returns from the Watch page
  const urlParams     = new URLSearchParams(search);
  const activeSeason  = parseInt(urlParams.get("season")  ?? "0", 10) || 0;
  const activeEpisode = parseInt(urlParams.get("episode") ?? "0", 10) || 0;

  const [subject, setSubject]         = useState<(Subject & { stars?: Staff[]; totalSeasons?: number; totalEpisodes?: number }) | null>(null);
  const [richDetail, setRichDetail]   = useState<Subject | null>(null);
  const [recommendations, setRecommendations] = useState<Subject[]>([]);
  const [loading, setLoading]         = useState(true);
  const [inList, setInList]           = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  // Episodes — loaded automatically for series
  const [episodeData, setEpisodeData]         = useState<EpisodeData | null>(null);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [selectedSeason, setSelectedSeason]   = useState(activeSeason > 0 ? activeSeason : 1);

  const { user } = useAuth();
  const { toast } = useToast();

  // Load subject details
  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    setSubject(null);
    setShowTrailer(false);
    setEpisodeData(null);
    setSelectedSeason(activeSeason > 0 ? activeSeason : 1);

    Promise.all([
      externalFetch("detail",      { subjectId }),
      externalFetch("rich-detail", { subjectId }),
      externalFetch("recommend",   { subjectId, page: 1, perPage: 20 }),
    ]).then(([det, rich, rec]) => {
      const d    = det  as { data: { subject: Subject & { stars: Staff[]; totalSeasons?: number; totalEpisodes?: number } } };
      const r    = rich as { data: Subject & { trailerUrl?: string } };
      const rec2 = rec  as { data: { items: Subject[] } };
      const s    = d.data?.subject ?? null;
      setSubject(s);
      setRichDetail(r.data ?? null);
      setRecommendations(rec2.data?.items ?? []);

      // Auto-fetch episodes if this is a series
      if (s?.subjectType === 2) {
        setEpisodesLoading(true);
        apiGet(`proxy/episodes/${subjectId}?title=${encodeURIComponent(s.title ?? "")}`)
          .then(res => res.json())
          .then((raw: unknown) => {
            const r2 = raw as { seasons?: Season[]; data?: { seasons?: Season[] } };
            const seasons = r2.seasons ?? r2.data?.seasons ?? [];
            setEpisodeData({ seasons: Array.isArray(seasons) ? seasons : [] });
          })
          .catch(() => {
            toast("Could not load episode list", "warning");
          })
          .finally(() => setEpisodesLoading(false));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  // Watchlist status
  useEffect(() => {
    if (!user || !subjectId) return;
    apiGet(`user/watchlist/${subjectId}`)
      .then(r => r.json())
      .then((d: { inWatchlist: boolean }) => setInList(d.inWatchlist))
      .catch(() => {});
  }, [user, subjectId]);

  const toggleList = async () => {
    if (!user) { toast("Please login to use My List", "warning"); return; }
    if (inList) {
      await apiDelete(`user/watchlist/${subjectId}`);
      setInList(false);
      toast("Removed from My List", "info");
    } else {
      await apiPost("user/watchlist", {
        subjectId,
        subjectType: subject?.subjectType,
        title:       subject?.title,
        coverUrl:    subject?.cover?.url ?? "",
        genre:       subject?.genre ?? "",
        releaseDate: subject?.releaseDate ?? "",
        imdbRating:  subject?.imdbRatingValue ?? "",
      });
      setInList(true);
      toast("Added to My List!", "success");
    }
  };

  const share = (platform: string) => {
    const url  = window.location.href;
    const text = encodeURIComponent(`Watch "${subject?.title}" on Bradlyn's Theatre`);
    if (platform === "copy")          { navigator.clipboard.writeText(url); toast("Link copied!", "success"); }
    else if (platform === "twitter")  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, "_blank");
    else if (platform === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
  };

  const trailerUrl = richDetail?.trailerUrl ?? (subject?.trailer as { videoAddress?: { url?: string } } | null)?.videoAddress?.url;
  const isSeries   = subject?.subjectType === 2;
  const allSeasons = episodeData?.seasons ?? [];
  const currentSeasonData = allSeasons.find(s => s.season === selectedSeason);
  const currentEpisodes   = currentSeasonData?.episodes ?? [];
  const coverUrl          = subject?.cover?.url ?? "";

  // ── Loading skeleton ──
  if (loading) return (
    <div className="pt-20 max-w-5xl mx-auto px-4">
      <div className="animate-pulse space-y-4">
        <div className="h-64 bg-white/5 rounded-xl" />
        <div className="h-8  bg-white/5 rounded w-1/2" />
        <div className="h-4  bg-white/5 rounded w-full" />
        <div className="h-4  bg-white/5 rounded w-3/4" />
      </div>
    </div>
  );

  if (!subject) return <div className="pt-20 px-4 text-center text-gray-400">Title not found</div>;

  const bgImg  = subject.stills?.url ?? subject.cover?.url ?? "";
  const genres = (subject.genre ?? "").split(",");

  return (
    <div className="pt-14 pb-12">

      {/* ── Hero banner ── */}
      <div className="relative w-full h-72 overflow-hidden">
        {bgImg
          ? <img src={bgImg} alt={subject.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gray-900" />}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0a0f1f 40%, rgba(10,15,31,0.3) 100%)" }} />
        {trailerUrl && showTrailer && (
          <div className="absolute inset-0 z-10">
            <video src={trailerUrl} autoPlay controls className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-24 relative z-10">

        {/* ── Title block ── */}
        <div className="flex gap-6 items-end mb-6">
          <div className="flex-shrink-0 w-32 rounded-lg overflow-hidden shadow-2xl border border-white/10">
            {coverUrl
              ? <img src={coverUrl} alt={subject.title} className="w-full" style={{ aspectRatio: "2/3", objectFit: "cover" }} />
              : <div className="w-full bg-gray-800" style={{ aspectRatio: "2/3" }} />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white mb-1">{subject.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-2">
              {subject.releaseDate && <span className="flex items-center gap-1"><Calendar size={13} /> {subject.releaseDate.slice(0, 4)}</span>}
              {isSeries && subject.totalSeasons && (
                <span className="flex items-center gap-1"><Tv size={13} /> {subject.totalSeasons} Season{subject.totalSeasons > 1 ? "s" : ""}</span>
              )}
              {subject.duration && !isSeries && (
                <span className="flex items-center gap-1"><Clock size={13} /> {Math.floor(subject.duration / 60)}m</span>
              )}
              {subject.countryName && <span className="flex items-center gap-1"><Globe size={13} /> {subject.countryName}</span>}
              {subject.imdbRatingValue && Number(subject.imdbRatingValue) > 0 && (
                <span className="flex items-center gap-1 text-yellow-400 font-medium">
                  <Star size={13} fill="currentColor" /> {subject.imdbRatingValue}/10
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {genres.filter(Boolean).map(g => (
                <span key={g} className="text-xs px-2 py-0.5 rounded-full border border-white/15 text-gray-300">{g.trim()}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Action buttons ── */}
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
            <button onClick={() => share("copy")}     className="p-2.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg" title="Copy link"><ExternalLink size={16} /></button>
            <button onClick={() => share("twitter")}  className="p-2.5 bg-white/10 hover:bg-white/20 text-blue-400  rounded-lg" title="Share on X"><Twitter size={16} /></button>
            <button onClick={() => share("facebook")} className="p-2.5 bg-white/10 hover:bg-white/20 text-blue-600 rounded-lg"  title="Share on Facebook"><Facebook size={16} /></button>
          </div>
        </div>

        {subject.description && (
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2">Synopsis</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{subject.description}</p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            SEASONS & EPISODES — always visible for series
            ══════════════════════════════════════════ */}
        {isSeries && (
          <div className="mb-8">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Tv size={16} className="text-cyan-400" /> Episodes
            </h3>

            {/* ── Loading state ── */}
            {episodesLoading && (
              <div className="glass rounded-2xl border border-white/10 p-8 flex flex-col items-center gap-3">
                <Loader2 size={28} className="animate-spin text-cyan-400" />
                <p className="text-gray-400 text-sm">Loading episodes…</p>
              </div>
            )}

            {/* ── Episodes panel ── */}
            {!episodesLoading && episodeData && (
              <div className="glass rounded-2xl border border-white/10 overflow-hidden">

                {/* Season selector */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                  {allSeasons.length === 0 ? null : allSeasons.length <= 7 ? (
                    /* Tab buttons for ≤7 seasons */
                    <div className="flex gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
                      {allSeasons.map(s => (
                        <button
                          key={s.season}
                          onClick={() => setSelectedSeason(s.season)}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            selectedSeason === s.season
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                              : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          Season {s.season}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${
                            selectedSeason === s.season
                              ? "bg-cyan-400/20 text-cyan-300"
                              : "bg-white/10 text-gray-500"
                          }`}>{s.episodes.length}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* Dropdown for many seasons */
                    <select
                      value={selectedSeason}
                      onChange={e => setSelectedSeason(Number(e.target.value))}
                      className="flex-1 bg-white/10 border border-white/15 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                      style={{ background: "#0d1426" }}
                    >
                      {allSeasons.map(s => (
                        <option key={s.season} value={s.season} style={{ background: "#0a0f1f" }}>
                          Season {s.season} — {s.episodes.length} episodes
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Episode count label */}
                  {currentEpisodes.length > 0 && (
                    <span className="text-gray-600 text-xs flex-shrink-0">
                      {currentEpisodes.length} episode{currentEpisodes.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* ── Coming Soon ── */}
                {currentEpisodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                      <Tv size={24} className="text-gray-600" />
                    </div>
                    <h4 className="text-white font-semibold mb-1">Coming Soon</h4>
                    <p className="text-gray-500 text-sm max-w-xs">
                      Episodes for Season {selectedSeason} haven't been added yet. Check back later.
                    </p>
                  </div>
                ) : (
                  /* ── Episode grid ── */
                  <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {currentEpisodes.map(ep => {
                        const isActive = activeSeason === selectedSeason && activeEpisode === ep.episode;
                        return (
                          <Link
                            key={ep.episode}
                            href={`/watch/${subjectId}?season=${selectedSeason}&episode=${ep.episode}`}
                          >
                            <div className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-xl ${
                              isActive
                                ? "ring-2 ring-cyan-400 shadow-[0_0_18px_rgba(0,243,255,0.3)]"
                                : "hover:ring-1 hover:ring-white/20"
                            }`}>

                              {/* Thumbnail */}
                              <div className="relative aspect-video bg-gray-900 overflow-hidden">
                                {coverUrl ? (
                                  <img
                                    src={coverUrl}
                                    alt={ep.title}
                                    className="w-full h-full object-cover scale-110 opacity-60 group-hover:opacity-85 transition-opacity duration-200"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                                )}
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                                {/* Episode number badge — top left */}
                                <div className="absolute top-2 left-2">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                    isActive
                                      ? "bg-cyan-400 text-black"
                                      : "bg-black/70 text-gray-200 border border-white/15"
                                  }`}>
                                    E{ep.episode}
                                  </span>
                                </div>

                                {/* Duration badge — top right */}
                                {ep.duration && (
                                  <div className="absolute top-2 right-2">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/70 text-gray-400 border border-white/10 flex items-center gap-0.5">
                                      <Clock size={8} /> {ep.duration}
                                    </span>
                                  </div>
                                )}

                                {/* Play overlay on hover */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg ${
                                    isActive ? "bg-cyan-400" : "bg-white/95"
                                  }`}>
                                    <Play size={17} fill="black" className="ml-0.5" />
                                  </div>
                                </div>

                                {/* Active indicator bar at bottom */}
                                {isActive && (
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
                                )}
                              </div>

                              {/* Info row below thumbnail */}
                              <div className={`px-2.5 py-2 ${isActive ? "bg-cyan-500/10" : "bg-white/[0.03] group-hover:bg-white/[0.06]"} transition-colors`}>
                                <p className={`text-xs font-semibold truncate leading-snug ${
                                  isActive ? "text-cyan-400" : "text-gray-200 group-hover:text-white"
                                } transition-colors`}>
                                  {ep.title || `Episode ${ep.episode}`}
                                </p>
                                <p className="text-[10px] mt-0.5 text-gray-600">
                                  S{selectedSeason} · E{ep.episode}
                                  {isActive && (
                                    <span className="ml-1.5 text-cyan-500 font-semibold">▶ Playing</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Available versions (dubs) ── */}
        {richDetail?.dubs && richDetail.dubs.length > 1 && (
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2">Available Versions</h3>
            <div className="flex flex-wrap gap-2">
              {richDetail.dubs.map(dub => (
                <Link key={dub.subjectId} href={`/detail/${dub.subjectId}`}>
                  <span className={`text-xs px-3 py-1.5 rounded-full cursor-pointer ${
                    dub.subjectId === subjectId
                      ? "neon-border text-cyan-400"
                      : "border border-white/15 text-gray-300 hover:border-white/30"
                  }`}>
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
                    {s.avatarUrl
                      ? <img src={s.avatarUrl} alt={s.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-1 border-2 border-white/10 group-hover:border-cyan-500/50 transition-colors" />
                      : <div className="w-16 h-16 rounded-full bg-gray-700 mx-auto mb-1 flex items-center justify-center text-gray-400 text-lg">{s.name[0]}</div>
                    }
                    <p className="text-white text-xs font-medium truncate">{s.name}</p>
                    {s.character && <p className="text-gray-500 text-xs truncate">{s.character}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {recommendations.length > 0 && <Carousel title="More Like This" subjects={recommendations} />}
      </div>
    </div>
  );
}
