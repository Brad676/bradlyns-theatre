import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";
import { Card } from "@/components/Card";
import { type Subject, externalFetch } from "@/lib/api";
import { useLocation } from "wouter";

const GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi", "Thriller", "Mystery", "Family", "Biography", "History", "Music", "Sport"];
const COUNTRIES = ["United States", "United Kingdom", "South Korea", "France", "Germany", "Japan", "Nigeria", "India", "China", "Italy", "Spain", "Mexico", "Brazil", "Canada", "Australia"];

const SECTION_LABELS: Record<string, string> = {
  trending: "Trending Now",
  hot: "Hot Right Now",
  local: "Local Shows",
  movie: "Movies",
  series: "Series",
  comedy: "Comedy",
  music: "Music",
};

export default function Browse() {
  const [location] = useLocation();
  const qp = new URLSearchParams(location.split("?")[1] ?? "");

  // Read initial state from URL params (set by sidebar)
  const initType = qp.get("type") === "movie" ? 1 : qp.get("type") === "series" ? 2 : 0;
  const initGenre = qp.get("genre") ?? "";
  const initSort = qp.get("sort") ?? "";
  const initRegion = qp.get("region") ?? "";

  const [results, setResults] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState(initGenre);
  const [selectedCountry, setSelectedCountry] = useState(initRegion === "local" ? "Nigeria" : "");
  const [selectedType, setSelectedType] = useState<0 | 1 | 2>(initType as 0 | 1 | 2);
  const [sortMode, setSortMode] = useState(initSort);
  const [genreOpen, setGenreOpen] = useState(true);
  const [countryOpen, setCountryOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Determine page section heading
  const sectionKey = initSort || initRegion || (initGenre ? initGenre.toLowerCase() : "") || (initType === 1 ? "movie" : initType === 2 ? "series" : "");
  const pageTitle = SECTION_LABELS[sectionKey] ?? "Browse";

  const fetchResults = async (
    pg: number,
    append = false,
    genre = selectedGenre,
    country = selectedCountry,
    type = selectedType,
    sort = sortMode,
  ) => {
    setLoading(true);
    const params: Record<string, string | number> = { page: pg, perPage: 24 };
    if (type > 0) params.subjectType = type;
    if (genre) params.genre = genre;
    if (country) params.countryName = country;

    let endpoint = "browse";
    if (sort === "trending") endpoint = "trending";
    else if (sort === "hot") endpoint = "hot";

    try {
      const data = await externalFetch(endpoint, params) as {
        data: { items?: Subject[]; subjectList?: Subject[]; movie?: Subject[]; series?: Subject[]; pager?: { hasMore: boolean } }
      };
      const raw = data.data?.items
        ?? data.data?.subjectList
        ?? [...(data.data?.movie ?? []), ...(data.data?.series ?? [])];
      const items = genre === "Music" ? raw : raw.filter((s: Subject) => s.subjectType === 1 || s.subjectType === 2);
      if (append) setResults(prev => [...prev, ...items]);
      else setResults(items);
      setHasMore(data.data?.pager?.hasMore ?? items.length === 24);
      setPage(pg);
    } catch {
      if (!append) setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setResults([]);
    setPage(1);
    fetchResults(1, false, initGenre, initRegion === "local" ? "Nigeria" : "", initType as 0 | 1 | 2, initSort);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const applyFilter = (genre = selectedGenre, country = selectedCountry, type = selectedType) => {
    setResults([]);
    setSortMode("");
    fetchResults(1, false, genre, country, type, "");
    setSidebarOpen(false);
  };

  useEffect(() => {
    if (!observerRef.current || !hasMore) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        fetchResults(page + 1, true);
      }
    });
    obs.observe(observerRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, page]);

  const FilterSidebar = () => (
    <aside className="w-56 flex-shrink-0 space-y-4">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Type</p>
        {([{ label: "All", value: 0 }, { label: "Movies", value: 1 }, { label: "Series", value: 2 }] as { label: string; value: 0 | 1 | 2 }[]).map(t => (
          <button key={t.value} onClick={() => { setSelectedType(t.value); applyFilter(selectedGenre, selectedCountry, t.value); }}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${selectedType === t.value && !sortMode ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white hover:bg-white/10"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Sort</p>
        {[{ label: "Default", value: "" }, { label: "Trending", value: "trending" }, { label: "Hot", value: "hot" }].map(s => (
          <button key={s.value} onClick={() => { setSortMode(s.value); fetchResults(1, false, selectedGenre, selectedCountry, selectedType, s.value); setSidebarOpen(false); }}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${sortMode === s.value ? "bg-purple-500/20 text-purple-400" : "text-gray-400 hover:text-white hover:bg-white/10"}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div>
        <button onClick={() => setGenreOpen(o => !o)} className="flex items-center justify-between w-full text-sm font-medium text-gray-300 mb-2">
          Genre {genreOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {genreOpen && (
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            <button onClick={() => { setSelectedGenre(""); applyFilter(""); }} className={`block w-full text-left px-3 py-1.5 rounded text-sm ${!selectedGenre ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-white"}`}>All Genres</button>
            {GENRES.map(g => (
              <button key={g} onClick={() => { setSelectedGenre(g); applyFilter(g); }} className={`block w-full text-left px-3 py-1.5 rounded text-sm ${selectedGenre === g ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-white"}`}>{g}</button>
            ))}
          </div>
        )}
      </div>

      <div>
        <button onClick={() => setCountryOpen(o => !o)} className="flex items-center justify-between w-full text-sm font-medium text-gray-300 mb-2">
          Country {countryOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {countryOpen && (
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            <button onClick={() => { setSelectedCountry(""); applyFilter(selectedGenre, ""); }} className={`block w-full text-left px-3 py-1.5 rounded text-sm ${!selectedCountry ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-white"}`}>All Countries</button>
            {COUNTRIES.map(c => (
              <button key={c} onClick={() => { setSelectedCountry(c); applyFilter(selectedGenre, c); }} className={`block w-full text-left px-3 py-1.5 rounded text-sm ${selectedCountry === c ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-white"}`}>{c}</button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="pt-20 px-4 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white neon-text">{pageTitle}</h1>
        <button onClick={() => setSidebarOpen(s => !s)} className="md:hidden neon-btn px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <Filter size={14} /> Filters
        </button>
      </div>

      {sidebarOpen && (
        <div className="md:hidden mb-6 glass rounded-xl p-4 neon-border">
          <FilterSidebar />
        </div>
      )}

      <div className="flex gap-8">
        <div className="hidden md:block">
          <FilterSidebar />
        </div>
        <div className="flex-1">
          {loading && results.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="rounded-lg bg-white/5 animate-pulse" style={{ aspectRatio: "2/3" }} />)}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No titles found for this filter.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.map(s => <Card key={s.subjectId} subject={s} />)}
              </div>
              <div ref={observerRef} className="h-8 flex items-center justify-center mt-4">
                {loading && <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
