import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Users, Bell, Send, ChevronRight, Play, List } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiGet, apiPost, type Room, type QueueItem } from "@/lib/api";
import { getStreamUrl } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import { AuthModal } from "@/components/AuthModal";

export default function RoomWatch() {
  const [, params] = useRoute("/rooms/:id");
  const roomId = Number(params?.id ?? 0);
  const { user } = useAuth();
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(1);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatMessages, setChatMessages] = useState<{ username: string; message: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [requestTitle, setRequestTitle] = useState("");
  const [showRequestInput, setShowRequestInput] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [notifyWhenActive, setNotifyWhenActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!roomId) return;
    apiGet(`rooms/${roomId}`)
      .then(r => r.json())
      .then((data: Room & { queue: QueueItem[] }) => {
        setRoom(data);
        setQueue(data.queue ?? []);
        if (data.currentSubjectId) {
          const season = data.currentSubjectType === 2 ? data.queue?.[0]?.seriesSeason : undefined;
          const episode = data.currentSubjectType === 2 ? data.queue?.[0]?.seriesEpisode : undefined;
          getStreamUrl(data.currentSubjectId, season, episode, "720", "En").then(setStreamUrl).catch(() => {});
          setSyncTimestamp(data.currentTimestampSec ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const s = io({ path: `${base}/socket.io`, transports: ["websocket", "polling"] });
    s.emit("join-room", roomId);
    s.on("viewer-count", (count: number) => setViewerCount(count));
    s.on("host-play", ({ subjectId, subjectType, title, coverUrl, timestampSec }: { subjectId: string; subjectType: number; title: string; coverUrl: string; timestampSec?: number }) => {
      getStreamUrl(subjectId, undefined, undefined, "720", "En").then(setStreamUrl).catch(() => {});
      setSyncTimestamp(timestampSec ?? 0);
      setRoom(prev => prev ? { ...prev, state: "playing", currentSubjectId: subjectId, currentTitle: title, currentCoverUrl: coverUrl } : prev);
      toast(`Now playing: ${title}`, "info");
    });
    s.on("host-seek", ({ timestampSec }: { timestampSec: number }) => {
      setSyncTimestamp(timestampSec);
    });
    s.on("host-pause", () => {
      const vid = document.querySelector("video") as HTMLVideoElement | null;
      vid?.pause();
      toast("Host paused", "info");
    });
    s.on("host-resume", () => {
      const vid = document.querySelector("video") as HTMLVideoElement | null;
      vid?.play();
    });
    s.on("host-idle", () => {
      setStreamUrl(null);
      setRoom(prev => prev ? { ...prev, state: "idle" } : prev);
    });
    s.on("queue-update", (newQueue: QueueItem[]) => setQueue(newQueue));
    s.on("chat-message", (msg: { username: string; message: string; time: string }) => {
      setChatMessages(prev => [...prev.slice(-50), msg]);
    });
    s.on("notify-active", ({ title }: { title: string }) => {
      toast(`${room?.name ?? "Room"} is now playing: ${title}`, "success");
    });
    setSocket(s);
    return () => { s.emit("leave-room", roomId); s.disconnect(); };
  }, [roomId]);

  const sendChat = () => {
    if (!chatInput.trim() || !socket) return;
    if (!user) { setShowAuth(true); return; }
    const msg = { username: user.username, message: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    socket.emit("chat-message", { roomId, ...msg });
    setChatMessages(prev => [...prev.slice(-50), msg]);
    setChatInput("");
  };

  const sendRequest = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!requestTitle.trim()) return;
    const r = await apiPost(`rooms/${roomId}/requests`, { title: requestTitle });
    if (r.ok) {
      toast("Request sent to host!", "success");
      setRequestTitle("");
      setShowRequestInput(false);
    } else {
      toast("Failed to send request", "error");
    }
  };

  const toggleNotify = async () => {
    if (!user) { setShowAuth(true); return; }
    if (room?.state !== "idle") return;
    socket?.emit("notify-when-active", { roomId });
    setNotifyWhenActive(true);
    toast("You'll be notified when the room goes live!", "success");
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" /></div>;
  if (!room) return <div className="pt-20 px-4 text-center text-gray-400">Room not found</div>;

  const isHost = user?.userId === room.hostUserId;

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 glass z-10 flex-shrink-0">
        <Link href="/rooms">
          <button className="text-gray-400 hover:text-white p-1.5"><ArrowLeft size={18} /></button>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{room.name}</p>
          <p className="text-gray-500 text-xs flex items-center gap-1">
            <Users size={10} /> {viewerCount} watching · Hosted by {room.hostUsername}
            {room.state === "playing" && room.currentTitle && <span className="ml-2 text-cyan-400">· {room.currentTitle}</span>}
          </p>
        </div>
        <button onClick={() => setShowSidebar(s => !s)} className="p-1.5 text-gray-400 hover:text-white"><List size={18} /></button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {streamUrl ? (
            <div className="w-full max-w-5xl">
              <VideoPlayer
                src={streamUrl}
                subjectId={room.currentSubjectId}
                subjectType={room.currentSubjectType ?? 1}
                title={room.currentTitle}
                coverUrl={room.currentCoverUrl}
              />
            </div>
          ) : (
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-20 h-20 rounded-full glass neon-border flex items-center justify-center mx-auto mb-4">
                <Play size={32} className="text-gray-500" />
              </div>
              <h2 className="text-white font-bold text-xl mb-2">Room is Idle</h2>
              <p className="text-gray-400 text-sm mb-6">The host hasn't started anything yet.</p>
              {!isHost && room.state === "idle" && !notifyWhenActive && (
                <button onClick={toggleNotify} className="neon-btn px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 mx-auto">
                  <Bell size={15} /> Notify Me When Live
                </button>
              )}
              {notifyWhenActive && <p className="text-cyan-400 text-sm flex items-center gap-1 justify-center"><Bell size={13} /> You'll be notified</p>}
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
            <div className="flex gap-2 pointer-events-auto">
              {!isHost && (
                <button onClick={() => setShowRequestInput(s => !s)} className="neon-btn px-3 py-2 rounded-lg text-xs flex items-center gap-1">
                  <Send size={12} /> Request
                </button>
              )}
            </div>
          </div>

          {showRequestInput && !isHost && (
            <div className="absolute bottom-16 left-4 right-4 glass rounded-xl p-4 border border-white/10 max-w-md">
              <p className="text-white text-sm font-medium mb-2">Request a title</p>
              <div className="flex gap-2">
                <input type="text" value={requestTitle} onChange={e => setRequestTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && sendRequest()} placeholder="Movie or series title" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" autoFocus />
                <button onClick={sendRequest} className="neon-btn px-4 py-2 rounded-lg text-xs">Send</button>
              </div>
            </div>
          )}
        </div>

        {showSidebar && (
          <div className="w-72 glass border-l border-white/10 flex flex-col overflow-hidden flex-shrink-0">
            <div className="p-3 border-b border-white/10">
              <h3 className="text-white font-medium text-sm">Queue ({queue.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {queue.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-4">Queue is empty</p>
              ) : (
                queue.map((q, i) => (
                  <div key={q.id} className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs w-4">{i + 1}</span>
                    {q.coverUrl && <img src={q.coverUrl} alt="" className="w-8 h-10 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs truncate">{q.title}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-white/10 p-3 flex flex-col gap-2">
              <div className="flex-1 overflow-y-auto max-h-40 space-y-1 mb-2">
                {chatMessages.map((m, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-cyan-400 font-medium">{m.username}</span>
                    <span className="text-gray-400"> {m.message}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  placeholder="Chat..."
                  className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:outline-none"
                />
                <button onClick={sendChat} className="p-1.5 text-cyan-400 hover:text-white"><Send size={14} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
