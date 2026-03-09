import { Search, Palette, Zap } from 'lucide-react';

const steps = [
  {
    icon: <Search size={22} />,
    title: 'Discover',
    description: 'Browse curated collections with advanced filtering by rarity, traits, and chain. Every piece has verified provenance.',
    iconColor: 'text-accent',
  },
  {
    icon: <Palette size={22} />,
    title: 'Evaluate',
    description: 'Deep-dive into token metadata, trait distribution, and sales history. Make informed decisions backed by on-chain data.',
    iconColor: 'text-accent-violet',
  },
  {
    icon: <Zap size={22} />,
    title: 'Collect',
    description: 'Mint or purchase through a streamlined wallet-first checkout. Fast transactions with real-time status.',
    iconColor: 'text-success',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 relative">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 relative">
        <div className="text-center mb-14">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-text">How It Works</h2>
          <p className="text-[13px] text-muted mt-2 max-w-md mx-auto">
            From discovery to collection — built for the modern NFT collector.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {steps.map((step, i) => (
            <div
              key={i}
              className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] p-7 hover:border-white/[0.10] transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center ${step.iconColor} group-hover:border-white/[0.10] transition-colors duration-300`}>
                  {step.icon}
                </div>
                <span className="text-[11px] font-mono text-muted-dim tracking-wider">0{i + 1}</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-text mb-2">{step.title}</h3>
              <p className="text-[13px] text-muted leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
