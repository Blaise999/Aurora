import { Check, Loader2 } from 'lucide-react';

const milestones = [
  { quarter: 'Q4 2024', title: 'Genesis Launch', description: 'Initial collection drop with 10,000 unique pieces. Wallet-first mint experience.', status: 'complete' },
  { quarter: 'Q1 2025', title: 'Marketplace V2', description: 'Advanced filtering, trait analysis, and collection activity tracking.', status: 'complete' },
  { quarter: 'Q2 2025', title: 'Dynamic Metadata', description: 'Evolving NFT traits based on on-chain activity. Chainlink oracle integration.', status: 'active' },
  { quarter: 'Q3 2025', title: 'Cross-chain Bridge', description: 'Seamless NFT transfers across Ethereum, Polygon, and Arbitrum.', status: 'upcoming' },
];

export default function Roadmap() {
  return (
    <section className="py-20 relative">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 relative">
        <div className="text-center mb-14">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-text">Roadmap</h2>
          <p className="text-[13px] text-muted mt-2">Our path forward, quarter by quarter</p>
        </div>

        <div className="max-w-3xl mx-auto">
          {milestones.map((m, i) => (
            <div key={i} className="flex gap-5 relative animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300
                  ${m.status === 'complete' ? 'bg-success/10 border-success/20 text-success' : ''}
                  ${m.status === 'active' ? 'bg-accent/10 border-accent/20 text-accent' : ''}
                  ${m.status === 'upcoming' ? 'bg-white/[0.03] border-white/[0.06] text-muted-dim' : ''}
                `}>
                  {m.status === 'complete' && <Check size={16} />}
                  {m.status === 'active' && <Loader2 size={16} className="animate-spin" />}
                  {m.status === 'upcoming' && <span className="w-2 h-2 rounded-full bg-current" />}
                </div>
                {i < milestones.length - 1 && (
                  <div className={`w-px flex-1 mt-1 ${m.status === 'complete' ? 'bg-success/20' : 'bg-white/[0.06]'}`} />
                )}
              </div>
              <div className={`pb-10 flex-1 ${m.status === 'upcoming' ? 'opacity-50' : ''}`}>
                <span className="text-[11px] font-mono text-muted-dim">{m.quarter}</span>
                <h3 className="font-display text-lg font-semibold text-text mt-1">{m.title}</h3>
                <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
