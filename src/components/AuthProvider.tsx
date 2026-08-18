"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  signInClient,
  signOutClient,
  setGuestMode,
  isGuestMode,
} from "@/lib/auth-client";

// ── Types ─────────────────────────────────────────────────────────
interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginAsGuest: () => void;
  refresh: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  loginAsGuest: () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ── Session fetch helper ──────────────────────────────────────────
async function fetchSession(): Promise<{
  user: AuthUser | null;
  isAuthenticated: boolean;
}> {
  try {
    const res = await fetch("/api/auth/session");
    if (res.ok) {
      const data = await res.json();
      if (data?.user) {
        return { user: data.user, isAuthenticated: true };
      }
    }
  } catch {
    // ignore
  }
  return { user: null, isAuthenticated: false };
}

// ── Provider ──────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(false);

  // Initial session fetch on mount
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    let cancelled = false;
    (async () => {
      const session = await fetchSession();
      if (cancelled) return;
      if (session.isAuthenticated) {
        setUser(session.user);
        setIsAuthenticated(true);
        setIsGuest(false);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsGuest(isGuestMode());
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    const session = await fetchSession();
    if (session.isAuthenticated) {
      setUser(session.user);
      setIsAuthenticated(true);
      setIsGuest(false);
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setIsGuest(isGuestMode());
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await signInClient(email, password);
      if (result.success) {
        await refresh();
      }
      return result;
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await signOutClient();
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(false);
    // Redirect to home
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, []);

  const loginAsGuest = useCallback(() => {
    setGuestMode(true);
    setIsGuest(true);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isGuest,
        isLoading,
        login,
        logout,
        loginAsGuest,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
