'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Clock, Zap, ArrowRight, Users } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const drops = [
  {
    id: 'drop-1',
    name: 'Ethereal Voids: Genesis',
    creator: 'Studio Void',
    image: '/pictures/collection-01.svg',
    price: '0.08 ETH',
    minted: 3421,
    total: 5000,
    endsIn: Date.now() + 4 * 60 * 60 * 1000 + 23 * 60 * 1000,
    status: 'live',
  },
  {
    id: 'drop-2',
    name: 'Chromatic Shift II',
    creator: 'Palette Labs',
    image: '/pictures/collection-02.svg',
    price: '0.12 ETH',
    minted: 0,
    total: 3333,
    endsIn: Date.now() + 2 * 24 * 60 * 60 * 1000,
    status: 'upcoming',
  },
];

function Countdown({ target }) {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTime({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [target]);

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 font-mono">
      {[
        { val: pad(time.h), label: 'h' },
        { val: pad(time.m), label: 'm' },
        { val: pad(time.s), label: 's' },
      ].map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-1.5">
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
            <span className="text-lg font-bold text-text tabular-nums tracking-tight">{unit.val}</span>
          </div>
          <span className="text-[10px] text-muted-dim uppercase">{unit.label}</span>
          {i < 2 && <span className="text-muted-dim mx-0.5">:</span>}
        </div>
      ))}
    </div>
  );
}

export default function LiveDrops() {
  return (
    <section className="py-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
              <Zap size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-text">Live Drops</h2>
              <p className="text-xs text-muted-dim mt-0.5 font-mono tracking-wide">Active and upcoming mints</p>
            </div>
          </div>
          <Link href="/mint" className="hidden sm:flex items-center gap-1.5 text-[13px] text-muted hover:text-accent transition-colors group">
            All drops <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {drops.map((drop) => {
            const progress = drop.total > 0 ? (drop.minted / drop.total) * 100 : 0;
            const isLive = drop.status === 'live';

            return (
              <div
                key={drop.id}
                className="group relative rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.10] transition-all duration-300"
              >
                {/* Top: image banner */}
                <div className="h-40 relative overflow-hidden">
                  <img
                    src={drop.image}
                    alt={drop.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
                  <div className="absolute top-4 left-4">
                    {isLive ? (
                      <Badge color="success" dot>Live Now</Badge>
                    ) : (
                      <Badge color="default">Upcoming</Badge>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 -mt-4 relative">
                  <div>
                    <p className="text-[11px] text-muted-dim font-mono">{drop.creator}</p>
                    <h3 className="font-display text-xl font-bold text-text mt-1 group-hover:text-accent transition-colors duration-300">
                      {drop.name}
                    </h3>
                  </div>

                  {/* Countdown */}
                  <div>
                    <p className="text-[10px] text-muted-dim uppercase tracking-wider mb-2">
                      {isLive ? 'Ends in' : 'Starts in'}
                    </p>
                    <Countdown target={drop.endsIn} />
                  </div>

                  {/* Progress */}
                  {isLive && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-muted font-mono">{drop.minted.toLocaleString()} / {drop.total.toLocaleString()}</span>
                        <span className="text-[11px] text-accent font-mono font-semibold">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent to-accent-violet rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Bottom */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-[10px] text-muted-dim">Price</p>
                        <p className="text-sm text-text font-mono font-semibold">{drop.price}</p>
                      </div>
                      <div className="w-px h-8 bg-white/[0.06]" />
                      <div className="flex items-center gap-1 text-muted-dim">
                        <Users size={12} />
                        <span className="text-[11px] font-mono">{(drop.minted > 0 ? Math.floor(drop.minted * 0.7) : 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <Link href="/mint">
                      <Button variant={isLive ? 'primary' : 'secondary'} size="sm">
                        {isLive ? 'Mint Now' : 'Remind Me'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
