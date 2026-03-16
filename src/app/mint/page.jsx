"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCachedNft, useSettings, useCachedNfts } from "@/hooks/useNfts";
import { useBuy } from "@/hooks/useBuy";
import { resolveImage } from "@/lib/utils";
import { useAccount, useSwitchChain } from "wagmi";
import { useAuth } from "@/hooks/useAuth";
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

  const { settings } = useSettings();
  const { nfts: relatedNfts, loading: relatedLoading } = useCachedNfts(12);

  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  // normal auth only
  const { isAuthed, login, loading: authLoading } = useAuth();

  const {
    buy,
    txHash,
    isSending,
    isWaiting,
    confirming,
    confirmResult,
    confirmError,
    resetBuy,
  } = useBuy();

  const targetChainId = getChainId();
  const isWrongChain = isConnected && chain?.id !== targetChainId;
  const chainName = targetChainId === 8453 ? "Base" : "Base Sepolia";
  const explorerUrl = getExplorerUrl();

  const mintFee = String(
    selectedNft?.mintFee || settings?.minting_fee || "0.002"
  );
  const nftPrice = String(
    selectedNft?.mintPrice || settings?.minting_fee || "0.002"
  );
  const totalPrice = (parseFloat(nftPrice) + parseFloat(mintFee)).toFixed(6);

  const [imgZoomed, setImgZoomed] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const [profileId, setProfileId] = useState(null);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [ownershipSource, setOwnershipSource] = useState(null); // wallet_mints | user_collections | both | null
  const [checkingOwned, setCheckingOwned] = useState(false);

  useEffect(() => {
    async function loadOrCreateProfile() {
      if (!isAuthed) {
        setProfileId(null);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfileId(null);
        return;
      }

      let profile = null;

      // First try by auth email
      let { data: byEmail, error: emailError } = await supabase
        .from("profiles")
        .select("id, email, wallet_address")
        .eq("email", user.email)
        .maybeSingle();

      if (emailError) {
        console.error("Profile fetch by email failed:", emailError);
      }

      profile = byEmail || null;

      // Create profile if missing
      if (!profile?.id) {
        const { data: newProfile, error: insertErr } = await supabase
          .from("profiles")
          .insert({
            email: user.email || `user_${user.id}@local.app`,
            first_name: user.user_metadata?.name?.split(" ")[0] || "User",
            username:
              user.user_metadata?.username ||
              `user_${String(user.id).slice(0, 8)}`,
            wallet_address: address ? String(address).toLowerCase() : null,
          })
          .select("id, email, wallet_address")
          .single();

        if (insertErr || !newProfile?.id) {
          console.error("Profile creation failed:", insertErr);
          return;
        }

        profile = newProfile;
      }

      setProfileId(profile.id);

      // keep wallet synced after wallet connect
      if (
        address &&
        (!profile.wallet_address ||
          profile.wallet_address.toLowerCase() !== address.toLowerCase())
      ) {
        const { error: walletSyncError } = await supabase
          .from("profiles")
          .update({
            wallet_address: address.toLowerCase(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (walletSyncError) {
          console.error("Wallet sync failed:", walletSyncError);
        }
      }
    }

    loadOrCreateProfile();
  }, [isAuthed, address]);

  const currentContract =
    selectedNft?.contractAddress ||
    selectedNft?.contract_address ||
    contractParam ||
    null;

  const currentTokenId =
    selectedNft?.tokenId || selectedNft?.token_id || tokenIdParam || null;

  const currentChainId =
    selectedNft?.chainId || selectedNft?.chain_id || targetChainId;

  useEffect(() => {
    async function checkOwnership() {
      // must be app-authenticated first
      if (!isAuthed || !profileId || !currentContract || !currentTokenId) {
        setAlreadyOwned(false);
        setOwnershipSource(null);
        return;
      }

      setCheckingOwned(true);

      const normalizedContract = String(currentContract).toLowerCase();
      const normalizedTokenId = String(currentTokenId);
      const normalizedWallet = address ? String(address).toLowerCase() : null;

      try {
        const collectionQuery = supabase
          .from("user_collections")
          .select("id")
          .eq("profile_id", profileId)
          .eq("contract_address", normalizedContract)
          .eq("token_id", normalizedTokenId)
          .limit(1);

        let mintQuery = null;

        if (normalizedWallet) {
          mintQuery = supabase
            .from("wallet_mints")
            .select("id")
            .eq("wallet_address", normalizedWallet)
            .eq("contract_address", normalizedContract)
            .eq("token_id", normalizedTokenId)
            .eq("chain_id", Number(currentChainId))
            .in("status", ["confirmed", "success"])
            .limit(1);
        }

        const [collectionRes, mintRes] = await Promise.all([
          collectionQuery,
          mintQuery,
        ]);

        if (collectionRes?.error) {
          console.error(
            "user_collections ownership check failed:",
            collectionRes.error
          );
        }

        if (mintRes?.error) {
          console.error("wallet_mints ownership check failed:", mintRes.error);
        }

        const inCollection = !!collectionRes?.data?.length;
        const inWalletMints = !!mintRes?.data?.length;

        setAlreadyOwned(inCollection || inWalletMints);

        if (inCollection && inWalletMints) {
          setOwnershipSource("both");
        } else if (inCollection) {
          setOwnershipSource("user_collections");
        } else if (inWalletMints) {
          setOwnershipSource("wallet_mints");
        } else {
          setOwnershipSource(null);
        }
      } catch (err) {
        console.error("Ownership check crashed:", err);
        setAlreadyOwned(false);
        setOwnershipSource(null);
      } finally {
        setCheckingOwned(false);
      }
    }

    checkOwnership();
  }, [isAuthed, profileId, address, currentContract, currentTokenId, currentChainId]);

  useEffect(() => {
    if (confirmResult?.success) {
      setAlreadyOwned(true);
      setOwnershipSource("wallet_mints");
    }
  }, [confirmResult]);

  const nftExplorerLink =
    currentContract && currentTokenId
      ? `${explorerUrl}/token/${currentContract}?a=${currentTokenId}`
      : null;

  const contractExplorerLink = currentContract
    ? `${explorerUrl}/address/${currentContract}`
    : null;

  const txExplorerLink = txHash ? `${explorerUrl}/tx/${txHash}` : null;

  let state = "needs_login";

  if (isAuthed) state = "needs_wallet";
  if (isAuthed && isConnected && isWrongChain) state = "wrong_network";
  if (isAuthed && isConnected && !isWrongChain) state = "ready";

  if (confirmResult?.success) state = "tx_success";
  if (confirmError) state = "tx_error";
  if (confirming) state = "confirming";
  if (isWaiting) state = "tx_pending";
  if (isSending) state = "tx_signing";

  const handleMint = useCallback(() => {
    if (!isAuthed || !isConnected || !selectedNft || alreadyOwned) return;

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
      collection: selectedNft.collection || selectedNft.collection_name || null,
      tokenType: selectedNft.tokenType || selectedNft.token_type || "ERC721",
      attributes: selectedNft.attributes || [],
      nftPrice,
      mintFee,
      totalPrice,
    });
  }, [
    isAuthed,
    isConnected,
    selectedNft,
    alreadyOwned,
    tokenIdParam,
    contractParam,
    targetChainId,
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

    if (!isConnected || !selectedNft) return;

    const favoriteContract =
      selectedNft.contractAddress || selectedNft.contract_address;
    const favoriteTokenId = selectedNft.tokenId || selectedNft.token_id;
    const favoriteChainId = selectedNft.chainId || selectedNft.chain_id;

    if (!favoriteContract || !favoriteTokenId) return;

    if (favorited) {
      await fetch(
        `/api/favorites?wallet=${address}&contract=${favoriteContract}&tokenId=${favoriteTokenId}&chainId=${favoriteChainId}`,
        { method: "DELETE" }
      );
      setFavorited(false);
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          contractAddress: favoriteContract,
          tokenId: favoriteTokenId,
          chainId: favoriteChainId,
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
    if (ownershipSource === "both") {
      return "This NFT has already been bought and is already in your collection.";
    }
    if (ownershipSource === "wallet_mints") {
      return "This wallet has already bought or minted this NFT.";
    }
    if (ownershipSource === "user_collections") {
      return "This NFT is already in your collection.";
    }
    return "You already bought this NFT.";
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
          <Link href="/explore" className="hover:text-accent transition-colors">
            Explore
          </Link>
          <span>/</span>
          <span className="text-text">
            {isSelectedMode ? dn?.name || "Loading..." : "Mint"}
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
                    imgZoomed ? "aspect-auto min-h-[500px]" : "aspect-square"
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

                {isConnected && (
                  <button
                    onClick={handleFavorite}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <Heart
                      size={18}
                      className={
                        favorited ? "text-hot fill-hot" : "text-white/70"
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
                  <p className="text-sm text-muted leading-relaxed">{nftDesc}</p>

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

                    {checkingOwned && isAuthed && (
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
                        Mint
                      </h2>

                      {state === "ready" && !alreadyOwned && (
                        <Badge color="success" dot>
                          Ready
                        </Badge>
                      )}

                      {["tx_pending", "tx_signing", "confirming"].includes(state) && (
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
                      <span className="text-muted">NFT Price</span>
                      <span className="text-text font-mono font-medium">
                        {nftPrice} ETH
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Mint Fee</span>
                      <span className="text-text font-mono font-medium">
                        {mintFee} ETH
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-border-light">
                      <span className="text-text font-medium">Total</span>
                      <span className="text-lg font-mono font-semibold text-accent">
                        {totalPrice} ETH
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Network</span>
                      <span className="text-text font-mono">{chainName}</span>
                    </div>
                  </div>

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
                        onClick={login}
                        disabled={authLoading}
                      >
                        {authLoading ? (
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
                        <Wallet size={32} className="mx-auto text-muted-dim" />
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

                      <WalletConnectModal
                        open={showWalletModal}
                        onClose={() => setShowWalletModal(false)}
                      />
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
                      {checkingOwned ? (
                        <div className="bg-surface2 border border-border-light rounded-xl p-4 text-center">
                          <Loader2
                            size={18}
                            className="mx-auto mb-2 animate-spin text-accent"
                          />
                          <p className="text-sm text-muted">
                            Checking whether you already bought this NFT...
                          </p>
                        </div>
                      ) : alreadyOwned ? (
                        <div className="bg-success/10 border border-success/20 rounded-xl p-4">
                          <p className="text-sm font-medium text-success">
                            You’ve already bought this NFT.
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
                          disabled={!profileId || checkingOwned || alreadyOwned}
                        >
                          Mint Now — {totalPrice} ETH
                        </Button>
                      )}
                    </div>
                  )}

                  {["tx_signing", "tx_pending", "confirming"].includes(state) && (
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
                        Successfully minted!
                      </p>
                      <p className="text-sm text-muted">
                        NFT saved to your collection.
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

                        {nftExplorerLink && (
                          <a
                            href={nftExplorerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="secondary" size="md">
                              View NFT
                            </Button>
                          </a>
                        )}

                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => {
                            resetBuy();
                          }}
                        >
                          Mint Another
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
                            {confirmError || "User rejected or insufficient funds."}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={() => {
                          resetBuy();
                        }}
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
                  Browse & Mint
                </span>
              </div>

              <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl mb-4">
                Choose an NFT to <span className="text-gradient">Mint</span>
              </h1>
              <p className="text-muted text-base sm:text-lg leading-relaxed">
                Click any NFT to see its details and mint it to your wallet.
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