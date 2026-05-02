import { useState, useEffect, useCallback } from "react";
import { Music2, MapPin, Globe, TrendingUp, ChevronRight } from "lucide-react";
import { Card } from "@/components/Card";
import { type Subject, externalFetch, searchSubjects } from "@/lib/api";

type RegionId = "africa" | "europe" | "asia" | "australia" | "americas" | "worldwide";

type Region = {
  id: RegionId;
  label: string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  description: string;
  countries: string[];
  keywords: string[];
};

const REGIONS: Region[] = [
  {
    id: "africa",
    label: "Africa",
    icon: MapPin,
    gradient: "from-orange-500/30 to-yellow-500/30",
    iconColor: "text-orange-400",
    description: "Afrobeats, Afropop, Highlife, Bongo Flava & more",
    countries: ["Nigeria", "Ghana", "South Africa", "Kenya", "Tanzania", "Cameroon", "Ethiopia", "Egypt", "Senegal", "Ivory Coast"],
    keywords: ["afrobeats", "afropop", "african music", "naija music", "bongo flava"],
  },
  {
    id: "europe",
    label: "Europe",
    icon: Globe,
    gradient: "from-blue-500/30 to-indigo-500/30",
    iconColor: "text-blue-400",
    description: "Pop, Rock, Electronic & chart-toppers from across Europe",
    countries: ["United Kingdom", "France", "Germany", "Italy", "Spain", "Sweden", "Netherlands", "Norway", "Denmark"],
    keywords: ["uk music", "french music", "euro pop", "british music", "european hits"],
  },
  {
    id: "asia",
    label: "Asia",
    icon: Globe,
    gradient: "from-pink-500/30 to-rose-500/30",
    iconColor: "text-pink-400",
    description: "K-Pop, Bollywood, J-Pop, C-Pop & Asian chart hits",
    countries: ["South Korea", "Japan", "India", "China", "Indonesia", "Thailand", "Philippines", "Taiwan"],
    keywords: ["kpop", "bollywood", "jpop", "cpop", "asian music", "hallyu"],
  },
  {
    id: "australia",
    label: "Australia & Oceania",
    icon: Globe,
    gradient: "from-teal-500/30 to-cyan-500/30",
    iconColor: "text-teal-400",
    description: "Australian pop, rock, indie & Pacific island sounds",
    countries: ["Australia", "New Zealand", "Papua New Guinea", "Fiji"],
    keywords: ["australian music", "aussie music", "new zealand music", "pacific music"],
  },
  {
    id: "americas",
    label: "Americas",
    icon: Globe,
    gradient: "from-purple-500/30 to-violet-500/30",
    iconColor: "text-purple-400",
    description: "Hip-Hop, R&B, Latin, Reggae & North/South American hits",
    countries: ["United States", "Brazil", "Jamaica", "Mexico", "Colombia", "Cuba", "Argentina", "Puerto Rico"],
    keywords: ["hip hop", "latin music", "reggae", "r&b music", "rap", "samba", "salsa"],
  },
  {
    id: "worldwide",
    label: "Worldwide",
    icon: TrendingUp,
    gradient: "from-cyan-500/30 to-purple-500/30",
    iconColor: "text-cyan-400",
    description: "Global trending music — the best from every corner of the world",
    countries: [],
    keywords: ["music", "music video", "top hits", "pop music", "world music"],
  },
];

function uniq(arr: Subject[]): Subject[] {
  const seen = new Set<string>();
  return arr.filter(s => {
    if (seen.has(s.subjectId)) return false;
    seen.add(s.subjectId);
    return true;
  });
}

type BrowseData = { data: { items?: Subject[] } };
type SearchData = { data: { items?: Subject[]; subjectList?: Subject[] } };

