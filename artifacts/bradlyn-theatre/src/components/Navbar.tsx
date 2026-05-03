import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, User, X, LogOut, Settings, List, Film } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { externalFetch } from "@/lib/api";

type Suggestion = { word: string };

export function Navbar() {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focused, setFocused] = useState(false);
  const [, navigate] = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const raw = await externalFetch("search/suggest", { keyword: query }) as { data: { items?: Suggestion[]; words?: Suggestion[]; keywordList?: string[] } };
        const items: Suggestion[] =
          raw.data?.items ??
          raw.data?.words ??
          (raw.data?.keywordList ?? []).map((w: string) => ({ word: w }));
        setSuggestions(items ?? []);
      } catch { setSuggestions([]); }
    }, 300);
  }, [query]);

  const doSearch = (kw: string) => {
    if (navDebounceRef.current) clearTimeout(navDebounceRef.current);
    setShowSuggestions(false);
    setQuery(kw);
    navigate(`/search?q=${encodeURIComponent(kw)}`);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setShowSuggestions(true);
    if (navDebounceRef.current) clearTimeout(navDebounceRef.current);
    if (val.trim().length >= 2) {
      navDebounceRef.current = setTimeout(() => {
        navigate(`/search?q=${encodeURIComponent(val.trim())}`);
      }, 400);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="pl-16 pr-4 h-14 flex items-center gap-4">
        <Link href="/">
          <span className="text-lg font-bold neon-text cursor-pointer whitespace-nowrap pl-2">🎭 Bradlyn's theatre</span>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-lg relative">
          <div className={`flex items-center rounded-full px-4 py-2 gap-2 transition-all duration-200 ${
            focused
              ? "bg-white/10 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
              : "bg-white/5 border border-white/10 hover:border-white/20"
          }`}>
            <Search size={15} className={`flex-shrink-0 transition-colors duration-200 ${focused ? "text-cyan-400" : "text-gray-400"}`} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onFocus={() => { setFocused(true); setShowSuggestions(true); }}
              onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 200); }}
              onKeyDown={e => { if (e.key === "Enter" && query.trim()) doSearch(query.trim()); }}
              placeholder="Search movies, series..."
              className="bg-transparent text-sm text-white placeholder-gray-500 outline-none flex-1 w-full"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                className="p-0.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl border border-white/10 overflow-hidden z-50 shadow-xl">
              {suggestions.slice(0, 8).map((s, i) => (
                <button
                  key={s.word}
                  onMouseDown={e => { e.preventDefault(); doSearch(s.word); }}
                  className={`w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors ${
                    i !== 0 ? "border-t border-white/5" : ""
                  }`}
                >
                  <Search size={12} className="text-gray-500 flex-shrink-0" />
                  <span>{s.word}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="ml-auto">
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(m => !m)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-full px-3 py-1.5 text-sm text-white transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-bold">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[80px] truncate">{user.username}</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 glass rounded-lg border border-white/10 min-w-[160px] overflow-hidden z-50 animate-fade-in">
                  <Link href="/profile" onClick={() => setShowUserMenu(false)}>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-2">
                      <User size={14} /> Profile
                    </button>
                  </Link>
                  <Link href="/profile/list" onClick={() => setShowUserMenu(false)}>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-2">
                      <List size={14} /> My List
                    </button>
                  </Link>
                  <Link href="/profile/room" onClick={() => setShowUserMenu(false)}>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-2">
                      <Film size={14} /> My Room
                    </button>
                  </Link>
                  <Link href="/profile/settings" onClick={() => setShowUserMenu(false)}>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-2">
                      <Settings size={14} /> Settings
                    </button>
                  </Link>
                  <button onClick={() => { logout(); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
