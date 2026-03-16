'use client';
import { Trophy, Crown, Medal, Star, Flame } from 'lucide-react';

const collectors = [
  { rank: 1, name: 'quantum_whale.eth', nfts: 47, volume: '12.8 ETH', avatar: '🐋', badge: 'Diamond' },
  { rank: 2, name: 'neon_degen.base', nfts: 34, volume: '9.2 ETH', avatar: '⚡', badge: 'Platinum' },
  { rank: 3, name: 'voidwalker.eth', nfts: 28, volume: '7.6 ETH', avatar: '🌀', badge: 'Gold' },
  { rank: 4, name: 'pixel_monk', nfts: 22, volume: '5.1 ETH', avatar: '🎨', badge: 'Gold' },
  { rank: 5, name: 'astral_ape.base', nfts: 19, volume: '4.3 ETH', avatar: '🦍', badge: 'Silver' },
  { rank: 6, name: 'crystal_hand', nfts: 15, volume: '3.8 ETH', avatar: '💎', badge: 'Silver' },
];

const rankIcons = {
  1: <Crown size={14} className="text-yellow-400" />,
  2: <Medal size={14} className="text-gray-300" />,
  3: <Medal size={14} className="text-amber-600" />,
};

const badgeColors = {
  Diamond: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Platinum: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Gold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Silver: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
};

export default function TopCollectors() {
  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-yellow-500/[0.02] rounded-full blur-[150px]" />
      </div>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-yellow-500/10 border border-yellow-500/20 mb-5">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-xs font-display font-semibold text-yellow-400 uppercase tracking-wider">Leaderboard</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-text">Top Collectors</h2>
          <p className="text-[13px] text-muted mt-2 max-w-md mx-auto">
            The most active collectors on the platform this month
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          {collectors.map((c, i) => (
            <div
              key={c.rank}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-300 hover:border-white/[0.12] animate-fade-in ${
                c.rank === 1
                  ? 'bg-yellow-500/[0.03] border-yellow-500/20'
                  : 'bg-white/[0.02] border-white/[0.06]'
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-8 text-center">
                {rankIcons[c.rank] || (
                  <span className="text-sm font-mono text-muted-dim">{c.rank}</span>
                )}
              </div>

              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-xl">
                {c.avatar}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-text truncate">{c.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-muted font-mono">{c.nfts} NFTs</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-pill border font-medium ${badgeColors[c.badge]}`}>
                    {c.badge}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-mono font-semibold text-accent">{c.volume}</p>
                <p className="text-[10px] text-muted-dim">volume</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
