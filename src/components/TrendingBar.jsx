"use client";
import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTrendingNfts } from "@/hooks/useNfts";
import { resolveImage, buildMintUrl, formatEth } from "@/lib/utils";

export default function TrendingBar() {
  const { nfts, loading } = useTrendingNfts(12);

  // Duplicate for infinite scroll effect
  const doubled = useMemo(() => [...nfts, ...nfts], [nfts]);

  if (loading || nfts.length === 0) return null;

  return (
    <section className="relative py-6 border-y border-border-light bg-surface/30 overflow-hidden">
      {/* Label */}
      <div className="absolute left-0 top-0 bottom-0 w-32 sm:w-48 bg-gradient-to-r from-bg to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 sm:w-48 bg-gradient-to-l from-bg to-transparent z-20 pointer-events-none" />

      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-hot animate-pulse" />
        <span className="text-xs font-display font-semibold text-hot uppercase tracking-wider hidden sm:block">
          Trending
        </span>
      </div>

      {/* Marquee */}
      <div className="marquee-track">
        {doubled.map((nft, i) => (
          <Link
            key={`${nft.tokenId}-${i}`}
            href={buildMintUrl(nft)}
            className="flex-shrink-0 flex items-center gap-3 px-4 py-1.5 mx-2 rounded-pill bg-surface2/50 border border-border-light hover:border-accent/30 transition-all group"
          >
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={resolveImage(nft)}
                alt={nft.name || "NFT"}
                fill
                className="object-cover group-hover:scale-110 transition-transform"
                sizes="32px"
              />
            </div>
            <span className="text-xs font-medium text-text truncate max-w-[120px]">
              {nft.name || `#${nft.tokenId}`}
            </span>
            {(nft.price_eth || nft.priceEth) && (
              <span className="text-xs font-mono text-accent">
                {formatEth(nft.price_eth || nft.priceEth)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
