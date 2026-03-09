'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, Shield, Bolt, Radio } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import CursorSpotlight from './CursorSpotlight';
import HeroLabels from './HeroLabels';
import { heroNFTs } from '@/lib/mock/nfts';

export default function HeroTriptych() {
  const heroRef = useRef(null);
  const copyRef = useRef(null);
  const cardsRef = useRef([]);
  const [activeLabel, setActiveLabel] = useState(1);

  useEffect(() => {
    let gsapModule;

    const initGSAP = async () => {
      try {
        gsapModule = (await import('gsap')).default || (await import('gsap'));
        const { ScrollTrigger } = await import('gsap/ScrollTrigger');
        gsapModule.registerPlugin(ScrollTrigger);

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) return;

        const tl = gsapModule.timeline({ defaults: { ease: 'power2.out' } });

        // Phase 1: Intro settle
        if (copyRef.current) {
          tl.fromTo(copyRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9 });
        }
        cardsRef.current.forEach((card, i) => {
          if (card) {
            tl.fromTo(card,
              { opacity: 0, scale: 0.985, y: 14 },
              { opacity: 1, scale: 1, y: 0, duration: 0.7 },
              `-=${0.5}`
            );
          }
        });

        // Phase 2: Scroll drift
        if (heroRef.current) {
          const scrollTl = gsapModule.timeline({
            scrollTrigger: {
              trigger: heroRef.current,
              start: 'top top',
              end: '+=60%',
              scrub: 0.6,
            }
          });

          if (cardsRef.current[0]) {
            scrollTl.to(cardsRef.current[0], { x: -30, y: -14, rotation: -2, duration: 1 }, 0);
          }
          if (cardsRef.current[2]) {
            scrollTl.to(cardsRef.current[2], { x: 30, y: -14, rotation: 2, duration: 1 }, 0);
          }
          if (cardsRef.current[1]) {
            scrollTl.to(cardsRef.current[1], { y: -12, scale: 1.02, duration: 1 }, 0);
          }
        }
      } catch (e) {
        // GSAP not available, degrade gracefully
        if (copyRef.current) copyRef.current.style.opacity = '1';
        cardsRef.current.forEach(c => { if (c) c.style.opacity = '1'; });
      }
    };

    initGSAP();

    return () => {
      if (gsapModule?.killTweensOf) {
        cardsRef.current.forEach(c => c && gsapModule.killTweensOf(c));
      }
    };
  }, []);

  const handleLabelSwitch = (index) => {
    setActiveLabel(index);
    // Swap center card visually
    cardsRef.current.forEach((card, i) => {
      if (!card) return;
      const isCentered = i === index;
      card.style.transition = 'all 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
      card.style.zIndex = isCentered ? '3' : '1';
      card.style.transform = isCentered ? 'scale(1.05)' : 'scale(0.92)';
      card.style.opacity = isCentered ? '1' : '0.7';
    });
    // Reset transforms after animation
    setTimeout(() => {
      cardsRef.current.forEach((card) => {
        if (card) card.style.transform = '';
        if (card) card.style.opacity = '';
      });
    }, 700);
  };

  const nftGradients = heroNFTs.map(n => n.normalized_metadata.image);

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-accent/[0.04] blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-accent-violet/[0.04] blur-[100px] animate-pulse-glow" style={{animationDelay: '2s'}} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      </div>

      <CursorSpotlight />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-8 w-full py-32 md:py-0">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center min-h-[80vh]">
          {/* Left: Copy + CTAs */}
          <div ref={copyRef} className="space-y-8 opacity-0">
            <div className="space-y-6">
              <Badge color="accent" dot>Live Collection</Badge>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-[68px] font-bold leading-[1.05] tracking-tight">
                A curated{' '}
                <span className="gradient-text">collection</span>,{' '}
                <br className="hidden sm:block" />
                built on-chain.
              </h1>
              <p className="text-lg text-muted leading-relaxed max-w-lg">
                Explore live NFT media, rarity traits, and collection activity — then mint seamlessly through a wallet-first checkout.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/explore">
                <Button variant="primary" size="lg">
                  Explore NFTs <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href="/mint">
                <Button variant="secondary" size="lg">
                  View Mint
                </Button>
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white/[0.04] border border-border-light">
                <Radio size={13} className="text-success" />
                <span className="text-xs text-muted">Live data</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white/[0.04] border border-border-light">
                <Shield size={13} className="text-accent" />
                <span className="text-xs text-muted">Verified provenance</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white/[0.04] border border-border-light">
                <Zap size={13} className="text-accent-violet" />
                <span className="text-xs text-muted">Fast mint flow</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-success/10 border border-success/20">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-success font-mono font-medium">Ethereum</span>
              </div>
            </div>
          </div>

          {/* Right: Triptych */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-full max-w-[520px] aspect-square">
              {/* Glow behind cards */}
              <div className="absolute inset-0 bg-gradient-radial from-accent/[0.08] via-transparent to-transparent rounded-full scale-125 animate-pulse-glow" />

              {nftGradients.map((gradient, i) => {
                const positions = [
                  { className: 'absolute left-0 top-8 w-[55%] z-[1] -rotate-6', delay: '0.1s' },
                  { className: 'absolute left-1/2 top-0 -translate-x-1/2 w-[62%] z-[3]', delay: '0s' },
                  { className: 'absolute right-0 top-8 w-[55%] z-[2] rotate-6', delay: '0.2s' },
                ];
                return (
                  <div
                    key={i}
                    ref={el => cardsRef.current[i] = el}
                    className={`${positions[i].className} opacity-0 cursor-pointer group`}
                    style={{ animationDelay: positions[i].delay }}
                  >
                    <div className="rounded-card overflow-hidden glass-card card-hover">
                      <div
                        className="aspect-[3/4] w-full relative"
                        style={{ background: gradient }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 via-transparent to-accent-violet/10" />
                        </div>
                      </div>
                      <div className="p-4 space-y-1.5">
                        <p className="text-[11px] text-muted-dim font-mono">{heroNFTs[i]?.collectionName}</p>
                        <p className="text-sm font-display font-semibold text-text truncate">{heroNFTs[i]?.name}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-accent font-mono">{heroNFTs[i]?.price}</span>
                          <span className="text-[10px] text-muted-dim">#{heroNFTs[i]?.token_id}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Labels */}
        <HeroLabels active={activeLabel} onSwitch={handleLabelSwitch} />
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg to-transparent z-[5]" />
    </section>
  );
}
