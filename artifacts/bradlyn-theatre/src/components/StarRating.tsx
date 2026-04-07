import { useState } from "react";
import { Star } from "lucide-react";
import { apiPost, apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useEffect } from "react";

type Props = { subjectId: string };

export function StarRating({ subjectId }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    apiGet(`user/ratings/${subjectId}`)
      .then(r => r.json())
      .then((d: { rating: number | null }) => setRating(d.rating))
      .catch(() => {});
  }, [user, subjectId]);

  const rate = async (val: number) => {
    if (!user) { toast("Please login to rate", "warning"); return; }
    await apiPost("user/ratings", { subjectId, rating: val });
    setRating(val);
    toast("Rating saved!", "success");
  };

  const display = hover ?? rating ?? 0;

  return (
    <div className="star-rating flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} className="star" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => rate(i)}>
          <Star size={20} fill={i <= display ? "#fbbf24" : "none"} className={i <= display ? "text-yellow-400" : "text-gray-600"} />
        </button>
      ))}
      {rating && <span className="text-gray-400 text-sm ml-1">{rating}/5</span>}
    </div>
  );
}
