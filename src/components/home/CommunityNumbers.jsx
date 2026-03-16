'use client';
import { useEffect, useRef, useState } from 'react';

function Counter({ target, suffix = '', prefix = '' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ran.current) {
        ran.current = true;
        const start = Date.now();
        const dur = 2000;
        const tick = () => {
          const p = Math.min((Date.now() - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.floor(eased * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        tick();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="font-mono font-bold text-4xl sm:text-5xl text-text tabular-nums">
      {prefix}{val.toLocaleString()}{suffix}
    </span>
  );
}

export default function CommunityNumbers() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,229,255,0.04),transparent_70%)]" />
      </div>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 relative">
        <div className="text-center mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-text">
            The Numbers Speak
          </h2>
          <p className="text-[13px] text-muted mt-2">Growing every day since genesis</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {[
            { val: 4237, label: 'NFTs Minted', suffix: '+', desc: 'Unique pieces collected' },
            { val: 1892, label: 'Collectors', suffix: '+', desc: 'Active wallets' },
            { val: 339, label: 'ETH Volume', suffix: '', prefix: '', desc: 'Total traded' },
            { val: 99, label: 'Uptime', suffix: '%', desc: 'Platform reliability' },
          ].map((s, i) => (
            <div key={s.label} className="text-center space-y-3 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <Counter target={s.val} suffix={s.suffix} prefix={s.prefix} />
              <p className="font-display font-semibold text-sm text-text">{s.label}</p>
              <p className="text-[11px] text-muted-dim">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
