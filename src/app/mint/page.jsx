"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCachedNft, useSettings, useCachedNfts } from "@/hooks/useNfts";
import { useBuy } from "@/hooks/useBuy";
import { resolveImage } from "@/lib/utils";
import { useAccount, useSwitchChain } from "wagmi";
import { useSession } from "@/hooks/useSession";
import { getChainId, getExplorerUrl } from "@/lib/web3/contract";
import NftCard from "@/components/NftCard";
import NftCardSkeleton from "@/components/NftCardSkeleton";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  Wallet,
  AlertTriangle,
  Check,
  Loader2,
  Heart,
  ExternalLink,
  User,
} from "lucide-react";
import WalletConnectModal from "@/components/WalletConnectModal";

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

  const { settings } = useSettings();
  const { nfts: relatedNfts, loading: relatedLoading } = useCachedNfts(12);

  const {
    address: liveWalletAddress,
    isConnected: isWagmiConnected,
    chain,
  } = useAccount();
  const { switchChain } = useSwitchChain();

  const {
    isLoggedIn,
    profile,
    loading: sessionLoading,
    linkedWallet,
    hasLinkedWallet,
    refreshSession,
  } = useSession();

  const {
    buy,
    txHash,
    isSending,
    isWaiting,
    confirming,
    confirmResult,
    confirmError,
    resetBuy,
    userBalanceEth,
  } = useBuy();

  const targetChainId = getChainId();
  const chainName = targetChainId === 8453 ? "Base" : "Base Sepolia";
  const explorerUrl = getExplorerUrl();

  const liveWallet = liveWalletAddress
    ? String(liveWalletAddress).toLowerCase()
    : null;

  const savedWallet = linkedWallet
    ? String(linkedWallet).toLowerCase()
    : profile?.wallet_address
    ? String(profile.wallet_address).toLowerCase()
    : null;

  const effectiveWallet = liveWallet || savedWallet || null;
  const hasUsableWallet = Boolean(effectiveWallet);

  const isWrongChain =
    isWagmiConnected && chain?.id !== targetChainId;

  // Buy fee = platform fee charged on every purchase (from admin settings)
  const mintFee = String(
    selectedNft?.mintFee || settings?.buy_fee || "0.002"
  );
  // NFT price = the item's own price (from nft_pricing / cached_nfts DB, NOT from settings)
  const nftPrice = String(
    selectedNft?.mintPrice || selectedNft?.price || selectedNft?.nft_price_eth || "0"
  );
  const totalPrice = (parseFloat(nftPrice) + parseFloat(mintFee)).toFixed(6);
  const totalPriceNum = parseFloat(totalPrice);
  const hasEnoughBalance = userBalanceEth !== null
    ? userBalanceEth >= totalPriceNum
    : true;

  const [imgZoomed, setImgZoomed] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [ownershipSource, setOwnershipSource] = useState(null);
  const [checkingOwned, setCheckingOwned] = useState(false);

  const profileId = profile?.id || null;

  const currentContract =
    selectedNft?.contractAddress ||
    selectedNft?.contract_address ||
    contractParam ||
    null;

  const currentTokenId =
    selectedNft?.tokenId ||
    selectedNft?.token_id ||
    tokenIdParam ||
    null;

  const currentChainId =
    selectedNft?.chainId || selectedNft?.chain_id || targetChainId;

  useEffect(() => {
    async function checkOwnership() {
      if (!isLoggedIn || !profileId || !currentContract || !currentTokenId) {
        setAlreadyOwned(false);
        setOwnershipSource(null);
        return;
      }

      setCheckingOwned(true);
      try {
        const params = new URLSearchParams({
          profileId: String(profileId),
          contract: String(currentContract).toLowerCase(),
          tokenId: String(currentTokenId),
          chainId: String(currentChainId),
        });

        if (effectiveWallet) {
          params.set("wallet", effectiveWallet);
        }

        const res = await fetch(`/api/nft/owner?${params}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (data.owned) {
          setAlreadyOwned(true);
          setOwnershipSource(data.source || "owned");
        } else {
          setAlreadyOwned(false);
          setOwnershipSource(null);
        }
      } catch (err) {
        console.error("Ownership check failed:", err);
        setAlreadyOwned(false);
        setOwnershipSource(null);
      } finally {
        setCheckingOwned(false);
      }
    }

    checkOwnership();
  }, [
    isLoggedIn,
    profileId,
    effectiveWallet,
    currentContract,
    currentTokenId,
    currentChainId,
  ]);

  useEffect(() => {
    if (confirmResult?.success) {
      setAlreadyOwned(true);
      setOwnershipSource("wallet_mints");
      refreshSession();
    }
  }, [confirmResult, refreshSession]);

  const nftExplorerLink =
    currentContract && currentTokenId
      ? `${explorerUrl}/token/${currentContract}?a=${currentTokenId}`
      : null;

  const contractExplorerLink = currentContract
    ? `${explorerUrl}/address/${currentContract}`
    : null;

  const txExplorerLink = txHash ? `${explorerUrl}/tx/${txHash}` : null;

  let state = "needs_login";

  if (isLoggedIn && !hasUsableWallet) {
    state = "needs_wallet";
  }

  if (isLoggedIn && hasUsableWallet) {
    state = "ready";
  }

  if (isLoggedIn && isWagmiConnected && isWrongChain) {
    state = "wrong_network";
  }

  if (confirmResult?.success) state = "tx_success";
  if (confirmError) state = "tx_error";
  if (confirming) state = "confirming";
  if (isWaiting) state = "tx_pending";
  if (isSending) state = "tx_signing";

  const handleMint = useCallback(() => {
    if (!isLoggedIn || !selectedNft || alreadyOwned) return;

    if (!hasUsableWallet) {
      setShowWalletModal(true);
      return;
    }

    if (!isWagmiConnected) {
      setShowWalletModal(true);
      return;
    }

    if (chain?.id !== targetChainId) {
      switchChain({ chainId: targetChainId });
      return;
    }

    const tokenId = String(
      selectedNft.tokenId || selectedNft.token_id || tokenIdParam || "0"
    );

    const contractAddress = String(
      selectedNft.contractAddress ||
        selectedNft.contract_address ||
        contractParam ||
        ""
    ).toLowerCase();

    const chainId = Number(
      selectedNft.chainId || selectedNft.chain_id || targetChainId
    );

    const image =
      selectedNft.image ||
      selectedNft.image_url ||
      resolveImage(selectedNft || {}) ||
      "";

    resetBuy();

    buy({
      dbId: selectedNft.dbId || selectedNft.id || null,
      tokenId,
      contractAddress,
      chainId,
      chain: selectedNft.chain || chainName,
      name: selectedNft.name || null,
      image,
      description: selectedNft.description || null,
      collection:
        selectedNft.collection || selectedNft.collection_name || null,
      tokenType:
        selectedNft.tokenType || selectedNft.token_type || "ERC721",
      attributes: selectedNft.attributes || [],
      nftPrice,
      mintFee,
      totalPrice,
    });
  }, [
    isLoggedIn,
    selectedNft,
    alreadyOwned,
    hasUsableWallet,
    isWagmiConnected,
    chain?.id,
    targetChainId,
    switchChain,
    tokenIdParam,
    contractParam,
    chainName,
    nftPrice,
    mintFee,
    totalPrice,
    buy,
    resetBuy,
  ]);

  const handleFavorite = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!effectiveWallet || !selectedNft) return;

    const fc =
      selectedNft.contractAddress || selectedNft.contract_address;
    const ft = selectedNft.tokenId || selectedNft.token_id;
    const fch = selectedNft.chainId || selectedNft.chain_id;
    if (!fc || !ft) return;

    if (favorited) {
      await fetch(
        `/api/favorites?wallet=${effectiveWallet}&contract=${fc}&tokenId=${ft}&chainId=${fch}`,
        { method: "DELETE" }
      );
      setFavorited(false);
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: effectiveWallet,
          contractAddress: fc,
          tokenId: ft,
          chainId: fch,
          cachedNftId: selectedNft.dbId || selectedNft.id || null,
        }),
      });
      setFavorited(true);
    }
  };

  const dn = selectedNft;
  const nftImage = dn?.image || dn?.image_url || resolveImage(dn || {});
  const nftDesc =
    dn?.description ||
    "A unique digital collectible from a curated collection.";

  const ownershipMessage = (() => {
    if (ownershipSource === "both")
      return "This NFT has already been bought and is in your collection.";
    if (ownershipSource === "wallet_mints")
      return "This wallet has already bought this NFT.";
    if (ownershipSource === "user_collections")
      return "This NFT is already in your collection.";
    return "You already bought this NFT.";
  })();

  const handleLogin = () => {
    if (typeof window !== "undefined") window.location.href = "/login";
  };

  const savedWalletShort = savedWallet
    ? `${savedWallet.slice(0, 6)}...${savedWallet.slice(-4)}`
    : null;

  const effectiveWalletShort = effectiveWallet
    ? `${effectiveWallet.slice(0, 6)}...${effectiveWallet.slice(-4)}`
    : null;

  const mintButtonLabel = (() => {
    if (!hasUsableWallet) return "Connect Wallet";
    if (!isWagmiConnected) return `Buy Now — ${totalPrice} ETH`;
    if (isWrongChain) return `Switch to ${chainName}`;
    return `Buy Now — ${totalPrice} ETH`;
  })();

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/3 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-violet/4 rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <nav className="flex items-center gap-2 text-xs text-muted-dim mb-6">
          <Link href="/" className="hover:text-accent transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/explore"
            className="hover:text-accent transition-colors"
          >
            Explore
          </Link>
          <span>/</span>
          <span className="text-text">
            {isSelectedMode ? dn?.name || "Loading..." : "Buy"}
          </span>
        </nav>

        {isSelectedMode && dn ? (
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-10">
            <div className="lg:col-span-3 space-y-6">
              <div
                className={`relative rounded-card overflow-hidden border border-border-light shadow-card ${
                  imgZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
                onClick={() => setImgZoomed(!imgZoomed)}
              >
                <div
                  className={`relative ${
                    imgZoomed
                      ? "aspect-auto min-h-[500px]"
                      : "aspect-square"
                  } transition-all duration-500`}
                >
                  <Image
                    src={nftImage}
                    alt={dn.name || "NFT"}
                    fill
                    className={`object-contain transition-transform duration-500 ${
                      imgZoomed ? "scale-110" : ""
                    }`}
                    sizes="(max-width:1024px) 100vw, 60vw"
                    priority
                  />
                </div>

                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-pill bg-surface/80 backdrop-blur-sm border border-border-light text-xs font-display font-semibold">
                  {dn.collection || dn.collection_name || "Collection"}
                </div>

                {effectiveWallet && (
                  <button
                    onClick={handleFavorite}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <Heart
                      size={18}
                      className={
                        favorited
                          ? "text-hot fill-hot"
                          : "text-white/70"
                      }
                    />
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
                    <ExternalLink
                      size={18}
                      className="group-hover:rotate-12 transition-transform"
                    />
                    View NFT on {chainName} Explorer
                  </a>
                </div>
              )}

              <div className="space-y-4">
                <div className="rounded-card bg-surface2 border border-border-light p-5 sm:p-6">
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl mb-3">
                    {dn.name}
                  </h1>
                  <p className="text-sm text-muted leading-relaxed">
                    {nftDesc}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="px-3 py-1 rounded-pill bg-accent/10 text-xs text-accent font-medium border border-accent/20">
                      {dn.tokenType || dn.token_type || "ERC-721"}
                    </span>
                    <span className="px-3 py-1 rounded-pill bg-accent-violet/10 text-xs text-accent-violet font-medium border border-accent-violet/20">
                      {dn.chain || "Base"}
                    </span>
                    <span className="px-3 py-1 rounded-pill bg-warning/10 text-xs text-warning font-medium border border-warning/20">
                      Chain-Verifiable
                    </span>

                    {checkingOwned && isLoggedIn && (
                      <span className="px-3 py-1 rounded-pill bg-surface border border-border-light text-xs">
                        Checking purchase status...
                      </span>
                    )}

                    {!checkingOwned && alreadyOwned && (
                      <span className="px-3 py-1 rounded-pill bg-success/10 text-xs text-success font-medium border border-success/20">
                        Already bought
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-card bg-surface2 border border-border-light p-5 sm:p-6">
                  <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted mb-4">
                    Details
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { l: "Token ID", v: currentTokenId || "—" },
                      {
                        l: "Contract",
                        v: currentContract
                          ? `${currentContract.slice(0, 6)}...${currentContract.slice(-4)}`
                          : "—",
                      },
                      {
                        l: "Collection",
                        v: dn.collection || dn.collection_name || "—",
                      },
                      { l: "Chain", v: dn.chain || "Base" },
                    ].map((item) => (
                      <div key={item.l} className="space-y-1">
                        <p className="text-xs text-muted-dim">{item.l}</p>

                        {item.l === "Contract" && contractExplorerLink ? (
                          <a
                            href={contractExplorerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-accent hover:underline flex items-center gap-1 group"
                          >
                            {item.v}
                            <ExternalLink
                              size={14}
                              className="opacity-70 group-hover:opacity-100 transition-opacity"
                            />
                          </a>
                        ) : item.l === "Token ID" && nftExplorerLink ? (
                          <a
                            href={nftExplorerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-accent hover:underline flex items-center gap-1 group"
                          >
                            {item.v}
                            <ExternalLink
                              size={14}
                              className="opacity-70 group-hover:opacity-100 transition-opacity"
                            />
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
                    <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted mb-4">
                      Attributes
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {dn.attributes.map((a, i) => (
                        <div
                          key={i}
                          className="rounded-xl bg-accent/5 border border-accent/10 p-3 text-center"
                        >
                          <p className="text-[10px] text-accent uppercase tracking-wider mb-1">
                            {a.trait_type}
                          </p>
                          <p className="text-sm font-semibold truncate">
                            {a.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="lg:sticky lg:top-24">
                <div className="glass-card rounded-card p-6 sm:p-8 space-y-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-xl font-semibold text-text">
                        Buy
                      </h2>

                      {state === "ready" && !alreadyOwned && (
                        <Badge color="success" dot>
                          Ready
                        </Badge>
                      )}
                      {["tx_pending", "tx_signing", "confirming"].includes(
                        state
                      ) && (
                        <Badge color="warning" dot>
                          Pending
                        </Badge>
                      )}
                      {state === "tx_success" && (
                        <Badge color="success" dot>
                          Complete
                        </Badge>
                      )}
                      {state === "tx_error" && (
                        <Badge color="danger" dot>
                          Error
                        </Badge>
                      )}
                      {!checkingOwned && alreadyOwned && (
                        <Badge color="success" dot>
                          Bought
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted">{dn.name}</p>
                  </div>

                  <div className="bg-surface2/40 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Buy Fee</span>
                      <span className="text-lg font-mono font-semibold text-accent">
                        {totalPrice} ETH
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Gas Fee</span>
                      <span className="text-text font-mono text-muted-dim">
                        Estimated by wallet
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-border-light">
                      <span className="text-muted">Network</span>
                      <span className="text-text font-mono">
                        {chainName}
                      </span>
                    </div>
                    {isWagmiConnected && userBalanceEth !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Your Balance</span>
                        <span className={`font-mono ${hasEnoughBalance ? "text-success" : "text-danger"}`}>
                          {userBalanceEth.toFixed(6)} ETH
                        </span>
                      </div>
                    )}
                  </div>

                  {isWagmiConnected && !hasEnoughBalance && (
                    <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/10 p-3 mt-2">
                      <span className="text-xs text-danger">
                        Insufficient balance. This NFT costs {totalPrice} ETH, your wallet has {userBalanceEth !== null ? userBalanceEth.toFixed(6) : "unknown"} ETH.
                      </span>
                    </div>
                  )}

                  {state === "needs_login" && (
                    <div className="space-y-4">
                      <div className="text-center py-4 space-y-2">
                        <User size={32} className="mx-auto text-accent" />
                        <p className="text-sm text-muted">
                          Sign up or log in first before continuing
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={handleLogin}
                        disabled={sessionLoading}
                      >
                        {sessionLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <User size={16} />
                        )}
                        Continue to Login / Signup
                      </Button>
                    </div>
                  )}

                  {state === "needs_wallet" && (
                    <div className="space-y-4">
                      <div className="text-center py-4 space-y-2">
                        <Wallet
                          size={32}
                          className="mx-auto text-muted-dim"
                        />
                        <p className="text-sm text-muted">
                          Connect your wallet to continue
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={() => setShowWalletModal(true)}
                      >
                        <Wallet size={16} />
                        Connect Wallet
                      </Button>
                    </div>
                  )}

                  {state === "wrong_network" && (
                    <div className="space-y-4">
                      <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle
                          size={18}
                          className="text-warning mt-0.5 shrink-0"
                        />
                        <div>
                          <p className="text-sm font-medium text-warning">
                            Wrong Network
                          </p>
                          <p className="text-xs text-muted mt-1">
                            Please switch to {chainName} to continue.
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={() => switchChain({ chainId: targetChainId })}
                      >
                        Switch to {chainName}
                      </Button>
                    </div>
                  )}

                  {state === "ready" && (
                    <div className="space-y-4">
                      {hasUsableWallet && (
                        <div className="bg-success/10 border border-success/20 rounded-xl p-4">
                          <p className="text-sm font-medium text-success">
                            Wallet detected
                          </p>
                          <p className="text-xs text-muted mt-1 font-mono">
                            {effectiveWalletShort}
                          </p>
                          {!isWagmiConnected && (
                            <p className="text-xs text-muted mt-2">
                              You can continue with this wallet. You’ll only be asked to connect when it’s time to sign.
                            </p>
                          )}
                        </div>
                      )}

                      {checkingOwned ? (
                        <div className="bg-surface2 border border-border-light rounded-xl p-4 text-center">
                          <Loader2
                            size={18}
                            className="mx-auto mb-2 animate-spin text-accent"
                          />
                          <p className="text-sm text-muted">
                            Checking whether you already own this NFT...
                          </p>
                        </div>
                      ) : alreadyOwned ? (
                        <div className="bg-success/10 border border-success/20 rounded-xl p-4">
                          <p className="text-sm font-medium text-success">
                            You already own this NFT.
                          </p>
                          <p className="text-xs text-muted mt-1">
                            {ownershipMessage}
                          </p>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="lg"
                          className="w-full"
                          onClick={handleMint}
                          disabled={!profileId || checkingOwned || alreadyOwned || (isWagmiConnected && !hasEnoughBalance)}
                        >
                          {mintButtonLabel}
                        </Button>
                      )}
                    </div>
                  )}

                  {["tx_signing", "tx_pending", "confirming"].includes(
                    state
                  ) && (
                    <div className="text-center py-6 space-y-3">
                      <Loader2
                        size={36}
                        className="mx-auto text-accent animate-spin"
                      />
                      <p className="text-sm text-muted">
                        {state === "tx_signing" && "Confirm in your wallet…"}
                        {state === "tx_pending" && "Transaction pending…"}
                        {state === "confirming" && "Verifying on server…"}
                      </p>

                      {txExplorerLink && (
                        <a
                          href={txExplorerLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent font-mono hover:underline"
                        >
                          View transaction on {chainName} Explorer
                        </a>
                      )}
                    </div>
                  )}

                  {state === "tx_success" && (
                    <div className="text-center py-6 space-y-4">
                      <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                        <Check size={28} className="text-success" />
                      </div>

                      <p className="text-text font-semibold">
                        Successfully purchased!
                      </p>
                      <p className="text-sm text-muted">
                        NFT added to your collection.
                      </p>

                      <div className="flex gap-3 justify-center flex-wrap">
                        {txExplorerLink && (
                          <a
                            href={txExplorerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="secondary" size="md">
                              View Transaction
                            </Button>
                          </a>
                        )}

                        <Button
                          variant="secondary"
                          size="md"
                          onClick={resetBuy}
                        >
                          Buy Another
                        </Button>
                      </div>
                    </div>
                  )}

                  {state === "tx_error" && (
                    <div className="space-y-4">
                      <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle
                          size={18}
                          className="text-danger mt-0.5 shrink-0"
                        />
                        <div>
                          <p className="text-sm font-medium text-danger">
                            Transaction Failed
                          </p>
                          <p className="text-xs text-muted mt-1 break-all">
                            {confirmError ||
                              "User rejected or insufficient funds."}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={resetBuy}
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>

                {relatedNfts.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted mb-4">
                      More to Explore
                    </h3>
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
                <span className="text-xs font-display font-semibold text-accent uppercase tracking-wider">
                  Browse & Buy
                </span>
              </div>

              <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl mb-4">
                Choose an NFT to <span className="text-gradient">Buy</span>
              </h1>
              <p className="text-muted text-base sm:text-lg leading-relaxed">
                Click any NFT to see its details and buy it for your collection.
              </p>
            </div>

            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl mb-6">
                Available NFTs
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                {relatedLoading ? (
                  <NftCardSkeleton count={10} />
                ) : relatedNfts.length > 0 ? (
                  relatedNfts.map((n, i) => (
                    <NftCard key={n.id || i} nft={n} index={i} />
                  ))
                ) : (
                  <NftCardSkeleton count={10} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <WalletConnectModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
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