import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X, Clock } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { Card } from "@/components/Card";
import { type Subject, searchSubjects, apiPost, apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function SearchPage() {
  const searchStr = useSearch();
  const urlQuery = new URLSearchParams(searchStr).get("q") ?? "";
  const [inputValue, setInputValue] = useState(urlQuery);
  const [results, setResults] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [history, setHistory] = useState<{ id: number; keyword: string }[]>([]);
  const [, navigate] = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();
  const observerRef = useRef<HTMLDivElement>(null);
  const currentQuery = useRef(urlQuery);

  useEffect(() => {
    if (!user) return;
    apiGet("user/search-history")
      .then(r => r.json())
      .then((data: { id: number; keyword: string }[]) => setHistory(data))
      .catch(() => {});
  }, [user]);

  const doSearch = async (kw: string, pg = 1, append = false) => {
    if (!kw.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await searchSubjects(kw, pg, 24, 0) as { data: { items: Subject[]; pager: { hasMore: boolean } } };
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
    setInputValue(urlQuery);
    currentQuery.current = urlQuery;
    if (urlQuery) doSearch(urlQuery);
    else setResults([]);
  }, [urlQuery]);

  useEffect(() => {
    if (!observerRef.current || !hasMore) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        doSearch(currentQuery.current, page + 1, true);
      }
    });
    obs.observe(observerRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, page]);

  const handleSearch = (kw: string) => {
    if (!kw.trim()) return;
    currentQuery.current = kw;
    navigate(`/search?q=${encodeURIComponent(kw)}`);
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim()) {
      debounceRef.current = setTimeout(() => {
        handleSearch(val);
      }, 500);
    } else {
      setResults([]);
    }
  };

  return (
    <div className="pt-20 px-4 max-w-7xl mx-auto pb-12">
      <div className="max-w-xl mx-auto mb-8">
        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 gap-3 focus-within:border-cyan-500/50 transition-colors">
          <SearchIcon size={18} className="text-gray-400" />
          <input
            autoFocus
            type="text"
            value={inputValue}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && inputValue.trim()) handleSearch(inputValue); }}
            placeholder="Search movies, series..."
            className="bg-transparent flex-1 text-white placeholder-gray-500 outline-none text-sm"
          />
          {inputValue && (
            <button onClick={() => { setInputValue(""); setResults([]); navigate("/search"); }}>
              <X size={16} className="text-gray-400 hover:text-white" />
            </button>
          )}
        </div>
      </div>

      {!urlQuery && history.length > 0 && (
        <div className="max-w-xl mx-auto">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Clock size={16} className="text-gray-400" /> Recent Searches
          </h3>
          <div className="space-y-1">
            {history.slice(0, 10).map(h => (
              <button
                key={h.id}
                onClick={() => { setInputValue(h.keyword); handleSearch(h.keyword); }}
                className="w-full text-left px-4 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 text-sm flex items-center gap-3"
              >
                <Clock size={14} className="text-gray-500 flex-shrink-0" />
                {h.keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      {urlQuery && (
        <>
          <div className="mb-4">
            <p className="text-gray-400 text-sm">
              {loading && results.length === 0
                ? "Searching..."
                : results.length > 0
                  ? `${results.length} results for "${urlQuery}"`
                  : !loading ? `No results found for "${urlQuery}"` : ""}
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
          <div ref={observerRef} className="h-10 flex items-center justify-center mt-4">
            {loading && results.length > 0 && (
              <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
