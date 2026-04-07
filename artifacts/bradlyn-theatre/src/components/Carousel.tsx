import { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "./Card";
import { type Subject } from "@/lib/api";

type Props = {
  title: string;
  subjects: Subject[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onSendToRoom?: (subject: Subject) => void;
};

export function Carousel({ title, subjects, loading, onLoadMore, hasMore, onSendToRoom }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [paused, setPaused] = useState(false);

  const updateButtons = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateButtons);
    updateButtons();
    return () => el.removeEventListener("scroll", updateButtons);
  }, [subjects]);

  useEffect(() => {
    if (paused) return;
    autoScrollRef.current = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 5) {
        el.scrollLeft = 0;
      } else {
        el.scrollLeft += 200;
      }
    }, 3500);
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [paused, subjects]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !onLoadMore || !hasMore) return;
    const onScroll = () => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 200) {
        onLoadMore();
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [onLoadMore, hasMore]);

  const scroll = (dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  if (!loading && subjects.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3 px-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full neon-glow inline-block" style={{ background: "var(--neon-cyan)" }} />
        {title}
      </h2>
      <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full glass flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            style={{ top: "40%" }}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div ref={trackRef} className="carousel-track px-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[160px] rounded-lg bg-white/5 animate-pulse" style={{ aspectRatio: "2/3" }} />
            ))
          ) : (
            subjects.map(s => (
              <Card key={s.subjectId} subject={s} onSendToRoom={onSendToRoom} />
            ))
          )}
        </div>
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full glass flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            style={{ top: "40%" }}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </section>
  );
}
