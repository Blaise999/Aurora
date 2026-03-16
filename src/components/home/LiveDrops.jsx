'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock3, Zap, ArrowRight, Users, Sparkles, BarChart3 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useTrendingNfts } from '@/hooks/useNfts';
import { resolveImage } from '@/lib/utils';

const baseDrops = [
  {
    id: 'drop-1',
    name: 'Ethereal Voids: Genesis',
    creator: 'Studio Void',
    price: '0.08 ETH',
    minted: 3421,
    total: 5000,
    endsIn: Date.now() + 4 * 60 * 60 * 1000 + 23 * 60 * 1000,
    status: 'live',
    accent: 'from-cyan-400/20 via-accent/10 to-transparent',
    blurb: 'A high-momentum collection currently absorbing most of the market attention this cycle.',
  },
  {
    id: 'drop-2',
    name: 'Chromatic Shift II',
    creator: 'Palette Labs',
    price: '0.12 ETH',
    minted: 0,
    total: 3333,
    endsIn: Date.now() + 2 * 24 * 60 * 60 * 1000,
    status: 'upcoming',
    accent: 'from-fuchsia-400/20 via-accent-violet/10 to-transparent',
    blurb: 'An upcoming release with strong visual identity, limited supply, and early collector buzz.',
  },
];

function Countdown({ target }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target - Date.now());

      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [target]);

  const pad = (n) => String(n).padStart(2, '0');

  const units = [
    { val: pad(time.d), label: 'd' },
    { val: pad(time.h), label: 'h' },
    { val: pad(time.m), label: 'm' },
    { val: pad(time.s), label: 's' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 font-mono">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="min-w-[58px] rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2"
        >
          <div className="text-base font-bold text-text tabular-nums leading-none">{unit.val}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-dim">{unit.label}</div>
        </div>
      ))}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3">
      <div className="flex items-center gap-2 text-muted-dim">
        <Icon size={13} />
        <span className="text-[10px] uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-text">{value}</p>
    </div>
  );
}

export default function LiveDrops() {
  const { nfts = [] } = useTrendingNfts(12);

  const drops = useMemo(() => {
    return baseDrops.map((drop, index) => {
      const nft = nfts[index] || nfts[(index + 2) % nfts.length] || null;

      return {
        ...drop,
        image: nft ? resolveImage(nft.image || nft.image_url || nft.media_url) : null,
        nftTitle: nft?.name || 'Featured collectible',
        floorHint: nft?.price || nft?.mint_price || null,
      };
    });
  }, [nfts]);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-[1400px] px-6 md:px-8">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-accent">
              <Zap size={12} />
              live market watch
            </div>

            <h2 className="font-display text-2xl font-bold text-text sm:text-3xl md:text-4xl">
              Live Drops
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              A cleaner look at active and upcoming mint events, paired with live collection visuals
              and supply context so users can understand momentum before taking action.
            </p>
          </div>

          <Link
            href="/mint"
            className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-accent group"
          >
            Explore all drops
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {drops.map((drop) => {
            const progress = drop.total > 0 ? (drop.minted / drop.total) * 100 : 0;
            const isLive = drop.status === 'live';
            const collectorEstimate = drop.minted > 0 ? Math.floor(drop.minted * 0.72) : 184;

            return (
              <article
                key={drop.id}
                className="group relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-white/[0.025] transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.035]"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${drop.accent}`} />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_32%)]" />

                <div className="relative grid min-h-[430px] md:grid-cols-[1.05fr_1fr]">
                  {/* Visual side */}
                  <div className="relative min-h-[260px] overflow-hidden border-b border-white/[0.06] md:min-h-full md:border-b-0 md:border-r">
                    {drop.image ? (
                      <>
                        <Image
                          src={drop.image}
                          alt={drop.nftTitle || drop.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          unoptimized={String(drop.image).endsWith('.svg')}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/35 to-black/10" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/25 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-white/[0.02]" />
                    )}

                    <div className="absolute left-5 top-5 flex items-center gap-2">
                      {isLive ? (
                        <Badge color="success" dot>Live Now</Badge>
                      ) : (
                        <Badge color="default">Upcoming</Badge>
                      )}

                      <div className="rounded-full border border-white/[0.08] bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/80 backdrop-blur-md">
                        featured visual
                      </div>
                    </div>

                    <div className="absolute bottom-5 left-5 right-5">
                      <div className="max-w-[420px] rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">
                          collection visual
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-white">
                          {drop.nftTitle || drop.name}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-white/70">
                          Visual reference pulled from trending NFTs to make the drop card feel alive and market-linked.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Content side */}
                  <div className="relative flex flex-col justify-between p-6 md:p-7">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-dim">
                            {drop.creator}
                          </p>
                          <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-text transition-colors duration-300 group-hover:text-accent">
                            {drop.name}
                          </h3>
                        </div>

                        <div className="hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-right sm:block">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-dim">mint price</p>
                          <p className="mt-1 text-sm font-semibold text-text">{drop.price}</p>
                        </div>
                      </div>

                      <p className="mt-4 max-w-lg text-sm leading-6 text-muted">
                        {drop.blurb}
                      </p>

                      <div className="mt-6">
                        <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-dim">
                          <Clock3 size={13} />
                          {isLive ? 'Mint closes in' : 'Mint begins in'}
                        </div>
                        <Countdown target={drop.endsIn} />
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <Stat
                          icon={BarChart3}
                          label="Supply"
                          value={`${drop.minted.toLocaleString()} / ${drop.total.toLocaleString()}`}
                        />
                        <Stat
                          icon={Users}
                          label="Collectors"
                          value={collectorEstimate.toLocaleString()}
                        />
                        <Stat
                          icon={Sparkles}
                          label="Price"
                          value={drop.price}
                        />
                        <Stat
                          icon={Zap}
                          label="Status"
                          value={isLive ? 'Mint in progress' : 'Waiting room'}
                        />
                      </div>

                      {isLive && (
                        <div className="mt-6">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-dim">
                              Mint progress
                            </span>
                            <span className="text-sm font-semibold text-accent">
                              {progress.toFixed(1)}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-violet transition-all duration-1000 ease-out"
                              style={{ width: `${progress}%` }}
                            />
                          </div>

                          <p className="mt-2 text-xs text-muted-dim">
                            {drop.minted.toLocaleString()} minted so far with consistent traction across the current window.
                          </p>
                        </div>
                      )}

                      {!isLive && (
                        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-dim">
                            Pre-launch note
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted">
                            This drop is staged as upcoming, so the card leans into release timing, pricing,
                            and collection identity rather than conversion-heavy actions.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-dim">market read</p>
                        <p className="mt-1 text-sm text-text">
                          {isLive ? 'Strong activity and visible momentum.' : 'Early interest, awaiting launch window.'}
                        </p>
                      </div>

                      <Link href="/mint">
                        <Button variant="secondary" size="sm">
                          View details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 sm:hidden">
          <Link
            href="/mint"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-accent"
          >
            Explore all drops <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}