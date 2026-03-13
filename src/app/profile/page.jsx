'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Check, ExternalLink, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import PageShell from '@/components/layout/PageShell';
import NFTGridAlchemy from '@/components/nft/NFTGridAlchemy';
import NftCard from '@/components/NftCard';
import NftCardSkeleton from '@/components/NftCardSkeleton';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useSession } from '@/hooks/useSession';
import { getExplorerUrl } from '@/lib/web3/contract';

export default function ProfileByAddress() {
  const params = useParams();
  const router = useRouter();
  const wa = params?.address;
  const { address } = useAccount();
  const { profile, isLoggedIn } = useSession();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('all');
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const isOwn = isLoggedIn && (
    profile?.wallet_address?.toLowerCase() === wa?.toLowerCase() ||
    address?.toLowerCase() === wa?.toLowerCase()
  );
  const shortAddr = wa ? `${wa.slice(0, 8)}…${wa.slice(-6)}` : '';
  const explorerUrl = getExplorerUrl();
  const handleCopy = () => { if (wa) navigator.clipboard.writeText(wa); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // If this is user's own address, redirect to /profile
  useEffect(() => {
    if (isOwn && isLoggedIn) {
      router.replace('/profile');
    }
  }, [isOwn, isLoggedIn, router]);

  return (
    <PageShell>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted hover:text-text mb-6 transition-colors"><ArrowLeft size={16} /> Home</Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-violet flex items-center justify-center shrink-0">
            <span className="font-display font-bold text-bg text-xl">{wa?.[2]?.toUpperCase() || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-text truncate">{shortAddr}</h1>
              <button onClick={handleCopy} className="p-1.5 text-muted hover:text-text transition-colors">
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            </div>
            <a href={`${explorerUrl}/address/${wa}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-accent font-mono flex items-center gap-1 mt-1">
              <ExternalLink size={10} /> View on Explorer
            </a>
          </div>
        </div>

        <NFTGridAlchemy owner={wa} />
      </div>
    </PageShell>
  );
}
