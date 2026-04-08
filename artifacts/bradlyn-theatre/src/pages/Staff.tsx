import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, User } from "lucide-react";
import { Card } from "@/components/Card";
import { type Subject, type Staff, externalFetch } from "@/lib/api";

export default function StaffPage() {
  const [, params] = useRoute("/staff/:id");
  const staffId = params?.id ?? "";
  const [staff, setStaff] = useState<Staff | null>(null);
  const [works, setWorks] = useState<Subject[]>([]);
  const [related, setRelated] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [worksPage, setWorksPage] = useState(1);
  const [hasMoreWorks, setHasMoreWorks] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!staffId) return;
    setLoading(true);
    Promise.all([
      externalFetch("staff/detail", { staffId }),
      externalFetch("staff/works", { staffId, page: 1, perPage: 24 }),
      externalFetch("staff/related", { staffId }),
    ]).then(([d, w, r]) => {
      const detail = d as { data: Staff };
      const worksData = w as { data: { items: Subject[]; pager: { hasMore: boolean } } };
      const relatedData = r as { data: { items?: Staff[] } };
      setStaff(detail.data ?? null);
      setWorks(worksData.data?.items ?? []);
      setHasMoreWorks(worksData.data?.pager?.hasMore ?? false);
      setRelated(relatedData.data?.items ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [staffId]);

  const loadMore = () => {
    const nextPage = worksPage + 1;
    externalFetch("staff/works", { staffId, page: nextPage, perPage: 24 })
      .then((w: unknown) => {
        const data = w as { data: { items: Subject[]; pager: { hasMore: boolean } } };
        setWorks(prev => [...prev, ...(data.data?.items ?? [])]);
        setHasMoreWorks(data.data?.pager?.hasMore ?? false);
        setWorksPage(nextPage);
      }).catch(() => {});
  };

  useEffect(() => {
    if (!observerRef.current || !hasMoreWorks) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreWorks) loadMore();
    });
    obs.observe(observerRef.current);
    return () => obs.disconnect();
  }, [hasMoreWorks, worksPage]);

  if (loading) return <div className="pt-20 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mt-8" /></div>;

  if (!staff) return <div className="pt-20 px-4 text-center text-gray-400">Person not found</div>;

  return (
    <div className="pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        <Link href="/">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6">
            <ArrowLeft size={16} /> Back
          </button>
        </Link>

        <div className="flex gap-6 mb-8">
          {staff.avatarUrl ? (
            <img src={staff.avatarUrl} alt={staff.name} className="w-28 h-28 rounded-full object-cover border-2 border-white/10 flex-shrink-0" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
              <User size={40} className="text-gray-500" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{staff.name}</h1>
            {staff.staffType && <p className="text-gray-400 text-sm mb-1">{Array.isArray(staff.staffType) ? staff.staffType.join(", ") : staff.staffType}</p>}
            {staff.born && <p className="text-gray-400 text-sm mb-2">Born: {staff.born}</p>}
            {staff.subjectNum && <p className="text-gray-400 text-sm">{staff.subjectNum} Works</p>}
            {staff.description && <p className="text-gray-300 text-sm mt-3 max-w-2xl line-clamp-4">{staff.description}</p>}
          </div>
        </div>

        {related.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-3">People Also Worked With</h2>
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {related.slice(0, 10).map(r => (
                <Link key={r.staffId} href={`/staff/${r.staffId}`}>
                  <div className="flex-shrink-0 w-20 text-center cursor-pointer group">
                    {r.avatarUrl ? (
                      <img src={r.avatarUrl} alt={r.name} className="w-14 h-14 rounded-full object-cover mx-auto mb-1 border border-white/10 group-hover:border-cyan-500/50 transition-colors" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-700 mx-auto mb-1 flex items-center justify-center text-gray-400">{r.name[0]}</div>
                    )}
                    <p className="text-white text-xs truncate">{r.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-lg font-bold text-white mb-4">Works ({staff.subjectNum ?? works.length})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {works.map(s => <Card key={s.subjectId} subject={s} />)}
        </div>
        <div ref={observerRef} className="h-8 flex items-center justify-center mt-4">
          {hasMoreWorks && <div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />}
        </div>
      </div>
    </div>
  );
}
