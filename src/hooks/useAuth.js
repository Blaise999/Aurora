"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * useAuth — app auth (email/login/signup first, wallet later)
 *
 * Returns:
 * {
 *   user,
 *   session,
 *   profile,
 *   isAuthed,
 *   login,
 *   logout,
 *   loading
 * }
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }

    const email =
      authUser.email || `user_${String(authUser.id).slice(0, 8)}@local.app`;

    let { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email, first_name, username, wallet_address, avatar_url")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) {
      console.error("Profile fetch failed:", fetchError);
    }

    if (existingProfile) {
      setProfile(existingProfile);
      return existingProfile;
    }

    const fullName =
      authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      "User";

    const firstName =
      authUser.user_metadata?.first_name ||
      fullName.split(" ")[0] ||
      "User";

    const username =
      authUser.user_metadata?.username ||
      email.split("@")[0] ||
      `user_${String(authUser.id).slice(0, 8)}`;

    const avatarUrl =
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      null;

    const { data: createdProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        email,
        first_name: firstName,
        username,
        avatar_url: avatarUrl,
      })
      .select("id, email, first_name, username, wallet_address, avatar_url")
      .single();

    if (createError) {
      console.error("Profile creation failed:", createError);
      setProfile(null);
      return null;
    }

    setProfile(createdProfile);
    return createdProfile;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth session load failed:", error);
        }

        if (!mounted) return;

        setSession(session || null);
        setUser(session?.user || null);

        if (session?.user) {
          await ensureProfile(session.user);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("useAuth init error:", err);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession || null);
      setUser(nextSession?.user || null);

      if (nextSession?.user) {
        await ensureProfile(nextSession.user);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [ensureProfile]);

  const login = useCallback(async () => {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout failed:", error);
      }
    } catch (err) {
      console.error("Logout crashed:", err);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);

      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  }, []);

  return {
    user,
    session,
    profile,
    isAuthed: Boolean(user),
    login,
    logout,
    loading,
  };
}