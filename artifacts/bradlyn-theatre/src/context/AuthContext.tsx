import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { setAuthToken, apiGet, apiPost } from "@/lib/api";

type User = { userId: number; username: string };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("bt_token");
    if (token) {
      setAuthToken(token);
      apiGet("auth/me")
        .then(r => {
          if (!r.ok) throw new Error("Token invalid");
          return r.json();
        })
        .then((data: User) => {
          if (data && data.userId) setUser(data);
          else throw new Error("Bad user data");
        })
        .catch(() => {
          setAuthToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    let r: Response;
    try {
      r = await apiPost("auth/login", { username, password });
    } catch {
      throw new Error("Cannot reach server. Check your connection.");
    }
    if (!r.ok) {
      let msg = "Login failed";
      try { const e = await r.json(); msg = e.error ?? msg; } catch { /* ignore */ }
      throw new Error(msg);
    }
    let data: { token: string; user: User };
    try {
      data = await r.json() as { token: string; user: User };
    } catch {
      throw new Error("Unexpected server response. Please try again.");
    }
    setAuthToken(data.token);
    setUser(data.user);
  };

  const register = async (username: string, password: string, email?: string) => {
    let r: Response;
    try {
      r = await apiPost("auth/register", { username, password, ...(email ? { email } : {}) });
    } catch {
      throw new Error("Cannot reach server. Check your connection.");
    }
    if (!r.ok) {
      let msg = "Registration failed";
      try { const e = await r.json(); msg = e.error ?? msg; } catch { /* ignore */ }
      throw new Error(msg);
    }
    let data: { token: string; user: User };
    try {
      data = await r.json() as { token: string; user: User };
    } catch {
      throw new Error("Unexpected server response. Please try again.");
    }
    setAuthToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
