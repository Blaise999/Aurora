"use client";
import Image from "next/image";
import Link from "next/link";
import { useTrendingNfts } from "@/hooks/useNfts";
import { resolveImage, buildMintUrl } from "@/lib/utils";

export default function CollectionPreview() {
  const { nfts } = useTrendingNfts(6);

  // Group into 2 "collections" for visual variety
  const collections = [
    {
      name: "Aurora Genesis",
      description: "The original collection of 10,000 unique generative artworks",
      nfts: nfts.slice(0, 3),
      color: "from-accent/20 to-accent-violet/20",
    },
    {
      name: "Celestial Fragments",
      description: "Rare cosmic artifacts from the edge of the digital universe",
      nfts: nfts.slice(3, 6),
      color: "from-accent-violet/20 to-hot/20",
    },
  ];

  return (
    <section className="py-16 sm:py-24 relative">
      {/* Bg glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-violet/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-[2px] bg-accent-violet" />
          <span className="text-xs font-display font-semibold text-accent-violet uppercase tracking-widest">
            Collections
          </span>
        </div>
        <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl mb-8 sm:mb-12">
          Top <span className="text-gradient">Collections</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {collections.map((col, ci) => (
            <div
              key={ci}
              className={`rounded-card p-5 sm:p-6 bg-gradient-to-br ${col.color} border border-border-light card-hover`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-lg">{col.name}</h3>
                  <p className="text-xs text-muted-dim mt-1">{col.description}</p>
                </div>
                <Link
                  href="/explore"
                  className="px-3 py-1.5 rounded-pill text-xs font-display font-medium border border-border hover:border-accent/40 transition"
                >
                  View
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {col.nfts.map((nft, i) => (
                  <Link
                    key={i}
                    href={buildMintUrl(nft)}
                    className="relative flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-border-light group"
                  >
                    <Image
                      src={resolveImage(nft)}
                      alt={nft.name || "NFT"}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="128px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <p className="absolute bottom-2 left-2 right-2 text-[10px] font-medium truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {nft.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
