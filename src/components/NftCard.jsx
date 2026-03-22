'use client';
import { memo, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import NFTMedia from '@/components/NFTMedia';
import Badge from '@/components/ui/Badge';

function mintHref(nft) {
  const p = new URLSearchParams();
  if (nft.contractAddress) p.set("contract", nft.contractAddress);
  if (nft.tokenId) p.set("tokenId", nft.tokenId);
  if (nft.nftId) p.set("nftId", nft.nftId);
  if (nft.isLocal) p.set("local", "1");
  return `/mint?${p}`;
}

const NFTCard = memo(function NFTCard({ nft, index = 0 }) {
  const [hov, setHov] = useState(false);
  const desc = nft.description || nft.normalized_metadata?.description || '';
  const img = nft.image || nft.normalized_metadata?.image || nft.image_url || '';
  const displayPrice = (nft.price && nft.price !== '—') ? nft.price : nft.mintPrice ? `${nft.mintPrice} ETH` : null;
  const hasPrice = !!displayPrice;
  const hasLast = nft.lastSale && nft.lastSale !== '—';

  return (
    <Link href={mintHref(nft)} prefetch={false}>
      <div className="group rounded-card overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.10] transition-all duration-400 animate-fade-in"
        style={{ animationDelay: `${Math.min(index, 11) * 60}ms` }}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        <div className="relative overflow-hidden">
          <div className={`transition-transform duration-700 ease-out ${hov ? 'scale-[1.04]' : 'scale-100'}`}>
            <NFTMedia src={img} alt={nft.name} />
          </div>
          <div className={`absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent transition-opacity duration-300 flex items-end p-4 ${hov ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-xs text-accent font-mono">Mint Now →</span>
          </div>
          <div className="absolute top-3 left-3">
            <Badge color="default" className="!bg-black/50 backdrop-blur-md !border-white/10 !text-[10px]">{nft.chain || 'Base'}</Badge>
          </div>
          <button className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all duration-300 hover:bg-white/10 ${hov ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <Heart size={13} className="text-muted" />
          </button>
        </div>
        <div className="p-3 sm:p-4 space-y-1 sm:space-y-1.5">
          <p className="text-[10px] text-muted-dim font-mono truncate tracking-wide uppercase">{nft.collectionName || nft.collection || 'Collection'}</p>
          <p className="text-sm font-display font-semibold text-text truncate group-hover:text-accent transition-colors duration-200">{nft.name}</p>
          {desc && <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{desc}</p>}
          {hasPrice || hasLast ? (
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <div><p className="text-[9px] text-muted-dim uppercase tracking-wider">Price</p><p className="text-sm text-accent font-mono font-semibold mt-0.5">{displayPrice}</p></div>
              <div className="text-right"><p className="text-[9px] text-muted-dim uppercase tracking-wider">Last</p><p className="text-sm text-muted font-mono mt-0.5">{nft.lastSale}</p></div>
            </div>
          ) : (
            <div className="pt-2 border-t border-white/[0.06]"><p className="text-[10px] text-muted-dim/60 italic">No listing data</p></div>
          )}
        </div>
      </div>
    </Link>
  );
});
export default NFTCard;
