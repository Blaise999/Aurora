"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTrendingNfts } from "@/hooks/useNfts";
import { resolveImage, shuffle, buildMintUrl } from "@/lib/utils";
import { useWallet } from "@/context/WalletContext";

export default function HeroSection() {
  const { nfts } = useTrendingNfts(9);
  const { isConnected, connect } = useWallet();
  const [activeIdx, setActiveIdx] = useState(0);

  // Pick 3 hero NFTs
  const heroNfts = useMemo(() => {
    if (nfts.length === 0) return [];
    return shuffle(nfts).slice(0, 3);
  }, [nfts]);

  // Rotate featured NFT
  useEffect(() => {
    if (heroNfts.length === 0) return;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % heroNfts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroNfts.length]);

  return (
    <section className="relative min-h-[90vh] sm:min-h-screen flex items-center overflow-hidden">
      {/* Animated bg blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/5 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-accent-violet/8 rounded-full blur-[100px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Text */}
          <div className="space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-accent/10 border border-accent/20">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-semibold font-display text-accent uppercase tracking-wider">
                Live on Base
              </span>
            </div>

            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight">
              Discover &{" "}
              <span className="text-gradient">Collect</span>
              <br />
              Digital Art
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-lg leading-relaxed">
              Explore thousands of unique NFTs from creators worldwide.
              Mint, trade, and build your collection on Base L2.
            </p>

            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link
                href="/explore"
                className="px-7 py-3.5 rounded-pill font-display font-semibold text-sm bg-gradient-to-r from-accent to-accent-violet text-bg hover:shadow-glow transition-all duration-300 hover:scale-[1.03]"
              >
                Explore NFTs
              </Link>
              {!isConnected && (
                <button
                  onClick={connect}
                  className="px-7 py-3.5 rounded-pill font-display font-semibold text-sm border border-border text-text hover:bg-white/5 transition-all duration-300"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-8 sm:gap-12 pt-4">
              {[
                { label: "NFTs", value: "10K+" },
                { label: "Collectors", value: "2.4K" },
                { label: "Volume", value: "847 ETH" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-display font-bold text-xl sm:text-2xl text-text">{stat.value}</p>
                  <p className="text-xs text-muted-dim mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Featured NFT Cards */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-square">
              {heroNfts.map((nft, idx) => {
                const isActive = idx === activeIdx;
                const offset = idx - activeIdx;
                return (
                  <Link
                    key={idx}
                    href={buildMintUrl(nft)}
                    className="absolute inset-0 rounded-card overflow-hidden border border-border-light shadow-card transition-all duration-700"
                    style={{
                      transform: `translateX(${offset * 30}px) translateY(${Math.abs(offset) * 15}px) scale(${isActive ? 1 : 0.9}) rotate(${offset * 3}deg)`,
                      zIndex: isActive ? 30 : 20 - Math.abs(offset),
                      opacity: isActive ? 1 : 0.5,
                    }}
                  >
                    <Image
                      src={resolveImage(nft)}
                      alt={nft.name || "NFT"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 90vw, 400px"
                      priority={idx === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="font-display font-bold text-lg truncate">{nft.name}</p>
                      <p className="text-xs text-muted mt-1">
                        {nft.collection || "Aurora Collection"}
                      </p>
                    </div>
                    {isActive && (
                      <div className="absolute inset-0 rounded-card border-2 border-accent/30 pointer-events-none" />
                    )}
                  </Link>
                );
              })}

              {/* Glow behind cards */}
              <div className="absolute inset-0 bg-accent/5 rounded-full blur-[80px] -z-10" />
            </div>

            {/* Dots indicator */}
            {heroNfts.length > 0 && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                {heroNfts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIdx(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === activeIdx ? "bg-accent w-6" : "bg-muted-dim/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
