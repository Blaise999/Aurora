'use client';
import { useRef, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import NFTCard from '@/components/nft/NFTCard';
import { featuredNFTs } from '@/lib/mock/nfts';
import { normalizeUiNfts } from '@/components/nft/normalizeUiNft';
import { useCachedNfts } from '@/hooks/useNfts';

export default function FeaturedNFTs() {
  const scrollRef = useRef(null);
  const fallback = useMemo(() => normalizeUiNfts(featuredNFTs), []);
  const { nfts: rawNfts } = useCachedNfts(20);
  const [cL, setCL] = useState(false);
  const [cR, setCR] = useState(true);

  const nfts = useMemo(() => {
    if (!rawNfts?.length) return fallback;
    // Shuffle so every page load shows different order
    const shuffled = [...rawNfts].sort(() => Math.random() - 0.5);
    const list = shuffled.map(n => ({
      id: n.id, contractAddress: n.contractAddress, tokenId: n.tokenId,
      name: n.name, description: n.description, collectionName: n.collection,
      chain: n.chain, normalized_metadata: { image: n.image }, image: n.image,
      price: '—', lastSale: '—'
    }));
    const norm = normalizeUiNfts(list);
    return norm.length ? norm.slice(0, 12) : fallback;
  }, [rawNfts, fallback]);

  const chk = () => { if (!scrollRef.current) return; const { scrollLeft: l, scrollWidth: w, clientWidth: c } = scrollRef.current; setCL(l > 10); setCR(l < w - c - 10); };
  const scroll = (d) => { scrollRef.current?.scrollBy({ left: d * 320, behavior: 'smooth' }); setTimeout(chk, 400); };

  return (
    <section className="py-16 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="flex items-end justify-between mb-7">
          <div><h2 className="font-display text-xl sm:text-2xl font-bold text-text">Featured</h2><p className="text-[12px] text-muted mt-1">Hand-picked pieces from top collections</p></div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <button onClick={() => scroll(-1)} disabled={!cL} className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted hover:text-text disabled:opacity-30 transition-all"><ChevronLeft size={15}/></button>
              <button onClick={() => scroll(1)} disabled={!cR} className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted hover:text-text disabled:opacity-30 transition-all"><ChevronRight size={15}/></button>
            </div>
            <Link href="/explore" className="hidden sm:flex items-center gap-1 text-[12px] text-muted hover:text-accent transition-colors">See all<ArrowUpRight size={12}/></Link>
          </div>
        </div>
      </div>
      <div ref={scrollRef} onScroll={chk} className="flex gap-4 overflow-x-auto scrollbar-hide px-6 md:px-8 snap-x snap-mandatory pb-4" style={{ scrollbarWidth: 'none' }}>
        <div className="shrink-0 w-[calc((100%-1400px)/2+1.5rem)] hidden xl:block"/>
        {nfts.map((nft, i) => <div key={nft.id} className="shrink-0 w-[260px] snap-start"><NFTCard nft={nft} index={i}/></div>)}
        <div className="shrink-0 w-8"/>
      </div>
    </section>
  );
}
