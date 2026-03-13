'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.authenticated) {
        setSession(data.session);
        setProfile(data.profile);
      } else {
        setSession(null);
        setProfile(null);
      }
    } catch {
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const logout = useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setSession(null);
    setProfile(null);
  }, []);

  const refreshSession = fetchSession;

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
