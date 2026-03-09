'use client';
import { useEffect, useState, useRef } from 'react';
import { Flame, Users, Zap, TrendingUp } from 'lucide-react';

function AnimatedNumber({ target, duration = 2000, prefix = '', suffix = '', decimals = 0 }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCurrent(eased * target);
            if (progress < 1) requestAnimationFrame(tick);
          };
          tick();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  const formatted = decimals > 0
    ? current.toFixed(decimals)
    : Math.floor(current).toLocaleString();

  return (
    <span ref={ref} className="font-mono font-bold text-2xl sm:text-[28px] text-text tracking-tight tabular-nums">
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default function LiveStats() {
  const stats = [
    { label: 'NFTs Minted', value: 4237, icon: Flame, color: 'text-accent', suffix: '' },
    { label: 'Active Wallets', value: 1892, icon: Users, color: 'text-accent-violet', suffix: '' },
    { label: 'Total Volume', value: 339.4, icon: TrendingUp, color: 'text-success', suffix: ' ETH', decimals: 1, prefix: '' },
    { label: 'Avg Mint Speed', value: 2.3, icon: Zap, color: 'text-warning', suffix: 's', decimals: 1, prefix: '' },
  ];

  return (
    <section className="relative py-6 -mt-12 z-10">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="group relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 sm:p-6 hover:border-white/[0.10] transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <Icon size={16} className={stat.color} style={{ opacity: 0.7 }} />
                  <span className="text-[10px] font-mono text-muted-dim">24h</span>
                </div>
                <AnimatedNumber
                  target={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix || ''}
                  decimals={stat.decimals || 0}
                  duration={1800 + i * 300}
                />
                <p className="text-[11px] text-muted-dim mt-1.5 font-medium">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
