import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, User, Shuffle, Users, X, LogOut, Settings, List, Film } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await externalFetch("search/suggest", { keyword: query }) as { data: { items: Suggestion[] } };
        setSuggestions(data.data?.items ?? []);
      } catch { setSuggestions([]); }
    }, 300);
  }, [query]);

  const doSearch = (kw: string) => {
    setShowSuggestions(false);
    setQuery(kw);
    navigate(`/search?q=${encodeURIComponent(kw)}`);
  };

  const randomTitle = async () => {
    try {
      const data = await externalFetch("trending", { page: 1, perPage: 20 }) as { data: { subjectList: { subjectId: string }[] } };
      const list = data.data?.subjectList ?? [];
      if (list.length > 0) {
        const pick = list[Math.floor(Math.random() * list.length)];
        navigate(`/detail/${pick.subjectId}`);
      }
    } catch {}
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/">
            <span className="text-lg font-bold neon-text cursor-pointer whitespace-nowrap">🎭 Bradlyn's theatre</span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg relative">
            <div className={`flex items-center rounded-full px-4 py-2 gap-2 transition-all duration-200 ${
              focused
                ? "bg-white/10 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                : "bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/8"
            }`}>
              <Search size={15} className={`flex-shrink-0 transition-colors duration-200 ${focused ? "text-cyan-400" : "text-gray-400"}`} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => { setFocused(true); setShowSuggestions(true); }}
                onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 150); }}
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
                    onClick={() => doSearch(s.word)}
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

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={randomTitle} title="Random" className="p-2 text-gray-400 hover:text-cyan-400 transition-colors hidden sm:flex">
              <Shuffle size={18} />
            </button>
            <Link href="/rooms">
              <button className="p-2 text-gray-400 hover:text-purple-400 transition-colors hidden sm:flex" title="Rooms">
                <Users size={18} />
              </button>
            </Link>

            {user && (
              <div className="relative">
                <button onClick={() => setShowUserMenu(m => !m)} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-full px-3 py-1.5 text-sm text-white">
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
    </>
  );
}
