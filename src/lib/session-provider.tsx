"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface ClientUser {
  id: string;
  name: string;
  role: "CITIZEN" | "LAWYER" | "ADMIN";
  phone: string;
  email?: string;
  lawyerId?: string;
  language?: "ar" | "en";
}

interface SessionCtx {
  user: ClientUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    if (typeof window !== "undefined") window.location.href = "/";
  };

  useEffect(() => {
    refresh();
  }, []);

  return <Ctx.Provider value={{ user, loading, refresh, signOut }}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) return { user: null, loading: false, refresh: async () => {}, signOut: async () => {} };
  return v;
}
