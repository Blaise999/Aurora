import { Fingerprint, Globe2, Layers, ShieldCheck, Coins, Sparkles } from 'lucide-react';

const benefits = [
  {
    icon: Fingerprint,
    title: 'True Ownership',
    description: 'Your NFT lives on the blockchain, not on our servers. You own it — forever. No one can take it away.',
    color: 'text-accent',
    bg: 'from-accent/10 to-accent/5',
  },
  {
    icon: Globe2,
    title: 'Global & Borderless',
    description: 'Trade with anyone, anywhere. No banks, no borders. Just wallets and signed transactions.',
    color: 'text-accent-violet',
    bg: 'from-accent-violet/10 to-accent-violet/5',
  },
  {
    icon: Layers,
    title: 'Immutable Provenance',
    description: 'Every transfer, every sale, every mint — permanently recorded. Art history written in blocks.',
    color: 'text-success',
    bg: 'from-success/10 to-success/5',
  },
  {
    icon: ShieldCheck,
    title: 'Trustless Verification',
    description: 'Don\'t trust, verify. Smart contracts enforce rules. No middlemen, no gatekeepers.',
    color: 'text-warning',
    bg: 'from-warning/10 to-warning/5',
  },
  {
    icon: Coins,
    title: 'Programmable Value',
    description: 'Royalties, airdrops, token-gating — your NFT is a key that unlocks a growing ecosystem.',
    color: 'text-cyan-400',
    bg: 'from-cyan-400/10 to-cyan-400/5',
  },
  {
    icon: Sparkles,
    title: 'Culture on Chain',
    description: 'Collect the culture. Support creators directly. Be part of the movement that\'s reshaping digital art.',
    color: 'text-pink-400',
    bg: 'from-pink-400/10 to-pink-400/5',
  },
];

export default function WhyCollect() {
  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-accent/[0.02] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent-violet/[0.02] rounded-full blur-[120px]" />
      </div>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 relative">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-accent-violet/10 border border-accent-violet/20 mb-5">
            <Sparkles size={14} className="text-accent-violet" />
            <span className="text-xs font-display font-semibold text-accent-violet uppercase tracking-wider">Why Web3</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-text">
            Why Collect On-Chain?
          </h2>
          <p className="text-[13px] text-muted mt-2 max-w-lg mx-auto">
            Digital art meets verifiable ownership. Here&apos;s what makes it different from everything else.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={i}
                className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] p-7 hover:border-white/[0.10] transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${b.bg} border border-white/[0.06] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={22} className={b.color} />
                </div>
                <h3 className="font-display text-lg font-semibold text-text mb-2">{b.title}</h3>
                <p className="text-[13px] text-muted leading-relaxed">{b.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
