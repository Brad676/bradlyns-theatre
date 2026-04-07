import { useState } from "react";
import { X, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

type Props = { onClose: () => void };

export function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password);
      toast(mode === "login" ? "Welcome back!" : "Account created!", "success");
      onClose();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="glass rounded-xl w-full max-w-sm p-6 neon-border relative animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={20} />
        </button>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold neon-text">Bradlyn's Theatre</h2>
          <p className="text-gray-400 text-sm mt-1">{mode === "login" ? "Sign in to your account" : "Create an account"}</p>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-white/10 mb-6">
          <button onClick={() => setMode("login")} className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "login" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"}`}>Login</button>
          <button onClick={() => setMode("register")} className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "register" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400 hover:text-white"}`}>Register</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-sm"
              placeholder="Enter username"
              required
              minLength={3}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-sm"
                placeholder="Enter password"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full neon-btn py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
