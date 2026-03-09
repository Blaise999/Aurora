'use client';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import NFTGridCollection from '@/components/nft/NFTGridCollection';

export default function CollectionPage() {
  const params = useParams();
  const router = useRouter();
  const contractAddress = params?.contractAddress;

  return (
    <PageShell>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted hover:text-text mb-6 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-text">Collection</h1>
          <p className="text-sm text-muted mt-1 font-mono truncate">{contractAddress}</p>
        </div>
        <NFTGridCollection contractAddress={contractAddress} />
      </div>
    </PageShell>
  );
}
