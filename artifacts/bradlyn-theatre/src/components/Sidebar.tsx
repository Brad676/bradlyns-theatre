import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Search, Film, Tv, Bookmark, Users, User,
  Shuffle, Settings, ChevronLeft, ChevronRight,
  TrendingUp, Flame, Globe, Laugh, Video, Heart,
  Share2, MessageCircle, Facebook
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { externalFetch } from "@/lib/api";

const NAV_MAIN = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
];

const NAV_CATEGORIES = [
  { href: "/browse?type=movie", icon: Film, label: "Movies" },
  { href: "/browse?type=series", icon: Tv, label: "Series" },
  { href: "/profile/list", icon: Heart, label: "My Movies" },
  { href: "/browse?genre=comedy", icon: Laugh, label: "Comedy" },
  { href: "/browse?sort=trending", icon: TrendingUp, label: "Trending" },
  { href: "/browse?sort=hot", icon: Flame, label: "Hot" },
  { href: "/browse?region=local", icon: Globe, label: "Local Shows" },
  { href: "/rooms", icon: Users, label: "Rooms" },
];

const SHARE_OPTIONS = [
  {
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-green-400 hover:bg-green-500/10",
    url: () => `https://wa.me/?text=${encodeURIComponent("🎭 Watch movies & series on Bradlyn's Theatre! " + window.location.origin)}`,
  },
  {
    label: "Facebook",
    icon: Facebook,
    color: "text-blue-400 hover:bg-blue-500/10",
    url: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`,
  },
  {
    label: "Telegram",
    icon: Video,
    color: "text-sky-400 hover:bg-sky-500/10",
    url: () => `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent("🎭 Check out Bradlyn's Theatre - stream movies & series!")}`,
  },
];

function SidebarSection({ label, expanded }: { label: string; expanded: boolean }) {
  if (!expanded) return <div className="h-px bg-white/5 my-2 mx-2" />;
  return (
    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-4 pt-4 pb-1">
      {label}
    </p>
  );
}

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [showShare, setShowShare] = useState(false);
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
    const path = href.split("?")[0];
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const NavItem = ({ href, icon: Icon, label, extraClass = "" }: { href: string; icon: React.ElementType; label: string; extraClass?: string }) => {
    const active = isActive(href);
    return (
      <Link href={href}>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group border
            ${active
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_8px_rgba(0,243,255,0.08)]"
              : `text-gray-400 hover:text-white hover:bg-white/5 border-transparent ${extraClass}`
            }
            ${expanded ? "" : "justify-center"}`}
          title={!expanded ? label : undefined}
        >
          <Icon size={18} className={`flex-shrink-0 transition-colors ${active ? "text-cyan-400" : "group-hover:text-cyan-400"}`} />
          {expanded && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
          {active && expanded && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
        </button>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {expanded && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out overflow-hidden
          ${expanded ? "w-56" : "w-16"}
          glass border-r border-white/5`}
        style={{ paddingTop: "3.5rem" }}
      >
        {/* Collapse / expand toggle button */}
        <button
          onClick={() => { setExpanded(e => !e); setShowShare(false); }}
          className={`flex items-center gap-2 mx-2 mt-3 mb-1 px-3 py-2 rounded-lg border border-white/8 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/5 hover:border-cyan-500/20 transition-all duration-200 ${expanded ? "" : "justify-center"}`}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          {expanded && <span className="text-xs font-medium">Collapse</span>}
        </button>

        {/* Profile */}
        <div className={`flex items-center gap-3 px-3 py-3 mx-2 mt-1 rounded-lg border border-white/5 bg-white/3 ${expanded ? "" : "justify-center"}`}>
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
              <p className="text-xs text-white font-medium truncate leading-tight">
                {user ? user.username : "Guest"}
              </p>
              <p className="text-[10px] text-gray-500 truncate">
                {user ? "View profile" : "Not signed in"}
              </p>
            </div>
          )}
        </div>

        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {/* Main nav */}
          <SidebarSection label="Menu" expanded={expanded} />
          <nav className="flex flex-col gap-0.5 px-2">
            {NAV_MAIN.map(item => <NavItem key={item.href} {...item} />)}
          </nav>

          {/* Categories */}
          <SidebarSection label="Browse" expanded={expanded} />
          <nav className="flex flex-col gap-0.5 px-2">
            {NAV_CATEGORIES.map(item => <NavItem key={item.href} {...item} />)}
          </nav>

          {/* Surprise Me */}
          <SidebarSection label="Discover" expanded={expanded} />
          <div className="px-2">
            <button
              onClick={randomTitle}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/5 border border-transparent hover:border-purple-500/20 transition-all duration-200 ${expanded ? "" : "justify-center"}`}
              title={!expanded ? "Surprise Me" : undefined}
            >
              <Shuffle size={18} className="flex-shrink-0" />
              {expanded && <span className="text-sm font-medium">Surprise Me</span>}
            </button>
          </div>

          {/* Share */}
          <SidebarSection label="Share" expanded={expanded} />
          <div className="px-2">
            <button
              onClick={() => setShowShare(s => !s)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200
                ${showShare
                  ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"}
                ${expanded ? "" : "justify-center"}`}
              title={!expanded ? "Share App" : undefined}
            >
              <Share2 size={18} className="flex-shrink-0" />
              {expanded && <span className="text-sm font-medium">Share App</span>}
            </button>

            {showShare && (
              <div className={`mt-1 flex flex-col gap-0.5 ${expanded ? "" : "items-center"}`}>
                {SHARE_OPTIONS.map(({ label, icon: Icon, color, url }) => (
                  <a
                    key={label}
                    href={url()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 border border-transparent ${color} ${expanded ? "" : "justify-center"}`}
                    title={!expanded ? label : undefined}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {expanded && <span className="font-medium">{label}</span>}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings pinned at bottom */}
        <div className="py-3 px-2 border-t border-white/5">
          <Link href="/profile/settings">
            <button
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 border border-transparent transition-all duration-200 ${expanded ? "" : "justify-center"}`}
              title={!expanded ? "Settings" : undefined}
            >
              <Settings size={18} className="flex-shrink-0" />
              {expanded && <span className="text-sm font-medium">Settings</span>}
            </button>
          </Link>
        </div>
      </aside>
    </>
  );
}
