"use client";

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSettings } from "@/hooks/useNfts";
import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useReadContract,
  useBalance,
  useWalletClient,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { useSession } from "@/hooks/useSession";
import {
  getChainId,
  getExplorerUrl,
  getCreatorContractAddress,
  AURORA_CREATOR_ABI,
} from "@/lib/web3/contract";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  Wallet,
  Check,
  Loader2,
  User,
  Upload,
  X,
  Sparkles,
  ImagePlus,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  Zap,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  PenLine,
  Eye,
  AlertTriangle,
} from "lucide-react";
import WalletConnectModal from "@/components/WalletConnectModal";

function StepIndicator({ current, steps }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((s, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;

        return (
          <div key={i} className="flex items-center gap-1 sm:gap-2">
            <div
              className={`
                flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300
                ${isActive ? "border border-accent/30 bg-accent/15 text-accent shadow-[0_0_12px_rgba(34,211,238,0.12)]" : ""}
                ${isDone ? "border border-success/20 bg-success/10 text-success" : ""}
                ${!isActive && !isDone ? "border border-border-light bg-surface2/50 text-muted-dim" : ""}
              `}
            >
              {isDone ? <CheckCircle2 size={13} /> : <span className="w-4 text-center">{stepNum}</span>}
              <span className="hidden sm:inline">{s}</span>
            </div>

            {i < steps.length - 1 && (
              <div
                className={`h-px w-6 transition-colors duration-300 sm:w-10 ${
                  isDone ? "bg-success/40" : "bg-border-light"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CreatePageContent() {
  const { settings } = useSettings();
  const { address: liveWalletAddress, isConnected: isWagmiConnected, chain } = useAccount();
  useConnect();
  const { switchChain } = useSwitchChain();

  const {
    isLoggedIn,
    profile,
    loading: sessionLoading,
    linkedWallet,
    refreshSession,
  } = useSession();

  const targetChainId = getChainId();
  const chainName = targetChainId === 8453 ? "Base" : "Base Sepolia";
  const explorerUrl = getExplorerUrl();
  const creatorContract = getCreatorContractAddress();

  const liveWallet = liveWalletAddress ? String(liveWalletAddress).toLowerCase() : null;
  const savedWallet = linkedWallet
    ? String(linkedWallet).toLowerCase()
    : profile?.wallet_address
      ? String(profile.wallet_address).toLowerCase()
      : null;

  const effectiveWallet = liveWallet || savedWallet || null;
  const hasUsableWallet = Boolean(effectiveWallet);
  const isWrongChain = isWagmiConnected && chain?.id !== targetChainId;

  const { data: onChainFeeRaw, isLoading: feeLoading } = useReadContract({
    address: creatorContract || undefined,
    abi: AURORA_CREATOR_ABI,
    functionName: "mintFee",
    chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });

  const { data: mintActiveOnChain } = useReadContract({
    address: creatorContract || undefined,
    abi: AURORA_CREATOR_ABI,
    functionName: "mintActive",
    chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });

  const { data: totalMintedOnChain } = useReadContract({
    address: creatorContract || undefined,
    abi: AURORA_CREATOR_ABI,
    functionName: "totalMinted",
    chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });

  const onChainFeeEth = onChainFeeRaw != null ? formatEther(onChainFeeRaw) : null;
  const onChainFeeNum = parseFloat(onChainFeeEth || "0");

  const adminPriceRaw = settings?.mint_price_eth;
  const adminPriceNum = adminPriceRaw ? parseFloat(adminPriceRaw) : 0;

  const totalMintPrice = useMemo(() => {
    if (onChainFeeNum <= 0 && adminPriceNum <= 0) return null;
    if (onChainFeeNum <= 0) return adminPriceNum > 0 ? adminPriceNum : null;
    if (adminPriceNum <= 0) return onChainFeeNum;
    return Math.max(adminPriceNum, onChainFeeNum);
  }, [adminPriceNum, onChainFeeNum]);

  const adminCut = useMemo(() => {
    if (totalMintPrice == null || onChainFeeNum <= 0) return 0;
    const cut = totalMintPrice - onChainFeeNum;
    return cut > 0.0000001 ? cut : 0;
  }, [totalMintPrice, onChainFeeNum]);

  const totalMintPriceStr =
    totalMintPrice != null
      ? totalMintPrice.toFixed(8).replace(/\.?0+$/, "")
      : null;

  const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET || "";

  const { data: walletClient } = useWalletClient();
  const { data: balanceData } = useBalance({
    address: liveWalletAddress || undefined,
    query: { enabled: Boolean(liveWalletAddress) },
  });

  const userBalanceEth = balanceData ? parseFloat(formatEther(balanceData.value)) : null;

  const hasEnoughBalance = useMemo(() => {
    if (userBalanceEth === null || totalMintPrice === null || totalMintPrice <= 0) return true;
    const result = userBalanceEth >= totalMintPrice;

    if (!result) {
      console.warn("[BALANCE CHECK FAILED]", {
        userBalanceEth,
        totalMintPrice,
        onChainFeeNum,
        adminPriceNum,
        adminPriceRaw,
        balanceChainId: balanceData?.chainId || chain?.id,
        targetChainId,
        connectedChainId: chain?.id,
      });
    }

    return result;
  }, [
    userBalanceEth,
    totalMintPrice,
    onChainFeeNum,
    adminPriceNum,
    adminPriceRaw,
    balanceData,
    chain,
    targetChainId,
  ]);

  const isMintActive = mintActiveOnChain !== false;
  const isFeeReady = onChainFeeNum > 0;
  const isPriceReady = totalMintPrice !== null && totalMintPrice > 0;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [collection, setCollection] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [attributes, setAttributes] = useState([{ trait_type: "", value: "" }]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState(1);

  const {
    writeContract,
    data: txHash,
    isPending: isSending,
    error: sendError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isWaiting, isSuccess: isConfirmedOnChain } =
    useWaitForTransactionReceipt({
      hash: txHash,
      query: { enabled: Boolean(txHash) },
    });

  const handleFileSelect = (file) => {
    if (!file) return;

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];

    if (!allowed.includes(file.type)) {
      alert("Please upload PNG, JPG, GIF, WEBP, or SVG");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10MB");
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const addAttribute = () => setAttributes((p) => [...p, { trait_type: "", value: "" }]);
  const removeAttribute = (i) => setAttributes((p) => p.filter((_, j) => j !== i));
  const updateAttribute = (i, f, v) =>
    setAttributes((p) => p.map((a, j) => (j === i ? { ...a, [f]: v } : a)));

  const isStep1Valid = Boolean(imageFile);
  const isStep2Valid = Boolean(name.trim());
  const isFormValid = isStep1Valid && isStep2Valid;

  const [mintStep, setMintStep] = useState("");

  const handleCreateMint = useCallback(async () => {
    if (!isLoggedIn || !isFormValid) return;

    if (!hasUsableWallet || !isWagmiConnected) {
      setShowWalletModal(true);
      return;
    }

    if (chain?.id !== targetChainId) {
      switchChain({ chainId: targetChainId });
      return;
    }

    if (!creatorContract) {
      setConfirmError("Creator contract not configured.");
      return;
    }

    if (!isFeeReady || !isPriceReady) {
      setConfirmError("Mint fee is still loading. Please try again.");
      return;
    }

    setStep(4);
    setConfirmResult(null);
    setConfirmError(null);

    if (adminCut > 0 && walletClient && ADMIN_WALLET) {
      setMintStep("sending_cut");
      try {
        const cutHash = await walletClient.sendTransaction({
          to: ADMIN_WALLET,
          value: parseEther(adminCut.toFixed(18)),
          chain,
        });

        const viemMod = await import("viem");
        const chainsMod = await import("viem/chains");
        const pc = viemMod.createPublicClient({
          chain: targetChainId === 8453 ? chainsMod.base : chainsMod.baseSepolia,
          transport: viemMod.http(),
        });

        await pc.waitForTransactionReceipt({ hash: cutHash });
      } catch (e) {
        setConfirmError(e?.shortMessage || e?.message || "Transaction rejected");
        setStep(3);
        setMintStep("");
        return;
      }
    }

    setMintStep("minting");

    const metadataURI = `${window.location.origin}/api/nft/token-metadata?pending=1`;

    writeContract({
      address: creatorContract,
      abi: AURORA_CREATOR_ABI,
      functionName: "createNft",
      args: [metadataURI],
      value: parseEther(String(onChainFeeEth)),
      chainId: targetChainId,
    });
  }, [
    isLoggedIn,
    isFormValid,
    hasUsableWallet,
    isWagmiConnected,
    chain,
    targetChainId,
    switchChain,
    creatorContract,
    isFeeReady,
    isPriceReady,
    adminCut,
    walletClient,
    ADMIN_WALLET,
    onChainFeeEth,
    writeContract,
  ]);

  useEffect(() => {
    if (!isConfirmedOnChain || !txHash || confirming || confirmResult) return;

    const finalize = async () => {
      setConfirming(true);

      try {
        let imageBase64 = null;

        if (imageFile) {
          imageBase64 = await new Promise((resolve) => {
            const rd = new FileReader();
            rd.onload = () => resolve(rd.result);
            rd.readAsDataURL(imageFile);
          });
        }

        const validAttrs = attributes.filter(
          (a) => a.trait_type.trim() && a.value.trim()
        );

        const res = await fetch("/api/nft/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txHash,
            name: name.trim(),
            description: description.trim(),
            collection: collection.trim() || "User Created",
            externalUrl: externalUrl.trim(),
            attributes: validAttrs,
            imageBase64,
            imageFileName: imageFile?.name || "nft-image",
            imageType: imageFile?.type || "image/png",
            feeEth: onChainFeeEth,
            totalPriceEth: totalMintPriceStr,
            adminCutEth: adminCut > 0 ? adminCut.toFixed(8) : "0",
            listingPriceEth: listingPrice ? String(listingPrice) : "0",
            creatorContract,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Create failed");

        setConfirmResult(data);
        setStep(5);
        refreshSession();
      } catch (e) {
        setConfirmError(e?.message || "Failed to finalize");
        setStep(4);
      } finally {
        setConfirming(false);
      }
    };

    finalize();
  }, [
    isConfirmedOnChain,
    txHash,
    confirming,
    confirmResult,
    imageFile,
    attributes,
    name,
    description,
    collection,
    externalUrl,
    listingPrice,
    onChainFeeEth,
    totalMintPriceStr,
    adminCut,
    creatorContract,
    refreshSession,
  ]);

  useEffect(() => {
    if (sendError) {
      setConfirmError(sendError.shortMessage || sendError.message || "Transaction failed");
      setStep(3);
    }
  }, [sendError]);

  const resetAll = () => {
    resetWrite();
    setConfirmResult(null);
    setConfirmError(null);
    setStep(1);
    setName("");
    setDescription("");
    setCollection("");
    setExternalUrl("");
    setListingPrice("");
    setAttributes([{ trait_type: "", value: "" }]);
    setImageFile(null);
    setImagePreview(null);
    setMintStep("");
  };

  const txExplorerLink = txHash ? `${explorerUrl}/tx/${txHash}` : null;
  const contractExplorerLink = creatorContract
    ? `${explorerUrl}/address/${creatorContract}`
    : null;

  const effectiveWalletShort = effectiveWallet
    ? `${effectiveWallet.slice(0, 6)}...${effectiveWallet.slice(-4)}`
    : null;

  let authState = "needs_login";
  if (isLoggedIn && !hasUsableWallet) authState = "needs_wallet";
  if (isLoggedIn && hasUsableWallet) authState = "ready";
  if (isLoggedIn && isWagmiConnected && isWrongChain) authState = "wrong_network";

  let mintState = "idle";
  if (confirmResult?.success) mintState = "success";
  else if (confirmError) mintState = "error";
  else if (confirming) mintState = "confirming";
  else if (isWaiting) mintState = "tx_pending";
  else if (isSending) mintState = "tx_signing";

  const handleLogin = () => {
    if (typeof window !== "undefined") window.location.href = "/login";
  };

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-accent-violet/5 blur-[200px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-accent/3 blur-[180px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-dim">
          <Link href="/" className="transition-colors hover:text-accent">
            Home
          </Link>
          <span>/</span>
          <span className="text-text">Create NFT</span>
        </nav>

        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-pill border border-accent-violet/20 bg-accent-violet/10 px-4 py-1.5">
            <Sparkles size={14} className="text-accent-violet" />
            <span className="font-display text-xs font-semibold uppercase tracking-wider text-accent-violet">
              On-Chain Creator
            </span>
          </div>

          <h1 className="mb-3 font-display text-3xl font-extrabold sm:text-4xl lg:text-5xl">
            Mint Your <span className="text-gradient">Own NFT</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base text-muted sm:text-lg">
            Upload artwork, add metadata, and mint a real ERC-721 NFT on {chainName}.
          </p>

          {creatorContract && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border-light bg-surface2/60 px-4 py-2 text-xs">
              <Shield size={13} className="text-success" />
              <span className="text-muted">Contract:</span>
              <a
                href={contractExplorerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-accent hover:underline"
              >
                {creatorContract.slice(0, 6)}...{creatorContract.slice(-4)}
              </a>
              {totalMintedOnChain !== undefined && (
                <span className="ml-2 text-muted">| {String(totalMintedOnChain)} minted</span>
              )}
            </div>
          )}
        </div>

        {!creatorContract && authState === "ready" && (
          <div className="mx-auto mb-8 max-w-lg rounded-xl border border-warning/20 bg-warning/10 p-5">
            <p className="text-sm font-medium text-warning">Contract Not Deployed</p>
            <p className="mt-1 text-xs text-muted">
              Set{" "}
              <code className="rounded bg-surface2 px-1 py-0.5 font-mono text-accent">
                NEXT_PUBLIC_CREATOR_CONTRACT
              </code>{" "}
              in .env after deploying.
            </p>
          </div>
        )}

        {creatorContract && !isMintActive && authState === "ready" && step < 4 && (
          <div className="mx-auto mb-8 max-w-lg rounded-xl border border-warning/20 bg-warning/10 p-5">
            <p className="text-sm font-medium text-warning">Minting Paused</p>
            <p className="mt-1 text-xs text-muted">
              The contract owner has paused minting.
            </p>
          </div>
        )}

        {authState === "ready" && creatorContract && feeLoading && (
          <div className="mx-auto mb-8 max-w-2xl rounded-xl border border-accent/20 bg-accent/5 p-4">
            <div className="flex items-center gap-2 text-sm text-accent">
              <Loader2 size={15} className="animate-spin" />
              Loading mint fee from contract...
            </div>
          </div>
        )}

        {authState === "needs_login" && (
          <div className="mx-auto max-w-md">
            <div className="glass-card rounded-card space-y-4 p-8 text-center">
              <User size={40} className="mx-auto text-accent" />
              <h2 className="font-display text-xl font-semibold">Sign In Required</h2>
              <p className="text-sm text-muted">Log in or sign up to start creating NFTs.</p>
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
          </div>
        )}

        {authState === "needs_wallet" && (
          <div className="mx-auto max-w-md">
            <div className="glass-card rounded-card space-y-4 p-8 text-center">
              <Wallet size={40} className="mx-auto text-muted-dim" />
              <h2 className="font-display text-xl font-semibold">Connect Wallet</h2>
              <p className="text-sm text-muted">Connect your wallet to mint NFTs on-chain.</p>
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
          </div>
        )}

        {authState === "wrong_network" && (
          <div className="mx-auto max-w-md">
            <div className="glass-card rounded-card space-y-4 p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                <span className="text-sm font-semibold text-warning">!</span>
              </div>
              <h2 className="font-display text-xl font-semibold text-warning">Wrong Network</h2>
              <p className="text-sm text-muted">Switch to {chainName} to continue.</p>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => switchChain({ chainId: targetChainId })}
              >
                Switch to {chainName}
              </Button>
            </div>
          </div>
        )}

        {authState === "ready" && step <= 3 && (
          <>
            <StepIndicator current={step} steps={["Upload Art", "Add Details", "Review & Mint"]} />

            {step === 1 && (
              <div className="mx-auto max-w-2xl">
                <div className="glass-card rounded-card overflow-hidden">
                  <div className="border-b border-border-light p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/10">
                        <ImagePlus size={20} className="text-accent-violet" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-semibold">Upload Your Artwork</h3>
                        <p className="text-xs text-muted">PNG, JPG, GIF, WEBP, SVG — Max 10MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    {imagePreview ? (
                      <div className="relative overflow-hidden rounded-xl border border-border-light">
                        <div className="relative mx-auto aspect-square max-h-[400px]">
                          <Image src={imagePreview} alt="Preview" fill className="object-contain" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-colors hover:bg-black/80"
                        >
                          <X size={14} className="text-white" />
                        </button>
                        <div className="absolute bottom-3 left-3 rounded-pill bg-black/60 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
                          {imageFile?.name}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors ${
                          dragActive
                            ? "border-accent-violet bg-accent-violet/5"
                            : "border-border-light bg-surface2/30 hover:border-accent-violet/40"
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragActive(true);
                        }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="px-4 py-20 text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-violet/10">
                            <Upload size={28} className="text-accent-violet" />
                          </div>
                          <p className="mb-2 text-base font-medium text-text">
                            Drag & drop or click to upload
                          </p>
                          <p className="text-sm text-muted">Recommended: 1000×1000px or higher</p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files?.[0])}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end p-5 pt-0">
                    <Button variant="primary" size="lg" onClick={() => setStep(2)} disabled={!isStep1Valid}>
                      Continue <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mx-auto max-w-3xl">
                <div className="grid gap-6 md:grid-cols-5">
                  <div className="md:col-span-2">
                    {imagePreview && (
                      <div className="glass-card rounded-card sticky top-24 overflow-hidden">
                        <div className="relative aspect-square">
                          <Image src={imagePreview} alt="Preview" fill className="object-contain" />
                        </div>
                        <div className="border-t border-border-light p-3">
                          <p className="truncate text-xs text-muted">{imageFile?.name}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                              setStep(1);
                            }}
                            className="mt-1 text-xs text-accent hover:underline"
                          >
                            Change image
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="glass-card rounded-card mt-4 space-y-3 p-4">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-accent" />
                        <span className="font-display text-sm font-semibold">Pricing</span>
                        {isPriceReady ? (
                          <Badge color="success" className="!text-[9px]">Live</Badge>
                        ) : (
                          <Badge color="warning" className="!text-[9px]">Loading</Badge>
                        )}
                      </div>

                      <div className="space-y-2 rounded-lg bg-surface2/40 p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted">Mint Fee</span>
                          <span className="font-mono font-semibold text-accent">
                            {totalMintPriceStr ? `${totalMintPriceStr} ETH` : "Loading..."}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted">Gas Fee</span>
                          <span className="font-mono text-muted-dim">
                            Estimated by wallet
                          </span>
                        </div>

                        <div className="my-1 border-t border-border-light" />

                        <div className="flex justify-between text-sm">
                          <span className="text-muted">Network</span>
                          <span className="font-mono">{chainName}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted">Standard</span>
                          <span className="font-mono">ERC-721</span>
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

                      {isWagmiConnected && !hasEnoughBalance && totalMintPriceStr && (
                        <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-[11px] text-danger">
                          Insufficient balance. You need at least {totalMintPriceStr} ETH plus gas fees.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <div className="glass-card rounded-card overflow-hidden">
                      <div className="border-b border-border-light p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
                            <PenLine size={18} className="text-accent" />
                          </div>
                          <div>
                            <h3 className="font-display text-sm font-semibold">NFT Details</h3>
                            <p className="text-[11px] text-muted">
                              Add a name, description, and properties
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5 p-5">
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-text">
                            Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Cosmic Dreamer #1"
                            className="w-full rounded-xl border border-border-light bg-surface2/60 px-4 py-3 text-sm text-text transition-colors placeholder:text-muted-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                            maxLength={100}
                          />
                          <p className="text-right text-[11px] text-muted-dim">{name.length}/100</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-text">Description</label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell the story behind your creation..."
                            rows={3}
                            className="w-full resize-none rounded-xl border border-border-light bg-surface2/60 px-4 py-3 text-sm text-text transition-colors placeholder:text-muted-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                            maxLength={1000}
                          />
                          <p className="text-right text-[11px] text-muted-dim">
                            {description.length}/1000
                          </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-text">Collection</label>
                            <input
                              type="text"
                              value={collection}
                              onChange={(e) => setCollection(e.target.value)}
                              placeholder="e.g. My Art Series"
                              className="w-full rounded-xl border border-border-light bg-surface2/60 px-4 py-3 text-sm text-text transition-colors placeholder:text-muted-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-text">External URL</label>
                            <input
                              type="url"
                              value={externalUrl}
                              onChange={(e) => setExternalUrl(e.target.value)}
                              placeholder="https://..."
                              className="w-full rounded-xl border border-border-light bg-surface2/60 px-4 py-3 text-sm text-text transition-colors placeholder:text-muted-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-text">
                            NFT Price (ETH)
                          </label>
                          <p className="text-[11px] text-muted">
                            Set the price you want this NFT to sell for. Leave at 0 if not for sale yet.
                          </p>
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            value={listingPrice}
                            onChange={(e) => setListingPrice(e.target.value)}
                            placeholder="0.01"
                            className="w-full rounded-xl border border-border-light bg-surface2/60 px-4 py-3 text-sm text-text transition-colors placeholder:text-muted-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                          />
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-text">Properties</label>
                            <button
                              type="button"
                              onClick={addAttribute}
                              className="flex items-center gap-1 text-xs text-accent transition-colors hover:text-accent/80"
                            >
                              <Plus size={12} /> Add
                            </button>
                          </div>

                          <div className="space-y-2">
                            {attributes.map((attr, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={attr.trait_type}
                                  onChange={(e) => updateAttribute(idx, "trait_type", e.target.value)}
                                  placeholder="Trait (e.g. Color)"
                                  className="flex-1 rounded-lg border border-border-light bg-surface2/60 px-3 py-2.5 text-sm text-text placeholder:text-muted-dim focus:border-accent/50 focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={attr.value}
                                  onChange={(e) => updateAttribute(idx, "value", e.target.value)}
                                  placeholder="Value (e.g. Blue)"
                                  className="flex-1 rounded-lg border border-border-light bg-surface2/60 px-3 py-2.5 text-sm text-text placeholder:text-muted-dim focus:border-accent/50 focus:outline-none"
                                />
                                {attributes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeAttribute(idx)}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger transition-colors hover:bg-danger/20"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between p-5 pt-0">
                        <Button variant="ghost" size="md" onClick={() => setStep(1)}>
                          <ArrowLeft size={14} /> Back
                        </Button>
                        <Button variant="primary" size="lg" onClick={() => setStep(3)} disabled={!isStep2Valid}>
                          <Eye size={16} /> Review
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mx-auto max-w-2xl space-y-6">
                <div className="glass-card rounded-card p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/10">
                      <Shield size={20} className="text-accent-violet" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-semibold">Review Your NFT</h2>
                      <p className="text-xs text-muted">
                        This calls AuroraCreator.createNft() with the live on-chain fee
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-5">
                    <div className="sm:col-span-2">
                      {imagePreview && (
                        <div className="overflow-hidden rounded-xl border border-border-light">
                          <div className="relative aspect-square">
                            <Image src={imagePreview} alt="Preview" fill className="object-contain" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 sm:col-span-3">
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">Name</p>
                        <p className="font-display text-lg font-semibold">{name}</p>
                      </div>

                      {description && (
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">Description</p>
                          <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                            {description}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">Collection</p>
                          <p className="text-sm">{collection || "User Created"}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">Chain</p>
                          <p className="font-mono text-sm">{chainName}</p>
                        </div>
                        {listingPrice && parseFloat(listingPrice) > 0 && (
                          <div>
                            <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">NFT Price</p>
                            <p className="font-mono text-sm text-accent">{listingPrice} ETH</p>
                          </div>
                        )}
                      </div>

                      {attributes.filter((a) => a.trait_type && a.value).length > 0 && (
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-wider text-muted-dim">Properties</p>
                          <div className="flex flex-wrap gap-2">
                            {attributes
                              .filter((a) => a.trait_type && a.value)
                              .map((a, i) => (
                                <span
                                  key={i}
                                  className="rounded-lg border border-accent/10 bg-accent/5 px-3 py-1 text-xs"
                                >
                                  <span className="text-accent">{a.trait_type}:</span> {a.value}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 space-y-2 rounded-xl bg-surface2/40 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Contract</span>
                      <span className="font-mono text-xs text-accent">
                        {creatorContract
                          ? `${creatorContract.slice(0, 6)}...${creatorContract.slice(-4)}`
                          : "Not set"}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Function</span>
                      <span className="font-mono text-xs">createNft(metadataURI)</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Wallet</span>
                      <span className="font-mono text-xs">{effectiveWalletShort}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Mint Fee</span>
                      <span className="font-mono text-lg font-semibold text-accent">
                        {totalMintPriceStr ? `${totalMintPriceStr} ETH` : "Loading..."}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Gas Fee</span>
                      <span className="font-mono text-xs text-muted-dim">Estimated by wallet</span>
                    </div>

                    <div className="flex justify-between border-t border-border-light pt-2 text-sm">
                      <span className="text-muted">Network</span>
                      <span className="font-mono text-xs">{chainName}</span>
                    </div>

                    {isWagmiConnected && userBalanceEth !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Your Balance</span>
                        <span className={`font-mono text-xs ${hasEnoughBalance ? "text-success" : "text-danger"}`}>
                          {userBalanceEth.toFixed(6)} ETH
                        </span>
                      </div>
                    )}
                  </div>

                  {confirmError && (
                    <div className="mt-4 rounded-xl border border-danger/20 bg-danger/10 p-4">
                      <p className="text-sm font-medium text-danger">Error</p>
                      <p className="mt-1 break-all text-xs text-muted">{confirmError}</p>
                    </div>
                  )}

                  {!isPriceReady && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/10 p-4">
                      <AlertTriangle size={15} className="mt-0.5 text-warning" />
                      <p className="text-xs text-warning">
                        Mint fee is still loading. Minting stays disabled until it loads.
                      </p>
                    </div>
                  )}

                  {isWagmiConnected && !hasEnoughBalance && totalMintPriceStr && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/10 p-4">
                      <AlertTriangle size={15} className="mt-0.5 text-danger" />
                      <p className="text-xs text-danger">
                        Insufficient balance. You need at least {totalMintPriceStr} ETH plus gas fees.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <Button
                      variant="ghost"
                      size="lg"
                      className="flex-1"
                      onClick={() => {
                        setStep(2);
                        setConfirmError(null);
                      }}
                    >
                      <ArrowLeft size={14} /> Back
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      className="flex-1"
                      onClick={handleCreateMint}
                      disabled={!creatorContract || !isMintActive || !isPriceReady}
                    >
                      <Sparkles size={16} /> Mint On-Chain — {totalMintPriceStr ? `${totalMintPriceStr} ETH` : "Loading..."}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {authState === "ready" && step === 4 && (
          <div className="mx-auto max-w-md">
            <div className="glass-card rounded-card space-y-5 p-8 text-center">
              <div className="relative mx-auto h-20 w-20">
                <div className="absolute inset-0 animate-ping rounded-full border-2 border-accent/20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
                  <Loader2 size={36} className="animate-spin text-accent" />
                </div>
              </div>

              <h2 className="font-display text-xl font-semibold">
                {mintState === "tx_signing" && "Confirm in your wallet..."}
                {mintState === "tx_pending" && "Transaction pending on-chain..."}
                {mintState === "confirming" && "Saving metadata to database..."}
                {mintState === "error" && "Something went wrong"}
              </h2>

              <p className="text-sm text-muted">
                {mintState === "tx_signing" && "Your wallet will ask you to approve the mint transaction."}
                {mintState === "tx_pending" && `Waiting for block confirmation on ${chainName}.`}
                {mintState === "confirming" && "Verifying the mint event and storing your NFT metadata."}
              </p>

              {txExplorerLink && (
                <a
                  href={txExplorerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                >
                  <ExternalLink size={12} /> View on {chainName} Explorer
                </a>
              )}

              {mintState === "error" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-left">
                    <p className="break-all text-xs text-muted">
                      {confirmError || "Transaction rejected or failed."}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      size="md"
                      className="flex-1"
                      onClick={() => {
                        setStep(2);
                        setConfirmError(null);
                        resetWrite();
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      className="flex-1"
                      onClick={() => {
                        setConfirmError(null);
                        resetWrite();
                        setStep(3);
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 5 && confirmResult?.success && (
          <div className="mx-auto max-w-lg">
            <div className="glass-card rounded-card space-y-6 p-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
                <Check size={40} className="text-success" />
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold">NFT Minted On-Chain!</h2>
                <p className="mt-2 text-sm text-muted">
                  <strong>&quot;{name}&quot;</strong> is now a real ERC-721 token
                  {confirmResult?.tokenId && <> — Token #{confirmResult.tokenId}</>}.
                </p>
              </div>

              {imagePreview && (
                <div className="mx-auto max-w-[200px] overflow-hidden rounded-xl border border-border-light">
                  <div className="relative aspect-square">
                    <Image src={imagePreview} alt={name} fill className="object-contain" />
                  </div>
                </div>
              )}

              <div className="space-y-2 rounded-xl bg-surface2/40 p-4 text-left text-sm">
                {confirmResult?.tokenId && (
                  <div className="flex justify-between">
                    <span className="text-muted">Token ID</span>
                    <span className="font-mono font-medium">#{confirmResult.tokenId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">Contract</span>
                  <span className="font-mono text-xs text-accent">
                    {creatorContract?.slice(0, 6)}...{creatorContract?.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Mint Fee</span>
                  <span className="font-mono text-accent">{totalMintPriceStr || onChainFeeEth} ETH</span>
                </div>
                {listingPrice && parseFloat(listingPrice) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">NFT Price</span>
                    <span className="font-mono text-accent">{listingPrice} ETH</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">Standard</span>
                  <span className="font-mono">ERC-721</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {txExplorerLink && (
                  <a href={txExplorerLink} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="md">
                      <ExternalLink size={14} /> View Transaction
                    </Button>
                  </a>
                )}
                <Link href="/profile">
                  <Button variant="secondary" size="md">View in Profile</Button>
                </Link>
                <Button variant="primary" size="md" onClick={resetAll}>
                  <Plus size={14} /> Create Another
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <WalletConnectModal open={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      <CreatePageContent />
    </Suspense>
  );
}