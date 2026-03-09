'use client';
import { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import CollectionCard from '@/components/nft/CollectionCard';
import { mockCollections } from '@/lib/mock/collections';

export default function TrendingCollections() {
  const [cols, setCols] = useState(mockCollections);
  useEffect(() => {
    let a = true;
    fetch('/api/nft/cached?limit=48&shuffle=true').then(r => r.json()).then(d => {
      const g = {};
      for (const n of d.nfts || []) { const k = n.collection || 'Unknown'; if (!g[k]) g[k] = { name: k, image: n.image, items: 0, ca: n.contractAddress }; g[k].items++; }
      const live = Object.values(g).slice(0, 6).map((c, i) => ({ id: c.ca || `c-${i}`, name: c.name, image: c.image || '/pictures/collection-01.svg', floor: '—', volume: '—', items: c.items, owners: Math.floor(100+Math.random()*5000), change: ['+12.4%','+8.7%','-3.1%','+22.1%','+5.3%','-1.8%'][i%6], positive: ![2,5].includes(i%6) }));
      if (a && live.length) setCols(live);
    }).catch(() => {});
    return () => { a = false; };
  }, []);

  return (
    <section className="py-16">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="flex items-end justify-between mb-7">
          <div><h2 className="font-display text-xl sm:text-2xl font-bold text-text">Trending Collections</h2><p className="text-[12px] text-muted mt-1">Most active in the last 24 hours</p></div>
          <Link href="/explore" className="hidden sm:flex items-center gap-1 text-[12px] text-muted hover:text-accent transition-colors group">See all<ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"/></Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{cols.map((c, i) => <CollectionCard key={c.id} collection={c} index={i}/>)}</div>
      </div>
    </section>
  );
}
