"use client";

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useSettings } from "@/hooks/useNfts";
import {
  useAccount,
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

const STORAGE_KEY = "aurora_pending_mint_v4";
const LOG = "[CREATE PAGE]";

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
              {isDone ? (
                <CheckCircle2 size={13} />
              ) : (
                <span className="w-4 text-center">{stepNum}</span>
              )}
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

function clampRoyalty(value) {
  const parsed = Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(30, Math.max(0, parsed));
}

async function readJsonSafe(res) {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { error: raw || "Invalid server response" };
  }
}

function CreatePageContent() {
  const { settings } = useSettings();
  const { address: liveWalletAddress, isConnected: isWagmiConnected, chain } = useAccount();
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
    totalMintPrice != null ? totalMintPrice.toFixed(8).replace(/\.?0+$/, "") : null;

  const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET || "";

  const { data: walletClient } = useWalletClient();
  const { data: balanceData } = useBalance({
    address: liveWalletAddress || undefined,
    chainId: targetChainId,
    query: { enabled: Boolean(liveWalletAddress && isWagmiConnected) },
  });

  const userBalanceEth = balanceData ? parseFloat(formatEther(balanceData.value)) : null;

  const hasEnoughBalance = useMemo(() => {
    if (userBalanceEth === null || totalMintPrice === null || totalMintPrice <= 0) return true;
    return userBalanceEth >= totalMintPrice;
  }, [userBalanceEth, totalMintPrice]);

  const isMintActive = mintActiveOnChain !== false;
  const isFeeReady = onChainFeeNum > 0;
  const isPriceReady = totalMintPrice !== null && totalMintPrice > 0;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [collection, setCollection] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [royaltyPercent, setRoyaltyPercent] = useState("");
  const [attributes, setAttributes] = useState([{ trait_type: "", value: "" }]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [showWalletModal, setShowWalletModal] = useState(false);

  const [step, setStep] = useState(1);
  const [mintStep, setMintStep] = useState("");
  const [mintKey, setMintKey] = useState(null);
  const [pendingMetadataUri, setPendingMetadataUri] = useState(null);
  const [submittedTxHash, setSubmittedTxHash] = useState(null);
  const [confirmResult, setConfirmResult] = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const confirmLoopActiveRef = useRef(false);
  const confirmBusyRef = useRef(false);
  const receiptTriggeredForHashRef = useRef(null);
  const unmountedRef = useRef(false);

  const {
    writeContractAsync,
    isPending: isSending,
    error: sendError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    data: watchedReceipt,
    isLoading: isWaiting,
    error: watchedReceiptError,
  } = useWaitForTransactionReceipt({
    hash: submittedTxHash || undefined,
    chainId: targetChainId,
    confirmations: 1,
    pollingInterval: 1_000,
    timeout: 300_000,
    query: { enabled: Boolean(submittedTxHash) },
  });

  const royaltyNum = useMemo(() => clampRoyalty(royaltyPercent), [royaltyPercent]);

  const handleRoyaltyChange = (value) => {
    if (value === "") {
      setRoyaltyPercent("");
      return;
    }

    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return;
    setRoyaltyPercent(String(clampRoyalty(parsed)));
  };

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

    if (file.size > 4 * 1024 * 1024) {
      alert("File must be under 4MB when saving directly in the database");
      return;
    }

    console.log(LOG, "selected file", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result || null);
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

  const txExplorerLink = submittedTxHash ? `${explorerUrl}/tx/${submittedTxHash}` : null;
  const contractExplorerLink = creatorContract ? `${explorerUrl}/address/${creatorContract}` : null;

  const effectiveWalletShort = effectiveWallet
    ? `${effectiveWallet.slice(0, 6)}...${effectiveWallet.slice(-4)}`
    : null;

  const persistPendingState = useCallback(
    (nextMintKey, nextTxHash = null) => {
      if (typeof window === "undefined" || !nextMintKey) return;

      const payload = {
        mintKey: nextMintKey,
        txHash: nextTxHash || null,
        pendingMetadataUri: pendingMetadataUri || null,
        savedAt: Date.now(),
      };

      console.log(LOG, "persisting local pending state", payload);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },
    [pendingMetadataUri]
  );

  const clearPendingState = useCallback(() => {
    if (typeof window === "undefined") return;
    console.log(LOG, "clearing local pending state");
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const callConfirmOnce = useCallback(async () => {
    if (!mintKey || !submittedTxHash) {
      throw new Error("Missing mint key or transaction hash");
    }

    const payload = {
      mintKey,
      txHash: submittedTxHash,
      creatorContract: creatorContract || "",
      chainId: targetChainId,
      totalPriceEth: totalMintPriceStr || "0",
      adminCutEth: adminCut > 0 ? adminCut.toFixed(8) : "0",
    };

    console.log(LOG, "calling confirm route", payload);

    const res = await fetch("/api/nft/create/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await readJsonSafe(res);

    console.log(LOG, "confirm route response", {
      ok: res.ok,
      status: res.status,
      data,
    });

    if (!res.ok) {
      throw new Error(data?.error || "Failed to confirm mint");
    }

    return data;
  }, [mintKey, submittedTxHash, creatorContract, targetChainId, totalMintPriceStr, adminCut]);

  const confirmNow = useCallback(async () => {
    if (!mintKey || !submittedTxHash || confirmResult?.success || confirmBusyRef.current) {
      return false;
    }

    confirmBusyRef.current = true;
    setConfirming(true);
    setConfirmError(null);
    setMintStep("confirming");
    setStep(4);

    try {
      const data = await callConfirmOnce();

      if (data?.success) {
        if (unmountedRef.current) return true;

        console.log(LOG, "confirmNow success", data);
        setConfirmResult(data);
        setConfirmError(null);
        setStep(5);
        setMintStep("done");
        clearPendingState();
        await refreshSession();
        return true;
      }

      console.log(LOG, "confirmNow still pending", data);
      return false;
    } catch (err) {
      console.error(LOG, "confirmNow failed", err);
      if (!unmountedRef.current) {
        setConfirmError(err?.message || "Failed to confirm mint");
      }
      return false;
    } finally {
      confirmBusyRef.current = false;
      if (!unmountedRef.current) {
        setConfirming(false);
      }
    }
  }, [
    mintKey,
    submittedTxHash,
    confirmResult,
    callConfirmOnce,
    clearPendingState,
    refreshSession,
  ]);

  const runConfirmLoop = useCallback(async () => {
    if (
      !mintKey ||
      !submittedTxHash ||
      confirmResult?.success ||
      confirmLoopActiveRef.current ||
      confirmBusyRef.current
    ) {
      return;
    }

    console.log(LOG, "starting backend confirm loop", { mintKey, submittedTxHash });

    confirmLoopActiveRef.current = true;
    setConfirming(true);
    setMintStep("confirming");
    setStep(4);

    try {
      const maxAttempts = 40;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (unmountedRef.current) return;

        console.log(LOG, `confirm loop attempt ${attempt}/${maxAttempts}`, {
          mintKey,
          submittedTxHash,
        });

        const confirmed = await confirmNow();
        if (confirmed) return;

        const waitMs = Math.min(1500 + attempt * 1200, 20000);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      console.warn(LOG, "confirm loop ended without confirmation");
      setConfirmError(
        "Mint is still syncing. Your pending mint and tx hash are saved, so you can retry below or reopen this page later."
      );
    } finally {
      confirmLoopActiveRef.current = false;
      if (!unmountedRef.current) {
        setConfirming(false);
      }
    }
  }, [mintKey, submittedTxHash, confirmResult, confirmNow]);

  const retryConfirmation = useCallback(async () => {
    console.log(LOG, "manual retry requested");
    setConfirmError(null);
    await runConfirmLoop();
  }, [runConfirmLoop]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed?.mintKey) return;

      console.log(LOG, "restoring local pending state", parsed);

      setMintKey(parsed.mintKey);
      if (parsed.txHash) setSubmittedTxHash(parsed.txHash);
      if (parsed.pendingMetadataUri) setPendingMetadataUri(parsed.pendingMetadataUri);
      setStep(4);
      setMintStep(parsed.txHash ? "waiting_receipt" : "saved_pending");
    } catch (err) {
      console.warn(LOG, "failed to restore local state", err);
    }
  }, []);

  useEffect(() => {
    if (!mintKey) return;
    persistPendingState(mintKey, submittedTxHash || null);
  }, [mintKey, submittedTxHash, persistPendingState]);

  useEffect(() => {
    receiptTriggeredForHashRef.current = null;
  }, [submittedTxHash]);

  useEffect(() => {
    if (sendError) {
      console.error(LOG, "wallet send error", sendError);
      setConfirmError(sendError.shortMessage || sendError.message || "Transaction failed");
    }
  }, [sendError]);

  useEffect(() => {
    if (watchedReceiptError) {
      console.error(LOG, "receipt watcher error", watchedReceiptError);
      setConfirmError(
        watchedReceiptError.shortMessage ||
          watchedReceiptError.message ||
          "Receipt watch failed"
      );
    }
  }, [watchedReceiptError]);

  useEffect(() => {
    if (!watchedReceipt) return;
    console.log(LOG, "wagmi receipt watcher found receipt", watchedReceipt);
  }, [watchedReceipt]);

  useEffect(() => {
    if (!mintKey || !submittedTxHash || !watchedReceipt || confirmResult?.success) return;

    const receiptKey = `${mintKey}:${submittedTxHash}`;
    if (receiptTriggeredForHashRef.current === receiptKey) return;

    console.log(LOG, "receipt watcher triggered immediate confirm", {
      mintKey,
      submittedTxHash,
      receiptKey,
    });

    receiptTriggeredForHashRef.current = receiptKey;
    void confirmNow();
  }, [mintKey, submittedTxHash, watchedReceipt, confirmResult, confirmNow]);

  useEffect(() => {
    if (!mintKey || !submittedTxHash || confirmResult?.success) return;

    const timeoutId = window.setTimeout(() => {
      console.log(LOG, "no instant confirm yet, starting fallback confirm loop");
      void runConfirmLoop();
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [mintKey, submittedTxHash, confirmResult, runConfirmLoop]);

  const handleCreateMint = useCallback(async () => {
    if (!isLoggedIn || !isFormValid) return;

    if (!hasUsableWallet || !isWagmiConnected) {
      setShowWalletModal(true);
      return;
    }

    if (chain?.id !== targetChainId) {
      console.log(LOG, "wrong chain, requesting switch", {
        current: chain?.id,
        target: targetChainId,
      });
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

    if (!hasEnoughBalance) {
      setConfirmError(
        `Insufficient balance. Mint costs ${totalMintPriceStr} ETH, your wallet has ${
          userBalanceEth !== null ? userBalanceEth.toFixed(8) : "unknown"
        } ETH.`
      );
      return;
    }

    if (royaltyNum > 30) {
      setConfirmError("Creator royalty cannot be more than 30%.");
      return;
    }

    console.log(LOG, "starting create mint flow", {
      effectiveWallet,
      creatorContract,
      targetChainId,
      onChainFeeEth,
      totalMintPriceStr,
      adminCut,
      royaltyNum,
      listingPrice,
      isLoggedIn,
      isWagmiConnected,
    });

    setStep(4);
    setConfirmResult(null);
    setConfirmError(null);
    setConfirming(false);
    setSubmittedTxHash(null);
    setMintKey(null);
    setPendingMetadataUri(null);
    setMintStep("saving_pending");

    let createdMintKey = null;
    let createdMetadataUri = null;

    try {
      const validAttrs = attributes.filter((a) => a.trait_type.trim() && a.value.trim());

      const form = new FormData();
      form.append("name", name.trim());
      form.append("description", description.trim());
      form.append("collection", collection.trim() || "User Created");
      form.append("externalUrl", externalUrl.trim());
      form.append("attributes", JSON.stringify(validAttrs));
      form.append("feeEth", onChainFeeEth || "0");
      form.append("totalPriceEth", totalMintPriceStr || "0");
      form.append("adminCutEth", adminCut > 0 ? adminCut.toFixed(8) : "0");
      form.append("listingPriceEth", listingPrice ? String(listingPrice) : "0");
      form.append("royaltyPercent", royaltyNum > 0 ? String(royaltyNum) : "0");
      form.append("creatorContract", creatorContract || "");
      form.append("chainId", String(targetChainId));
      form.append("walletAddress", effectiveWallet || "");

      if (imageFile) {
        form.append("imageFile", imageFile);
      }

      console.log(LOG, "saving pending NFT row before on-chain mint");

      const createRes = await fetch("/api/nft/create", {
        method: "POST",
        body: form,
      });

      const createData = await readJsonSafe(createRes);

      console.log(LOG, "create route response", {
        ok: createRes.ok,
        status: createRes.status,
        data: createData,
      });

      if (!createRes.ok) {
        throw new Error(createData?.error || "Failed to save pending NFT");
      }

      createdMintKey = createData.mintKey;
      createdMetadataUri = createData.metadataUri;

      setMintKey(createData.mintKey);
      setPendingMetadataUri(createData.metadataUri);
      persistPendingState(createData.mintKey, null);

      if (adminCut > 0 && walletClient && ADMIN_WALLET) {
        console.log(LOG, "sending separate admin cut tx", {
          adminCut,
          ADMIN_WALLET,
        });

        setMintStep("sending_cut");

        const cutHash = await walletClient.sendTransaction({
          to: ADMIN_WALLET,
          value: parseEther(adminCut.toFixed(18)),
          chain,
        });

        console.log(LOG, "admin cut tx sent", { cutHash });

        try {
          const viemMod = await import("viem");
          const chainsMod = await import("viem/chains");

          const client = viemMod.createPublicClient({
            chain: targetChainId === 8453 ? chainsMod.base : chainsMod.baseSepolia,
            transport: viemMod.http(undefined, { timeout: 10000 }),
          });

          await client.waitForTransactionReceipt({ hash: cutHash });
          console.log(LOG, "admin cut receipt found", { cutHash });
        } catch (err) {
          console.warn(LOG, "admin cut receipt wait failed, continuing main mint", err);
        }
      }

      setMintStep("minting");

      console.log(LOG, "submitting createNft tx", {
        creatorContract,
        metadataUri: createData.metadataUri,
        feeEth: onChainFeeEth,
        chainId: targetChainId,
      });

      const hash = await writeContractAsync({
        address: creatorContract,
        abi: AURORA_CREATOR_ABI,
        functionName: "createNft",
        args: [createData.metadataUri],
        value: parseEther(String(onChainFeeEth)),
        chainId: targetChainId,
      });

      console.log(LOG, "createNft tx submitted", { hash });

      setSubmittedTxHash(hash);
      setMintStep("waiting_receipt");
      persistPendingState(createData.mintKey, hash);

      try {
        console.log(LOG, "attaching tx hash immediately via confirm route");
        await fetch("/api/nft/create/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mintKey: createData.mintKey,
            txHash: hash,
            creatorContract: creatorContract || "",
            chainId: targetChainId,
            totalPriceEth: totalMintPriceStr || "0",
            adminCutEth: adminCut > 0 ? adminCut.toFixed(8) : "0",
          }),
        });
      } catch (err) {
        console.warn(LOG, "initial confirm attach call failed, watcher/loop will continue", err);
      }
    } catch (e) {
      console.error(LOG, "handleCreateMint failed", e);

      const message = e?.shortMessage || e?.message || "Mint failed";

      if (createdMintKey) {
        setConfirmError(
          `Pending NFT saved with key ${createdMintKey}, but mint is not fully complete yet. ${message}`
        );
        setMintKey(createdMintKey);
        setPendingMetadataUri(createdMetadataUri);
        setMintStep("saved_pending");
      } else {
        setConfirmError(message);
      }
    }
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
    hasEnoughBalance,
    totalMintPriceStr,
    userBalanceEth,
    royaltyNum,
    attributes,
    name,
    description,
    collection,
    externalUrl,
    listingPrice,
    onChainFeeEth,
    adminCut,
    imageFile,
    walletClient,
    ADMIN_WALLET,
    writeContractAsync,
    persistPendingState,
    effectiveWallet,
  ]);

  const resetAll = () => {
    console.log(LOG, "resetting create page state");
    resetWrite();
    setConfirmResult(null);
    setConfirmError(null);
    setConfirming(false);
    setStep(1);
    setMintStep("");
    setMintKey(null);
    setPendingMetadataUri(null);
    setSubmittedTxHash(null);

    setName("");
    setDescription("");
    setCollection("");
    setExternalUrl("");
    setListingPrice("");
    setRoyaltyPercent("");
    setAttributes([{ trait_type: "", value: "" }]);
    setImageFile(null);
    setImagePreview(null);

    clearPendingState();
  };

  let authState = "needs_login";
  if (isLoggedIn && !hasUsableWallet) authState = "needs_wallet";
  if (isLoggedIn && hasUsableWallet) authState = "ready";
  if (isLoggedIn && isWagmiConnected && isWrongChain) authState = "wrong_network";

  const handleLogin = () => {
    if (typeof window !== "undefined") window.location.href = "/login";
  };

  const titleText =
    mintStep === "saving_pending"
      ? "Saving pending mint..."
      : mintStep === "sending_cut"
        ? "Sending admin payment..."
        : mintStep === "minting"
          ? "Submitting mint transaction..."
          : mintStep === "waiting_receipt"
            ? "Waiting for on-chain receipt..."
            : mintStep === "saved_pending"
              ? "Pending NFT saved"
              : mintStep === "confirming"
                ? "Confirming on-chain receipt..."
                : "Processing mint...";

  const subtitleText =
    mintStep === "saving_pending"
      ? "Your image and metadata are being saved first."
      : mintStep === "sending_cut"
        ? "Sending the admin portion before contract mint."
        : mintStep === "minting"
          ? "Your wallet will ask you to approve the contract mint."
          : mintStep === "waiting_receipt"
            ? "Your tx hash is saved. The page is polling hard and will auto-confirm the moment the receipt is available."
            : mintStep === "saved_pending"
              ? "Your pending NFT is safely saved. Once a tx hash is attached, confirmation can continue."
              : mintStep === "confirming"
                ? "The page will keep retrying confirmation much longer, even after refresh."
                : "Processing...";

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
            Save the NFT first, mint it on-chain second, then keep retrying confirmation until it lands.
          </p>

          {creatorContract && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border-light bg-surface2/60 px-4 py-2 text-xs">
              <Shield size={13} className="text-success" />
              <span className="text-muted">Contract:</span>
              <a
                href={contractExplorerLink || "#"}
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
            <p className="mt-1 text-xs text-muted">The contract owner has paused minting.</p>
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
                        <p className="text-xs text-muted">PNG, JPG, GIF, WEBP, SVG — Max 4MB for DB storage</p>
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
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end p-5 pt-0">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => setStep(2)}
                      disabled={!isStep1Valid}
                    >
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
                          <Badge color="success" className="!text-[9px]">
                            Live
                          </Badge>
                        ) : (
                          <Badge color="warning" className="!text-[9px]">
                            Loading
                          </Badge>
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
                          <span className="font-mono text-muted-dim">Estimated by wallet</span>
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
                            <span
                              className={`font-mono ${
                                hasEnoughBalance ? "text-success" : "text-danger"
                              }`}
                            >
                              {userBalanceEth.toFixed(6)} ETH
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border border-accent/15 bg-accent/5 p-3 text-[11px] text-muted">
                        Creator royalty is hard-capped at <span className="font-semibold text-accent">30%</span>.
                      </div>

                      {isWagmiConnected && !hasEnoughBalance && totalMintPriceStr && (
                        <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-[11px] text-danger">
                          Insufficient balance. Mint costs {totalMintPriceStr} ETH, your wallet has{" "}
                          {userBalanceEth !== null ? userBalanceEth.toFixed(6) : "unknown"} ETH.
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
                              Add a name, description, price, royalties, and properties
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

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-text">NFT Price (ETH)</label>
                            <p className="text-[11px] text-muted">
                              Leave at 0 if not for sale yet.
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

                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-text">Creator Royalty (%)</label>
                            <p className="text-[11px] text-muted">Range: 0–30.</p>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="30"
                              value={royaltyPercent}
                              onChange={(e) => handleRoyaltyChange(e.target.value)}
                              placeholder="5"
                              className="w-full rounded-xl border border-border-light bg-surface2/60 px-4 py-3 text-sm text-text transition-colors placeholder:text-muted-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                            />
                          </div>
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
                        <Button
                          variant="primary"
                          size="lg"
                          onClick={() => setStep(3)}
                          disabled={!isStep2Valid}
                        >
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
                        The app saves a pending NFT first, then mints on-chain, then keeps retrying confirmation.
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
                          <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">
                            Description
                          </p>
                          <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                            {description}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">
                            Collection
                          </p>
                          <p className="text-sm">{collection || "User Created"}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">
                            Chain
                          </p>
                          <p className="font-mono text-sm">{chainName}</p>
                        </div>
                        {listingPrice && parseFloat(listingPrice) > 0 && (
                          <div>
                            <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">
                              NFT Price
                            </p>
                            <p className="font-mono text-sm text-accent">{listingPrice} ETH</p>
                          </div>
                        )}
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">
                            Creator Royalty
                          </p>
                          <p className="font-mono text-sm text-accent">{royaltyNum}%</p>
                        </div>
                      </div>

                      {attributes.filter((a) => a.trait_type && a.value).length > 0 && (
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-wider text-muted-dim">
                            Properties
                          </p>
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
                        <span
                          className={`font-mono text-xs ${
                            hasEnoughBalance ? "text-success" : "text-danger"
                          }`}
                        >
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
                        Insufficient balance. Mint costs {totalMintPriceStr} ETH, your wallet has{" "}
                        {userBalanceEth !== null ? userBalanceEth.toFixed(6) : "unknown"} ETH.
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
                      disabled={
                        !creatorContract ||
                        !isMintActive ||
                        !isPriceReady ||
                        !hasEnoughBalance ||
                        isSending ||
                        confirming
                      }
                    >
                      {isSending || confirming ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}
                      Save Pending + Mint — {totalMintPriceStr ? `${totalMintPriceStr} ETH` : "Loading..."}
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

              <h2 className="font-display text-xl font-semibold">{titleText}</h2>
              <p className="text-sm text-muted">{subtitleText}</p>

              {mintKey && (
                <div className="rounded-xl border border-border-light bg-surface2/40 p-3 text-left">
                  <p className="text-[11px] uppercase tracking-wider text-muted-dim">Mint Key</p>
                  <p className="mt-1 break-all font-mono text-xs text-accent">{mintKey}</p>
                </div>
              )}

              {pendingMetadataUri && (
                <div className="rounded-xl border border-border-light bg-surface2/40 p-3 text-left">
                  <p className="text-[11px] uppercase tracking-wider text-muted-dim">Metadata URI</p>
                  <p className="mt-1 break-all font-mono text-xs text-accent">{pendingMetadataUri}</p>
                </div>
              )}

              {submittedTxHash && (
                <div className="rounded-xl border border-border-light bg-surface2/40 p-3 text-left">
                  <p className="text-[11px] uppercase tracking-wider text-muted-dim">Transaction Hash</p>
                  <p className="mt-1 break-all font-mono text-xs text-accent">{submittedTxHash}</p>
                </div>
              )}

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

              {isWaiting && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs text-accent">
                  Wagmi is actively watching the receipt right now.
                </div>
              )}

              {confirmError && (
                <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-left">
                  <p className="break-all text-xs text-muted">{confirmError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" size="md" className="flex-1" onClick={() => setStep(2)}>
                  Edit
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={retryConfirmation}
                  disabled={!mintKey || !submittedTxHash || confirming}
                >
                  Retry confirmation
                </Button>
              </div>
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
                <h2 className="font-display text-2xl font-bold">NFT Mint Confirmed!</h2>
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
                  <span className="text-muted">Total Paid</span>
                  <span className="font-mono text-accent">
                    {confirmResult?.totalPriceEth || totalMintPriceStr || onChainFeeEth} ETH
                  </span>
                </div>
                {listingPrice && parseFloat(listingPrice) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">NFT Price</span>
                    <span className="font-mono text-accent">{listingPrice} ETH</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">Creator Royalty</span>
                  <span className="font-mono text-accent">
                    {confirmResult?.royaltyPercent != null
                      ? `${confirmResult.royaltyPercent}%`
                      : `${royaltyNum}%`}
                  </span>
                </div>
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
                  <Button variant="secondary" size="md">
                    View in Profile
                  </Button>
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