'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Wallet, Loader2, ExternalLink, Smartphone, Globe, Shield, ChevronRight } from 'lucide-react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useSession } from '@/hooks/useSession';

// Known wallet metadata with logos
const WALLET_META = {
  injected:           { name: 'Browser Wallet', desc: 'Default injected provider', icon: '🌐', priority: 10 },
  metaMask:           { name: 'MetaMask',       desc: 'Most popular Web3 wallet', icon: '🦊', priority: 1 },
  'io.metamask':      { name: 'MetaMask',       desc: 'Most popular Web3 wallet', icon: '🦊', priority: 1 },
  'io.metamask.flask': { name: 'MetaMask Flask', desc: 'MetaMask dev version', icon: '🧪', priority: 9 },
  coinbaseWallet:     { name: 'Coinbase Wallet', desc: 'Coinbase smart wallet', icon: '🔵', priority: 2 },
  coinbaseWalletSDK:  { name: 'Coinbase Wallet', desc: 'Coinbase smart wallet', icon: '🔵', priority: 2 },
  walletConnect:      { name: 'WalletConnect',   desc: 'OKX, Trust, Rainbow & 300+', icon: '🔗', priority: 3 },
  safe:               { name: 'Safe (Gnosis)',   desc: 'Multi-sig wallet', icon: '🔒', priority: 8 },
  // EIP-6963 discovered wallets
  'com.okex.wallet':  { name: 'OKX Wallet',     desc: 'OKX exchange wallet', icon: null, priority: 4 },
  'app.phantom':      { name: 'Phantom',         desc: 'Multi-chain wallet', icon: '👻', priority: 4 },
  'io.rabby':         { name: 'Rabby',           desc: 'Better UX for DeFi', icon: '🐰', priority: 4 },
  'com.trustwallet.app': { name: 'Trust Wallet', desc: 'Binance trust wallet', icon: '🛡️', priority: 4 },
  'app.zerion':       { name: 'Zerion',          desc: 'DeFi portfolio wallet', icon: '⚡', priority: 5 },
  'me.rainbow':       { name: 'Rainbow',         desc: 'Fun Ethereum wallet', icon: '🌈', priority: 5 },
  'com.brave.wallet':  { name: 'Brave Wallet',  desc: 'Built into Brave browser', icon: '🦁', priority: 5 },
  'xyz.frame':        { name: 'Frame',           desc: 'Privacy-focused wallet', icon: '🖼️', priority: 6 },
  'taho.xyz':         { name: 'Taho',            desc: 'Community-owned wallet', icon: '🌿', priority: 6 },
  'com.bitget.web3':  { name: 'Bitget Wallet',  desc: 'Bitget exchange wallet', icon: '💎', priority: 5 },
  'io.xdefi':         { name: 'XDEFI',          desc: 'Cross-chain wallet', icon: '🔷', priority: 6 },
};

function getWalletMeta(connector) {
  // Try exact ID match first
  const byId = WALLET_META[connector.id];
  if (byId) return byId;

  // Try matching by name
  const nameKey = connector.name?.toLowerCase();
  if (nameKey) {
    for (const [key, meta] of Object.entries(WALLET_META)) {
      if (meta.name.toLowerCase() === nameKey) return meta;
    }
  }

  // EIP-6963 wallets have their own icon — return generic meta with dynamic name
  return {
    name: connector.name || 'Wallet',
    desc: 'Connect your wallet',
    icon: null,
    priority: 7,
  };
}

