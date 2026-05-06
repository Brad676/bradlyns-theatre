import { useRef, useEffect, useState, useCallback, memo } from "react";
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

function CarouselComponent({ title, subjects, loading, onLoadMore, hasMore, onSendToRoom }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const autoScrollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef<number | null>(null);

  const updateButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // Use RAF to batch DOM reads and prevent layout thrashing
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // Use passive scroll listener for better performance
    el.addEventListener("scroll", updateButtons, { passive: true });
    updateButtons();
    return () => {
      el.removeEventListener("scroll", updateButtons);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [subjects, updateButtons]);

  // Auto-scroll with setTimeout (more efficient than setInterval for pausing)
  useEffect(() => {
    if (paused || subjects.length === 0) return;
    
    const scheduleScroll = () => {
      autoScrollRef.current = setTimeout(() => {
        const el = trackRef.current;
        if (!el) return;
        requestAnimationFrame(() => {
          if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 5) {
            el.scrollLeft = 0;
          } else {
            el.scrollBy({ left: 200, behavior: "smooth" });
          }
        });
        scheduleScroll();
      }, 3500);
    };
    
    scheduleScroll();
    return () => { if (autoScrollRef.current) clearTimeout(autoScrollRef.current); };
  }, [paused, subjects.length]);

  // Infinite scroll load more with IntersectionObserver (more efficient than scroll events)
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !onLoadMore || !hasMore) return;
    
    // Create a sentinel element at the end
    let observer: IntersectionObserver | null = null;
    const lastCard = el.lastElementChild;
    
    if (lastCard) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            onLoadMore();
          }
        },
        { root: el, rootMargin: "0px 200px 0px 0px", threshold: 0 }
      );
      observer.observe(lastCard);
    }
    
    return () => observer?.disconnect();
  }, [onLoadMore, hasMore, subjects.length]);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  }, []);

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

// Memoize to prevent unnecessary re-renders when parent state changes
export const Carousel = memo(CarouselComponent, (prev, next) => {
  return prev.title === next.title &&
         prev.subjects === next.subjects &&
         prev.loading === next.loading &&
         prev.hasMore === next.hasMore &&
         prev.onLoadMore === next.onLoadMore &&
         prev.onSendToRoom === next.onSendToRoom;
});
