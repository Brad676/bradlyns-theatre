import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { Card } from "@/components/Card";
import { type Subject, externalFetch, apiPost, apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function SearchPage() {
  const [location] = useLocation();
  const urlQuery = new URLSearchParams(window.location.search).get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [history, setHistory] = useState<{ id: number; keyword: string }[]>([]);
  const [, navigate] = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    apiGet("user/search-history")
      .then(r => r.json())
      .then((data: { id: number; keyword: string }[]) => setHistory(data))
      .catch(() => {});
  }, [user]);

  const doSearch = async (kw: string, pg = 1, append = false) => {
    if (!kw) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await externalFetch("search", { keyword: kw, page: pg, perPage: 24, subjectType: 0 }) as { data: { items: Subject[]; pager: { hasMore: boolean } } };
      const items = data.data?.items ?? [];
      if (append) setResults(prev => [...prev, ...items]);
      else setResults(items);
      setHasMore(data.data?.pager?.hasMore ?? false);
      setPage(pg);
      if (user && pg === 1) {
        apiPost("user/search-history", { keyword: kw }).catch(() => {});
      }
    } catch {
      if (!append) setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlQuery) { setQuery(urlQuery); doSearch(urlQuery); }
  }, [urlQuery]);

  useEffect(() => {
    if (!observerRef.current || !hasMore) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        doSearch(query, page + 1, true);
      }
    });
    obs.observe(observerRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, page, query]);

  const handleSearch = (kw: string) => {
    setQuery(kw);
    navigate(`/search?q=${encodeURIComponent(kw)}`);
    doSearch(kw);
  };

  return (
    <div className="pt-20 px-4 max-w-7xl mx-auto pb-12">
      <div className="max-w-xl mx-auto mb-8">
        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 gap-3 focus-within:border-cyan-500/50 transition-colors">
          <SearchIcon size={18} className="text-gray-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => handleSearch(e.target.value), 500);
            }}
            onKeyDown={e => { if (e.key === "Enter") handleSearch(query); }}
            placeholder="Search movies, series..."
            className="bg-transparent flex-1 text-white placeholder-gray-500 outline-none text-sm"
          />
          {query && <button onClick={() => { setQuery(""); setResults([]); }}><X size={16} className="text-gray-400" /></button>}
        </div>
      </div>

      {!query && history.length > 0 && (
        <div className="max-w-xl mx-auto">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Clock size={16} className="text-gray-400" /> Recent Searches</h3>
          <div className="space-y-1">
            {history.slice(0, 10).map(h => (
              <button key={h.id} onClick={() => handleSearch(h.keyword)} className="w-full text-left px-4 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 text-sm flex items-center gap-3">
                <Clock size={14} className="text-gray-500 flex-shrink-0" />
                {h.keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      {query && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {loading ? "Searching..." : `Results for "${query}" (${results.length})`}
            </p>
          </div>
          {loading && results.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-lg bg-white/5 animate-pulse" style={{ aspectRatio: "2/3" }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {results.map(s => <Card key={s.subjectId} subject={s} />)}
            </div>
          )}
          <div ref={observerRef} className="h-8 flex items-center justify-center">
            {loading && results.length > 0 && <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />}
          </div>
        </>
      )}
    </div>
  );
}
