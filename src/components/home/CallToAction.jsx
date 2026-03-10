// Server Component — no hooks needed
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function CallToAction() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-accent/[0.05] via-accent-violet/[0.02] to-transparent rounded-full blur-3xl" />
      </div>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 relative">
        <div className="rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden bg-white/[0.02] border border-white/[0.06]">
          {/* Subtle gradient border effect */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-accent/20 via-transparent to-accent-violet/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Sparkles size={20} className="text-accent" />
            </div>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-text mb-4 leading-tight">
            Ready to start your <span className="gradient-text">collection</span>?
          </h2>
          <p className="text-base sm:text-lg text-muted max-w-lg mx-auto mb-8 leading-relaxed">
            Join thousands of collectors minting unique digital artifacts with verified on-chain provenance.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/mint"><Button variant="primary" size="lg">Start Minting <ArrowRight size={16} /></Button></Link>
            <Link href="/explore"><Button variant="secondary" size="lg">Browse Collection</Button></Link>
          </div>
          <div className="flex items-center justify-center gap-6 sm:gap-12 mt-10 pt-8 border-t border-white/[0.06]">
            {[['4,237', 'Minted'], ['1,892', 'Collectors'], ['339 ETH', 'Volume']].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="font-mono font-bold text-lg sm:text-xl text-text tracking-tight">{val}</p>
                <p className="text-[10px] text-muted-dim mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
