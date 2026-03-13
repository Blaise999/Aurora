"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Radio, Shield, Zap, Clock, Flame, ChevronDown } from "lucide-react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import CursorSpotlight from "./CursorSpotlight";
import { heroSlides } from "@/lib/mock/nfts";

const INTERVAL = 8000;

const HERO_BG_IMAGES = [
  "/pictures/hero-bg-1.webp",
  "/pictures/hero-bg-2.webp",
  "/pictures/hero-bg-3.webp",
];


const HERO_CARD_IMAGES = [
  ["/pictures/hero-card-1-1.webp", "/pictures/hero-card-1-2.webp", "/pictures/hero-card-1-3.webp"],
  ["/pictures/hero-card-2-1.webp", "/pictures/hero-card-2-2.webp", "/pictures/hero-card-2-3.webp"],
  ["/pictures/hero-card-3-1.webp", "/pictures/hero-card-3-2.webp", "/pictures/hero-card-3-3.webp"],
];

const SLIDE_BADGES = [
  { label: 'Trending', icon: Flame, color: 'hot' },
  { label: 'Live Now', icon: Radio, color: 'success' },
  { label: 'Ending Soon', icon: Clock, color: 'warning' },
];

export default function HeroCarousel() {
  const slides = heroSlides || [];
  const slideCount = slides.length || 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const [frontIndex, setFrontIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [motionReady, setMotionReady] = useState(false);

  const heroRef = useRef(null);
  const slideRefs = useRef([]);
  const copyRefs = useRef([]);
  const cardGroupRefs = useRef([]);

  const timerRef = useRef(null);
  const gsapRef = useRef(null);

  const keepBg = useMemo(() => {
    const nextIdx = (frontIndex + 1) % slideCount;
    return new Set([activeIndex, frontIndex, nextIdx]);
  }, [activeIndex, frontIndex, slideCount]);

  const getBgSrc = (i) => HERO_BG_IMAGES[i] || slides[i]?.bg || HERO_BG_IMAGES[0];

  const goToSlide = useCallback(
    (nextIdx) => {
      if (transitioning || nextIdx === activeIndex) return;
      setTransitioning(true);
      setFrontIndex(nextIdx);

      const gsap = gsapRef.current;
      if (!gsap || !motionReady) {
        setActiveIndex(nextIdx);
        setFrontIndex(nextIdx);
        setTransitioning(false);
        return;
      }

      const prevSlide = slideRefs.current[activeIndex];
      const nextSlide = slideRefs.current[nextIdx];
      const prevCopy = copyRefs.current[activeIndex];
      const nextCopy = copyRefs.current[nextIdx];
      const prevCards = cardGroupRefs.current[activeIndex];
      const nextCards = cardGroupRefs.current[nextIdx];

      if (prevSlide) gsap.set(prevSlide, { zIndex: 2 });
      if (nextSlide) gsap.set(nextSlide, { zIndex: 3 });

      const tl = gsap.timeline({
        onComplete: () => {
          setActiveIndex(nextIdx);
          setFrontIndex(nextIdx);
          setTransitioning(false);
        },
      });

      if (prevCopy) tl.to(prevCopy, { opacity: 0, y: -18, duration: 0.45, ease: "power2.in" }, 0);
      if (prevCards) tl.to(prevCards, { opacity: 0, y: -12, duration: 0.45, ease: "power2.in" }, 0.05);
      if (prevSlide) tl.to(prevSlide, { opacity: 0, scale: 1.02, duration: 0.65, ease: "power2.in" }, 0.08);

      if (nextSlide) gsap.set(nextSlide, { opacity: 0, scale: 1.02 });
      if (nextCopy) gsap.set(nextCopy, { opacity: 0, y: 22 });
      if (nextCards) gsap.set(nextCards, { opacity: 0, y: 18 });

      if (nextSlide) tl.to(nextSlide, { opacity: 1, scale: 1.0, duration: 0.95, ease: "sine.inOut" }, 0.22);
      if (nextCopy) tl.to(nextCopy, { opacity: 1, y: 0, duration: 0.75, ease: "power2.out" }, 0.45);
      if (nextCards) tl.to(nextCards, { opacity: 1, y: 0, duration: 0.75, ease: "power2.out" }, 0.55);
    },
    [activeIndex, transitioning, motionReady]
  );

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const nextIdx = (activeIndex + 1) % slideCount;
      goToSlide(nextIdx);
    }, INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeIndex, goToSlide, slideCount]);

  const handleDot = (idx) => {
    if (timerRef.current) clearInterval(timerRef.current);
    goToSlide(idx);
  };

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReduced) { setMotionReady(false); return; }

        const mod = await import("gsap");
        const gsap = mod.default || mod.gsap || mod;
        gsapRef.current = gsap;
        if (cancelled) return;
        setMotionReady(true);

        slideRefs.current.forEach((el, i) => {
          if (!el) return;
          gsap.set(el, { opacity: i === 0 ? 1 : 0, scale: i === 0 ? 1.02 : 1, zIndex: i === 0 ? 3 : 1 });
        });
        copyRefs.current.forEach((el, i) => {
          if (!el) return;
          gsap.set(el, { opacity: i === 0 ? 1 : 0, y: i === 0 ? 0 : 18 });
        });
        cardGroupRefs.current.forEach((el, i) => {
          if (!el) return;
          gsap.set(el, { opacity: i === 0 ? 1 : 0, y: i === 0 ? 0 : 18 });
        });

        const tl = gsap.timeline({ delay: 0.12 });
        if (slideRefs.current[0]) tl.to(slideRefs.current[0], { scale: 1.0, duration: 1.2, ease: "sine.inOut" }, 0);
        if (copyRefs.current[0])
          tl.fromTo(copyRefs.current[0], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.75, ease: "power2.out" }, 0.25);
        if (cardGroupRefs.current[0])
          tl.fromTo(cardGroupRefs.current[0], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.75, ease: "power2.out" }, 0.38);
      } catch { setMotionReady(false); }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const handleScrollCue = () => {
    window.scrollTo({ top: window.innerHeight - 80, behavior: 'smooth' });
  };

  return (
    <section
      ref={(el) => (heroRef.current = el)}
      className="relative w-full h-screen min-h-[580px] sm:min-h-[700px] max-h-[1000px] overflow-hidden -mt-16 sm:-mt-20"
    >
      {/* BACKGROUNDS */}
      {slides.map((slide, i) => {
        const shouldMountImage = keepBg.has(i);
        const isInitialLCP = i === 0 && activeIndex === 0 && frontIndex === 0;
        const bgSrc = getBgSrc(i);

        return (
          <div
            key={slide.id}
            ref={(el) => (slideRefs.current[i] = el)}
            className={`absolute inset-0 will-change-transform ${motionReady ? "opacity-0" : ""}`}
            style={motionReady ? undefined : { opacity: i === activeIndex ? 1 : 0, zIndex: i === activeIndex ? 3 : 1 }}
          >
            {shouldMountImage ? (
              <Image
                src={bgSrc}
                alt=""
                aria-hidden="true"
                fill
                sizes="100vw"
                quality={95}
                priority={isInitialLCP}
                loading={isInitialLCP ? "eager" : "lazy"}
                fetchPriority={isInitialLCP ? "high" : "auto"}
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-bg" />
            )}
            <div className="absolute inset-0 bg-black/10" />
          </div>
        );
      })}

      {/* SCRIM */}
      <div className="absolute inset-0 z-[2]" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/70 to-bg/20" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg/50 to-transparent" />
      </div>

      {/* AMBIENT GLOW */}
      <div className="absolute inset-0 z-[2] pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/3 left-[10%] w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[140px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-[15%] w-[400px] h-[400px] rounded-full bg-accent-violet/[0.03] blur-[120px] animate-pulse-glow" style={{ animationDelay: "2s" }} />
      </div>

      <CursorSpotlight />

      {/* CONTENT */}
      <div className="relative z-[3] h-full max-w-[1400px] mx-auto px-6 md:px-8 flex items-center">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full pt-16">
          {/* LEFT COPY */}
          <div className="relative min-h-[340px]">
            {slides.map((slide, i) => {
              const badge = SLIDE_BADGES[i % SLIDE_BADGES.length];
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={slide.id}
                  ref={(el) => (copyRefs.current[i] = el)}
                  className={`${i === 0 ? "" : "absolute inset-0"} space-y-6 ${motionReady ? "opacity-0" : ""}`}
                  style={{
                    pointerEvents: i === (motionReady ? frontIndex : activeIndex) ? "auto" : "none",
                    ...(motionReady ? {} : { opacity: i === activeIndex ? 1 : 0 }),
                  }}
                >
                  {/* Status badges */}
                  <div className="flex items-center gap-2">
                    <Badge color={badge.color} dot>
                      {badge.label}
                    </Badge>
                    <Badge color="default" className="!bg-white/[0.04] !border-white/[0.06]">
                      <BadgeIcon size={10} className="mr-1" />
                      Collection
                    </Badge>
                  </div>

                  <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[58px] font-bold leading-[1.08] tracking-tight text-balance">
                    {slide.heading.split(" ").map((word, wi) => {
                      const gradientWords = ["collection", "rarity", "clarity"];
                      const isGradient = gradientWords.some((gw) => word.toLowerCase().includes(gw));
                      return (
                        <span key={wi}>
                          {isGradient ? <span className="gradient-text">{word}</span> : word}{" "}
                        </span>
                      );
                    })}
                  </h1>

                  <p className="text-base sm:text-lg text-muted leading-relaxed max-w-lg">{slide.sub}</p>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <Link href="/explore">
                      <Button variant="primary" size="lg">
                        Explore <ArrowRight size={16} />
                      </Button>
                    </Link>
                    <Link href="/mint">
                      <Button variant="secondary" size="lg">
                        Connect Wallet
                      </Button>
                    </Link>
                  </div>

                  {/* Trust pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-white/[0.03] border border-white/[0.06]">
                      <Shield size={11} className="text-accent" />
                      <span className="text-[11px] text-muted-dim">Verified</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-white/[0.03] border border-white/[0.06]">
                      <Zap size={11} className="text-accent-violet" />
                      <span className="text-[11px] text-muted-dim">Fast mint</span>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-pill bg-success/10 border border-success/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      <span className="text-[10px] text-success font-mono font-medium">Ethereum</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT TRIPTYCH CARDS */}
          <div className="relative hidden lg:flex items-center justify-center min-h-[420px]">
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                ref={(el) => (cardGroupRefs.current[i] = el)}
                className={`${i === 0 ? "" : "absolute inset-0"} flex items-center justify-center ${motionReady ? "opacity-0" : ""}`}
                style={{
                  pointerEvents: i === (motionReady ? frontIndex : activeIndex) ? "auto" : "none",
                  ...(motionReady ? {} : { opacity: i === activeIndex ? 1 : 0 }),
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[360px] h-[360px] rounded-full bg-gradient-radial from-accent/[0.05] via-transparent to-transparent animate-pulse-glow" />
                </div>

                <div className="relative w-full max-w-[500px] h-[400px]">
                  {(slide.cards || []).slice(0, 3).map((nft, ci) => {
                    const positions = [
                      { left: "0%", top: "12%", rotate: "-7deg", scale: "0.88", z: 1 },
                      { left: "50%", top: "0%", rotate: "0deg", scale: "1", z: 3, transform: "translateX(-50%)" },
                      { right: "0%", top: "12%", rotate: "7deg", scale: "0.88", z: 2 },
                    ];
                    const pos = positions[ci] || positions[1];
                    const heroOverride = HERO_CARD_IMAGES[i]?.[ci] || null;
                    const fallbackImg = nft?.normalized_metadata?.image || nft?.image || "/pictures/nft-00.svg";
                    const imgSrc = heroOverride || fallbackImg;

                    return (
                      <div
                        key={nft?.id ?? `card-${i}-${ci}`}
                        className="absolute group cursor-pointer"
                        style={{
                          left: pos.left,
                          right: pos.right,
                          top: pos.top,
                          transform: `${pos.transform || ""} rotate(${pos.rotate}) scale(${pos.scale})`,
                          zIndex: pos.z,
                          width: "52%",
                        }}
                      >
                        <div className="glass-card rounded-card overflow-hidden card-hover shadow-card">
                          <div className="aspect-[3/4] w-full relative overflow-hidden">
                            <Image
                              src={imgSrc}
                              alt={nft?.name || "NFT"}
                              fill
                              sizes="(min-width: 1024px) 260px, 0px"
                              quality={88}
                              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-accent/10 via-transparent to-accent-violet/10" />
                          </div>
                          <div className="p-3.5 space-y-1">
                            <p className="text-[10px] text-muted-dim font-mono truncate">{nft?.collectionName}</p>
                            <p className="text-[13px] font-display font-semibold text-text truncate">{nft?.name}</p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-accent font-mono">{nft?.price}</span>
                              <span className="text-[10px] text-muted-dim">#{nft?.token_id}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DOTS */}
      <div className="absolute bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-[4] flex items-center gap-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDot(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`
              relative h-1.5 rounded-full transition-all duration-500 ease-out
              ${i === (motionReady ? frontIndex : activeIndex) ? "w-8 bg-accent shadow-glow" : "w-2 bg-white/20 hover:bg-white/40"}
            `}
          >
            {i === (motionReady ? frontIndex : activeIndex) && (
              <span
                key={`${(motionReady ? frontIndex : activeIndex)}-fill`}
                className="absolute inset-0 rounded-full bg-accent/60 origin-left"
                style={{ animation: `dot-fill ${INTERVAL}ms linear` }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Scroll cue */}
      <button onClick={handleScrollCue} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[4] flex flex-col items-center gap-1 text-muted-dim hover:text-muted transition-colors animate-float">
        <span className="text-[10px] font-mono tracking-widest uppercase hidden sm:block">Scroll</span>
        <ChevronDown size={16} />
      </button>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg to-transparent z-[3]" />
    </section>
  );
}
