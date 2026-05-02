import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Search, Film, Tv, Bookmark, Users, User, Shuffle, Settings, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { externalFetch } from "@/lib/api";

const NAV = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/browse?type=movie", icon: Film, label: "Movies" },
  { href: "/browse?type=series", icon: Tv, label: "TV Shows" },
  { href: "/profile/list", icon: Bookmark, label: "My List" },
  { href: "/rooms", icon: Users, label: "Rooms" },
];

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [location, navigate] = useLocation();
  const { user } = useAuth();

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

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href.split("?")[0]);
  };

  return (
    <>
      {/* Backdrop overlay when expanded on mobile */}
      {expanded && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out
          ${expanded ? "w-56" : "w-16"}
          glass border-r border-white/5`}
        style={{ paddingTop: "3.5rem" /* below navbar */ }}
      >
        {/* Toggle button */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full glass border border-white/10 flex items-center justify-center text-gray-400 hover:text-cyan-400 transition-colors z-50"
        >
          <ChevronRight
            size={12}
            className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Profile at top */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-white/5 ${expanded ? "" : "justify-center"}`}>
          <Link href="/profile">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 cursor-pointer hover:border-cyan-400/60 transition-colors">
              {user ? (
                <span className="text-xs font-bold">{user.username[0].toUpperCase()}</span>
              ) : (
                <User size={14} />
              )}
            </div>
          </Link>
          {expanded && (
            <div className="overflow-hidden">
              <p className="text-xs text-white font-medium truncate">
                {user ? user.username : "Guest"}
              </p>
              <p className="text-[10px] text-gray-500 truncate">
                {user ? "View profile" : "Not signed in"}
              </p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href}>
                <button
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                    ${active
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_8px_rgba(0,243,255,0.08)]"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }
                    ${expanded ? "" : "justify-center"}`}
                  title={!expanded ? label : undefined}
                >
                  <Icon
                    size={18}
                    className={`flex-shrink-0 transition-colors ${active ? "text-cyan-400" : "group-hover:text-cyan-400"}`}
                  />
                  {expanded && (
                    <span className="text-sm font-medium whitespace-nowrap">{label}</span>
                  )}
                  {active && expanded && (
                    <span className="ml-auto w-1 h-1 rounded-full bg-cyan-400" />
                  )}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="py-4 px-2 border-t border-white/5 flex flex-col gap-1">
          <button
            onClick={randomTitle}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-white/5 border border-transparent transition-all duration-200 group ${expanded ? "" : "justify-center"}`}
            title={!expanded ? "Random title" : undefined}
          >
            <Shuffle size={18} className="flex-shrink-0" />
            {expanded && <span className="text-sm font-medium whitespace-nowrap">Surprise Me</span>}
          </button>

          <Link href="/profile/settings">
            <button
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 border border-transparent transition-all duration-200 group ${expanded ? "" : "justify-center"}`}
              title={!expanded ? "Settings" : undefined}
            >
              <Settings size={18} className="flex-shrink-0" />
              {expanded && <span className="text-sm font-medium whitespace-nowrap">Settings</span>}
            </button>
          </Link>
        </div>
      </aside>
    </>
  );
}
