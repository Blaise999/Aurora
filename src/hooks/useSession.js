'use client';

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useRef,
} from 'react';

const SessionContext = createContext(null);

// module cache across remounts
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
      const res = await fetch('/api/auth/session', {
        method: 'GET',
        cache: 'no-store',
      });

      const data = await res.json();

      if (res.ok && data?.authenticated) {
        const nextSession = data.session || null;
        const nextProfile = data.profile || null;

        setSession(nextSession);
        setProfile(nextProfile);

        _sessionCache = nextSession;
        _profileCache = nextProfile;
      } else {
        setSession(null);
        setProfile(null);

        _sessionCache = null;
        _profileCache = null;
      }

      _fetched = true;
    } catch (err) {
      console.error('fetchSession error:', err);

      setSession(null);
      setProfile(null);

      _sessionCache = null;
      _profileCache = null;
      _fetched = true;
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!_fetched) {
      fetchSession();
    } else {
      setLoading(false);
    }
  }, [fetchSession]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('logout error:', err);
    }

    // Obliterate ALL state
    setSession(null);
    setProfile(null);

    _sessionCache = null;
    _profileCache = null;
    _fetched = false;

    // Disconnect wagmi if active
    try {
      const { disconnect } = await import('wagmi/actions');
      const { wagmiConfig } = await import('@/lib/web3/wagmi-config');
      disconnect(wagmiConfig);
    } catch (_) {}

    // Clear any lingering storage
    try {
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        keys.forEach((k) => {
          if (
            k.startsWith('wagmi') ||
            k.startsWith('wc@') ||
            k.startsWith('walletconnect') ||
            k.startsWith('-walletlink') ||
            k.includes('coinbase')
          ) {
            localStorage.removeItem(k);
          }
        });
        sessionStorage.clear();
      }
    } catch (_) {}
  }, []);

  const refreshSession = useCallback(async () => {
    _fetched = false;
    await fetchSession();
  }, [fetchSession]);

  const updateProfileLocal = useCallback((patch) => {
    setProfile((prev) => {
      const next = { ...(prev || {}), ...(patch || {}) };
      _profileCache = next;
      return next;
    });
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        profile,
        loading,
        logout,
        refreshSession,
        updateProfileLocal,
        isLoggedIn: !!session?.email,
        linkedWallet: profile?.wallet_address || session?.wallet || null,
        hasLinkedWallet: !!(profile?.wallet_address || session?.wallet),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}