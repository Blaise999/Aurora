'use client';
import { useState, useEffect } from 'react';
import { Activity, Zap, ArrowRight, Sparkles } from 'lucide-react';

const MOCK_EVENTS = [
  { wallet: '0x7B2e...4f1A', action: 'minted', nft: 'Celestial Fragment #1042', time: '2m ago', amount: '0.042 ETH' },
  { wallet: '0xA3f1...8c2D', action: 'bought', nft: 'Void Resonance #1018', time: '5m ago', amount: '0.12 ETH' },
  { wallet: '0xC9d3...2e7F', action: 'minted', nft: 'Quantum Whisper #1007', time: '8m ago', amount: '0.042 ETH' },
  { wallet: '0x1F4a...9b3E', action: 'minted', nft: 'Nebula Core #1033', time: '12m ago', amount: '0.042 ETH' },
  { wallet: '0xD8e2...6a1B', action: 'bought', nft: 'Astral Prism #1055', time: '18m ago', amount: '0.08 ETH' },
  { wallet: '0x5C7f...3d2A', action: 'minted', nft: 'Dark Matter Bloom #1061', time: '23m ago', amount: '0.042 ETH' },
  { wallet: '0x2E9c...7f4D', action: 'minted', nft: 'Phantom Signal #1009', time: '31m ago', amount: '0.042 ETH' },
  { wallet: '0xB6a1...5e8C', action: 'bought', nft: 'Ether Cascade #1028', time: '45m ago', amount: '0.15 ETH' },
];

export default function RecentActivity() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-success/20 to-success/5 border border-success/20 flex items-center justify-center">
              <Activity size={16} className="text-success" />
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-text">Live Activity</h2>
              <p className="text-[11px] text-muted-dim mt-0.5 font-mono tracking-wide">
                Real-time mints &amp; purchases
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-success/10 border border-success/20">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[11px] font-mono text-success font-medium">Live</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {MOCK_EVENTS.map((evt, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.10] transition-all duration-500 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                evt.action === 'minted'
                  ? 'bg-accent/10 text-accent'
                  : 'bg-accent-violet/10 text-accent-violet'
              }`}>
                {evt.action === 'minted' ? <Sparkles size={16} /> : <Zap size={16} />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-text truncate">
                  <span className="font-mono text-muted">{evt.wallet}</span>{' '}
                  <span className={evt.action === 'minted' ? 'text-accent' : 'text-accent-violet'}>
                    {evt.action}
                  </span>{' '}
                  <span className="font-semibold">{evt.nft}</span>
                </p>
                <p className="text-[10px] text-muted-dim mt-0.5">{evt.time}</p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-mono font-semibold text-text">{evt.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
