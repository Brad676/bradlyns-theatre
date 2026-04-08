import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiPost, apiDelete } from "@/lib/api";

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  if (!user) return <div className="pt-20 px-4 text-center text-gray-400">Please sign in</div>;

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) { toast("Passwords don't match", "error"); return; }
    setLoading(true);
    const r = await apiPost("auth/change-password", { currentPassword: currentPass, newPassword: newPass });
    if (r.ok) {
      toast("Password changed successfully!", "success");
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
    } else {
      const e = await r.json();
      toast(e.error ?? "Failed", "error");
    }
    setLoading(false);
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== user.username) { toast("Username doesn't match", "error"); return; }
    await apiDelete("auth/account");
    logout();
    navigate("/");
    toast("Account deleted", "info");
  };

  return (
    <div className="pt-20 pb-12 max-w-lg mx-auto px-4">
      <Link href="/profile">
        <button className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6">
          <ArrowLeft size={16} /> Back to Profile
        </button>
      </Link>
      <h1 className="text-2xl font-bold text-white mb-8">Account Settings</h1>

      <div className="glass rounded-xl p-6 neon-border mb-6">
        <h2 className="text-white font-semibold mb-4">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Current Password</label>
            <input type={showPass ? "text" : "password"} value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50" required />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">New Password</label>
            <input type={showPass ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50" required minLength={6} />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Confirm New Password</label>
            <input type={showPass ? "text" : "password"} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50" required minLength={6} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="showP" checked={showPass} onChange={e => setShowPass(e.target.checked)} className="accent-cyan-400" />
            <label htmlFor="showP" className="text-sm text-gray-400 cursor-pointer">Show passwords</label>
          </div>
          <button type="submit" disabled={loading} className="neon-btn w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Update Password
          </button>
        </form>
      </div>

      <div className="glass rounded-xl p-6 border border-red-500/20">
        <h2 className="text-red-400 font-semibold mb-4 flex items-center gap-2"><Trash2 size={16} /> Delete Account</h2>
        <p className="text-gray-400 text-sm mb-4">This action is permanent and cannot be undone. All your data will be deleted.</p>
        <div className="space-y-3">
          <input
            type="text"
            placeholder={`Type "${user.username}" to confirm`}
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            className="w-full bg-white/5 border border-red-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
          />
          <button onClick={deleteAccount} disabled={deleteConfirm !== user.username} className="w-full py-2.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}
