import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { Clock, List, Search, Settings, Film, Trash2, BarChart2, Play } from "lucide-react";
import { Card } from "@/components/Card";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiGet, apiDelete, apiPost, apiPut } from "@/lib/api";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"history" | "list" | "searches" | "stats">("history");

  const [history, setHistory] = useState<{ id: number; subjectId: string; subjectType: number; title: string; coverUrl: string; timestampSec: number; durationSec: number; updatedAt: string }[]>([]);
  const [watchlist, setWatchlist] = useState<{ id: number; subjectId: string; subjectType: number; title: string; coverUrl: string; genre: string; imdbRating: string; addedAt: string }[]>([]);
  const [searchHist, setSearchHist] = useState<{ id: number; keyword: string; createdAt: string }[]>([]);
  const [stats, setStats] = useState<{ totalWatchTimeSeconds: number; moviesWatched: number; seriesWatched: number; watchlistCount: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    apiGet("user/history").then(r => r.json()).then(setHistory).catch(() => {});
    apiGet("user/watchlist").then(r => r.json()).then(setWatchlist).catch(() => {});
    apiGet("user/search-history").then(r => r.json()).then(setSearchHist).catch(() => {});
    apiGet("user/stats").then(r => r.json()).then(setStats).catch(() => {});
  }, [user]);

  if (!user) return (
    <div className="pt-20 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-white text-xl font-bold mb-2">Sign in to view your profile</h2>
        <p className="text-gray-400 text-sm">Create an account to track your watch history, ratings and more.</p>
      </div>
    </div>
  );

  const deleteHistory = async (subjectId: string) => {
    await apiDelete(`user/history/${subjectId}`);
    setHistory(prev => prev.filter(h => h.subjectId !== subjectId));
    toast("Removed from history", "info");
  };

  const deleteSearch = async (id: number) => {
    await apiDelete(`user/search-history/${id}`);
    setSearchHist(prev => prev.filter(h => h.id !== id));
  };

  const clearSearchHistory = async () => {
    await apiDelete("user/search-history");
    setSearchHist([]);
    toast("Search history cleared", "info");
  };

  const removeFromList = async (subjectId: string) => {
    await apiDelete(`user/watchlist/${subjectId}`);
    setWatchlist(prev => prev.filter(w => w.subjectId !== subjectId));
    toast("Removed from My List", "info");
  };

  return (
    <div className="pt-20 pb-12 max-w-5xl mx-auto px-4">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full neon-border flex items-center justify-center text-2xl font-bold text-cyan-400" style={{ background: "rgba(0,243,255,0.1)" }}>
          {user.username[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{user.username}</h1>
          <div className="flex gap-4 mt-1 text-sm text-gray-400">
            <Link href="/profile/room"><span className="hover:text-white cursor-pointer flex items-center gap-1"><Film size={13} /> My Room</span></Link>
            <Link href="/profile/settings"><span className="hover:text-white cursor-pointer flex items-center gap-1"><Settings size={13} /> Settings</span></Link>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { id: "history" as const, label: "Watch History", icon: <Clock size={14} /> },
          { id: "list" as const, label: "My List", icon: <List size={14} /> },
          { id: "searches" as const, label: "Search History", icon: <Search size={14} /> },
          { id: "stats" as const, label: "Statistics", icon: <BarChart2 size={14} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-gray-400 hover:text-white hover:bg-white/10"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "history" && (
        <div>
          {history.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No watch history yet</p>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.subjectId} className="glass rounded-lg p-3 flex items-center gap-4">
                  {h.coverUrl ? (
                    <img src={h.coverUrl} alt={h.title} className="w-12 h-16 object-cover rounded flex-shrink-0" />
                  ) : <div className="w-12 h-16 bg-gray-800 rounded flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <Link href={`/detail/${h.subjectId}`}><p className="text-white font-medium text-sm truncate hover:text-cyan-400 cursor-pointer">{h.title}</p></Link>
                    <p className="text-gray-500 text-xs mt-0.5">{formatDate(h.updatedAt)}</p>
                    {h.durationSec > 0 && (
                      <div className="mt-1 w-full bg-white/10 rounded-full h-1">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (h.timestampSec / h.durationSec) * 100)}%`, background: "var(--neon-cyan)" }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/watch/${h.subjectId}`}>
                      <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"><Play size={14} /></button>
                    </Link>
                    <button onClick={() => deleteHistory(h.subjectId)} className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "list" && (
        <div>
          {watchlist.length === 0 ? (
            <p className="text-gray-500 text-center py-12">Your list is empty</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {watchlist.map(w => (
                <div key={w.subjectId} className="relative group">
                  <Card subject={{ subjectId: w.subjectId, subjectType: w.subjectType, title: w.title, cover: { url: w.coverUrl }, genre: w.genre, imdbRatingValue: w.imdbRating }} />
                  <button onClick={() => removeFromList(w.subjectId)} className="absolute top-1 right-1 z-10 w-7 h-7 rounded-full bg-black/80 flex items-center justify-center text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "searches" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-400 text-sm">{searchHist.length} searches</p>
            {searchHist.length > 0 && (
              <button onClick={clearSearchHistory} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1">
                <Trash2 size={13} /> Clear all
              </button>
            )}
          </div>
          {searchHist.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No search history</p>
          ) : (
            <div className="space-y-1">
              {searchHist.map(h => (
                <div key={h.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 group">
                  <Link href={`/search?q=${encodeURIComponent(h.keyword)}`}>
                    <span className="text-gray-300 hover:text-white text-sm cursor-pointer flex items-center gap-2">
                      <Search size={13} className="text-gray-500" /> {h.keyword}
                    </span>
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 text-xs">{formatDate(h.createdAt)}</span>
                    <button onClick={() => deleteSearch(h.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "stats" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Watch Time", value: formatTime(stats.totalWatchTimeSeconds), color: "cyan" },
            { label: "Movies", value: String(stats.moviesWatched), color: "purple" },
            { label: "Series", value: String(stats.seriesWatched), color: "magenta" },
            { label: "In My List", value: String(stats.watchlistCount), color: "cyan" },
          ].map(s => (
            <div key={s.label} className="glass rounded-xl p-5 text-center neon-border">
              <p className="text-3xl font-bold neon-text mb-1">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
