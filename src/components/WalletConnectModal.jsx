'use client';
import { useCallback, useEffect, useState } from 'react';
import { X, Loader2, ChevronRight } from 'lucide-react';
import { useConnect, useAccount } from 'wagmi';

function getWalletLabel(connector) {
  const id = connector.id?.toLowerCase() || '';
  const name = connector.name || '';
  if (id.includes('metamask') || name.includes('MetaMask')) return { name: 'MetaMask', icon: '🦊' };
  if (id.includes('coinbase') || name.includes('Coinbase')) return { name: 'Coinbase Wallet', icon: '🔵' };
  if (id.includes('walletconnect') || name.includes('WalletConnect')) return { name: 'WalletConnect', icon: '🔗' };
  if (id.includes('phantom') || name.includes('Phantom')) return { name: 'Phantom', icon: '👻' };
  if (id.includes('okx') || name.includes('OKX')) return { name: 'OKX Wallet', icon: '⚡' };
  if (id.includes('trust') || name.includes('Trust')) return { name: 'Trust Wallet', icon: '🛡️' };
  if (id.includes('rabby') || name.includes('Rabby')) return { name: 'Rabby', icon: '🐰' };
  if (id.includes('brave') || name.includes('Brave')) return { name: 'Brave Wallet', icon: '🦁' };
  if (id === 'safe') return { name: 'Safe', icon: '🔒' };
  if (id === 'injected') return { name: 'Browser Wallet', icon: '🌐' };
  return { name: name || 'Wallet', icon: '💎' };
}

export default function WalletConnectModal({ open, onClose }) {
  const { connectors, connect, isPending } = useConnect();
  const { isConnected } = useAccount();
  const [connectingId, setConnectingId] = useState(null);
  const [error, setError] = useState('');

  // Deduplicate by display name
  const wallets = connectors.reduce((acc, c) => {
    const label = getWalletLabel(c);
    if (!acc.find(w => w.label.name === label.name)) {
      acc.push({ connector: c, label });
    }
    return acc;
  }, []);

  const handleConnect = useCallback((connector) => {
    setConnectingId(connector.id);
    setError('');
    connect(
      { connector },
      {
        onSuccess: () => { setConnectingId(null); onClose?.(); },
        onError: (err) => {
          setConnectingId(null);
          setError(err?.shortMessage || err?.message || 'Connection failed');
        },
      }
    );
  }, [connect, onClose]);

  // Auto-close when connected
  useEffect(() => {
    if (isConnected && open) onClose?.();
  }, [isConnected, open, onClose]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-surface/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="font-display font-bold text-base text-text">Connect Wallet</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-white/[0.06] transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Wallet list */}
        <div className="p-4 space-y-1.5 max-h-[60vh] overflow-y-auto">
          {wallets.map(({ connector, label }) => {
            const isActive = connectingId === connector.id;
            const hasIcon = connector.icon?.startsWith('data:');
            return (
              <button
                key={connector.uid || connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group
                  ${isActive ? 'bg-accent/10 border border-accent/30' : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06]'}
                  disabled:opacity-40`}
              >
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 overflow-hidden">
                  {hasIcon ? (
                    <img src={connector.icon} alt={label.name} className="w-6 h-6 rounded object-contain" />
                  ) : (
                    <span className="text-lg">{label.icon}</span>
                  )}
                </div>
                <span className="flex-1 font-display font-semibold text-sm text-text">{label.name}</span>
                {isActive ? (
                  <Loader2 size={16} className="text-accent animate-spin shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-muted-dim shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-danger/10 border border-danger/20">
              <p className="text-xs text-danger flex-1">{error}</p>
              <button onClick={() => setError('')} className="text-danger/60 hover:text-danger"><X size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
