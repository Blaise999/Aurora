'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Check, ExternalLink, Wallet, Loader2, Heart } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useConnect } from 'wagmi';
import PageShell from '@/components/layout/PageShell';
import NFTGrid from '@/components/nft/NFTGrid';
import NFTGridAlchemy from '@/components/nft/NFTGridAlchemy';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { NFTCardSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { getExplorerUrl } from '@/lib/web3/contract';

export default function ProfilePage() {
  const params = useParams();
  const wa = params?.address;
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { session, isAuthed } = useAuth();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('all');
  const [dbNfts, setDbNfts] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [favs, setFavs] = useState([]);
  const [favsLoading, setFavsLoading] = useState(false);

  const isOwn = isAuthed && session?.toLowerCase() === wa?.toLowerCase();
  const shortAddr = wa ? `${wa.slice(0,8)}…${wa.slice(-6)}` : '';
  const explorerUrl = getExplorerUrl();
  const handleCopy = () => { if (wa) navigator.clipboard.writeText(wa); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleConnect = () => { const c = connectors[0]; if (c) connect({ connector: c }); };

  // Load minted NFTs from wallet_mints via profile/nfts
  useEffect(() => {
    if (tab !== 'minted' || !isOwn) return;
    let a = true;
    setDbLoading(true);
    fetch('/api/profile/nfts').then(r => r.json()).then(d => { if (a && d.nfts) setDbNfts(d.nfts); }).catch(() => {}).finally(() => { if (a) setDbLoading(false); });
    return () => { a = false; };
  }, [tab, isOwn]);

  // Load favorites
  useEffect(() => {
    if (tab !== 'favorites' || !isOwn || !wa) return;
    let a = true;
    setFavsLoading(true);
    fetch(`/api/favorites?wallet=${wa}`).then(r => r.json()).then(d => {
      if (a && d.favorites) {
        const formatted = d.favorites.map(f => {
          const cn = f.cached_nfts;
          return cn ? { id: `${cn.contract_address}_${cn.token_id}`, contractAddress: cn.contract_address, tokenId: cn.token_id, name: cn.name, description: cn.description || '', chain: cn.chain_id === 8453 ? 'Base' : 'Ethereum', collectionName: cn.collection_name, normalized_metadata: { image: cn.image_url }, image: cn.image_url, price: '—', lastSale: '—' } : null;
        }).filter(Boolean);
        setFavs(formatted);
      }
    }).catch(() => {}).finally(() => { if (a) setFavsLoading(false); });
    return () => { a = false; };
  }, [tab, isOwn, wa]);

  if (!isConnected) return (
    <PageShell><div className="min-h-[70vh] flex items-center justify-center px-4"><div className="text-center max-w-md space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto"><Wallet size={28} className="text-accent" /></div>
      <div><h1 className="font-display font-bold text-2xl text-text mb-2">Connect Your Wallet</h1><p className="text-sm text-muted">Connect to view profiles, favorites, and minted NFTs.</p></div>
      <Button variant="primary" size="lg" className="w-full" onClick={handleConnect} disabled={isPending}>{isPending ? <Loader2 size={16} className="animate-spin"/> : <Wallet size={16}/>} Connect Wallet</Button>
    </div></div></PageShell>
  );

  return (
    <PageShell>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted hover:text-text mb-6 transition-colors"><ArrowLeft size={16}/> Home</Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-violet flex items-center justify-center shrink-0"><span className="font-display font-bold text-bg text-xl">{wa?.[2]?.toUpperCase() || '?'}</span></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3"><h1 className="font-display text-2xl font-bold text-text truncate">{shortAddr}</h1><button onClick={handleCopy} className="p-1.5 text-muted hover:text-text transition-colors">{copied ? <Check size={14} className="text-success"/> : <Copy size={14}/>}</button></div>
            <div className="flex items-center gap-2 mt-1">{isOwn && <Badge color="accent">Your Wallet</Badge>}<a href={`${explorerUrl}/address/${wa}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-accent font-mono flex items-center gap-1"><ExternalLink size={10}/> Explorer</a></div>
          </div>
        </div>
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {['all','minted','favorites'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm rounded-xl transition-colors whitespace-nowrap ${tab === t ? 'bg-accent/10 text-accent font-medium' : 'text-muted hover:text-text hover:bg-white/[0.04]'}`}>
              {t === 'all' ? 'All NFTs (Chain)' : t === 'minted' ? 'Minted' : 'Favorites'}
              {t === 'favorites' && <Heart size={12} className="inline ml-1.5"/>}
            </button>
          ))}
        </div>

        {tab === 'all' ? <NFTGridAlchemy owner={wa}/> : tab === 'minted' ? (
          <div>{dbLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{Array.from({length:4}).map((_,i) => <NFTCardSkeleton key={i}/>)}</div> : dbNfts.length > 0 ? <NFTGrid nfts={dbNfts} columns={4}/> : <div className="text-center py-20"><p className="text-muted text-sm">No minted NFTs yet.</p><Link href="/mint"><Button variant="primary" size="md" className="mt-4">Browse & Mint</Button></Link></div>}</div>
        ) : (
          <div>{favsLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{Array.from({length:4}).map((_,i) => <NFTCardSkeleton key={i}/>)}</div> : favs.length > 0 ? <NFTGrid nfts={favs} columns={4}/> : <div className="text-center py-20"><p className="text-muted text-sm">No favorites yet.</p><p className="text-muted-dim text-xs mt-1">Click the heart icon on any NFT to save it here.</p><Link href="/explore"><Button variant="primary" size="md" className="mt-4">Explore NFTs</Button></Link></div>}</div>
        )}
      </div>
    </PageShell>
  );
}
