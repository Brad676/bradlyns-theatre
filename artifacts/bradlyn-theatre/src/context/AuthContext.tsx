import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { setAuthToken, apiGet, apiPost } from "@/lib/api";

type User = { userId: number; username: string };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
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
        .then(r => r.json())
        .then((data: User) => setUser(data))
        .catch(() => {
          setAuthToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const r = await apiPost("auth/login", { username, password });
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.error ?? "Login failed");
    }
    const data = await r.json() as { token: string; user: User };
    setAuthToken(data.token);
    setUser(data.user);
  };

  const register = async (username: string, password: string) => {
    const r = await apiPost("auth/register", { username, password });
    if (!r.ok) {
      const e = await r.json();
      throw new Error(e.error ?? "Registration failed");
    }
    const data = await r.json() as { token: string; user: User };
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
