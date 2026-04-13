import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase, USE_SUPABASE } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

const logAuth = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log("[AUTH]", ...args);
  }
};

const PROFILE_TIMEOUT_MS = 20000; // free-tier Supabase can take 10-15s on cold start

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

interface Profile {
  id: string;
  agency_id: string | null;
  full_name: string;
  role: string;
}

interface AuthContextType {
  /** null = not logged in (or mock mode) */
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  /** true while we're restoring session / fetching profile */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Update specific fields of the in-memory profile (e.g. after onboarding sets agency_id). */
  updateProfile: (fields: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

// ----- Mock values when Supabase is off -----
const MOCK_PROFILE: Profile = {
  id: "mock-user",
  agency_id: "agence-durand",
  full_name: "Démo Durand",
  role: "gestionnaire",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(USE_SUPABASE ? null : MOCK_PROFILE);
  const [loading, setLoading] = useState(USE_SUPABASE); // only wait when Supabase is on
  const profileCacheRef = useRef<Map<string, Profile>>(new Map());

  // Fetch profile row from public.profiles.
  // Retries up to 4 times with backoff to handle the signup race condition where
  // onAuthStateChange fires before the on_auth_user_created trigger has committed.
  const fetchProfile = useCallback(async (authUser: User): Promise<Profile | null> => {
    const cached = profileCacheRef.current.get(authUser.id);
    if (cached) return cached;

    const delays = [0, 300, 600, 1000]; // ms between attempts (trigger commits in <500ms)

    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (delays[attempt] > 0) {
        await new Promise(r => setTimeout(r, delays[attempt]));
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, agency_id, full_name, role")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch profile", error);
        return null;
      }

      if (data) {
        const resolved = data as Profile;
        profileCacheRef.current.set(authUser.id, resolved);
        return resolved;
      }

      logAuth(`Profile not found yet (attempt ${attempt + 1}/${delays.length}) — trigger may not have committed`);
    }

    console.error("No profile found for user after retries", { userId: authUser.id });
    return null;
  }, []);

  const applySession = useCallback(async (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);

    if (newSession?.user) {
      // Avoid duplicate hydration work when auth emits multiple events for same user.
      if (profile?.id === newSession.user.id) {
        return;
      }

      // Try to fetch profile from DB, but never block more than 5s.
      // If HTTP hangs, use a local fallback profile so the app can proceed.
      try {
        const p = await withTimeout(
            fetchProfile(newSession.user),
            PROFILE_TIMEOUT_MS, // Utilise ta constante (8000ms)
            "profile_timeout",
        );
        if (p) {
          setProfile(p);
        } else {
          console.error("No profile found for user during session application", {
            userId: newSession.user.id,
          });
          setProfile(null);
        }
      } catch {
        console.error("Profile fetch timed out or failed");
        setProfile(null);
      }
      return;
    }

    setProfile(null);
  }, [fetchProfile]);

  // Restore session on mount + listen for auth changes.
  // loading stays true until user + profile are both resolved.
  useEffect(() => {
    if (!USE_SUPABASE) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // Bootstrap from current session. Timeout after 5s if getSession hangs.
    void (async () => {
      try {
        setLoading(true);
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          "getSession_timeout",
        );
        if (error) {
          console.error("Failed to restore session", error);
          if (mounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
          return;
        }

        if (mounted) {
          await applySession(data.session ?? null);
        }
      } catch {
        logAuth("getSession timed out — will rely on onAuthStateChange");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        logAuth("onAuthStateChange", { event: _event, hasSession: Boolean(newSession) });

        // Skip INITIAL_SESSION — the bootstrap getSession() above handles it.
        if (_event === "INITIAL_SESSION") return;

        // Only set loading if we don't have a profile yet (avoid re-blocking UI).
        const needsProfile = !profile || profile.id !== newSession?.user?.id;
        if (needsProfile) setLoading(true);
        try {
          await applySession(newSession);
        } finally {
          setLoading(false);
        }

        // Redirect to login on explicit sign-out
        if (_event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setProfile(null);
          window.location.href = "/#/login";
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  // signIn: fire signInWithPassword and race it against the onAuthStateChange
  // event that Supabase emits. The HTTP response sometimes never resolves
  // (browser quirk / proxy / service-worker), but the auth event always fires.
  const signIn = useCallback((email: string, password: string): Promise<{ error: string | null }> => {
    logAuth("signIn start", { email });

    return new Promise((resolve) => {
      let settled = false;
      const settle = (result: { error: string | null }) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      // Listen for auth state change — this fires even when the HTTP response hangs.
      const { data: { subscription: signInSub } } = supabase.auth.onAuthStateChange(
        (event) => {
          if (event === "SIGNED_IN") {
            logAuth("signIn resolved via SIGNED_IN event");
            signInSub.unsubscribe();
            settle({ error: null });
          }
        },
      );

      // Also await the HTTP response in case it does resolve.
      supabase.auth.signInWithPassword({ email, password })
        .then(({ error: signInError }) => {
          if (signInError) {
            logAuth("signIn HTTP error", { message: signInError.message });
            signInSub.unsubscribe();
            settle({ error: signInError.message });
          } else {
            logAuth("signIn HTTP success");
            signInSub.unsubscribe();
            settle({ error: null });
          }
        })
        .catch((err) => {
          logAuth("signIn HTTP exception (ignored — waiting for event)", err);
          // Don't settle on network error — the event listener may still fire.
        });

      // Hard timeout: if nothing fires within 20s, give up.
      window.setTimeout(() => {
        signInSub.unsubscribe();
        settle({ error: "Timeout de connexion. Vérifie ta connexion réseau." });
      }, 20000);
    });
  }, []);

  const signOut = useCallback(async () => {
    profileCacheRef.current.clear();
    localStorage.removeItem("claro_settings");
    localStorage.removeItem("onboardingStep");
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback((fields: Partial<Profile>) => {
    setProfile((prev) => {
      if (prev) {
        const updated = { ...prev, ...fields };
        profileCacheRef.current.set(updated.id, updated);
        return updated;
      }
      // No existing profile — bootstrap from current auth user
      if (!user) return prev;
      const newProfile: Profile = {
        id: user.id,
        agency_id: fields.agency_id ?? null,
        full_name: fields.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Utilisateur",
        role: fields.role ?? "gestionnaire",
      };
      profileCacheRef.current.set(newProfile.id, newProfile);
      logAuth("updateProfile: created profile from auth user", { id: newProfile.id });
      return newProfile;
    });
  }, [user]);

  const value = useMemo<AuthContextType>(
    () => ({ user, profile, session, loading, signIn, signOut, updateProfile }),
    [user, profile, session, loading, signIn, signOut, updateProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
