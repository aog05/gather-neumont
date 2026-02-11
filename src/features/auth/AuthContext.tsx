import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthMe, AuthMode } from "./authTypes";
import { authStorage } from "./authStorage";

type AuthContextValue = {
  mode: AuthMode;
  me?: AuthMe;
  profileComplete: boolean | null;
  continueAsGuest: () => void;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<{ username: string; isAdmin: boolean; profileComplete: boolean | null } | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toModeFromMe(me: AuthMe | undefined): AuthMode {
  if (!me) return "unknown";
  return me.isAdmin ? "admin" : "user";
}

function parseUserFromApi(
  payload: unknown,
): { me: AuthMe; profileComplete: boolean | null } | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const anyPayload = payload as any;
  const user = anyPayload.user ?? anyPayload.me ?? anyPayload;
  if (!user || typeof user !== "object") return undefined;

  const username = (user as any).username;
  if (typeof username !== "string" || !username.trim()) return undefined;

  const isAdmin = Boolean((user as any).isAdmin ?? (user as any).admin);
  const profileComplete =
    typeof (user as any).profileComplete === "boolean" ? Boolean((user as any).profileComplete) : null;
  return { me: { username, isAdmin }, profileComplete };
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AuthMode>(() =>
    authStorage.isGuestChosen() ? "guest" : "unknown",
  );
  const [me, setMe] = useState<AuthMe | undefined>(undefined);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  const refreshInFlight = useRef<Promise<{ username: string; isAdmin: boolean; profileComplete: boolean | null } | null> | null>(null);
  const didInit = useRef(false);

  const continueAsGuest = useCallback(() => {
    authStorage.setGuestChosen(true);
    setMe(undefined);
    setProfileComplete(null);
    setMode("guest");
  }, []);

  const login = useCallback(async (username: string) => {
    authStorage.setGuestChosen(false);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    if (!res.ok) {
      let message = `Login failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.error) message = String(data.error);
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    const data = await res.json();
    const parsed = parseUserFromApi(data);
    if (!parsed) {
      throw new Error("Login succeeded but user payload was missing/invalid");
    }

    setMe(parsed.me);
    setMode(toModeFromMe(parsed.me));
    // Login doesn't guarantee the profile fields are included; refresh will populate this.
    setProfileComplete(parsed.profileComplete);
  }, []);

  const logout = useCallback(async () => {
    authStorage.setGuestChosen(false);
    setMe(undefined);
    setProfileComplete(null);
    setMode("unknown");

    try {
      sessionStorage.removeItem("guestMode");
    } catch {
      // ignore
    }

    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // If the endpoint doesn't exist or the network fails, client state is already cleared.
    }
  }, []);

  const refresh = useCallback(async () => {
    if (authStorage.isGuestChosen()) {
      setMe(undefined);
      setProfileComplete(null);
      setMode("guest");
      return null;
    }

    if (refreshInFlight.current) return refreshInFlight.current;

    refreshInFlight.current = (async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET", credentials: "include" });
        if (!res.ok) {
          // If the endpoint doesn't exist, keep "unknown" until login/guest.
          if (res.status === 404) return null;
          if (res.status === 401) {
            setMe(undefined);
            setProfileComplete(null);
            setMode("unknown");
            return null;
          }
          return null;
        }

        const data = await res.json();
        const parsed = parseUserFromApi(data);
        if (!parsed) {
          setMe(undefined);
          setProfileComplete(null);
          setMode("unknown");
          return null;
        }

        setMe(parsed.me);
        setProfileComplete(parsed.profileComplete);
        setMode(toModeFromMe(parsed.me));
        return { ...parsed.me, profileComplete: parsed.profileComplete };
      } catch {
        // keep current state
        return null;
      } finally {
        refreshInFlight.current = null;
      }
    })();

    return refreshInFlight.current;
  }, []);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ mode, me, profileComplete, continueAsGuest, login, logout, refresh }),
    [continueAsGuest, login, logout, me, mode, profileComplete, refresh],
  );

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
