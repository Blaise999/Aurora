'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';

/**
 * useAuth — handles SIWE authentication flow.
 * 1. GET /api/auth/nonce
 * 2. signMessage (SIWE format)
 * 3. POST /api/auth/verify
 *
 * Returns { session, isAuthed, login, logout, loading }
 */
export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const [session, setSession] = useState(null); // wallet address string
  const [loading, setLoading] = useState(false);

  const login = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      // 1. Get nonce
      const nonceRes = await fetch('/api/auth/nonce');
      const { nonce } = await nonceRes.json();

      // 2. Build SIWE message
      const domain = window.location.host;
      const origin = window.location.origin;
      const message = [
        `${domain} wants you to sign in with your Ethereum account:`,
        address,
        '',
        'Sign in to AuroraNft',
        '',
        `URI: ${origin}`,
        `Version: 1`,
        `Chain ID: ${parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10)}`,
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join('\n');

      // 3. Sign
      const signature = await signMessageAsync({ message });

      // 4. Verify
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature, address }),
      });

      const data = await verifyRes.json();
      if (data.ok) {
        setSession(data.address);
      } else {
        console.error('Auth failed:', data.error);
      }
    } catch (e) {
      console.error('Login error:', e);
    } finally {
      setLoading(false);
    }
  }, [address, signMessageAsync]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setSession(null);
    disconnect();
  }, [disconnect]);

  // Clear session when wallet disconnects
  useEffect(() => {
    if (!isConnected) setSession(null);
  }, [isConnected]);

  return {
    session,
    isAuthed: Boolean(session),
    login,
    logout,
    loading,
    address,
    isConnected,
  };
}
