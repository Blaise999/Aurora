"use client";
import { useTrendingNfts } from "@/hooks/useNfts";
import NftCard from "./NftCard";
import NftCardSkeleton from "./NftCardSkeleton";
import Link from "next/link";

export default function FeaturedSection() {
  const { nfts, loading } = useTrendingNfts(8);

  return (
    <section className="relative py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-8 sm:mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-[2px] bg-accent" />
              <span className="text-xs font-display font-semibold text-accent uppercase tracking-widest">
                Featured
              </span>
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl">
              Trending <span className="text-gradient">NFTs</span>
            </h2>
          </div>
          <Link
            href="/explore"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-pill text-sm font-display font-medium border border-border hover:border-accent/40 hover:text-accent transition-all"
          >
            View All
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {loading ? (
            <NftCardSkeleton count={8} />
          ) : (
            nfts.map((nft, i) => (
              <NftCard key={`${nft.contractAddress}-${nft.tokenId}-${i}`} nft={nft} index={i} />
            ))
          )}
        </div>

        {/* Mobile View All */}
        <div className="sm:hidden mt-8 text-center">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-pill text-sm font-display font-medium border border-border hover:border-accent/40 transition"
          >
            View All NFTs
          </Link>
        </div>
      </div>
    </section>
  );
}
