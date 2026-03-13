'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Wallet, Loader2, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useSession } from '@/hooks/useSession';

// Wallet theme colors and UI
const WALLET_THEMES = {
  metaMask:         { name: 'MetaMask',        color: '#F6851B', bg: 'from-[#F6851B]/20 to-[#E2761B]/10', icon: '🦊', border: '#F6851B' },
  'io.metamask':    { name: 'MetaMask',        color: '#F6851B', bg: 'from-[#F6851B]/20 to-[#E2761B]/10', icon: '🦊', border: '#F6851B' },
  injected:         { name: 'Browser Wallet',  color: '#627EEA', bg: 'from-[#627EEA]/20 to-[#627EEA]/10', icon: '🌐', border: '#627EEA' },
  coinbaseWallet:   { name: 'Coinbase Wallet', color: '#0052FF', bg: 'from-[#0052FF]/20 to-[#0052FF]/10', icon: '🔵', border: '#0052FF' },
  coinbaseWalletSDK:{ name: 'Coinbase Wallet', color: '#0052FF', bg: 'from-[#0052FF]/20 to-[#0052FF]/10', icon: '🔵', border: '#0052FF' },
  walletConnect:    { name: 'WalletConnect',   color: '#3B99FC', bg: 'from-[#3B99FC]/20 to-[#3B99FC]/10', icon: '🔗', border: '#3B99FC' },
  safe:             { name: 'Safe',            color: '#12FF80', bg: 'from-[#12FF80]/20 to-[#12FF80]/10', icon: '🔒', border: '#12FF80' },
};

function getWalletTheme(connectorId) {
  return WALLET_THEMES[connectorId] || WALLET_THEMES.injected;
}

