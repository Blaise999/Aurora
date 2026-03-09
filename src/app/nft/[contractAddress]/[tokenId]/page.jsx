'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  ExternalLink, Heart, Share2, Eye, Clock, ArrowLeft,
  ChevronDown, ChevronUp, Shield, Layers, Tag, ShoppingCart,
  Loader2, Check, AlertTriangle, Wallet
} from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import NFTMedia from '@/components/NFTMedia';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useBuy } from '@/hooks/useBuy';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { getChainId, getExplorerUrl } from '@/lib/web3/contract';

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

export default function NFTAlchemyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractAddress = params?.contractAddress;
  const tokenId = params?.tokenId;

  const [nft, setNft] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [siteSettings, setSiteSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { isAuthed, login, loading: authLoading, session } = useAuth();
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending: isConnectPending } = useConnect();
  const { switchChain } = useSwitchChain();

  const {
    buy, txHash, isSending, isWaiting, isConfirmedOnChain,
    writeError, confirmBuy, confirming, confirmResult, confirmError, resetBuy,
  } = useBuy();

  const targetChainId = getChainId();
  const isWrongChain = isConnected && chain?.id !== targetChainId;
  const explorerUrl = getExplorerUrl();

  // Fetch NFT metadata from our API (Alchemy, server-side)
  useEffect(() => {
    if (!contractAddress || !tokenId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const url = new URL('/api/nft/metadata', window.location.origin);
        url.searchParams.set('contractAddress', contractAddress);
        url.searchParams.set('tokenId', tokenId);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!alive) return;
        if (data.error) throw new Error(data.error);
        setNft(data.nft);
        if (data.pricing) setPricing(data.pricing);
      } catch (e) { if (alive) setError(e.message); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [contractAddress, tokenId]);

  // Fetch site settings for buy_fee
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.settings) setSiteSettings(data.settings);
      } catch {}
    })();
  }, []);

  // After on-chain confirm, save purchase to server
  useEffect(() => {
    if (isConfirmedOnChain && txHash && !confirmResult && !confirming) {
      const price = pricing?.price_eth || '0';
      const fee = pricing?.minting_fee_eth || siteSettings.buy_fee || '0.002';
      confirmBuy(txHash, tokenId, price, fee, nft?.name);
    }
  }, [isConfirmedOnChain, txHash, confirmResult, confirming, confirmBuy, tokenId, pricing, siteSettings, nft]);

  const handleBuy = useCallback(() => {
    if (!pricing) return;
    resetBuy();
    const price = String(pricing.price_eth);
    const fee = String(pricing.minting_fee_eth || siteSettings.buy_fee || '0.002');
    buy(tokenId, price, fee);
  }, [buy, tokenId, pricing, siteSettings, resetBuy]);

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) connect({ connector });
  };

  if (loading) {
    return (
      <PageShell>
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="aspect-square rounded-card skeleton-pulse" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 skeleton-pulse rounded" />
              <div className="h-6 w-1/3 skeleton-pulse rounded" />
              <div className="h-40 skeleton-pulse rounded-card" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !nft) {
    return (
      <PageShell>
        <div className="text-center py-40">
          <p className="text-danger text-sm">{error || 'NFT not found'}</p>
          <Button variant="secondary" size="md" className="mt-4" onClick={() => router.back()}>Go Back</Button>
        </div>
      </PageShell>
    );
  }

  const attributes = nft.raw?.metadata?.attributes || nft.raw?.raw?.metadata?.attributes || [];
  const totalPrice = pricing
    ? (parseFloat(pricing.price_eth) + parseFloat(pricing.minting_fee_eth || siteSettings.buy_fee || 0)).toFixed(6)
    : null;

  // Buy state machine
  let buyState = 'idle';
  if (confirmResult) buyState = 'success';
  else if (confirmError || writeError) buyState = 'error';
  else if (confirming) buyState = 'confirming';
  else if (isWaiting) buyState = 'pending';
  else if (isSending) buyState = 'signing';

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
                  src={nft.image}
                  alt={nft.name}
                  aspect="portrait"
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
              {!imageLoaded && <div className="absolute inset-0 skeleton-pulse" />}
            </div>

            <Accordion title="Description" icon={<Layers size={14} className="text-accent" />} defaultOpen={true}>
              <p className="text-sm text-muted leading-relaxed">{nft.description || 'No description available.'}</p>
            </Accordion>
          </div>

          {/* RIGHT: Info + Buy */}
          <div className="space-y-5">
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <Badge color="accent">{nft.tokenType || 'ERC-721'}</Badge>
                <Badge color="default">#{tokenId}</Badge>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-text leading-tight">
                {nft.name || `#${tokenId}`}
              </h1>
              {nft.collectionName && (
                <p className="text-sm text-muted">
                  From <span className="text-accent hover:underline cursor-pointer">{nft.collectionName}</span>
                </p>
              )}
            </div>

            {/* Price + Buy Card */}
            <Card className="p-6 space-y-5 animate-fade-in" style={{ animationDelay: '150ms' }}>
              {pricing && pricing.is_listed !== false ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-dim uppercase tracking-wider">NFT Price</p>
                        <p className="text-3xl font-display font-bold text-accent mt-1">
                          {Number(pricing.price_eth).toFixed(4)} ETH
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-dim uppercase tracking-wider">Buy Fee</p>
                        <p className="text-lg font-mono text-muted mt-1">
                          {Number(pricing.minting_fee_eth || siteSettings.buy_fee || 0).toFixed(4)} ETH
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border-light">
                      <span className="text-sm font-medium text-text">Total</span>
                      <span className="text-xl font-mono font-semibold text-accent">{totalPrice} ETH</span>
                    </div>
                  </div>

                  {/* Buy flow */}
                  {buyState === 'idle' && (
                    <div className="space-y-3">
                      {!isConnected ? (
                        <Button variant="primary" size="lg" className="w-full" onClick={handleConnect} disabled={isConnectPending}>
                          {isConnectPending ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                          Connect Wallet
                        </Button>
                      ) : isWrongChain ? (
                        <Button variant="primary" size="lg" className="w-full" onClick={() => switchChain({ chainId: targetChainId })}>
                          Switch Network
                        </Button>
                      ) : !isAuthed ? (
                        <Button variant="primary" size="lg" className="w-full" onClick={login} disabled={authLoading}>
                          {authLoading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                          Sign In (SIWE)
                        </Button>
                      ) : (
                        <Button variant="primary" size="lg" className="w-full" onClick={handleBuy}>
                          <ShoppingCart size={16} /> Buy Now — {totalPrice} ETH
                        </Button>
                      )}
                    </div>
                  )}

                  {(buyState === 'signing' || buyState === 'pending' || buyState === 'confirming') && (
                    <div className="text-center py-4 space-y-3">
                      <Loader2 size={32} className="mx-auto text-accent animate-spin" />
                      <p className="text-sm text-muted">
                        {buyState === 'signing' && 'Confirm in your wallet…'}
                        {buyState === 'pending' && 'Transaction pending…'}
                        {buyState === 'confirming' && 'Saving purchase…'}
                      </p>
                      {txHash && (
                        <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-accent font-mono hover:underline">
                          View on Basescan
                        </a>
                      )}
                    </div>
                  )}

                  {buyState === 'success' && (
                    <div className="text-center py-4 space-y-4">
                      <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                        <Check size={28} className="text-success" />
                      </div>
                      <p className="text-text font-semibold">Purchase complete!</p>
                      <p className="text-xs text-muted">This NFT now appears in your profile.</p>
                      <div className="flex gap-3 justify-center">
                        {txHash && (
                          <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="secondary" size="md">View on Basescan</Button>
                          </a>
                        )}
                        {session && (
                          <Button variant="secondary" size="md" onClick={() => router.push(`/profile/${session}`)}>
                            View Profile
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {buyState === 'error' && (
                    <div className="space-y-3">
                      <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-danger">Transaction Failed</p>
                          <p className="text-xs text-muted mt-1 break-all">
                            {writeError?.shortMessage || confirmError || 'User rejected or insufficient funds.'}
                          </p>
                        </div>
                      </div>
                      <Button variant="primary" size="lg" className="w-full" onClick={resetBuy}>Try Again</Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted">This NFT is display-only (no listing price set).</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" size="lg" onClick={() => setLiked(!liked)} className={liked ? '!border-danger/30 !text-danger' : ''}>
                  <Heart size={16} className={liked ? 'fill-danger' : ''} />
                </Button>
                <Button variant="secondary" size="lg"><Share2 size={16} /></Button>
              </div>
            </Card>

            {/* Token Details */}
            <Accordion title="Token Details" icon={<Tag size={14} className="text-accent" />} defaultOpen={true}>
              <div className="space-y-2.5">
                {[
                  ['Contract', contractAddress?.slice(0, 12) + '…' + contractAddress?.slice(-6)],
                  ['Token ID', tokenId],
                  ['Standard', nft.tokenType || 'ERC-721'],
                  ['Collection', nft.collectionName || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm py-1">
                    <span className="text-muted">{label}</span>
                    <span className="text-text font-mono text-xs">{value}</span>
                  </div>
                ))}
              </div>
            </Accordion>

            {/* Traits */}
            {attributes.length > 0 && (
              <Accordion title={`Traits (${attributes.length})`} icon={<Layers size={14} className="text-success" />} defaultOpen={true}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {attributes.map((trait, i) => (
                    <div
                      key={i}
                      className="bg-surface2/50 rounded-xl p-3 border border-border-light text-center hover:border-accent/20 transition-colors cursor-pointer"
                    >
                      <p className="text-[10px] text-accent font-mono uppercase tracking-wider">{trait.trait_type}</p>
                      <p className="text-sm text-text font-medium mt-1">{trait.value}</p>
                    </div>
                  ))}
                </div>
              </Accordion>
            )}

            <a href={`${explorerUrl}/token/${contractAddress}?a=${tokenId}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="md" className="w-full">
                <ExternalLink size={14} /> View on Explorer
              </Button>
            </a>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
