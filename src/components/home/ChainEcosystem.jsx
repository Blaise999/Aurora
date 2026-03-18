import { Zap } from 'lucide-react';

const chains = [
  { name: 'Base', emoji: '🔵', desc: 'Coinbase L2 · Low fees', highlight: true },
  { name: 'Ethereum', emoji: '⟠', desc: 'The OG chain' },
  { name: 'Polygon', emoji: '💜', desc: 'zkEVM ready' },
  { name: 'Arbitrum', emoji: '🔷', desc: 'Nitro speed' },
  { name: 'Optimism', emoji: '🔴', desc: 'OP Stack' },
  { name: 'Zora', emoji: '✨', desc: 'Creator-first' },
];

const stats = [
  { label: 'Avg. Gas Fee', value: '<$0.01', sub: 'on Base L2' },
  { label: 'Block Time', value: '2s', sub: 'near-instant' },
  { label: 'Finality', value: '~1 min', sub: 'settled on Ethereum' },
  { label: 'TX Throughput', value: '2000+', sub: 'TPS capacity' },
];

export default function ChainEcosystem() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[200px]" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 relative">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-blue-500/10 border border-blue-500/20 mb-5">
            <Zap size={14} className="text-blue-400" />
            <span className="text-xs font-display font-semibold text-blue-400 uppercase tracking-wider">Ecosystem</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-text">
            Built on chain. Connected Everywhere.
          </h2>
          <p className="text-[13px] text-muted mt-2 max-w-lg mx-auto">
            Mint on the fastest L2 today. 
          </p>
        </div>

        {/* Chain badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-14">
          {chains.map((c, i) => (
            <div
              key={c.name}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border transition-all duration-300 animate-fade-in ${
                c.highlight
                  ? 'bg-blue-500/[0.08] border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.10]'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="text-xl">{c.emoji}</span>
              <div>
                <p className={`text-sm font-display font-semibold ${c.highlight ? 'text-blue-400' : 'text-text'}`}>{c.name}</p>
                <p className="text-[10px] text-muted-dim">{c.desc}</p>
              </div>
              {c.highlight && (
                <span className="ml-1 px-2 py-0.5 rounded-pill bg-blue-500/20 text-[9px] font-bold text-blue-300 uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Performance stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 text-center hover:border-white/[0.10] transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <p className="font-mono font-bold text-2xl text-text tracking-tight">{s.value}</p>
              <p className="text-[12px] text-muted mt-1 font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-dim mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
