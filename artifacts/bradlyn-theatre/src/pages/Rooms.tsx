import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Users, Play, Lock, Clock, Search } from "lucide-react";
import { apiGet, apiPost, type Room } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { AuthModal } from "@/components/AuthModal";

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "idle" | "all">("all");
  const [searchQ, setSearchQ] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{ roomId: number; name: string } | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    apiGet("rooms")
      .then(r => r.json())
      .then((data: Room[]) => setRooms(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = rooms.filter(r => {
    if (tab === "active" && r.state !== "playing") return false;
    if (tab === "idle" && r.state !== "idle") return false;
    if (searchQ && !r.name.toLowerCase().includes(searchQ.toLowerCase()) && !r.hostUsername.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const joinRoom = async (room: Room) => {
    if (!user) { setShowAuth(true); return; }
    if (room.password) {
      setPasswordPrompt({ roomId: room.id, name: room.name });
      setPasswordInput("");
      return;
    }
    window.location.href = `/rooms/${room.id}`;
  };

  const submitPassword = async () => {
    if (!passwordPrompt) return;
    const r = await apiPost(`rooms/${passwordPrompt.roomId}/join`, { password: passwordInput });
    if (r.ok) {
      setPasswordPrompt(null);
      window.location.href = `/rooms/${passwordPrompt.roomId}`;
    } else {
      toast("Wrong password", "error");
    }
  };

  return (
    <div className="pt-20 pb-12 max-w-5xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white neon-text">Watch Rooms</h1>
          <p className="text-gray-400 text-sm mt-1">Join a broadcast room or create your own</p>
        </div>
        {user ? (
          <Link href="/profile/room">
            <button className="neon-btn px-5 py-2.5 rounded-lg font-medium text-sm">Manage My Room</button>
          </Link>
        ) : (
          <button onClick={() => setShowAuth(true)} className="neon-btn px-5 py-2.5 rounded-lg font-medium text-sm">Sign in to Host</button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex bg-white/5 rounded-lg border border-white/10 overflow-hidden">
          {[
            { id: "all" as const, label: "All Rooms" },
            { id: "active" as const, label: "🟢 Live" },
            { id: "idle" as const, label: "💤 Idle" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm ${tab === t.id ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-gray-400" />
          <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search rooms..." className="bg-transparent text-white text-sm placeholder-gray-500 outline-none flex-1" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass rounded-xl h-36 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No rooms found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(room => (
            <div key={room.id} className="glass rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/30 transition-colors group cursor-pointer card-hover" onClick={() => joinRoom(room)}>
              <div className="relative h-24 overflow-hidden bg-gray-900">
                {room.currentCoverUrl && <img src={room.currentCoverUrl} alt="" className="w-full h-full object-cover opacity-50" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${room.state === "playing" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-gray-700/50 text-gray-400 border border-gray-600/30"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${room.state === "playing" ? "bg-green-400" : "bg-gray-500"}`} />
                    {room.state === "playing" ? "LIVE" : "Idle"}
                  </span>
                  {room.password && <Lock size={12} className="text-yellow-400" />}
                </div>
                {room.state === "playing" && room.currentTitle && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs font-medium truncate flex items-center gap-1"><Play size={10} fill="currentColor" /> {room.currentTitle}</p>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-white font-medium text-sm truncate">{room.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">Hosted by {room.hostUsername}</p>
                {room.queue && room.queue.length > 0 && (
                  <p className="text-gray-500 text-xs mt-1 flex items-center gap-1"><Clock size={10} /> {room.queue.length} in queue</p>
                )}
                <button className="w-full mt-3 py-1.5 rounded-lg text-xs font-medium text-center transition-colors" style={{ background: "rgba(0,243,255,0.1)", border: "1px solid rgba(0,243,255,0.2)", color: "var(--neon-cyan)" }}>
                  {room.password ? "🔒 Enter with password" : "Join Room"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {passwordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="glass rounded-xl p-6 w-full max-w-sm neon-border animate-fade-in">
            <h3 className="text-white font-bold mb-1">{passwordPrompt.name}</h3>
            <p className="text-gray-400 text-sm mb-4">This room is password protected</p>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === "Enter" && submitPassword()} placeholder="Enter room password" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 mb-4" autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setPasswordPrompt(null)} className="flex-1 py-2 rounded-lg text-gray-400 bg-white/10 hover:bg-white/20 text-sm">Cancel</button>
              <button onClick={submitPassword} className="flex-1 neon-btn py-2 rounded-lg text-sm font-medium">Join</button>
            </div>
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
