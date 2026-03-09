'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ExternalLink, Heart, Share2, Eye, Clock, ArrowLeft,
  ChevronDown, ChevronUp, Shield, Layers, Tag
} from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import NFTMedia from '@/components/NFTMedia';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import NFTCard from '@/components/nft/NFTCard';
import { getNFTById, provenanceHistory, mockNFTs } from '@/lib/mock/nfts';
import { normalizeUiNfts } from '@/components/nft/normalizeUiNft';

function Accordion({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <h3 className="text-sm font-semibold text-text">{title}</h3>
        </div>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: open ? '600px' : '0', opacity: open ? 1 : 0 }}
      >
        <div className="px-5 pb-5">{children}</div>
      </div>
    </Card>
  );
}

export default function NFTDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const [liked, setLiked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // If the id looks like contractAddress_tokenId, redirect to the proper route
  useEffect(() => {
    if (rawId && rawId.includes('_') && rawId.startsWith('0x')) {
      const parts = rawId.split('_');
      if (parts.length >= 2) {
        const contractAddr = parts[0];
        const tokenId = parts.slice(1).join('_');
        router.replace(`/nft/${contractAddr}/${tokenId}`);
      }
    }
  }, [rawId, router]);

  if (rawId && rawId.includes('_') && rawId.startsWith('0x')) {
    return <PageShell><div className="py-40 text-center text-muted text-sm">Redirecting...</div></PageShell>;
  }

  const nft = getNFTById(rawId);
  const traits = nft.normalized_metadata?.attributes || [];
  const relatedNfts = normalizeUiNfts(
    mockNFTs.filter(n => n.collectionName === nft.collectionName && n.id !== nft.id).slice(0, 4)
  );

  return (
    <PageShell>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted hover:text-text mb-6 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
        </button>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* LEFT: Media */}
          <div className="space-y-4">
            <div className="rounded-card overflow-hidden glass-card relative group">
              <div className={"transition-all duration-700 " + (imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]')}>
                <NFTMedia
                  src={nft.normalized_metadata?.image}
                  alt={nft.name}
                  aspect="portrait"
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
              {!imageLoaded && <div className="absolute inset-0 skeleton-pulse" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            <Accordion title="Description" icon={<Layers size={14} className="text-accent" />} defaultOpen={true}>
              <p className="text-sm text-muted leading-relaxed">{nft.normalized_metadata?.description}</p>
            </Accordion>

            <Accordion title="Provenance" icon={<Shield size={14} className="text-accent-violet" />}>
              <div className="space-y-0">
                {provenanceHistory.map((event, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border-light last:border-0">
                    <div className="flex flex-col items-center">
                      <div className={"w-2.5 h-2.5 rounded-full mt-1.5 " + (
                        event.event === 'Minted' ? 'bg-accent' :
                        event.event === 'Sale' ? 'bg-success' :
                        event.event === 'Listed' ? 'bg-warning' : 'bg-accent-violet'
                      )} />
                      {i < provenanceHistory.length - 1 && <div className="w-px h-full bg-border-light mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-text font-medium">{event.event}</span>
                        <span className="text-[11px] text-muted-dim flex items-center gap-1"><Clock size={10} /> {event.date}</span>
                      </div>
                      <p className="text-xs text-muted font-mono mt-0.5">{event.from} &rarr; {event.to}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Accordion>
          </div>

          {/* RIGHT: Info */}
          <div className="space-y-5">
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <Badge color="accent">{nft.chain}</Badge>
                <Badge color="default">#{nft.token_id}</Badge>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-text leading-tight">{nft.name}</h1>
              <p className="text-sm text-muted">
                From <span className="text-accent hover:underline cursor-pointer">{nft.collectionName}</span>
              </p>
            </div>

            <div className="flex items-center gap-5 text-sm text-muted animate-fade-in" style={{ animationDelay: '100ms' }}>
              <span className="flex items-center gap-1.5"><Eye size={14} /> {nft.views?.toLocaleString()} views</span>
              <span className="flex items-center gap-1.5"><Heart size={14} className={liked ? 'text-danger fill-danger' : ''} /> {nft.favorites + (liked ? 1 : 0)} favorites</span>
            </div>

            <Card className="p-6 space-y-5 animate-fade-in" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-dim uppercase tracking-wider">Current Price</p>
                  <p className="text-3xl font-display font-bold text-accent mt-1">{nft.price}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-dim uppercase tracking-wider">Last Sale</p>
                  <p className="text-lg font-mono text-muted mt-1">{nft.lastSale}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="primary" size="lg" className="flex-1">Buy Now</Button>
                <Button variant="secondary" size="lg" onClick={() => setLiked(!liked)} className={liked ? '!border-danger/30 !text-danger' : ''}>
                  <Heart size={16} className={liked ? 'fill-danger' : ''} />
                </Button>
                <Button variant="secondary" size="lg"><Share2 size={16} /></Button>
              </div>
            </Card>

            <Accordion title="Token Details" icon={<Tag size={14} className="text-accent" />} defaultOpen={true}>
              <div className="space-y-2.5">
                {[
                  ['Contract', nft.token_address?.slice(0, 12) + '...'],
                  ['Token ID', nft.token_id],
                  ['Chain', nft.chain],
                  ['Token Standard', 'ERC-721'],
                  ['Owner', nft.owner],
                  ['Creator', nft.creator],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm py-1">
                    <span className="text-muted">{label}</span>
                    <span className="text-text font-mono text-xs">{value}</span>
                  </div>
                ))}
              </div>
            </Accordion>

            {traits.length > 0 && (
              <Accordion title={'Traits (' + traits.length + ')'} icon={<Layers size={14} className="text-success" />} defaultOpen={true}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {traits.map((trait, i) => (
                    <div key={i} className="bg-surface2/50 rounded-xl p-3 border border-border-light text-center hover:border-accent/20 transition-colors group cursor-pointer">
                      <p className="text-[10px] text-accent font-mono uppercase tracking-wider group-hover:text-accent-violet transition-colors">{trait.trait_type}</p>
                      <p className="text-sm text-text font-medium mt-1">{trait.value}</p>
                    </div>
                  ))}
                </div>
              </Accordion>
            )}

            <a href="#" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="md" className="w-full">
                <ExternalLink size={14} /> View on Explorer
              </Button>
            </a>
          </div>
        </div>

        {relatedNfts.length > 0 && (
          <div className="mt-16 pt-12 border-t border-border-light">
            <h2 className="font-display text-2xl font-bold text-text mb-2">More from {nft.collectionName}</h2>
            <p className="text-sm text-muted mb-8">Explore other pieces from this collection</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {relatedNfts.map((related, i) => (
                <NFTCard key={related.id} nft={related} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
