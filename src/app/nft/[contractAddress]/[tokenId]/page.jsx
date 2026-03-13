'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  ExternalLink, Heart, Share2, Eye, Clock, ArrowLeft,
  ChevronDown, ChevronUp, Shield, Layers, Tag, ShoppingCart,
  Loader2, Check, AlertTriangle, Wallet, Globe, FileCode, Link2
} from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import NFTMedia from '@/components/NFTMedia';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useSession } from '@/hooks/useSession';
import { useBuy } from '@/hooks/useBuy';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { getChainId, getExplorerUrl } from '@/lib/web3/contract';
import { getNftExplorerLinks, getExplorerName, nftUrl, contractUrl, txUrl } from '@/lib/explorer';

function Accordion({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2.5">{icon}<h3 className="text-sm font-semibold text-text">{title}</h3></div>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>
      <div className="overflow-hidden transition-all duration-300 ease-out" style={{ maxHeight: open ? '800px' : '0', opacity: open ? 1 : 0 }}>
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

  const { isLoggedIn, profile } = useSession();
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect } = useConnect();
  const { switchChain } = useSwitchChain();

  const {
    buy, txHash, isSending, isWaiting, isConfirmedOnChain,
    writeError, confirmBuy, confirming, confirmResult, confirmError, resetBuy,
  } = useBuy();

  const targetChainId = getChainId();
  const isWrongChain = isConnected && chain?.id !== targetChainId;
  const explorerUrl = getExplorerUrl();

  // Determine chain ID from NFT data
  const nftChainId = nft?.chain_id || nft?.chainId || (nft?.chain === 'Base' ? 8453 : nft?.chain === 'Ethereum' ? 1 : targetChainId);

  // Build explorer links
  const explorerLinks = contractAddress
    ? getNftExplorerLinks(contractAddress, tokenId, nftChainId, txHash)
    : [];

  // Fetch NFT
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

  // Fetch site settings
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.settings) setSiteSettings(data.settings);
      } catch {}
    })();
  }, []);

  // Auto-confirm after on-chain success
  useEffect(() => {
    if (isConfirmedOnChain && txHash && !confirmResult && !confirming) {
      confirmBuy(txHash, tokenId || '0', nftPrice, buyFee, nft?.name || 'NFT');
    }
  }, [isConfirmedOnChain, txHash, confirmResult, confirming]);

  const buyFee = pricing?.mint_fee_eth || siteSettings?.buy_fee || '0.002';
  const nftPrice = pricing?.mint_price_eth || siteSettings?.minting_fee || '0.002';
  const totalPrice = (parseFloat(nftPrice) + parseFloat(buyFee)).toFixed(6);

  const handleBuy = useCallback(() => {
    resetBuy();
    buy(tokenId || '0', nftPrice, buyFee);
  }, [nftPrice, buyFee, tokenId, buy, resetBuy]);

  // Determine state
  let state = 'disconnected';
  if (isConnected && isWrongChain) state = 'wrong_network';
  else if (confirmResult) state = 'tx_success';
  else if (confirmError || writeError) state = 'tx_error';
  else if (confirming) state = 'confirming';
  else if (isWaiting) state = 'tx_pending';
  else if (isSending) state = 'tx_signing';
  else if (isConnected) state = 'ready';

  const nftImage = nft?.image?.cachedUrl || nft?.image?.thumbnailUrl || nft?.image?.originalUrl || nft?.image || nft?.raw?.metadata?.image || '';
  const resolvedImage = nftImage?.startsWith?.('ipfs://') ? nftImage.replace('ipfs://', 'https://ipfs.io/ipfs/') : nftImage;
  const nftName = nft?.name || nft?.contract?.name || `#${tokenId}`;
  const nftDesc = nft?.description || 'A unique digital collectible.';
  const collectionName = nft?.contract?.name || nft?.collection || nft?.collectionName || 'Collection';
  const chainName = targetChainId === 8453 ? 'Base' : 'Base Sepolia';

  if (loading) {
    return (
      <PageShell><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3"><div className="aspect-square rounded-card shimmer" /></div>
          <div className="lg:col-span-2"><div className="rounded-card bg-surface2 border border-border-light p-8 space-y-4"><div className="h-8 w-2/3 rounded shimmer" /><div className="h-12 rounded-pill shimmer" /></div></div>
        </div>
      </div></PageShell>
    );
  }

  if (error) {
    return (
      <PageShell><div className="max-w-md mx-auto text-center py-20 px-4">
        <AlertTriangle size={36} className="text-warning mx-auto mb-4" />
        <h2 className="font-display font-bold text-xl mb-2">NFT Not Found</h2>
        <p className="text-muted text-sm mb-6">{error}</p>
        <Button variant="primary" onClick={() => router.push('/explore')}>Browse NFTs</Button>
      </div></PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted hover:text-text mb-6 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-10">
          {/* Left: Image + Details */}
          <div className="lg:col-span-3 space-y-6">
            <div className="relative rounded-card overflow-hidden border border-border-light shadow-card">
              <div className="relative aspect-square">
                <NFTMedia src={resolvedImage} alt={nftName} className="w-full h-full object-contain" />
              </div>
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-pill bg-surface/80 backdrop-blur-sm border border-border-light text-xs font-display font-semibold">
                {collectionName}
              </div>
            </div>

            {/* Description */}
            <Accordion title="Description" icon={<Eye size={15} className="text-accent" />} defaultOpen>
              <p className="text-sm text-muted leading-relaxed">{nftDesc}</p>
            </Accordion>

            {/* Details */}
            <Accordion title="Details" icon={<Shield size={15} className="text-accent" />} defaultOpen>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-dim mb-0.5">Token ID</p><p className="font-mono">{tokenId}</p></div>
                <div><p className="text-xs text-muted-dim mb-0.5">Contract</p><p className="font-mono text-xs">{contractAddress ? `${contractAddress.slice(0,6)}...${contractAddress.slice(-4)}` : '—'}</p></div>
                <div><p className="text-xs text-muted-dim mb-0.5">Token Standard</p><p>{nft?.tokenType || nft?.contract?.tokenType || 'ERC-721'}</p></div>
                <div><p className="text-xs text-muted-dim mb-0.5">Chain</p><p>{nft?.chain || chainName}</p></div>
              </div>
            </Accordion>

            {/* ★ BLOCKCHAIN EXPLORER LINKS ★ */}
            <Accordion title="View on Blockchain" icon={<Globe size={15} className="text-accent" />} defaultOpen>
              <div className="space-y-2.5">
                {explorerLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface2/60 border border-border-light hover:border-accent/30 hover:bg-accent/5 transition-all group"
                  >
                    {link.icon === 'nft' && <Layers size={15} className="text-accent shrink-0" />}
                    {link.icon === 'contract' && <FileCode size={15} className="text-accent-violet shrink-0" />}
                    {link.icon === 'tx' && <Link2 size={15} className="text-success shrink-0" />}
                    {link.icon === 'opensea' && <Globe size={15} className="text-[#2081E2] shrink-0" />}
                    <span className="text-sm text-muted group-hover:text-text transition-colors flex-1">{link.label}</span>
                    <ExternalLink size={12} className="text-muted-dim group-hover:text-accent shrink-0" />
                  </a>
                ))}

                {/* Direct explorer link - always show */}
                {contractAddress && (
                  <div className="mt-3 pt-3 border-t border-border-light">
                    <p className="text-[10px] text-muted-dim uppercase tracking-wider mb-2">Direct Links</p>
                    <div className="flex flex-wrap gap-2">
                      <a href={nftUrl(contractAddress, tokenId, nftChainId)} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-pill text-[11px] bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors flex items-center gap-1.5">
                        <Layers size={10} /> {getExplorerName(nftChainId)} <ExternalLink size={9} />
                      </a>
                      <a href={contractUrl(contractAddress, nftChainId)} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-pill text-[11px] bg-accent-violet/10 text-accent-violet border border-accent-violet/20 hover:bg-accent-violet/20 transition-colors flex items-center gap-1.5">
                        <FileCode size={10} /> Contract <ExternalLink size={9} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </Accordion>

            {/* Attributes */}
            {(nft?.raw?.metadata?.attributes?.length > 0 || nft?.attributes?.length > 0) && (
              <Accordion title="Attributes" icon={<Tag size={15} className="text-accent" />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(nft?.raw?.metadata?.attributes || nft?.attributes || []).map((a, i) => (
                    <div key={i} className="rounded-xl bg-accent/5 border border-accent/10 p-3 text-center">
                      <p className="text-[10px] text-accent uppercase tracking-wider mb-1">{a.trait_type}</p>
                      <p className="text-sm font-semibold truncate">{a.value}</p>
                    </div>
                  ))}
                </div>
              </Accordion>
            )}
          </div>

          {/* Right: Buy Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="lg:sticky lg:top-24">
              <div className="glass-card rounded-card p-6 sm:p-8 space-y-6">
                <div>
                  <h1 className="font-display font-extrabold text-xl sm:text-2xl">{nftName}</h1>
                  <p className="text-sm text-muted mt-1">{collectionName}</p>
                </div>

                <div className="bg-surface2/40 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted">NFT Price</span><span className="font-mono font-medium">{nftPrice} ETH</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted">Mint Fee</span><span className="font-mono font-medium">{buyFee} ETH</span></div>
                  <div className="flex justify-between text-sm pt-2 border-t border-border-light">
                    <span className="font-medium">Total</span>
                    <span className="text-lg font-mono font-semibold text-accent">{totalPrice} ETH</span>
                  </div>
                </div>

                {state === 'disconnected' && (
                  <div className="space-y-3 text-center">
                    <Wallet size={28} className="mx-auto text-muted-dim" />
                    <p className="text-sm text-muted">Connect wallet to mint</p>
                    <Button variant="primary" size="lg" className="w-full" onClick={() => router.push(isLoggedIn ? '/connect-wallet' : '/login')}>
                      <Wallet size={16} /> {isLoggedIn ? 'Connect Wallet' : 'Login to Mint'}
                    </Button>
                  </div>
                )}

                {state === 'wrong_network' && (
                  <div className="space-y-3">
                    <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
                      <div><p className="text-sm font-medium text-warning">Wrong Network</p><p className="text-xs text-muted mt-1">Switch to {chainName}.</p></div>
                    </div>
                    <Button variant="primary" size="lg" className="w-full" onClick={() => switchChain({ chainId: targetChainId })}>Switch to {chainName}</Button>
                  </div>
                )}

                {state === 'ready' && (
                  <Button variant="primary" size="lg" className="w-full" onClick={handleBuy}>
                    Mint Now — {totalPrice} ETH
                  </Button>
                )}

                {['tx_signing', 'tx_pending', 'confirming'].includes(state) && (
                  <div className="text-center py-6 space-y-3">
                    <Loader2 size={36} className="mx-auto text-accent animate-spin" />
                    <p className="text-sm text-muted">
                      {state === 'tx_signing' ? 'Confirm in wallet…' : state === 'tx_pending' ? 'Transaction pending…' : 'Verifying…'}
                    </p>
                    {txHash && <a href={txUrl(txHash, nftChainId)} target="_blank" rel="noopener noreferrer" className="text-xs text-accent font-mono hover:underline">View on {getExplorerName(nftChainId)}</a>}
                  </div>
                )}

                {state === 'tx_success' && (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto"><Check size={28} className="text-success" /></div>
                    <p className="text-text font-semibold">Successfully minted!</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      {txHash && <a href={txUrl(txHash, nftChainId)} target="_blank" rel="noopener noreferrer"><Button variant="secondary" size="md">View on {getExplorerName(nftChainId)}</Button></a>}
                      <Button variant="primary" size="md" onClick={() => router.push('/profile')}>View Profile</Button>
                    </div>
                  </div>
                )}

                {state === 'tx_error' && (
                  <div className="space-y-4">
                    <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle size={16} className="text-danger mt-0.5 shrink-0" />
                      <div><p className="text-sm font-medium text-danger">Transaction Failed</p><p className="text-xs text-muted mt-1 break-all">{writeError?.shortMessage || confirmError || 'Rejected or insufficient funds.'}</p></div>
                    </div>
                    <Button variant="primary" size="lg" className="w-full" onClick={resetBuy}>Try Again</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
