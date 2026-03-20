'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Wallet, Loader2, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useSession } from '@/hooks/useSession';

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
  const searchParams = useSearchParams();
  const reconnectMode = searchParams.get('mode') === 'reconnect';

  const { session, profile, isLoggedIn, refreshSession } = useSession();
  const { connectors, connect } = useConnect();
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { disconnect } = useDisconnect();

  const [phase, setPhase] = useState('detect'); // detect | username | saving | done
  const [detectedWallet, setDetectedWallet] = useState(null);
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [connectingId, setConnectingId] = useState(null);
  const [disconnectingForReconnect, setDisconnectingForReconnect] = useState(false);

  const firstName = session?.firstName || profile?.first_name || 'User';

  useEffect(() => {
    if (!isLoggedIn && !session) {
      const timer = setTimeout(() => router.replace('/login'), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, session, router]);

  useEffect(() => {
    if (profile?.wallet_address && !reconnectMode) {
      router.replace('/profile');
    }
  }, [profile, reconnectMode, router]);

  useEffect(() => {
    if (profile?.username) {
      setUsername(profile.username);
    }
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function prepareReconnect() {
      if (!reconnectMode) return;

      try {
        setDisconnectingForReconnect(true);
        setError('');

        try {
          await disconnect();
        } catch (err) {
          console.error('Initial disconnect failed:', err);
        }

        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('wagmi.wallet');
            localStorage.removeItem('wagmi.connected');
            localStorage.removeItem('walletconnect');
            localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
            localStorage.removeItem('wagmi.store');
          }
        } catch (err) {
          console.error('Failed clearing wallet cache:', err);
        }

        if (!cancelled) {
          setDisconnectingForReconnect(false);
        }
      } catch (err) {
        if (!cancelled) {
          setDisconnectingForReconnect(false);
          setError('Could not reset current wallet session.');
        }
      }
    }

    prepareReconnect();

    return () => {
      cancelled = true;
    };
  }, [reconnectMode, disconnect]);

  const handleSaveDirect = useCallback(async (walletIdOverride) => {
    const walletId = walletIdOverride || detectedWallet || activeConnector?.id || 'injected';
    const walletTheme = getWalletTheme(walletId);

    setSaving(true);
    setPhase('saving');
    setError('');

    try {
      const res = await fetch('/api/profile/connect-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          username: profile?.username || username.trim(),
          walletType: walletTheme.name,
          reconnectMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setPhase('done');
      await refreshSession();
      setTimeout(() => router.push('/profile'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to save');
      setPhase(profile?.username || reconnectMode ? 'detect' : 'username');
    } finally {
      setSaving(false);
    }
  }, [detectedWallet, activeConnector, address, profile, username, reconnectMode, refreshSession, router]);

  useEffect(() => {
    if (searchParams.get('modal') === 'completed' && isConnected && address) {
      const walletId = searchParams.get('wallet') || activeConnector?.id || 'injected';
      setDetectedWallet(walletId);

      if (reconnectMode || profile?.username) {
        handleSaveDirect(walletId);
      } else {
        setPhase('username');
      }

      router.replace(reconnectMode ? '/connect-wallet?mode=reconnect' : '/connect-wallet');
    }
  }, [searchParams, isConnected, address, activeConnector, reconnectMode, profile, router, handleSaveDirect]);

  useEffect(() => {
    if (phase !== 'detect') return;
    const hasInjected = typeof window !== 'undefined' && !!window.ethereum;
    if (hasInjected) {
      const eth = window.ethereum;
      if (eth.isMetaMask) setDetectedWallet('metaMask');
      else if (eth.isCoinbaseWallet) setDetectedWallet('coinbaseWallet');
      else if (eth.isBraveWallet || eth.isTrust) setDetectedWallet('injected');
      else setDetectedWallet('injected');
    }
  }, [phase]);

  const handleConnect = useCallback((connector) => {
    setConnectingId(connector.id);
    setError('');

    connect(
      { connector },
      {
        onSuccess: () => {
          setConnectingId(null);
          const walletId = connector.id;
          router.push(`/welcome?wallet=${walletId}${reconnectMode ? '&mode=reconnect' : ''}`);
        },
        onError: (err) => {
          setConnectingId(null);
          if (err?.message?.includes('rejected')) {
            setError('Connection rejected. Try again.');
          } else {
            setError(err?.shortMessage || err?.message || 'Connection failed');
          }
        },
      }
    );
  }, [connect, router, reconnectMode]);

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    await handleSaveDirect();
  };

  const theme = getWalletTheme(detectedWallet);

  const wallets = connectors.reduce((acc, c) => {
    const t = getWalletTheme(c.id);
    if (!acc.find(w => w.theme.name === t.name)) acc.push({ connector: c, theme: t });
    return acc;
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  if (disconnectingForReconnect) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4">
        <div className="glass-strong rounded-2xl p-10 text-center space-y-5 w-full max-w-md">
          <Loader2 size={24} className="animate-spin text-accent mx-auto" />
          <div>
            <h2 className="font-display font-bold text-xl text-text">Resetting wallet session</h2>
            <p className="text-sm text-muted mt-2">
              Disconnecting the current wallet so you can connect another one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[200px] transition-colors duration-1000"
          style={{ background: `${theme.color}10` }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-3">
            <Image
              src="/pictures/logo.png"
              alt="AuroraNft"
              fill
              className="object-contain drop-shadow-[0_0_30px_rgba(0,229,255,0.3)]"
            />
          </div>
        </div>

        {phase === 'detect' && (
          <div className="glass-strong rounded-2xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-display font-extrabold text-2xl text-text">
                {reconnectMode ? 'Connect another wallet' : `Hey ${firstName}, connect your wallet`}
              </h2>
              <p className="text-muted text-sm">
                {reconnectMode
                  ? 'Your current wallet session has been cleared. Choose a wallet to continue.'
                  : 'Choose your wallet to continue'}
              </p>
            </div>

            {reconnectMode && profile?.wallet_address && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-dim mb-1">
                  Previously linked wallet
                </p>
                <p className="font-mono text-sm text-text">
                  {profile.wallet_address.slice(0, 8)}...{profile.wallet_address.slice(-6)}
                </p>
              </div>
            )}

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
                onChange={(e) => {
                  setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''));
                  setError('');
                }}
                placeholder="satoshi_nakamoto"
                maxLength={30}
                className="w-full px-4 py-3.5 rounded-xl bg-surface2 border border-border-light text-text placeholder:text-muted-dim/40 focus:outline-none focus:ring-1 transition-all text-sm font-mono"
                style={{
                  borderColor: username ? `${theme.color}40` : undefined,
                  boxShadow: username ? `0 0 0 1px ${theme.color}20` : undefined,
                }}
                autoFocus
              />
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

        {phase === 'saving' && (
          <div className="rounded-2xl p-10 text-center space-y-6 glass-strong animate-fade-in">
            <Loader2 size={20} className="animate-spin text-accent mx-auto" />
            <div>
              <h2 className="font-display font-bold text-xl text-text">
                {reconnectMode ? 'Updating wallet...' : 'Setting things up...'}
              </h2>
              <p className="text-muted text-sm mt-1">
                {reconnectMode
                  ? 'Linking your new wallet to this profile'
                  : 'Saving your wallet details'}
              </p>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="rounded-2xl p-10 text-center space-y-6 glass-strong animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto">
              <Check size={32} className="text-success" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-text">
                {reconnectMode ? 'Wallet Updated!' : 'All Set!'}
              </h2>
              <p className="text-muted text-sm mt-1">
                {reconnectMode
                  ? 'Your profile is now linked to the new wallet'
                  : <>Welcome to AuroraNFT, <span className="text-accent font-semibold">@{username}</span></>}
              </p>
            </div>
            <Loader2 size={20} className="animate-spin text-accent mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}