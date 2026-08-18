"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────
interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string;
}

interface UserSession {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
}

// ── Guest mode helpers ────────────────────────────────────────────
export function setGuestMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) {
    localStorage.setItem("medai_guest", "true");
  } else {
    localStorage.removeItem("medai_guest");
  }
}

export function isGuestMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("medai_guest") === "true";
}

// ── Session fetch helper ──────────────────────────────────────────
async function fetchSessionData(): Promise<{
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

// ── Session fetch hook ────────────────────────────────────────────
export function useSession() {
  const [session, setSession] = useState<UserSession>({
    user: null,
    isAuthenticated: false,
    isGuest: false,
    isLoading: true,
  });
  const mountedRef = useRef(false);

  const refresh = useCallback(async () => {
    const data = await fetchSessionData();
    const guest = isGuestMode();
    setSession({
      user: data.user,
      isAuthenticated: data.isAuthenticated,
      isGuest: guest && !data.isAuthenticated,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    let cancelled = false;
    (async () => {
      const data = await fetchSessionData();
      if (cancelled) return;
      const guest = isGuestMode();
      setSession({
        user: data.user,
        isAuthenticated: data.isAuthenticated,
        isGuest: guest && !data.isAuthenticated,
        isLoading: false,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { ...session, refresh };
}

// ── Sign in via credentials ───────────────────────────────────────
export async function signInClient(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // next-auth v5 credentials callback
    const res = await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email, password }).toString(),
      redirect: "manual",
    });

    // A redirect means success for next-auth credentials
    if (res.status === 303 || res.ok) {
      // Clear guest mode on successful sign in
      setGuestMode(false);
      return { success: true };
    }

    return { success: false, error: "Invalid credentials" };
  } catch {
    return { success: false, error: "Network error" };
  }
}

// ── Sign out ──────────────────────────────────────────────────────
export async function signOutClient(): Promise<void> {
  try {
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ callbackUrl: "/" }).toString(),
      redirect: "manual",
    });
  } catch {
    // ignore
  }
  setGuestMode(false);
}
