import { useState, useEffect } from "react";
import { Music2, MapPin, Globe, TrendingUp } from "lucide-react";
import { Card } from "@/components/Card";
import { type Subject, externalFetch } from "@/lib/api";

function MusicRow({ subjects, loading }: { subjects: Subject[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex gap-3 px-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[160px] rounded-lg bg-white/5 animate-pulse" style={{ aspectRatio: "2/3" }} />
        ))}
      </div>
    );
  }
  if (subjects.length === 0) {
    return <p className="text-gray-600 text-sm px-4 py-6 text-center">No music content found for this region</p>;
  }
  return (
    <div className="flex gap-3 px-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
      {subjects.map(s => <Card key={s.subjectId} subject={s} />)}
    </div>
  );
}

function SectionHeader({
  icon: Icon, title, subtitle, iconBg,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  iconBg: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4 px-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={17} className="text-white" />
      </div>
      <div>
        <h2 className="text-base font-bold text-white leading-tight">{title}</h2>
        <p className="text-gray-500 text-xs leading-tight mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function uniq(arr: Subject[]): Subject[] {
  const seen = new Set<string>();
  return arr.filter(s => { if (seen.has(s.subjectId)) return false; seen.add(s.subjectId); return true; });
}

export default function Music() {
  const [africa, setAfrica] = useState<Subject[]>([]);
  const [europe, setEurope] = useState<Subject[]>([]);
  const [worldwide, setWorldwide] = useState<Subject[]>([]);
  const [loadingAfrica, setLoadingAfrica] = useState(true);
  const [loadingEurope, setLoadingEurope] = useState(true);
  const [loadingWorldwide, setLoadingWorldwide] = useState(true);

  useEffect(() => {
    Promise.all([
      externalFetch("browse", { genre: "Music", countryName: "Nigeria", page: 1, perPage: 12 }),
      externalFetch("browse", { genre: "Music", countryName: "South Africa", page: 1, perPage: 12 }),
      externalFetch("browse", { genre: "Music", countryName: "Ghana", page: 1, perPage: 6 }),
    ]).then(results => {
      const all: Subject[] = results.flatMap(d => (d as { data: { items?: Subject[] } }).data?.items ?? []);
      setAfrica(uniq(all).slice(0, 24));
    }).catch(() => {}).finally(() => setLoadingAfrica(false));

    Promise.all([
      externalFetch("browse", { genre: "Music", countryName: "United Kingdom", page: 1, perPage: 12 }),
      externalFetch("browse", { genre: "Music", countryName: "France", page: 1, perPage: 10 }),
      externalFetch("browse", { genre: "Music", countryName: "Germany", page: 1, perPage: 8 }),
    ]).then(results => {
      const all: Subject[] = results.flatMap(d => (d as { data: { items?: Subject[] } }).data?.items ?? []);
      setEurope(uniq(all).slice(0, 24));
    }).catch(() => {}).finally(() => setLoadingEurope(false));

    externalFetch("browse", { genre: "Music", page: 1, perPage: 24 })
      .then(d => {
        const data = d as { data: { items?: Subject[] } };
        setWorldwide(data.data?.items ?? []);
      }).catch(() => {}).finally(() => setLoadingWorldwide(false));
  }, []);

  return (
    <div className="pt-20 pb-12">
      <div className="px-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/40 to-pink-500/40 border border-purple-500/30 flex items-center justify-center">
            <Music2 size={22} className="text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Music</h1>
            <p className="text-gray-400 text-sm">Latest songs from Africa, Europe &amp; around the world</p>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <section>
          <SectionHeader
            icon={MapPin}
            title="African Music"
            subtitle="Latest hits from Nigeria, Ghana, South Africa &amp; more"
            iconBg="bg-gradient-to-br from-orange-500/40 to-yellow-500/40 border border-orange-500/20"
          />
          <MusicRow subjects={africa} loading={loadingAfrica} />
        </section>

        <section>
          <SectionHeader
            icon={Globe}
            title="European Music"
            subtitle="Top tracks from United Kingdom, France, Germany &amp; more"
            iconBg="bg-gradient-to-br from-blue-500/40 to-indigo-500/40 border border-blue-500/20"
          />
          <MusicRow subjects={europe} loading={loadingEurope} />
        </section>

        <section>
          <SectionHeader
            icon={TrendingUp}
            title="Worldwide Hits"
            subtitle="Global trending music from around the world"
            iconBg="bg-gradient-to-br from-cyan-500/40 to-purple-500/40 border border-cyan-500/20"
          />
          <MusicRow subjects={worldwide} loading={loadingWorldwide} />
        </section>
      </div>
    </div>
  );
}
