"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCachedNft, useSettings, useCachedNfts } from "@/hooks/useNfts";
import { useBuy } from "@/hooks/useBuy";
import { resolveImage } from "@/lib/utils";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
import { getChainId, getExplorerUrl } from "@/lib/web3/contract";
import NftCard from "@/components/NftCard";
import NftCardSkeleton from "@/components/NftCardSkeleton";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Wallet, AlertTriangle, Check, Loader2, Heart, ExternalLink } from "lucide-react";
import WalletConnectModal from "@/components/WalletConnectModal";

// Import Supabase client
import { supabase } from "@/lib/supabase";

function MintPageContent() {
  const sp = useSearchParams();
  const contractParam = sp.get("contract");
  const tokenIdParam = sp.get("tokenId");
  const nftIdParam = sp.get("nftId");
  const isSelectedMode = !!(contractParam || nftIdParam);

  const { nft: selectedNft, loading: nftLoading } = useCachedNft(
    isSelectedMode ? contractParam : null,
    isSelectedMode ? tokenIdParam : null
  );

  const { settings, loading: settingsLoading } = useSettings();
  const { nfts: relatedNfts, loading: relatedLoading } = useCachedNfts(12);

  const { address, isConnected, chain } = useAccount();
  const { connectors, connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const { isAuthed, login, loading: authLoading } = useAuth();

  const {
    buy,
    txHash,
    isSending,
    isWaiting,
    isConfirmedOnChain,
    writeError,
    confirmBuy,
    confirming,
    confirmResult,
    confirmError,
    resetBuy,
  } = useBuy();

  const targetChainId = getChainId();
  const isWrongChain = isConnected && chain?.id !== targetChainId;
  const chainName = targetChainId === 8453 ? "Base" : "Base Sepolia";
  const explorerUrl = getExplorerUrl();

  const mintFee = selectedNft?.mintFee || settings?.minting_fee || "0.002";
  const nftPrice = selectedNft?.mintPrice || settings?.minting_fee || "0.002";
  const totalPrice = (parseFloat(nftPrice) + parseFloat(mintFee)).toFixed(6);

  const [imgZoomed, setImgZoomed] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [savingToDb, setSavingToDb] = useState(false);

  // Load or create profile when authed
  useEffect(() => {
    async function loadOrCreateProfile() {
      if (!isAuthed) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Profile fetch error:", error);
      }

      if (!profile?.id) {
        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert({
            email: user.email || 'unknown@wallet.com',
            first_name: user.user_metadata?.name?.split(' ')[0] || 'User',
            username: `user_${user.id.slice(0, 8)}`,
          })
          .select('id')
          .single();

        if (insertErr || !newProfile?.id) {
          console.error("Profile creation failed:", insertErr);
          return;
        }
        profile = newProfile;
      }

      setProfileId(profile.id);
    }

    loadOrCreateProfile();
  }, [isAuthed]);

  // Stable ref for auto-confirm
  const confirmRef = useRef({ confirmBuy, selectedNft, tokenIdParam, nftPrice, mintFee });

  useEffect(() => {
    confirmRef.current = { confirmBuy, selectedNft, tokenIdParam, nftPrice, mintFee };
  }, [confirmBuy, selectedNft, tokenIdParam, nftPrice, mintFee]);

  useEffect(() => {
    if (isConfirmedOnChain && txHash && !confirmResult && !confirming) {
      const { confirmBuy: cb, selectedNft: nft, tokenIdParam: tid, nftPrice: price, mintFee: fee } =
        confirmRef.current;
      if (!nft) return;
      cb(txHash, nft.tokenId || tid || "0", price, fee, nft.name || "NFT");
    }
  }, [isConfirmedOnChain, txHash, confirmResult, confirming]);

  // Save to user_collections after confirmation
  useEffect(() => {
    if (confirmResult?.tokenIds?.length > 0 && profileId && !savingToDb) {
      const saveMintedNfts = async () => {
        setSavingToDb(true);
        try {
          const nftImage = selectedNft?.image || selectedNft?.image_url || resolveImage(selectedNft || {}) || '';
          const nftName = selectedNft?.name || `Minted NFT #${confirmResult.tokenIds[0] || ''}`;
          const nftDesc = selectedNft?.description || 'A unique minted NFT from AuroraNft';

          const inserts = confirmResult.tokenIds.map((tid) => ({
            profile_id: profileId,
            chain_id: selectedNft?.chainId || targetChainId,
            contract_address: selectedNft?.contractAddress?.toLowerCase() || '',
            token_id: tid.toString(),
            cached_nft_id: selectedNft?.dbId || null,
            assigned_by: 'mint',
            assigned_at: new Date().toISOString(),
            // Metadata
            image_url: nftImage,
            nft_name: nftName,
            description: nftDesc,
          }));

          const { error } = await supabase.from('user_collections').insert(inserts);

          if (error) {
            console.error("Failed to save minted NFTs:", error);
          } else {
            console.log(`Saved ${inserts.length} minted NFTs to profile ${profileId}`);
          }
        } catch (err) {
          console.error("Save error:", err);
        } finally {
          setSavingToDb(false);
        }
      };

      saveMintedNfts();
    }
  }, [confirmResult, profileId, selectedNft, targetChainId, savingToDb]);

  // Fixed: Use getExplorerUrl instead of undefined getExplorerBase
  const nftExplorerLink =
    selectedNft?.contractAddress && (selectedNft?.tokenId || tokenIdParam)
      ? `${getExplorerUrl()}/token/${selectedNft.contractAddress}?a=${
          selectedNft.tokenId || tokenIdParam
        }`
      : null;

  // State machine
  let state = isAuthed ? "disconnected" : "needs_auth";
  if (isAuthed && isConnected && isWrongChain) state = "wrong_network";
  if (isAuthed && isConnected && !isWrongChain) state = "ready";
  if (confirmResult) state = "tx_success";
  if (confirmError || writeError) state = "tx_error";
  if (confirming) state = "confirming";
  if (isWaiting) state = "tx_pending";
  if (isSending) state = "tx_signing";

  const handleMint = useCallback(() => {
    if (!selectedNft) return;
    resetBuy();
    buy(selectedNft.tokenId || tokenIdParam || "0", nftPrice, mintFee);
  }, [selectedNft, tokenIdParam, nftPrice, mintFee, buy, resetBuy]);

  const handleFavorite = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!isConnected || !selectedNft) return;

    if (favorited) {
      await fetch(
        `/api/favorites?wallet=${address}&contract=${selectedNft.contractAddress}&tokenId=${selectedNft.tokenId}&chainId=${selectedNft.chainId}`,
        { method: "DELETE" }
      );
      setFavorited(false);
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          contractAddress: selectedNft.contractAddress,
          tokenId: selectedNft.tokenId,
          chainId: selectedNft.chainId,
          cachedNftId: selectedNft.dbId,
        }),
      });
      setFavorited(true);
    }
  };

  const dn = selectedNft;
  const nftImage = dn?.image || dn?.image_url || resolveImage(dn || {});
  const nftDesc = dn?.description || "A unique digital collectible from a curated collection.";

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-violet/4 rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <nav className="flex items-center gap-2 text-xs text-muted-dim mb-6">
          <Link href="/" className="hover:text-accent transition-colors">Home</Link>
          <span>/</span>
          <Link href="/explore" className="hover:text-accent transition-colors">Explore</Link>
          <span>/</span>
          <span className="text-text">{isSelectedMode ? (dn?.name || "Loading...") : "Mint"}</span>
        </nav>

        {isSelectedMode && dn ? (
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-10">
            {/* LEFT COLUMN – NFT details */}
            <div className="lg:col-span-3 space-y-6">
              <div
                className={`relative rounded-card overflow-hidden border border-border-light shadow-card ${
                  imgZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
                onClick={() => setImgZoomed(!imgZoomed)}
              >
                <div className={`relative ${imgZoomed ? "aspect-auto min-h-[500px]" : "aspect-square"} transition-all duration-500`}>
                  <Image
                    src={nftImage}
                    alt={dn.name || "NFT"}
                    fill
                    className={`object-contain transition-transform duration-500 ${imgZoomed ? "scale-110" : ""}`}
                    sizes="(max-width:1024px) 100vw, 60vw"
                    priority
                  />
                </div>

                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-pill bg-surface/80 backdrop-blur-sm border border-border-light text-xs font-display font-semibold">
                  {dn.collection || "Collection"}
                </div>

                {isConnected && (
                  <button
                    onClick={handleFavorite}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <Heart size={18} className={favorited ? "text-hot fill-hot" : "text-white/70"} />
                  </button>
                )}
              </div>

              {nftExplorerLink && (
                <div className="flex justify-center sm:justify-start">
                  <a
                    href={nftExplorerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface2 border border-border-light text-sm font-medium text-accent hover:bg-surface2/80 hover:border-accent/40 transition-colors group shadow-sm"
                  >
                    <ExternalLink size={18} className="group-hover:rotate-12 transition-transform" />
                    View on {chainName} Explorer
                  </a>
                </div>
              )}

              <div className="space-y-4">
                <div className="rounded-card bg-surface2 border border-border-light p-5 sm:p-6">
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl mb-3">{dn.name}</h1>
                  <p className="text-sm text-muted leading-relaxed">{nftDesc}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="px-3 py-1 rounded-pill bg-accent/10 text-xs text-accent font-medium border border-accent/20">
                      {dn.tokenType || "ERC-721"}
                    </span>
                    <span className="px-3 py-1 rounded-pill bg-accent-violet/10 text-xs text-accent-violet font-medium border border-accent-violet/20">
                      {dn.chain || "Base"}
                    </span>
                    <span className="px-3 py-1 rounded-pill bg-warning/10 text-xs text-warning font-medium border border-warning/20">
                      Chain-Verifiable
                    </span>
                  </div>
                </div>

                <div className="rounded-card bg-surface2 border border-border-light p-5 sm:p-6">
                  <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted mb-4">Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { l: "Token ID", v: dn.tokenId || "—" },
                      {
                        l: "Contract",
                        v: dn.contractAddress ? `${dn.contractAddress.slice(0, 6)}...${dn.contractAddress.slice(-4)}` : "—",
                      },
                      { l: "Collection", v: dn.collection || "—" },
                      { l: "Chain", v: dn.chain || "Base" },
                    ].map((item) => (
                      <div key={item.l} className="space-y-1">
                        <p className="text-xs text-muted-dim">{item.l}</p>
                        {item.l === "Contract" && nftExplorerLink ? (
                          <a
                            href={nftExplorerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-accent hover:underline flex items-center gap-1 group"
                          >
                            {item.v}
                            <ExternalLink size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ) : (
                          <p className="text-sm font-mono">{item.v}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {dn.attributes?.length > 0 && (
                  <div className="rounded-card bg-surface2 border border-border-light p-5 sm:p-6">
                    <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted mb-4">Attributes</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {dn.attributes.map((a, i) => (
                        <div key={i} className="rounded-xl bg-accent/5 border border-accent/10 p-3 text-center">
                          <p className="text-[10px] text-accent uppercase tracking-wider mb-1">{a.trait_type}</p>
                          <p className="text-sm font-semibold truncate">{a.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN – Mint controls */}
            <div className="lg:col-span-2 space-y-6">
              <div className="lg:sticky lg:top-24">
                <div className="glass-card rounded-card p-6 sm:p-8 space-y-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl font-semibold text-text">Mint</h2>
                      {state === "ready" && <Badge color="success" dot>Ready</Badge>}
                      {["tx_pending", "tx_signing", "confirming"].includes(state) && <Badge color="warning" dot>Pending</Badge>}
                      {state === "tx_success" && <Badge color="success" dot>Complete</Badge>}
                      {state === "tx_error" && <Badge color="danger" dot>Error</Badge>}
                    </div>
                    <p className="text-sm text-muted">{dn.name}</p>
                  </div>

                  <div className="bg-surface2/40 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">NFT Price</span>
                      <span className="text-text font-mono font-medium">{nftPrice} ETH</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Mint Fee</span>
                      <span className="text-text font-mono font-medium">{mintFee} ETH</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-border-light">
                      <span className="text-text font-medium">Total</span>
                      <span className="text-lg font-mono font-semibold text-accent">{totalPrice} ETH</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Network</span>
                      <span className="text-text font-mono">{chainName}</span>
                    </div>
                  </div>

                  {/* Conditional UI */}
                  {state === "needs_auth" && (
                    <div className="space-y-4">
                      <div className="text-center py-4 space-y-2">
                        <Wallet size={32} className="mx-auto text-accent" />
                        <p className="text-sm text-muted">Sign in to verify your wallet</p>
                      </div>
                      <Button variant="primary" size="lg" className="w-full" onClick={login} disabled={authLoading}>
                        {authLoading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                        Sign In (SIWE)
                      </Button>
                    </div>
                  )}

                  {state === "disconnected" && (
                    <div className="space-y-4">
                      <div className="text-center py-4 space-y-2">
                        <Wallet size={32} className="mx-auto text-muted-dim" />
                        <p className="text-sm text-muted">Connect your wallet to mint</p>
                      </div>
                      <Button variant="primary" size="lg" className="w-full" onClick={() => setShowWalletModal(true)}>
                        <Wallet size={16} />
                        Connect Wallet
                      </Button>
                      <WalletConnectModal open={showWalletModal} onClose={() => setShowWalletModal(false)} />
                    </div>
                  )}

                  {state === "wrong_network" && (
                    <div className="space-y-4">
                      <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-warning mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-warning">Wrong Network</p>
                          <p className="text-xs text-muted mt-1">Please switch to {chainName} to continue.</p>
                        </div>
                      </div>
                      <Button variant="primary" size="lg" className="w-full" onClick={() => switchChain({ chainId: targetChainId })}>
                        Switch to {chainName}
                      </Button>
                    </div>
                  )}

                  {state === "ready" && (
                    <div className="space-y-4">
                      <Button variant="primary" size="lg" className="w-full" onClick={handleMint} disabled={savingToDb || !profileId}>
                        {savingToDb ? <Loader2 size={16} className="animate-spin" /> : ''} Mint Now — {totalPrice} ETH
                      </Button>
                    </div>
                  )}

                  {["tx_signing", "tx_pending", "confirming"].includes(state) && (
                    <div className="text-center py-6 space-y-3">
                      <Loader2 size={36} className="mx-auto text-accent animate-spin" />
                      <p className="text-sm text-muted">
                        {state === "tx_signing" && 'Confirm in your wallet…'}
                        {state === "tx_pending" && 'Transaction pending…'}
                        {state === "confirming" && 'Verifying on server…'}
                      </p>
                      {txHash && (
                        <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-accent font-mono hover:underline">
                          View on Basescan
                        </a>
                      )}
                    </div>
                  )}

                  {state === "tx_success" && (
                    <div className="text-center py-6 space-y-4">
                      <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                        <Check size={28} className="text-success" />
                      </div>
                      <p className="text-text font-semibold">Successfully minted!</p>
                      <p className="text-sm text-muted">NFT saved to your collection.</p>
                      <div className="flex gap-3 justify-center">
                        {txHash && (
                          <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="secondary" size="md">View on Basescan</Button>
                          </a>
                        )}
                        <Button variant="secondary" size="md" onClick={() => { resetBuy(); }}>
                          Mint Another
                        </Button>
                      </div>
                    </div>
                  )}

                  {state === "tx_error" && (
                    <div className="space-y-4">
                      <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-danger">Transaction Failed</p>
                          <p className="text-xs text-muted mt-1 break-all">
                            {writeError?.shortMessage || confirmError || 'User rejected or insufficient funds.'}
                          </p>
                        </div>
                      </div>
                      <Button variant="primary" size="lg" className="w-full" onClick={() => { resetBuy(); }}>
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>

                {relatedNfts.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted mb-4">More to Explore</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {relatedNfts.slice(0, 4).map((n, i) => (
                        <NftCard key={n.id || i} nft={n} index={i} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : isSelectedMode && nftLoading ? (
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-10">
            <div className="lg:col-span-3 space-y-6">
              <div className="aspect-square rounded-card shimmer" />
              <div className="rounded-card bg-surface2 border border-border-light p-6 space-y-3">
                <div className="h-8 w-2/3 rounded shimmer" />
                <div className="h-4 w-full rounded shimmer" />
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-card bg-surface2 border border-border-light p-6 space-y-4">
                <div className="h-6 w-1/2 rounded shimmer" />
                <div className="h-12 rounded-pill shimmer" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-accent/10 border border-accent/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-display font-semibold text-accent uppercase tracking-wider">Browse & Mint</span>
              </div>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl mb-4">
                Choose an NFT to <span className="text-gradient">Mint</span>
              </h1>
              <p className="text-muted text-base sm:text-lg leading-relaxed">
                Click any NFT to see its details and mint it to your wallet.
              </p>
            </div>

            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl mb-6">Available NFTs</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                {relatedLoading ? (
                  <NftCardSkeleton count={10} />
                ) : relatedNfts.length > 0 ? (
                  relatedNfts.map((n, i) => <NftCard key={n.id || i} nft={n} index={i} />)
                ) : (
                  <NftCardSkeleton count={10} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MintPageContent />
    </Suspense>
  );
}