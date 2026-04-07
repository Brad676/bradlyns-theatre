import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";
import { Card } from "@/components/Card";
import { type Subject, externalFetch } from "@/lib/api";

const GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi", "Thriller", "Mystery", "Family", "Biography", "History", "Music", "Sport"];
const COUNTRIES = ["United States", "United Kingdom", "South Korea", "France", "Germany", "Japan", "Nigeria", "India", "China", "Italy", "Spain", "Mexico", "Brazil", "Canada", "Australia"];

export default function Browse() {
  const [results, setResults] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedType, setSelectedType] = useState<0 | 1 | 2>(0);
  const [genreOpen, setGenreOpen] = useState(true);
  const [countryOpen, setCountryOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchResults = async (pg: number, append = false, genre = selectedGenre, country = selectedCountry, type = selectedType) => {
    setLoading(true);
    const params: Record<string, string | number> = { page: pg, perPage: 24 };
    if (type > 0) params.subjectType = type;
    if (genre) params.genre = genre;
    if (country) params.countryName = country;
    try {
      const data = await externalFetch("browse", params) as { data: { items: Subject[]; pager: { hasMore: boolean } } };
      const items = (data.data?.items ?? []).filter(s => s.subjectType === 1 || s.subjectType === 2);
      if (append) setResults(prev => [...prev, ...items]);
      else setResults(items);
      setHasMore(data.data?.pager?.hasMore ?? false);
      setPage(pg);
    } catch {
      if (!append) setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResults(1); }, []);

  const applyFilter = (genre = selectedGenre, country = selectedCountry, type = selectedType) => {
    setResults([]);
    fetchResults(1, false, genre, country, type);
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

  const Sidebar = () => (
    <aside className="w-56 flex-shrink-0 space-y-4">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Type</p>
        {[{ label: "All", value: 0 }, { label: "Movies", value: 1 }, { label: "Series", value: 2 }].map(t => (
          <button key={t.value} onClick={() => { setSelectedType(t.value as 0 | 1 | 2); applyFilter(selectedGenre, selectedCountry, t.value as 0 | 1 | 2); }} className={`block w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${selectedType === t.value ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white hover:bg-white/10"}`}>
            {t.label}
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
              <button key={g} onClick={() => { setSelectedGenre(g); applyFilter(g); }} className={`block w-full text-left px-3 py-1.5 rounded text-sm ${selectedGenre === g ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-white"}`}>
                {g}
              </button>
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
              <button key={c} onClick={() => { setSelectedCountry(c); applyFilter(selectedGenre, c); }} className={`block w-full text-left px-3 py-1.5 rounded text-sm ${selectedCountry === c ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-white"}`}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="pt-20 px-4 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white neon-text">Browse</h1>
        <button onClick={() => setSidebarOpen(s => !s)} className="md:hidden neon-btn px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <Filter size={14} /> Filters
        </button>
      </div>

      {sidebarOpen && (
        <div className="md:hidden mb-6 glass rounded-xl p-4 neon-border">
          <Sidebar />
        </div>
      )}

      <div className="flex gap-8">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="flex-1">
          {loading && results.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="rounded-lg bg-white/5 animate-pulse" style={{ aspectRatio: "2/3" }} />)}
            </div>
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
