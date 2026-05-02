import { useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, User, Film, Star, Play } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

type Mode = "login" | "register";

const FEATURE_HIGHLIGHTS = [
  { icon: Film, label: "Thousands of titles" },
  { icon: Star, label: "Personalized lists" },
  { icon: Play, label: "Watch rooms with friends" },
];

export default function AuthGate() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login, register } = useAuth();
  const { toast } = useToast();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = "Username is required";
    else if (username.length < 3) errs.username = "At least 3 characters";
    if (mode === "register") {
      if (!email.trim()) errs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
      if (password.length < 6) errs.password = "At least 6 characters";
      if (password !== confirmPassword) errs.confirmPassword = "Passwords don't match";
    } else {
      if (!password) errs.password = "Password is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "login") {
        await login(username, password);
        toast("Welcome back!", "success");
      } else {
        await register(username, password, email);
        toast("Account created! Welcome to Bradlyn's Theatre!", "success");
      }
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPass(false);
    setShowConfirm(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative overflow-hidden p-12"
        style={{ background: "linear-gradient(135deg, #0a0f1f 0%, #0d1630 50%, #0a0f1f 100%)" }}>
        {/* Grid background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(0,243,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,243,255,0.04) 1px, transparent 1px)",
          backgroundSize: "50px 50px"
        }} />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,243,255,0.07) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(157,0,255,0.07) 0%, transparent 70%)" }} />

        <div className="relative z-10">
          <h1 className="text-4xl font-bold neon-text">🎭 Bradlyn's theatre</h1>
          <p className="text-gray-400 mt-3 text-lg leading-relaxed max-w-sm">
            Your cinematic universe — movies, series, watch rooms, and more. All in one place.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {FEATURE_HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Icon size={16} className="text-cyan-400" />
              </div>
              <span className="text-gray-300 text-sm">{label}</span>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-gray-600 text-xs">
          © {new Date().getFullYear()} Bradlyn's Theatre. All rights reserved.
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: "#0a0f1f" }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold neon-text">🎭 Bradlyn's theatre</h1>
            <p className="text-gray-500 text-sm mt-1">Your cinematic universe</p>
          </div>

          {/* Card */}
          <div className="glass rounded-2xl p-8 border border-white/8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">
                {mode === "login" ? "Welcome back" : "Create account"}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {mode === "login"
                  ? "Sign in to continue watching"
                  : "Join and start exploring thousands of titles"}
              </p>
            </div>

            {/* Mode tabs */}
            <div className="flex rounded-xl overflow-hidden border border-white/8 mb-6 p-1 bg-white/3">
              <button
                onClick={() => switchMode("login")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "login" ? "bg-cyan-500/20 text-cyan-400 shadow" : "text-gray-500 hover:text-white"}`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchMode("register")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "register" ? "bg-cyan-500/20 text-cyan-400 shadow" : "text-gray-500 hover:text-white"}`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4" noValidate>
              {/* Username */}
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1.5 uppercase tracking-wide">Username</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setErrors(p => ({ ...p, username: "" })); }}
                    className={`w-full bg-white/5 border rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none text-sm transition-colors ${errors.username ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-cyan-500/50 focus:bg-white/8"}`}
                    placeholder="Choose a username"
                    autoComplete="username"
                  />
                </div>
                {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
              </div>

              {/* Email — only on register */}
              {mode === "register" && (
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1.5 uppercase tracking-wide">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
                      className={`w-full bg-white/5 border rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none text-sm transition-colors ${errors.email ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-cyan-500/50 focus:bg-white/8"}`}
                      placeholder="your@email.com"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
              )}

              {/* Password */}
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: "" })); }}
                    className={`w-full bg-white/5 border rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-gray-600 focus:outline-none text-sm transition-colors ${errors.password ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-cyan-500/50 focus:bg-white/8"}`}
                    placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Confirm password — only on register */}
              {mode === "register" && (
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1.5 uppercase tracking-wide">Confirm Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: "" })); }}
                      className={`w-full bg-white/5 border rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-gray-600 focus:outline-none text-sm transition-colors ${errors.confirmPassword ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-cyan-500/50 focus:bg-white/8"}`}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full neon-btn py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 mt-2 text-sm"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <p className="text-center text-gray-600 text-xs mt-6">
              {mode === "login" ? (
                <>Don't have an account?{" "}
                  <button onClick={() => switchMode("register")} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">Create one</button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button onClick={() => switchMode("login")} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">Sign in</button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
