'use client';

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

const SessionContext = createContext(null);

// Module-level cache so session is shared across hot-remounts
let _sessionCache = null;
let _profileCache = null;
let _fetched = false;

export function SessionProvider({ children }) {
  const [session, setSession] = useState(_sessionCache);
  const [profile, setProfile] = useState(_profileCache);
  const [loading, setLoading] = useState(!_fetched);
  const fetchingRef = useRef(false);

  const fetchSession = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.authenticated) {
        setSession(data.session);
        setProfile(data.profile);
        _sessionCache = data.session;
        _profileCache = data.profile;
      } else {
        setSession(null);
        setProfile(null);
        _sessionCache = null;
        _profileCache = null;
      }
      _fetched = true;
    } catch {
      setSession(null);
      setProfile(null);
      _sessionCache = null;
      _profileCache = null;
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Only fetch if we haven't cached a result yet
    if (!_fetched) {
      fetchSession();
    } else {
      setLoading(false);
    }
  }, [fetchSession]);

  const logout = useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setSession(null);
    setProfile(null);
    _sessionCache = null;
    _profileCache = null;
    _fetched = false;
  }, []);

  const refreshSession = useCallback(async () => {
    _fetched = false;
    await fetchSession();
  }, [fetchSession]);

  return (
    <SessionContext.Provider value={{ session, profile, loading, logout, refreshSession, isLoggedIn: !!session?.email }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
