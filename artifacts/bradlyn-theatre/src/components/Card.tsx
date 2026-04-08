import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Check, Play, Star } from "lucide-react";
import { type Subject } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiPost, apiDelete, apiGet } from "@/lib/api";
import { useEffect } from "react";

type Props = {
  subject: Subject;
  rank?: number;
  onSendToRoom?: (subject: Subject) => void;
};

export function Card({ subject, rank, onSendToRoom }: Props) {
  const [inList, setInList] = useState(false);
  const [hover, setHover] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const coverUrl = subject.cover?.url ?? subject.stills?.url ?? "";
  const typeLabel = subject.subjectType === 1 ? "Movie" : subject.subjectType === 2 ? "Series" : "Video";
  const genres = (subject.genre ?? "").split(",").slice(0, 2);

  useEffect(() => {
    if (!user) return;
    apiGet(`user/watchlist/${subject.subjectId}`)
      .then(r => r.json())
      .then((d: { inWatchlist: boolean }) => setInList(d.inWatchlist))
      .catch(() => {});
  }, [user, subject.subjectId]);

  const toggleList = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast("Please login to add to your list", "warning"); return; }
    if (inList) {
      await apiDelete(`user/watchlist/${subject.subjectId}`);
      setInList(false);
      toast("Removed from My List", "info");
    } else {
      await apiPost("user/watchlist", {
        subjectId: subject.subjectId,
        subjectType: subject.subjectType,
        title: subject.title,
        coverUrl,
        genre: subject.genre ?? "",
        releaseDate: subject.releaseDate ?? "",
        imdbRating: subject.imdbRatingValue ?? "",
      });
      setInList(true);
      toast("Added to My List!", "success");
    }
  };

  return (
    <Link href={`/detail/${subject.subjectId}`}>
      <div
        className="relative cursor-pointer flex-shrink-0 w-[160px] group card-hover rounded-lg overflow-hidden"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ background: "#111827" }}
      >
        {rank && (
          <div className="absolute top-1 left-1 z-10 w-7 h-7 rounded-full bg-black/80 flex items-center justify-center text-xs font-bold neon-text">{rank}</div>
        )}
        <div className="relative w-full" style={{ aspectRatio: "2/3" }}>
          {coverUrl ? (
            <img src={coverUrl} alt={subject.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <Play size={32} className="text-gray-600" />
            </div>
          )}
          <div className={`absolute inset-0 bg-black/60 flex flex-col justify-end p-2 transition-opacity duration-200 ${hover ? "opacity-100" : "opacity-0"}`}>
              <button
                className="w-full bg-cyan-500/80 hover:bg-cyan-500 text-black font-bold py-1.5 rounded text-xs flex items-center justify-center gap-1 mb-1"
                onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/watch/${subject.subjectId}`); }}
              >
                <Play size={12} /> Watch
              </button>
            <button
              onClick={toggleList}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-1.5 rounded text-xs flex items-center justify-center gap-1 mb-1"
            >
              {inList ? <Check size={12} /> : <Plus size={12} />}
              {inList ? "In List" : "My List"}
            </button>
            {onSendToRoom && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onSendToRoom(subject); }}
                className="w-full bg-purple-500/30 hover:bg-purple-500/50 text-purple-300 py-1.5 rounded text-xs flex items-center justify-center gap-1"
              >
                Send to Room
              </button>
            )}
          </div>
        </div>
        <div className="p-2">
          <p className="text-white text-xs font-medium truncate">{subject.title}</p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span className="text-gray-500 text-xs">{typeLabel}</span>
            {subject.imdbRatingValue && Number(subject.imdbRatingValue) > 0 && (
              <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
                <Star size={9} fill="currentColor" /> {subject.imdbRatingValue}
              </span>
            )}
          </div>
          {genres.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {genres.map(g => (
                <span key={g} className="text-gray-500 text-xs">{g.trim()}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