export default function WalletConnectModal({ open, onClose, onConnected }) {
  const router = useRouter();
  const { connectors, connect, isPending, error: connectError } = useConnect();
  const { isConnected } = useAccount();
  const { isLoggedIn, hasLinkedWallet } = useSession();
  const [connectingId, setConnectingId] = useState(null);
  const [error, setError] = useState('');

  // Deduplicate by name and sort by priority
  const wallets = connectors
    .reduce((acc, c) => {
      const meta = getWalletMeta(c);
      // Skip generic "injected" if we have specific wallet entries
      if (c.id === 'injected' && acc.length > 0) {
        const hasSpecific = acc.some(
          (w) => w.connector.id !== 'injected' && w.connector.id !== 'safe'
        );
        if (hasSpecific) return acc;
      }
      const existing = acc.find((w) => w.meta.name === meta.name);
      if (!existing) acc.push({ connector: c, meta });
      return acc;
    }, [])
    .sort((a, b) => a.meta.priority - b.meta.priority);

  const handleConnect = useCallback(
    (connector) => {
      setConnectingId(connector.id);
      setError('');
      connect(
        { connector },
        {
          onSuccess: () => {
            setConnectingId(null);
            if (isLoggedIn && !hasLinkedWallet) {
              const walletName = getWalletMeta(connector).name || connector.id;
              onClose?.();
              router.push(`/welcome?wallet=${encodeURIComponent(walletName)}`);
              return;
            }
            onConnected?.();
            onClose?.();
          },
          onError: (err) => {
            setConnectingId(null);
            if (err?.message?.includes('rejected')) {
              setError('Connection rejected. Please try again.');
            } else {
              setError(err?.shortMessage || err?.message || 'Connection failed');
            }
          },
        }
      );
    },
    [connect, onClose, onConnected, isLoggedIn, hasLinkedWallet, router]
  );

  useEffect(() => {
    if (isConnected && open) onClose?.();
  }, [isConnected, open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-[440px] bg-surface/95 backdrop-blur-2xl border border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-card overflow-hidden animate-slide-up max-h-[85vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent-violet/20 border border-accent/20 flex items-center justify-center">
              <Wallet size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-text">Connect Wallet</h2>
              <p className="text-[11px] text-muted-dim">
                {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} detected
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-white/[0.06] transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Wallet List */}
        <div className="p-4 space-y-1.5 overflow-y-auto flex-1">
          {wallets.map(({ connector, meta }) => {
            const isConnecting = connectingId === connector.id;
            // EIP-6963 wallets provide their own icon via connector.icon
            const hasNativeIcon = connector.icon && connector.icon.startsWith('data:');
            return (
              <button
                key={connector.uid || connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className={`
                  w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl
                  transition-all duration-200 text-left group
                  ${isConnecting
                    ? 'bg-accent/10 border border-accent/30 shadow-[0_0_20px_rgba(34,211,238,0.08)]'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] active:scale-[0.98]'
                  }
                  disabled:opacity-40
                `}
              >
                {/* Icon — EIP-6963 native icon or emoji fallback */}
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 overflow-hidden">
                  {hasNativeIcon ? (
                    <img
                      src={connector.icon}
                      alt={meta.name}
                      className="w-7 h-7 rounded-lg object-contain"
                    />
                  ) : (
                    <span className="text-xl">{meta.icon || '💎'}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm text-text">{meta.name}</p>
                  <p className="text-[11px] text-muted-dim truncate">{meta.desc}</p>
                </div>

                {isConnecting ? (
                  <Loader2 size={18} className="text-accent animate-spin shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-muted-dim shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            );
          })}

          {/* Mobile hint */}
          <div className="sm:hidden pt-3">
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-accent/5 border border-accent/10">
              <Smartphone size={16} className="text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] text-text font-medium">On mobile?</p>
                <p className="text-[11px] text-muted-dim leading-relaxed">
                  Open this site in your wallet app&apos;s built-in browser (OKX, MetaMask, Trust, Phantom, etc.)
                </p>
              </div>
            </div>
          </div>

          {/* No WalletConnect hint */}
          {!wallets.find((w) => w.meta.name === 'WalletConnect') && (
            <div className="pt-2">
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-warning/5 border border-warning/10">
                <Globe size={16} className="text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] text-text font-medium">More wallets</p>
                  <p className="text-[11px] text-muted-dim leading-relaxed">
                    Set <code className="bg-surface2 px-1 rounded text-[10px]">NEXT_PUBLIC_WC_PROJECT_ID</code> to
                    enable WalletConnect — unlocks OKX, Trust, Rainbow & 300+ wallets via QR code.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 pb-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-danger/10 border border-danger/20">
              <span className="text-sm">⚠️</span>
              <p className="text-[12px] text-danger flex-1">{error}</p>
              <button onClick={() => setError('')} className="text-danger/60 hover:text-danger"><X size={14} /></button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 pt-3 border-t border-white/[0.04] shrink-0">
          <div className="flex items-center justify-center gap-2">
            <Shield size={11} className="text-muted-dim" />
            <p className="text-[10px] text-muted-dim">Secure connection via EIP-6963 & WalletConnect</p>
          </div>
        </div>

        <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/[0.15]" />
      </div>
    </div>
  );
}
