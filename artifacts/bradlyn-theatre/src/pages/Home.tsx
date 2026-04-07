import { useState, useEffect } from "react";
import { HeroSection } from "@/components/HeroSection";
import { Carousel } from "@/components/Carousel";
import { type Subject, externalFetch, apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function Home() {
  const [trending, setTrending] = useState<Subject[]>([]);
  const [hot, setHot] = useState<Subject[]>([]);
  const [recommended, setRecommended] = useState<Subject[]>([]);
  const [topMovies, setTopMovies] = useState<Subject[]>([]);
  const [continueWatching, setContinueWatching] = useState<Subject[]>([]);
  const [newReleases, setNewReleases] = useState<Subject[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingHot, setLoadingHot] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [trendingPage, setTrendingPage] = useState(1);
  const [hasMoreTrending, setHasMoreTrending] = useState(true);

  useEffect(() => {
    externalFetch("trending", { page: 1, perPage: 20 })
      .then((d: unknown) => {
        const data = d as { data: { subjectList: Subject[] } };
        setTrending(data.data?.subjectList ?? []);
        setLoadingTrending(false);
      })
      .catch(() => setLoadingTrending(false));

    externalFetch("hot")
      .then((d: unknown) => {
        const data = d as { data: { movie: Subject[]; series: Subject[] } };
        const combined = [...(data.data?.movie ?? []), ...(data.data?.series ?? [])];
        setHot(combined);
        setLoadingHot(false);
        if (combined.length > 0) {
          const seed = combined[Math.floor(Math.random() * Math.min(combined.length, 5))];
          externalFetch("recommend", { subjectId: seed.subjectId, page: 1, perPage: 20 })
            .then((r: unknown) => {
              const rd = r as { data: { items: Subject[] } };
              setRecommended(rd.data?.items ?? []);
            }).catch(() => {});
        }
      })
      .catch(() => setLoadingHot(false));

    externalFetch("ranking")
      .then((d: unknown) => {
        const data = d as { data: { subjectList: Subject[] } };
        setTopMovies(data.data?.subjectList ?? []);
      }).catch(() => {});

    externalFetch("browse", { subjectType: 1, page: 1, perPage: 20 })
      .then((d: unknown) => {
        const data = d as { data: { items: Subject[] } };
        setNewReleases((data.data?.items ?? []).filter(s => s.subjectType === 1).slice(0, 20));
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    apiGet("user/history")
      .then(r => r.json())
      .then((history: { subjectId: string; subjectType: number; title: string; coverUrl: string; timestampSec: number }[]) => {
        const subjects: Subject[] = history.map(h => ({
          subjectId: h.subjectId,
          subjectType: h.subjectType,
          title: h.title,
          cover: { url: h.coverUrl },
        }));
        setContinueWatching(subjects);
      })
      .catch(() => {});
  }, [user]);

  const loadMoreTrending = () => {
    if (!hasMoreTrending) return;
    const nextPage = trendingPage + 1;
    externalFetch("trending", { page: nextPage, perPage: 20 })
      .then((d: unknown) => {
        const data = d as { data: { subjectList: Subject[]; pager?: { hasMore: boolean } } };
        const items = data.data?.subjectList ?? [];
        setTrending(prev => [...prev, ...items]);
        setTrendingPage(nextPage);
        setHasMoreTrending(items.length === 20);
      })
      .catch(() => {});
  };

  return (
    <div className="pt-14">
      <HeroSection subjects={trending} />
      <div className="mt-8 pb-12">
        {user && continueWatching.length > 0 && (
          <Carousel title="Continue Watching" subjects={continueWatching} />
        )}
        <Carousel title="Trending Now" subjects={trending} loading={loadingTrending} onLoadMore={loadMoreTrending} hasMore={hasMoreTrending} />
        <Carousel title="Hot Right Now" subjects={hot} loading={loadingHot} />
        {topMovies.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-3 px-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full neon-glow inline-block" style={{ background: "var(--neon-magenta)" }} />
              Top 10 Today
            </h2>
            <div className="carousel-track px-4">
              {topMovies.slice(0, 10).map((s, i) => (
                <div key={s.subjectId} className="relative flex-shrink-0">
                  <span className="absolute -left-2 bottom-0 z-10 text-5xl font-black text-transparent" style={{ WebkitTextStroke: "1px rgba(0,243,255,0.5)" }}>{i + 1}</span>
                  <div className="ml-4">
                    <Carousel title="" subjects={[s]} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <Carousel title="Recommended For You" subjects={recommended} />
        <Carousel title="New Releases" subjects={newReleases} />
      </div>
    </div>
  );
}
