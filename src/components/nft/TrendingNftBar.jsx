'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Flame, TrendingUp, ArrowUpRight, Heart, Eye } from 'lucide-react';
import NFTMedia from '@/components/NFTMedia';
import Badge from '@/components/ui/Badge';
import { trendingNFTs, featuredNFTs } from '@/lib/mock/nfts';
import { normalizeUiNfts } from '@/components/nft/normalizeUiNft';

function mintHref(nft) { const p = new URLSearchParams(); if (nft.contractAddress) p.set("contract", nft.contractAddress); if (nft.tokenId) p.set("tokenId", nft.tokenId); return `/mint?${p}`; }

export default function TrendingNftBar() {
  const fallback = useMemo(() => normalizeUiNfts(trendingNFTs.length ? trendingNFTs : featuredNFTs).slice(0, 4), []);
  const [items, setItems] = useState(fallback);
  const [hovIdx, setHovIdx] = useState(-1);
  const [vis, setVis] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let a = true;
    fetch('/api/nft/cached?limit=20&shuffle=true').then(r => r.json()).then(d => {
      const list = (d.nfts || []).slice(0, 4).map(n => ({ id: n.id, contractAddress: n.contractAddress, tokenId: n.tokenId, name: n.name, collectionName: n.collection, chain: n.chain, normalized_metadata: { image: n.image }, price: '—', lastSale: '—' }));
      const norm = normalizeUiNfts(list);
      if (a && norm.length >= 4) setItems(norm);
    }).catch(() => {});
    return () => { a = false; };
  }, []);

  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.15 });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);

  if (!items.length) return null;
  const ranks = ['#1','#2','#3','#4'];
  const colors = [
    { ring: 'ring-accent/40', glow: 'shadow-[0_0_40px_rgba(0,229,255,0.12)]', badge: 'hot', tagBg: 'bg-accent/10 text-accent border-accent/20' },
    { ring: 'ring-accent-violet/40', glow: 'shadow-[0_0_40px_rgba(139,92,246,0.12)]', badge: 'rising', tagBg: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20' },
    { ring: 'ring-success/40', glow: 'shadow-[0_0_40px_rgba(16,185,129,0.12)]', badge: 'success', tagBg: 'bg-success/10 text-success border-success/20' },
    { ring: 'ring-warning/40', glow: 'shadow-[0_0_40px_rgba(245,158,11,0.12)]', badge: 'warning', tagBg: 'bg-warning/10 text-warning border-warning/20' },
  ];

  return (
    <section ref={ref} className="py-14 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"><div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[300px] bg-accent/[0.03] rounded-full blur-[100px]" /><div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[250px] bg-accent-violet/[0.03] rounded-full blur-[100px]" /></div>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-hot/20 to-hot/5 border border-hot/20 flex items-center justify-center"><Flame size={16} className="text-hot" /></div>
            <div><h2 className="font-display text-xl sm:text-2xl font-bold text-text">Trending Now</h2><p className="text-[11px] text-muted-dim mt-0.5 font-mono tracking-wide">Top movers in the last 24h</p></div>
          </div>
          <Link href="/explore" className="hidden sm:flex items-center gap-1.5 text-[13px] text-muted hover:text-accent transition-colors group">View all<ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((nft, i) => {
            const c = colors[i], hov = hovIdx === i;
            return (
              <Link key={nft.id} href={mintHref(nft)} prefetch={false} onMouseEnter={() => setHovIdx(i)} onMouseLeave={() => setHovIdx(-1)}>
                <div className={`group relative rounded-card overflow-hidden glass-card transition-all duration-500 ease-out ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${hov ? `scale-[1.03] ${c.glow}` : 'scale-100'}`} style={{ transitionDelay: vis ? `${i*100}ms` : '0ms' }}>
                  <div className="absolute top-3 left-3 z-20"><div className={`flex items-center gap-1 px-2 py-0.5 rounded-pill border text-[10px] font-mono font-bold backdrop-blur-md ${c.tagBg}`}><TrendingUp size={10}/>{ranks[i]}</div></div>
                  <div className="relative overflow-hidden"><div className={`transition-transform duration-700 ease-out ${hov ? 'scale-[1.08]' : 'scale-100'}`}><NFTMedia src={nft.normalized_metadata?.image} alt={nft.name} aspect="portrait" priority={i<2}/></div>
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-500 ${hov ? 'opacity-100' : 'opacity-40'}`}/>
                  </div>
                  <div className="p-3.5 space-y-2">
                    <p className="text-[10px] text-muted-dim font-mono truncate tracking-wide uppercase">{nft.collectionName}</p>
                    <h3 className="font-display text-[13px] sm:text-sm font-semibold text-text truncate group-hover:text-accent transition-colors duration-300">{nft.name}</h3>
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                      <div><p className="text-[9px] text-muted-dim uppercase tracking-wider">Price</p><p className="text-[13px] text-accent font-mono font-semibold mt-0.5">{nft.price !== '\u2014' ? nft.price : '0.42 ETH'}</p></div>
                      <div className="text-right"><p className="text-[9px] text-muted-dim uppercase tracking-wider">Last</p><p className="text-[13px] text-muted font-mono mt-0.5">{nft.lastSale !== '\u2014' ? nft.lastSale : '0.38 ETH'}</p></div>
                    </div>
                  </div>
                  <div className={`absolute inset-0 rounded-card pointer-events-none ring-1 ring-inset transition-all duration-500 ${hov ? c.ring : 'ring-transparent'}`}/>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
