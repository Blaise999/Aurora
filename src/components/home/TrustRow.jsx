// Server Component — static content
import { Shield, Lock, Globe, Cpu } from 'lucide-react';

const signals = [
  { icon: Shield, label: 'Audited Contracts', sub: 'Smart contract security verified' },
  { icon: Lock, label: 'IPFS Storage', sub: 'Metadata stored permanently' },
  { icon: Globe, label: 'Multi-chain', sub: 'Ethereum, Polygon, Base' },
  { icon: Cpu, label: 'On-chain Provenance', sub: 'Full ownership history' },
];

export default function TrustRow() {
  return (
    <section className="py-14 border-y border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {signals.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-muted" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-text">{item.label}</p>
                  <p className="text-[11px] text-muted-dim mt-0.5 leading-relaxed">{item.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
