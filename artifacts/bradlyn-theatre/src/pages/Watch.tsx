import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { externalFetch } from "@/lib/api";
import { type Subject } from "@/lib/api";

export default function Watch() {
  const [, params] = useRoute("/watch/:id");
  const subjectId = params?.id ?? "";
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tryCount, setTryCount] = useState(0);

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    setError(null);
    setStreamUrl(null);

    externalFetch("detail", { subjectId })
      .then((d: unknown) => {
        const data = d as { data: { subject: Subject } };
        setSubject(data.data?.subject ?? null);
      }).catch(() => {});

    const url = `https://movieapi.xcasper.space/api/bff/stream?subjectId=${subjectId}`;
    setStreamUrl(url);
    setLoading(false);
  }, [subjectId]);

  const handleError = () => {
    if (tryCount < 1) {
      setTryCount(c => c + 1);
      const altUrl = `https://cyber-stream-foxy-a5pz.vercel.app/movie/${subjectId}`;
      setStreamUrl(altUrl);
    } else {
      setError("This title is currently unavailable for streaming. Please try another title.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 glass absolute top-0 left-0 right-0 z-10">
        <Link href={subject ? `/detail/${subjectId}` : "/"}>
          <button className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-sm">
            <ArrowLeft size={18} /> {subject?.title ?? "Back"}
          </button>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center pt-12">
        {error ? (
          <div className="text-center max-w-md mx-auto px-4">
            <AlertTriangle size={40} className="text-yellow-500 mx-auto mb-4" />
            <h2 className="text-white font-bold text-xl mb-2">Streaming Unavailable</h2>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <Link href={`/detail/${subjectId}`}>
              <button className="neon-btn px-6 py-2.5 rounded-lg font-medium">Back to Details</button>
            </Link>
          </div>
        ) : streamUrl ? (
          <div className="w-full max-w-6xl">
            <VideoPlayer
              src={streamUrl}
              subjectId={subjectId}
              subjectType={subject?.subjectType ?? 1}
              title={subject?.title}
              coverUrl={subject?.cover?.url}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