async function fetchRegionContent(region: Region): Promise<Subject[]> {
  const results: Subject[] = [];

  const browsePromises = region.countries.slice(0, 5).map(country =>
    externalFetch("browse", { genre: "Music", countryName: country, page: 1, perPage: 10 })
      .then(d => (d as BrowseData).data?.items ?? [])
      .catch(() => [] as Subject[])
  );

  const keywordPromises = region.keywords.slice(0, 3).map(kw =>
    searchSubjects(kw, 1, 12)
      .then(d => {
        const sd = d as SearchData;
        return sd.data?.items ?? sd.data?.subjectList ?? [];
      })
      .catch(() => [] as Subject[])
  );

  const globalPromise = externalFetch("browse", {
    genre: "Music",
    page: 1,
    perPage: 20,
    ...(region.countries[0] ? { countryName: region.countries[0] } : {}),
  })
    .then(d => (d as BrowseData).data?.items ?? [])
    .catch(() => [] as Subject[]);

  const allResults = await Promise.all([...browsePromises, ...keywordPromises, globalPromise]);
  allResults.forEach(arr => results.push(...arr));

  return uniq(results).slice(0, 40);
}

function SkeletonRow() {
  return (
    <div className="flex gap-3 overflow-hidden px-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[150px] rounded-xl bg-white/5 animate-pulse"
          style={{ aspectRatio: "2/3" }}
        />
      ))}
    </div>
  );
}

function RegionSection({ region }: { region: Region }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(() => {
    if (loaded || loading) return;
    setLoading(true);
    fetchRegionContent(region)
      .then(items => { setSubjects(items); setLoaded(true); })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false));
  }, [region, loaded, loading]);

  useEffect(() => { load(); }, [load]);

  const Icon = region.icon;
  const displayItems = expanded ? subjects : subjects.slice(0, 20);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${region.gradient} border border-white/10 flex items-center justify-center flex-shrink-0`}>
            <Icon size={17} className={region.iconColor} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">{region.label}</h2>
            <p className="text-gray-500 text-xs leading-tight mt-0.5">{region.description}</p>
          </div>
        </div>
        {loaded && subjects.length > 20 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors pr-2"
          >
            {expanded ? "Show less" : `+${subjects.length - 20} more`}
            <ChevronRight size={13} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonRow />
      ) : subjects.length === 0 ? (
        <p className="text-gray-600 text-sm px-4 py-4 text-center">
          No music content found for this region — try browsing or searching above.
        </p>
      ) : (
        <div
          className={expanded ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 px-4" : "flex gap-3 px-4 overflow-x-auto pb-2"}
          style={expanded ? undefined : { scrollbarWidth: "none" }}
        >
          {displayItems.map(s => <Card key={s.subjectId} subject={s} />)}
        </div>
      )}
    </section>
  );
}

export default function Music() {
  const [activeTab, setActiveTab] = useState<RegionId>("africa");
  const activeRegion = REGIONS.find(r => r.id === activeTab)!;

  return (
    <div className="pt-20 pb-16">
      {/* Header */}
      <div className="px-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/40 to-pink-500/40 border border-purple-500/30 flex items-center justify-center">
            <Music2 size={22} className="text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Music</h1>
            <p className="text-gray-400 text-sm">
              Latest music from Africa, Europe, Asia, Australia, Americas &amp; beyond
            </p>
          </div>
        </div>
      </div>

      {/* Region tabs */}
      <div className="px-4 mb-6 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-2 min-w-max">
          {REGIONS.map(r => {
            const Icon = r.icon;
            const active = r.id === activeTab;
            return (
              <button
                key={r.id}
                onClick={() => setActiveTab(r.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  active
                    ? `bg-gradient-to-r ${r.gradient} border border-white/20 text-white shadow-lg`
                    : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon size={14} className={active ? r.iconColor : ""} />
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active region section */}
      <RegionSection key={activeRegion.id} region={activeRegion} />

      {/* Divider */}
      <div className="my-8 border-t border-white/5 mx-4" />

      {/* All other regions as compact rows */}
      <div className="space-y-10">
        {REGIONS.filter(r => r.id !== activeTab).map(region => (
          <RegionSection key={region.id} region={region} />
        ))}
      </div>
    </div>
  );
}
