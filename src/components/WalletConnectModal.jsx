'use client';
import { useState, useCallback, useEffect } from 'react';
import { X, Wallet, Loader2, ExternalLink, Smartphone, Globe, Shield } from 'lucide-react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';

// Connector display metadata
const WALLET_META = {
  injected: { name: 'Browser Wallet', desc: 'MetaMask, Trust, Brave, Rabby…', icon: '🦊', priority: 1 },
  metaMask: { name: 'MetaMask', desc: 'Popular browser & mobile wallet', icon: '🦊', priority: 1 },
  'io.metamask': { name: 'MetaMask', desc: 'Popular browser & mobile wallet', icon: '🦊', priority: 1 },
  coinbaseWallet: { name: 'Coinbase Wallet', desc: 'Coinbase smart wallet', icon: '🔵', priority: 2 },
  coinbaseWalletSDK: { name: 'Coinbase Wallet', desc: 'Coinbase smart wallet', icon: '🔵', priority: 2 },
  walletConnect: { name: 'WalletConnect', desc: 'Trust, Rainbow, Zerion & 300+', icon: '🔗', priority: 3 },
  safe: { name: 'Safe (Gnosis)', desc: 'Multi-sig wallet', icon: '🔒', priority: 4 },
};

function getWalletMeta(connector) {
  return (
    WALLET_META[connector.id] ||
    WALLET_META[connector.name?.toLowerCase()] ||
    { name: connector.name || 'Wallet', desc: 'Connect your wallet', icon: '💎', priority: 5 }
  );
}

export default function WalletConnectModal({ open, onClose, onConnected }) {
  const { connectors, connect, isPending, error: connectError } = useConnect();
  const { isConnected } = useAccount();
  const [connectingId, setConnectingId] = useState(null);
  const [error, setError] = useState('');

  // Deduplicate and sort connectors
  const wallets = connectors
    .reduce((acc, c) => {
      // Skip duplicates by name
      const meta = getWalletMeta(c);
      const existing = acc.find(w => w.meta.name === meta.name);
      if (!existing) acc.push({ connector: c, meta });
      return acc;
    }, [])
    .sort((a, b) => a.meta.priority - b.meta.priority);

  const handleConnect = useCallback((connector) => {
    setConnectingId(connector.id);
    setError('');
    connect(
      { connector },
      {
        onSuccess: () => {
          setConnectingId(null);
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
  }, [connect, onClose, onConnected]);

  // Close on successful connection
  useEffect(() => {
    if (isConnected && open) {
      onClose?.();
    }
  }, [isConnected, open, onClose]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-[420px] bg-surface/95 backdrop-blur-2xl border border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-card overflow-hidden animate-slide-up max-h-[85vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent-violet/20 border border-accent/20 flex items-center justify-center">
              <Wallet size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-text">Connect Wallet</h2>
              <p className="text-[11px] text-muted-dim">Choose your wallet to sign in</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-white/[0.06] transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Wallet List */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {wallets.map(({ connector, meta }) => {
            const isConnecting = connectingId === connector.id;
            return (
              <button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-xl
                  transition-all duration-200 text-left
                  ${isConnecting
                    ? 'bg-accent/10 border border-accent/30'
                    : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] active:scale-[0.98]'
                  }
                  disabled:opacity-40
                `}
              >
                <span className="text-2xl w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  {meta.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm text-text">{meta.name}</p>
                  <p className="text-[11px] text-muted-dim truncate">{meta.desc}</p>
                </div>
                {isConnecting ? (
                  <Loader2 size={18} className="text-accent animate-spin shrink-0" />
                ) : (
                  <ExternalLink size={14} className="text-muted-dim shrink-0" />
                )}
              </button>
            );
          })}

          {/* Mobile deep link hint */}
          <div className="sm:hidden pt-2">
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-accent/5 border border-accent/10">
              <Smartphone size={16} className="text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] text-text font-medium">On mobile?</p>
                <p className="text-[11px] text-muted-dim leading-relaxed">Open this site inside your wallet app&apos;s built-in browser for the best experience.</p>
              </div>
            </div>
          </div>
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
            <p className="text-[10px] text-muted-dim">Connecting signs you in automatically via SIWE</p>
          </div>
        </div>

        {/* Mobile drag handle */}
        <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/[0.15]" />
      </div>
    </div>
  );
}
