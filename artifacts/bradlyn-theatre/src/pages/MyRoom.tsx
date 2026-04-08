import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Play, Plus, Trash2, Settings, Users, Clock, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiGet, apiPost, apiDelete, apiPut, externalFetch, type Room, type QueueItem, type Subject } from "@/lib/api";
import { io, Socket } from "socket.io-client";

type RoomRequest = { id: number; requestUsername: string; title: string; subjectId: string; coverUrl: string };

export default function MyRoom() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [room, setRoom] = useState<(Room & { requests?: RoomRequest[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Subject[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "requests" | "schedule">("queue");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleSubject, setScheduleSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (!user) return;
    apiGet("rooms/my")
      .then(r => r.json())
      .then((data: Room & { requests?: RoomRequest[] } | null) => {
        setRoom(data);
        if (data) setRoomName(data.name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!room) return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const s = io({ path: `${base}/socket.io`, transports: ["websocket", "polling"] });
    s.emit("join-room", room.id);
    s.on("queue-update", (queue: QueueItem[]) => setRoom(prev => prev ? { ...prev, queue } : prev));
    setSocket(s);
    return () => { s.disconnect(); };
  }, [room?.id]);

  const createRoom = async () => {
    const r = await apiPost("rooms", { name: `${user!.username}'s Room` });
    const data = await r.json();
    setRoom(data);
    setRoomName(data.name);
    toast("Room created!", "success");
  };

  const saveSettings = async () => {
    await apiPut("rooms/my/settings", { name: roomName, password: roomPassword || "" });
    setRoom(prev => prev ? { ...prev, name: roomName } : prev);
    setShowSettings(false);
    toast("Settings saved!", "success");
  };

  const closeRoom = async () => {
    await apiPost("rooms/my/close", {});
    setRoom(null);
    toast("Room closed", "info");
  };

  const searchForAdd = async () => {
    if (!searchQ) return;
    setSearchLoading(true);
    const data = await externalFetch("search", { keyword: searchQ, page: 1, perPage: 10 }) as { data: { items: Subject[] } };
    setSearchResults(data.data?.items ?? []);
    setSearchLoading(false);
  };

  const addToQueue = async (subject: Subject, playNow = false) => {
    const r = await apiPost("rooms/my/queue", {
      subjectId: subject.subjectId,
      subjectType: subject.subjectType,
      title: subject.title,
      coverUrl: subject.cover?.url ?? "",
      playNow,
      scheduledAt: scheduleSubject?.subjectId === subject.subjectId && scheduleDate ? scheduleDate : null,
    });
    if (r.ok) {
      if (playNow) {
        socket?.emit("host-play", { roomId: room!.id, subjectId: subject.subjectId, subjectType: subject.subjectType, title: subject.title, coverUrl: subject.cover?.url ?? "" });
        setRoom(prev => prev ? { ...prev, state: "playing", currentTitle: subject.title, currentSubjectId: subject.subjectId } : prev);
        toast(`Now playing: ${subject.title}`, "success");
      } else {
        socket?.emit("queue-updated", room!.id);
        const queueData = await apiGet("rooms/my").then(res => res.json());
        setRoom(prev => prev ? { ...prev, queue: queueData.queue } : prev);
        toast(`Added to queue: ${subject.title}`, "success");
      }
    }
  };

  const removeFromQueue = async (itemId: number) => {
    await apiDelete(`rooms/my/queue/${itemId}`);
    socket?.emit("queue-updated", room!.id);
    setRoom(prev => prev ? { ...prev, queue: (prev.queue ?? []).filter(q => q.id !== itemId) } : prev);
    toast("Removed from queue", "info");
  };

  const approveRequest = async (reqId: number) => {
    await apiPost(`rooms/my/requests/${reqId}/approve`, {});
    socket?.emit("queue-updated", room!.id);
    setRoom(prev => prev ? { ...prev, requests: (prev.requests ?? []).filter(r => r.id !== reqId) } : prev);
    toast("Request approved", "success");
  };

  const rejectRequest = async (reqId: number) => {
    await apiPost(`rooms/my/requests/${reqId}/reject`, {});
    setRoom(prev => prev ? { ...prev, requests: (prev.requests ?? []).filter(r => r.id !== reqId) } : prev);
    toast("Request rejected", "info");
  };

  if (!user) return <div className="pt-20 px-4 text-center text-gray-400">Please sign in</div>;

  if (loading) return <div className="pt-20 flex justify-center"><div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mt-8" /></div>;

  return (
    <div className="pt-20 pb-12 max-w-4xl mx-auto px-4">
      <Link href="/profile">
        <button className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6">
          <ArrowLeft size={16} /> Back to Profile
        </button>
      </Link>

      {!room ? (
        <div className="text-center py-12">
          <h2 className="text-white text-xl font-bold mb-3">You don't have a room yet</h2>
          <p className="text-gray-400 text-sm mb-6">Create a room to broadcast movies & series to your viewers.</p>
          <button onClick={createRoom} className="neon-btn px-6 py-3 rounded-lg font-medium">Create My Room</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-xl p-5 neon-border flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">{room.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                <span className={`flex items-center gap-1 ${room.state === "playing" ? "text-green-400" : "text-gray-400"}`}>
                  <span className={`w-2 h-2 rounded-full ${room.state === "playing" ? "bg-green-400" : "bg-gray-500"}`} />
                  {room.state === "playing" ? `Playing: ${room.currentTitle ?? ""}` : "Idle"}
                </span>
                {room.password && <span className="text-yellow-400">🔒 Password protected</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href={`/rooms/${room.id}`}>
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm flex items-center gap-2"><Users size={14} /> View Room</button>
              </Link>
              <button onClick={() => setShowSettings(s => !s)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm flex items-center gap-2"><Settings size={14} /> Settings</button>
              <button onClick={closeRoom} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm">Close Room</button>
            </div>
          </div>

          {showSettings && (
            <div className="glass rounded-xl p-5 border border-white/10 space-y-3">
              <h3 className="text-white font-medium">Room Settings</h3>
              <input type="text" value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Room name" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50" />
              <input type="text" value={roomPassword} onChange={e => setRoomPassword(e.target.value)} placeholder="Password (leave empty to remove)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50" />
              <button onClick={saveSettings} className="neon-btn px-5 py-2 rounded-lg text-sm font-medium">Save Settings</button>
            </div>
          )}

          <div className="glass rounded-xl p-5 border border-white/10">
            <h3 className="text-white font-medium mb-3">Send Content to Room</h3>
            <div className="flex gap-2 mb-4">
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === "Enter" && searchForAdd()} placeholder="Search for a movie or series..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50" />
              <button onClick={searchForAdd} className="neon-btn px-4 py-2 rounded-lg text-sm">Search</button>
            </div>
            {searchLoading && <div className="text-center py-4"><div className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" /></div>}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map(s => (
                  <div key={s.subjectId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                    {s.cover?.url && <img src={s.cover.url} alt={s.title} className="w-8 h-10 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{s.title}</p>
                      <p className="text-gray-500 text-xs">{s.subjectType === 1 ? "Movie" : "Series"}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => addToQueue(s, true)} className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded text-xs hover:bg-cyan-500/30 flex items-center gap-1"><Play size={10} /> Play Now</button>
                      <button onClick={() => addToQueue(s, false)} className="px-3 py-1.5 bg-white/10 text-white rounded text-xs hover:bg-white/20 flex items-center gap-1"><Plus size={10} /> Queue</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass rounded-xl p-5 border border-white/10">
            <div className="flex gap-2 mb-4">
              {[
                { id: "queue", label: `Queue (${room.queue?.length ?? 0})` },
                { id: "requests", label: `Requests (${room.requests?.length ?? 0})` },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as "queue" | "requests")} className={`px-4 py-2 rounded-lg text-sm ${activeTab === t.id ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === "queue" && (
              <div>
                {(!room.queue || room.queue.length === 0) ? (
                  <p className="text-gray-500 text-sm text-center py-4">Queue is empty</p>
                ) : (
                  <div className="space-y-2">
                    {room.queue.map((q, i) => (
                      <div key={q.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                        <span className="text-gray-500 text-sm w-4">{i + 1}</span>
                        {q.coverUrl && <img src={q.coverUrl} alt={q.title} className="w-8 h-10 object-cover rounded" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{q.title}</p>
                          {q.scheduledAt && <p className="text-gray-500 text-xs flex items-center gap-1"><Clock size={10} /> {new Date(q.scheduledAt).toLocaleString()}</p>}
                        </div>
                        <button onClick={() => removeFromQueue(q.id)} className="text-gray-400 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "requests" && (
              <div>
                {(!room.requests || room.requests.length === 0) ? (
                  <p className="text-gray-500 text-sm text-center py-4">No pending requests</p>
                ) : (
                  <div className="space-y-2">
                    {room.requests.map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                        {r.coverUrl && <img src={r.coverUrl} alt={r.title} className="w-8 h-10 object-cover rounded" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{r.title}</p>
                          <p className="text-gray-500 text-xs">Requested by {r.requestUsername}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => approveRequest(r.id)} className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded text-xs">Approve</button>
                          <button onClick={() => rejectRequest(r.id)} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-xs">Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