export default function ConnectWalletPage() {
  const router = useRouter();
  const { session, profile, isLoggedIn, refreshSession } = useSession();
  const { connectors, connect, isPending, error: connectError } = useConnect();
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { disconnect } = useDisconnect();

  const [phase, setPhase] = useState('detect'); // detect | greeting | username | saving | done
  const [detectedWallet, setDetectedWallet] = useState(null);
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [connectingId, setConnectingId] = useState(null);

  const firstName = session?.firstName || profile?.first_name || 'User';

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn && !session) {
      const timer = setTimeout(() => router.replace('/login'), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, session, router]);

  // If already has wallet, skip to profile
  useEffect(() => {
    if (profile?.wallet_address) {
      router.replace('/profile');
    }
  }, [profile, router]);

  // Detect available wallets
  useEffect(() => {
    if (phase !== 'detect') return;
    // Auto-detect injected wallet
    const hasInjected = typeof window !== 'undefined' && !!window.ethereum;
    if (hasInjected) {
      // Try to identify the injected wallet
      const eth = window.ethereum;
      if (eth.isMetaMask) setDetectedWallet('metaMask');
      else if (eth.isCoinbaseWallet) setDetectedWallet('coinbaseWallet');
      else if (eth.isBraveWallet) setDetectedWallet('injected');
      else if (eth.isTrust) setDetectedWallet('injected');
      else setDetectedWallet('injected');
    }
  }, [phase]);

  // When wallet connects, move to greeting
  useEffect(() => {
    if (isConnected && address && phase === 'detect') {
      const walletId = activeConnector?.id || detectedWallet || 'injected';
      setDetectedWallet(walletId);
      setPhase('greeting');
      // Auto-advance to username after 2.5 seconds
      setTimeout(() => setPhase('username'), 2500);
    }
  }, [isConnected, address, phase, activeConnector, detectedWallet]);

  const handleConnect = useCallback((connector) => {
    setConnectingId(connector.id);
    setError('');
    connect(
      { connector },
      {
        onSuccess: () => {
          setConnectingId(null);
          setDetectedWallet(connector.id);
          setPhase('greeting');
          setTimeout(() => setPhase('username'), 2500);
        },
        onError: (err) => {
          setConnectingId(null);
          if (err?.message?.includes('rejected')) {
            setError('Connection rejected. Try again.');
          } else if (err?.message?.includes('provider') || err?.message?.includes('not found')) {
            setError(`${connector.name || 'Wallet'} not detected. Try another wallet or install the extension.`);
          } else {
            setError(err?.shortMessage || err?.message || 'Connection failed');
          }
        },
      }
    );
  }, [connect]);

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const walletTheme = getWalletTheme(detectedWallet);
      const res = await fetch('/api/profile/connect-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          username: username.trim(),
          walletType: walletTheme.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setPhase('done');
      await refreshSession();
      setTimeout(() => router.push('/profile'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const theme = getWalletTheme(detectedWallet);

  // Deduplicate connectors
  const wallets = connectors.reduce((acc, c) => {
    const t = getWalletTheme(c.id);
    if (!acc.find(w => w.theme.name === t.name)) acc.push({ connector: c, theme: t });
    return acc;
  }, []);

  if (!isLoggedIn) {
    return <div className="min-h-[85vh] flex items-center justify-center"><Loader2 className="animate-spin text-accent" size={28} /></div>;
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[200px] transition-colors duration-1000" style={{ background: `${theme.color}10` }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-3">
            <Image src="/pictures/logo.png" alt="AuroraNft" fill className="object-contain drop-shadow-[0_0_30px_rgba(0,229,255,0.3)]" />
          </div>
        </div>

        {/* Phase: Detect / Choose Wallet */}
        {phase === 'detect' && (
          <div className="glass-strong rounded-2xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-display font-extrabold text-2xl text-text">
                Hey {firstName}, connect your wallet
              </h2>
              <p className="text-muted text-sm">Choose your wallet to continue</p>
            </div>

            <div className="space-y-3">
              {wallets.map(({ connector, theme: wTheme }) => (
                <button
                  key={connector.uid || connector.id}
                  onClick={() => handleConnect(connector)}
                  disabled={!!connectingId}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  style={{
                    background: connectingId === connector.id ? `${wTheme.color}15` : 'rgba(255,255,255,0.02)',
                    borderColor: connectingId === connector.id ? `${wTheme.color}40` : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-2xl">{wTheme.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="font-display font-semibold text-sm text-text">{wTheme.name}</p>
                  </div>
                  {connectingId === connector.id ? (
                    <Loader2 size={16} className="animate-spin" style={{ color: wTheme.color }} />
                  ) : (
                    <ArrowRight size={16} className="text-muted-dim" />
                  )}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20">
                <AlertTriangle size={14} className="text-danger mt-0.5 shrink-0" />
                <p className="text-xs text-danger">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Phase: Greeting — styled with wallet theme */}
        {phase === 'greeting' && (
          <div
            className="rounded-2xl p-10 text-center space-y-6 border animate-fade-in"
            style={{
              background: `linear-gradient(135deg, ${theme.color}12, ${theme.color}06)`,
              borderColor: `${theme.color}30`,
            }}
          >
            <div className="text-6xl animate-float">{theme.icon}</div>
            <div>
              <h2 className="font-display font-extrabold text-2xl" style={{ color: theme.color }}>
                Welcome to {theme.name} Connect!
              </h2>
              <p className="text-muted text-sm mt-2">
                Wallet detected and connected
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" style={{ color: theme.color }} />
              <span className="text-xs text-muted">Preparing your profile...</span>
            </div>
          </div>
        )}

        {/* Phase: Username Input */}
        {phase === 'username' && (
          <div
            className="rounded-2xl p-8 border space-y-6 animate-fade-in"
            style={{
              background: `linear-gradient(135deg, ${theme.color}08, transparent)`,
              borderColor: `${theme.color}25`,
            }}
          >
            <div className="text-center space-y-2">
              <span className="text-4xl">{theme.icon}</span>
              <h2 className="font-display font-bold text-xl text-text">Almost there!</h2>
              <p className="text-muted text-sm">Choose your username</p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')); setError(''); }}
                placeholder="satoshi_nakamoto"
                maxLength={30}
                className="w-full px-4 py-3.5 rounded-xl bg-surface2 border border-border-light text-text placeholder:text-muted-dim/40 focus:outline-none focus:ring-1 transition-all text-sm font-mono"
                style={{ borderColor: username ? `${theme.color}40` : undefined, boxShadow: username ? `0 0 0 1px ${theme.color}20` : undefined }}
                autoFocus
              />
              <p className="text-[11px] text-muted-dim text-center leading-relaxed mt-4">
                Enter your web3 alias — make it legendary! ✨
              </p>
            </div>

            {error && <p className="text-danger text-xs text-center">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving || !username.trim()}
              className="w-full py-3.5 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: theme.color, color: '#070A10' }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {saving ? 'Saving...' : 'Continue'}
            </button>

            <div className="text-center">
              <p className="text-[10px] text-muted-dim font-mono">
                Connected: {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Phase: Done */}
        {phase === 'done' && (
          <div className="rounded-2xl p-10 text-center space-y-6 glass-strong animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto">
              <Check size={32} className="text-success" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-text">All Set!</h2>
              <p className="text-muted text-sm mt-1">Welcome to AuroraNFT, <span className="text-accent font-semibold">@{username}</span></p>
            </div>
            <Loader2 size={20} className="animate-spin text-accent mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
