import { useState, useEffect, useCallback, memo } from "react";
import { Link } from "wouter";
import { Play, Info, Plus, Check, Star } from "lucide-react";
import { type Subject, externalFetch, apiPost, apiDelete } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useWatchlistStatus } from "@/hooks/useWatchlistStatus";

type Props = { subjects: Subject[] };

function HeroSectionComponent({ subjects }: Props) {
  const [current, setCurrent] = useState(0);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const subject = subjects[current];

  // Use the shared watchlist status hook with caching
  const { inList, setInList } = useWatchlistStatus(subject?.subjectId ?? "");

  useEffect(() => {
    if (subjects.length === 0) return;
    const idx = Math.floor(Math.random() * Math.min(subjects.length, 5));
    setCurrent(idx);
  }, [subjects]);

  useEffect(() => {
    if (!subject) return;
    setTrailerUrl(null);
    setImageLoaded(false);
    // Delay fetching trailer to prioritize initial render
    const timer = setTimeout(() => {
      externalFetch("rich-detail", { subjectId: subject.subjectId })
        .then((d: unknown) => {
          const data = d as { data: { trailerUrl: string } };
          if (data.data?.trailerUrl) setTrailerUrl(data.data.trailerUrl);
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [subject?.subjectId]);

  const toggleList = useCallback(async () => {
    if (!user) { toast("Please login to add to your list", "warning"); return; }
    if (!subject) return;
    if (inList) {
      await apiDelete(`user/watchlist/${subject.subjectId}`);
      setInList(false);
      toast("Removed from My List", "info");
    } else {
      await apiPost("user/watchlist", {
        subjectId: subject.subjectId,
        subjectType: subject.subjectType,
        title: subject.title,
        coverUrl: subject.cover?.url ?? "",
        genre: subject.genre ?? "",
        releaseDate: subject.releaseDate ?? "",
        imdbRating: subject.imdbRatingValue ?? "",
      });
      setInList(true);
      toast("Added to My List!", "success");
    }
  }, [user, subject, inList, toast, setInList]);

  if (!subject) {
    return <div className="w-full h-[60vh] bg-gray-900 animate-pulse" />;
  }

  const bgImage = subject.stills?.url ?? subject.cover?.url ?? "";
  const genres = (subject.genre ?? "").split(",").slice(0, 3);

  return (
    <div className="relative w-full h-[60vh] min-h-[400px] overflow-hidden">
      {trailerUrl ? (
        <video
          key={trailerUrl}
          src={trailerUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : bgImage ? (
        <img src={bgImage} alt={subject.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gray-900" />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(10,15,31,0.95) 30%, rgba(10,15,31,0.3) 70%, transparent 100%), linear-gradient(to top, rgba(10,15,31,1) 0%, transparent 50%)" }} />

      <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-20 max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          {genres.map(g => (
            <span key={g} className="text-xs px-2 py-0.5 rounded-full border border-white/20 text-gray-300">{g.trim()}</span>
          ))}
          {subject.releaseDate && <span className="text-gray-400 text-xs">{subject.releaseDate.slice(0, 4)}</span>}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{subject.title}</h1>
        {subject.imdbRatingValue && Number(subject.imdbRatingValue) > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <Star size={14} fill="gold" className="text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">{subject.imdbRatingValue}</span>
            {subject.imdbRatingCount && subject.imdbRatingCount > 0 && (
              <span className="text-gray-500 text-xs">({subject.imdbRatingCount.toLocaleString()})</span>
            )}
          </div>
        )}
        {subject.description && (
          <p className="text-gray-300 text-sm mb-4 line-clamp-3">{subject.description}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/watch/${subject.subjectId}`}>
            <button className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-sm">
              <Play size={16} fill="black" /> Watch Now
            </button>
          </Link>
          <Link href={`/detail/${subject.subjectId}`}>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm">
              <Info size={16} /> More Info
            </button>
          </Link>
          <button onClick={toggleList} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg transition-colors text-sm">
            {inList ? <Check size={16} className="text-cyan-400" /> : <Plus size={16} />}
            {inList ? "In List" : "My List"}
          </button>
        </div>
      </div>

      {subjects.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-1.5">
          {subjects.slice(0, 5).map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${i === current ? "w-6" : "bg-white/30 hover:bg-white/50"}`} style={i === current ? { background: "var(--neon-cyan)" } : {}} />
          ))}
        </div>
      )}
    </div>
  );
}

// Memoize to prevent re-renders when subjects array reference changes but content is same
export const HeroSection = memo(HeroSectionComponent, (prev, next) => {
  if (prev.subjects.length !== next.subjects.length) return false;
  return prev.subjects.every((s, i) => s.subjectId === next.subjects[i]?.subjectId);
});
