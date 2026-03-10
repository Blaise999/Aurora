"use client";
import { useState, useMemo } from "react";
import { useTrendingNfts } from "@/hooks/useNfts";
import NftCard from "@/components/NftCard";
import NftCardSkeleton from "@/components/NftCardSkeleton";

const TABS = [
  { key: "all", label: "All" },
  { key: "trending", label: "Trending" },
  { key: "recent", label: "Recently Added" },
];

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState("all");
  const { nfts, loading } = useTrendingNfts(24);

  // Client-side filtering
  const filteredNfts = useMemo(() => {
    if (activeTab === "trending") {
      return [...nfts].sort((a, b) => parseFloat(b.mintPrice || 0) - parseFloat(a.mintPrice || 0));
    }
    if (activeTab === "recent") {
      return [...nfts].reverse();
    }
    return nfts;
  }, [nfts, activeTab]);

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-accent/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-accent-violet/4 rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-[2px] bg-accent" />
            <span className="text-xs font-display font-semibold text-accent uppercase tracking-widest">
              Discover
            </span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl mb-4">
            Explore <span className="text-gradient">NFTs</span>
          </h1>
          <p className="text-muted max-w-xl">
            Browse the full collection of unique digital artworks. Click any NFT to view details and mint.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-5 py-2.5 rounded-pill text-sm font-display font-medium whitespace-nowrap transition-all
                ${
                  activeTab === tab.key
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "bg-surface2 text-muted border border-border-light hover:border-border hover:text-text"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {loading ? (
            <NftCardSkeleton count={20} />
          ) : (
            filteredNfts.map((nft, i) => (
              <NftCard
                key={`${nft.contractAddress}-${nft.tokenId}-${i}`}
                nft={nft}
                index={i}
              />
            ))
          )}
        </div>

        {!loading && filteredNfts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted text-lg">No NFTs found</p>
          </div>
        )}
      </div>
    </div>
  );
}
