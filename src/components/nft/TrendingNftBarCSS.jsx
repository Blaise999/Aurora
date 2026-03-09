'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import NFTMedia from '@/components/NFTMedia';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { featuredNFTs } from '@/lib/mock/nfts';
import { normalizeUiNfts } from '@/components/nft/normalizeUiNft';

const ROTATE_MS = 7000;

export default function TrendingNftBarCSS() {
  const prefersReduced = useReducedMotion();
  const fallbackItems = useMemo(() => normalizeUiNfts(featuredNFTs).slice(0, 8), []);
  const [items, setItems] = useState(fallbackItems);
  const [loaded, setLoaded] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/nft/trending');
        if (!res.ok) return;
        const data = await res.json();
        const list = normalizeUiNfts(data.nfts || data || []);
        if (alive && list.length > 0) { setItems(list); setActiveIdx(0); }
      } catch {}
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);

  const advance = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => { setActiveIdx(i => (i + 1) % items.length); setTransitioning(false); }, 500);
  }, [items.length]);

  useEffect(() => {
    if (prefersReduced || items.length <= 1) return;
    timerRef.current = setInterval(advance, ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [advance, prefersReduced, items.length]);

  if (items.length === 0) return null;
  const nft = items[activeIdx];
  const detailHref = nft.contractAddress && nft.tokenId ? `/nft/${nft.contractAddress}/${nft.tokenId}` : `/nft/${nft.id}`;

  return (
    <section className="py-5 relative overflow-hidden" onMouseEnter={() => clearInterval(timerRef.current)}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-accent" />
          <span className="text-[11px] font-mono font-semibold tracking-wider text-muted-dim uppercase">Trending Now</span>
          <div className="flex items-center gap-1.5 ml-auto">
            {items.map((_, i) => (
              <button key={i} onClick={() => { setTransitioning(true); setTimeout(() => { setActiveIdx(i); setTransitioning(false); }, 400); }}
                className={`rounded-full transition-all duration-300 ${i === activeIdx ? 'bg-accent w-5 h-1.5' : 'bg-muted-dim/30 w-1.5 h-1.5'}`} />
            ))}
          </div>
        </div>
        <Link href={detailHref} prefetch={false}>
          <div className={`group glass-card rounded-card overflow-hidden card-hover flex flex-col sm:flex-row items-stretch transition-all ease-out ${transitioning ? 'opacity-0 blur-sm scale-[0.97]' : 'opacity-100 blur-0 scale-100'}`} style={{ transitionDuration: '500ms' }}>
            <div className="sm:w-[130px] md:w-[150px] shrink-0"><NFTMedia src={nft.normalized_metadata?.image} alt={nft.name} aspect="square" priority className="!aspect-square sm:!aspect-auto sm:h-full" /></div>
            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-center space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge color="default" className="!bg-black/40 backdrop-blur-sm !border-white/10 !text-[10px]">{nft.chain}</Badge>
                <span className="text-[10px] text-muted-dim font-mono truncate">{nft.collectionName}</span>
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-text group-hover:text-accent transition-colors duration-200 truncate">{nft.name}</h3>
              <span className="text-xs text-accent font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200">View Details →</span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
