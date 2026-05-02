import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Search, Film, Tv, Bookmark, Users, User,
  Shuffle, Settings, ChevronLeft, ChevronRight,
  TrendingUp, Flame, Globe, Laugh, Video, Heart,
  Share2, MessageCircle, Facebook, Music2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  { href: "/browse?genre=Comedy", icon: Laugh, label: "Comedy" },
  { href: "/browse?sort=trending", icon: TrendingUp, label: "Trending" },
  { href: "/browse?sort=hot", icon: Flame, label: "Hot" },
  { href: "/browse?region=local", icon: Globe, label: "Local Shows" },
  { href: "/browse?genre=Music", icon: Music2, label: "Music" },
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

const labelVariants = {
  hidden: { opacity: 0, x: -8, width: 0 },
  visible: (i: number) => ({
    opacity: 1, x: 0, width: "auto" as const,
    transition: { delay: i * 0.04, duration: 0.2 },
  }),
  exit: { opacity: 0, x: -8, width: 0, transition: { duration: 0.12 } },
};

const sectionVariants = {
  hidden: { opacity: 0, scaleX: 0.8 },
  visible: (i: number) => ({ opacity: 1, scaleX: 1, transition: { delay: i * 0.03, duration: 0.2 } }),
};

function SidebarSection({ label, expanded, index }: { label: string; expanded: boolean; index: number }) {
  if (!expanded) return <div className="h-px bg-white/5 my-2 mx-2" />;
  return (
    <motion.p
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-4 pt-4 pb-1 origin-left"
    >
      {label}
    </motion.p>
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

  const NavItem = ({
    href, icon: Icon, label, index = 0, extraClass = "",
  }: { href: string; icon: React.ElementType; label: string; index?: number; extraClass?: string }) => {
    const active = isActive(href);
    return (
      <Link href={href}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group border
            ${active
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_8px_rgba(0,243,255,0.08)]"
              : `text-gray-400 hover:text-white hover:bg-white/5 border-transparent ${extraClass}`}
            ${expanded ? "" : "justify-center"}`}
          title={!expanded ? label : undefined}
        >
          <Icon
            size={18}
            className={`flex-shrink-0 transition-colors ${active ? "text-cyan-400" : "group-hover:text-cyan-400"}`}
          />
          <AnimatePresence mode="wait">
            {expanded && (
              <motion.span
                key="label"
                custom={index}
                variants={labelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
          {active && expanded && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0"
            />
          )}
        </motion.button>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: expanded ? 224 : 64 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="fixed top-0 left-0 h-full z-40 flex flex-col overflow-hidden glass border-r border-white/5"
        style={{ paddingTop: "3.5rem" }}
      >
        {/* Collapse / expand toggle */}
        <motion.button
          whileHover={{ backgroundColor: "rgba(0,243,255,0.05)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setExpanded(e => !e); setShowShare(false); }}
          className={`flex items-center gap-2 mx-2 mt-3 mb-1 px-3 py-2 rounded-lg border border-white/8 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 transition-colors ${expanded ? "" : "justify-center"}`}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <motion.div animate={{ rotate: expanded ? 0 : 180 }} transition={{ duration: 0.3 }}>
            <ChevronLeft size={16} />
          </motion.div>
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-xs font-medium whitespace-nowrap overflow-hidden"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Profile */}
        <div className={`flex items-center gap-3 px-3 py-3 mx-2 mt-1 rounded-lg border border-white/5 bg-white/3 ${expanded ? "" : "justify-center"}`}>
          <Link href="/profile">
            <motion.div
              whileHover={{ scale: 1.1, borderColor: "rgba(0,243,255,0.6)" }}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 cursor-pointer transition-colors"
            >
              {user ? (
                <span className="text-xs font-bold">{user.username[0].toUpperCase()}</span>
              ) : (
                <User size={14} />
              )}
            </motion.div>
          </Link>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-white font-medium truncate leading-tight">
                  {user ? user.username : "Guest"}
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {user ? "View profile" : "Not signed in"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scrollable nav */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          <SidebarSection label="Menu" expanded={expanded} index={0} />
          <nav className="flex flex-col gap-0.5 px-2">
            {NAV_MAIN.map((item, i) => <NavItem key={item.href} {...item} index={i} />)}
          </nav>

          <SidebarSection label="Browse" expanded={expanded} index={1} />
          <nav className="flex flex-col gap-0.5 px-2">
            {NAV_CATEGORIES.map((item, i) => <NavItem key={item.href} {...item} index={i + 2} />)}
          </nav>

          <SidebarSection label="Discover" expanded={expanded} index={2} />
          <div className="px-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={randomTitle}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/5 border border-transparent hover:border-purple-500/20 transition-all duration-200 ${expanded ? "" : "justify-center"}`}
              title={!expanded ? "Surprise Me" : undefined}
            >
              <Shuffle size={18} className="flex-shrink-0" />
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto", transition: { delay: 0.18 } }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    Surprise Me
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <SidebarSection label="Share" expanded={expanded} index={3} />
          <div className="px-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowShare(s => !s)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200
                ${showShare ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"}
                ${expanded ? "" : "justify-center"}`}
              title={!expanded ? "Share App" : undefined}
            >
              <Share2 size={18} className="flex-shrink-0" />
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto", transition: { delay: 0.2 } }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    Share App
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <AnimatePresence>
              {showShare && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`mt-1 flex flex-col gap-0.5 overflow-hidden ${expanded ? "" : "items-center"}`}
                >
                  {SHARE_OPTIONS.map(({ label, icon: Icon, color, url }, i) => (
                    <motion.a
                      key={label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0, transition: { delay: i * 0.06 } }}
                      href={url()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 border border-transparent ${color} ${expanded ? "" : "justify-center"}`}
                      title={!expanded ? label : undefined}
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      {expanded && <span className="font-medium">{label}</span>}
                    </motion.a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Settings pinned at bottom */}
        <div className="py-3 px-2 border-t border-white/5">
          <Link href="/profile/settings">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 border border-transparent transition-all duration-200 ${expanded ? "" : "justify-center"}`}
              title={!expanded ? "Settings" : undefined}
            >
              <Settings size={18} className="flex-shrink-0" />
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto", transition: { delay: 0.15 } }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </Link>
        </div>
      </motion.aside>
    </>
  );
}
