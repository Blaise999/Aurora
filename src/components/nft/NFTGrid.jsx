'use client';
import { useMemo } from 'react';
import NFTCard from './NFTCard';
import { NFTCardSkeleton } from '@/components/ui/Skeleton';

export default function NFTGrid({ nfts = [], loading = false, columns = 4 }) {
  const colClasses = {
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };
  const memoizedNfts = useMemo(() => nfts, [nfts]);

  if (loading) {
    return (
      <div className={`grid ${colClasses[columns]} gap-5`}>
        {Array.from({ length: 8 }).map((_, i) => <NFTCardSkeleton key={i} />)}
      </div>
    );
  }
  if (!memoizedNfts.length) return null;
  return (
    <div className={`grid ${colClasses[columns]} gap-5`}>
      {memoizedNfts.map((nft, i) => <NFTCard key={nft.id} nft={nft} index={i} />)}
    </div>
  );
}
