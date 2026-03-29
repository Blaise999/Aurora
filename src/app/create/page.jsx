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
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useReadContract,
  useBalance,
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
                ${
                  isActive
                    ? "border border-accent/30 bg-accent/15 text-accent shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                    : ""
                }
                ${
                  isDone
                    ? "border border-success/20 bg-success/10 text-success"
                    : ""
                }
                ${
                  !isActive && !isDone
                    ? "border border-border-light bg-surface2/50 text-muted-dim"
                    : ""
                }
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJsonSafe(res) {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { error: raw || "Invalid server response" };
  }
}

function normalizeText(value, maxLen = 0) {
  const text = String(value ?? "");
  const trimmed = text.trim();
  if (!maxLen || trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen).trim();
}

function parseListingPrice(value) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function buildAttributesPayload(attributes) {
  return attributes
    .map((a) => ({
      trait_type: normalizeText(a?.trait_type, 100),
      value: normalizeText(a?.value, 200),
    }))
    .filter((a) => a.trait_type && a.value);
}

function getErrorMessage(err, fallback = "Something went wrong") {
  if (!err) return fallback;

  if (typeof err === "string") return err;

  if (err instanceof Error) {
    return err.message || fallback;
  }

  if (typeof err === "object") {
    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }

    if (typeof err.error === "string" && err.error.trim()) {
      return err.error;
    }

    if (
      err.error &&
      typeof err.error === "object" &&
      typeof err.error.message === "string" &&
      err.error.message.trim()
    ) {
      return err.error.message;
    }

    try {
      return JSON.stringify(err, null, 2);
    } catch {
      return fallback;
    }
  }

  return String(err);
}

function CreatePageContent() {
  const { address: liveWalletAddress, isConnected: isWagmiConnected, chain } =
    useAccount();
  const { switchChain } = useSwitchChain();

  const {
    isLoggedIn,
    profile,
    loading: sessionLoading,
    linkedWallet,
  } = useSession();

  const targetChainId = getChainId();
  const chainName = targetChainId === 8453 ? "Base" : "Base Sepolia";
  const explorerUrl = getExplorerUrl();
  const creatorContract = getCreatorContractAddress();

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

  const onChainFeeEth =
    onChainFeeRaw != null ? formatEther(onChainFeeRaw) : null;
  const onChainFeeNum = parseFloat(onChainFeeEth || "0");

  const { data: balanceData } = useBalance({
    address: liveWalletAddress || undefined,
    chainId: targetChainId,
    query: { enabled: Boolean(liveWalletAddress && isWagmiConnected) },
  });

  const userBalanceEth = balanceData
    ? parseFloat(formatEther(balanceData.value))
    : null;

  const hasEnoughBalance = useMemo(() => {
    if (userBalanceEth === null || onChainFeeNum <= 0) return true;
    return userBalanceEth >= onChainFeeNum;
  }, [userBalanceEth, onChainFeeNum]);

  const isMintActive = mintActiveOnChain !== false;
  const isFeeReady = onChainFeeNum > 0;
  const mintFeeText =
    onChainFeeNum > 0
      ? onChainFeeNum.toFixed(8).replace(/\.?0+$/, "")
      : null;

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
  const [mintStage, setMintStage] = useState("");
  const [submittedTxHash, setSubmittedTxHash] = useState(null);
  const [metadataUri, setMetadataUri] = useState("");
  const [preparedAsset, setPreparedAsset] = useState(null);
  const [preparedForKey, setPreparedForKey] = useState("");
  const [finalResult, setFinalResult] = useState(null);
  const [pageError, setPageError] = useState(null);
  const [syncingToProfile, setSyncingToProfile] = useState(false);
  const [preparingMetadata, setPreparingMetadata] = useState(false);

  const finalizingRef = useRef(false);
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
    pollingInterval: 1000,
    timeout: 300000,
    query: { enabled: Boolean(submittedTxHash) },
  });

  const royaltyNum = useMemo(
    () => clampRoyalty(royaltyPercent),
    [royaltyPercent]
  );

  const listingPriceNum = useMemo(
    () => parseListingPrice(listingPrice),
    [listingPrice]
  );

  const cleanAttributes = useMemo(
    () => buildAttributesPayload(attributes),
    [attributes]
  );

  const txExplorerLink = submittedTxHash
    ? `${explorerUrl}/tx/${submittedTxHash}`
    : null;

  const contractExplorerLink = creatorContract
    ? `${explorerUrl}/address/${creatorContract}`
    : null;

  const effectiveWalletShort = effectiveWallet
    ? `${effectiveWallet.slice(0, 6)}...${effectiveWallet.slice(-4)}`
    : null;

  const prepareKey = useMemo(
    () =>
      JSON.stringify({
        name: normalizeText(name, 100),
        description: normalizeText(description, 1000),
        collection: normalizeText(collection, 100) || "User Created",
        externalUrl: normalizeText(externalUrl, 1000),
        attributes: cleanAttributes,
        imageFile: imageFile
          ? {
              name: imageFile.name,
              size: imageFile.size,
              type: imageFile.type,
              lastModified: imageFile.lastModified,
            }
          : null,
      }),
    [name, description, collection, externalUrl, cleanAttributes, imageFile]
  );

  const isPreparedFresh = Boolean(
    preparedAsset?.metadataUri && metadataUri && preparedForKey === prepareKey
  );

  const canPressMint =
    Boolean(creatorContract) &&
    isMintActive &&
    isFeeReady &&
    isPreparedFresh &&
    !preparingMetadata &&
    !isSending &&
    !syncingToProfile;

  const canSubmitMintTx =
    canPressMint &&
    hasUsableWallet &&
    isWagmiConnected &&
    !isWrongChain &&
    hasEnoughBalance;

  const clearPreparedState = useCallback(() => {
    setPreparedAsset(null);
    setPreparedForKey("");
    setMetadataUri("");
  }, []);

  const handleRoyaltyChange = (value) => {
    clearPreparedState();

    if (value === "") {
      setRoyaltyPercent("");
      return;
    }

    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return;
    setRoyaltyPercent(String(clampRoyalty(parsed)));
  };

  const handleListingPriceChange = (value) => {
    if (value === "") {
      setListingPrice("");
      return;
    }

    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setListingPrice(value);
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
      alert("File must be under 4MB");
      return;
    }

    clearPreparedState();
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e?.target?.result;
      setImagePreview(typeof result === "string" ? result : null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const addAttribute = () => {
    clearPreparedState();
    setAttributes((p) => [...p, { trait_type: "", value: "" }]);
  };

  const removeAttribute = (i) => {
    clearPreparedState();
    setAttributes((p) => p.filter((_, j) => j !== i));
  };

  const updateAttribute = (i, f, v) => {
    clearPreparedState();
    setAttributes((p) => p.map((a, j) => (j === i ? { ...a, [f]: v } : a)));
  };

  const isStep1Valid = Boolean(imageFile);
  const isStep2Valid = Boolean(normalizeText(name, 100));
  const isFormValid = isStep1Valid && isStep2Valid;

  const buildPrepareForm = useCallback(() => {
    const form = new FormData();
    form.append("name", normalizeText(name, 100));
    form.append("description", normalizeText(description, 1000));
    form.append("externalUrl", normalizeText(externalUrl, 1000));
    form.append("collection", normalizeText(collection, 100) || "User Created");
    form.append("attributes", JSON.stringify(cleanAttributes));

    if (imageFile) {
      form.append("imageFile", imageFile);
    }

    return form;
  }, [name, description, externalUrl, collection, cleanAttributes, imageFile]);

  const prepareMetadata = useCallback(async () => {
    if (!imageFile) {
      throw new Error("Please upload an image first.");
    }

    if (
      preparedAsset?.metadataUri &&
      metadataUri &&
      preparedForKey === prepareKey
    ) {
      return preparedAsset;
    }

    setPreparingMetadata(true);
    setPageError(null);

    try {
      const res = await fetch("/api/nft/ipfs/prepare", {
        method: "POST",
        body: buildPrepareForm(),
      });

      const data = await readJsonSafe(res);

      if (!res.ok || !data?.success || !data?.metadataUri) {
        throw new Error(
          getErrorMessage(
            data?.error || data?.message || data,
            "Failed to prepare NFT metadata."
          )
        );
      }

      const prepared = {
        metadataUri: String(data.metadataUri),
        imageUri: data.imageUri ? String(data.imageUri) : "",
        imageGatewayUrl: data.imageGatewayUrl
          ? String(data.imageGatewayUrl)
          : "",
        metadataGatewayUrl: data.metadataGatewayUrl
          ? String(data.metadataGatewayUrl)
          : "",
      };

      if (unmountedRef.current) return prepared;

      setPreparedAsset(prepared);
      setMetadataUri(prepared.metadataUri);
      setPreparedForKey(prepareKey);

      return prepared;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Failed to prepare NFT metadata."));
    } finally {
      if (!unmountedRef.current) {
        setPreparingMetadata(false);
      }
    }
  }, [
    imageFile,
    preparedAsset,
    metadataUri,
    preparedForKey,
    prepareKey,
    buildPrepareForm,
  ]);

  const buildFinalizeForm = useCallback(
    (hashArg, metadataUriArg = metadataUri) => {
      const form = new FormData();

      form.append("txHash", hashArg);
      form.append("metadataUri", metadataUriArg || "");
      form.append("creatorContract", creatorContract || "");
      form.append("chainId", String(targetChainId));
      form.append("walletAddress", effectiveWallet || "");
      form.append("name", normalizeText(name, 100));
      form.append("description", normalizeText(description, 1000));
      form.append(
        "collection",
        normalizeText(collection, 100) || "User Created"
      );
      form.append("externalUrl", normalizeText(externalUrl, 1000));
      form.append("listingPriceEth", String(listingPriceNum));
      form.append("royaltyPercent", royaltyNum > 0 ? String(royaltyNum) : "0");
      form.append("feeEth", onChainFeeEth || "0");
      form.append("attributes", JSON.stringify(cleanAttributes));
      form.append("ipfsImageUri", preparedAsset?.imageUri || "");
      form.append("ipfsImageUrl", preparedAsset?.imageGatewayUrl || "");
      form.append("ipfsMetadataUrl", preparedAsset?.metadataGatewayUrl || "");

      return form;
    },
    [
      metadataUri,
      creatorContract,
      targetChainId,
      effectiveWallet,
      name,
      description,
      collection,
      externalUrl,
      listingPriceNum,
      royaltyNum,
      onChainFeeEth,
      cleanAttributes,
      preparedAsset,
    ]
  );

  const finalizeMint = useCallback(
    async (hashArg = submittedTxHash, metadataUriArg = metadataUri) => {
      if (
        !hashArg ||
        !metadataUriArg ||
        finalResult?.success ||
        finalizingRef.current
      ) {
        return false;
      }

      finalizingRef.current = true;
      setSyncingToProfile(true);
      setPageError(null);
      setMintStage("syncing");
      setStep(4);

      try {
        let lastMessage = "Failed to save minted NFT.";

        for (let attempt = 1; attempt <= 4; attempt++) {
          const res = await fetch("/api/nft/create", {
            method: "POST",
            body: buildFinalizeForm(hashArg, metadataUriArg),
          });

          const data = await readJsonSafe(res);

          if (res.ok && data?.success) {
            if (unmountedRef.current) return true;

            setFinalResult(data);
            setPageError(null);
            setStep(5);
            setMintStage("done");
            return true;
          }

          lastMessage =
            data?.error ||
            data?.message ||
            `Finalize failed with status ${res.status}`;

          if (res.status >= 400 && res.status < 500 && res.status !== 409) {
            break;
          }

          if (attempt < 4) {
            await sleep(Math.min(1500 * attempt, 5000));
          }
        }

        throw new Error(lastMessage);
      } catch (err) {
        console.error(LOG, "finalizeMint failed", err);
        if (!unmountedRef.current) {
          setPageError(
            getErrorMessage(
              err,
              "Mint went through, but syncing to the app failed. Retry below."
            )
          );
          setMintStage("sync_failed");
        }
        return false;
      } finally {
        finalizingRef.current = false;
        if (!unmountedRef.current) {
          setSyncingToProfile(false);
        }
      }
    },
    [submittedTxHash, metadataUri, finalResult, buildFinalizeForm]
  );

  const handleGoToReview = useCallback(() => {
    if (!isStep2Valid) return;

    setPageError(null);
    setStep(3);

    if (!isPreparedFresh && !preparingMetadata) {
      void prepareMetadata().catch((err) => {
        console.error(LOG, "review metadata prepare failed", err);
        if (!unmountedRef.current) {
          setPageError(
            getErrorMessage(err, "Failed to prepare metadata. Please retry.")
          );
        }
      });
    }
  }, [isStep2Valid, isPreparedFresh, preparingMetadata, prepareMetadata]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (sendError) {
      console.error(LOG, "wallet send error", sendError);
      setPageError(getErrorMessage(sendError, "Transaction failed"));
      setMintStage("failed");
    }
  }, [sendError]);

  useEffect(() => {
    if (watchedReceiptError) {
      console.error(LOG, "receipt watcher error", watchedReceiptError);
      setPageError(
        getErrorMessage(
          watchedReceiptError,
          "Still checking chain confirmation."
        )
      );
    }
  }, [watchedReceiptError]);

  useEffect(() => {
    if (
      !watchedReceipt ||
      !submittedTxHash ||
      !metadataUri ||
      finalResult?.success
    ) {
      return;
    }
    void finalizeMint(submittedTxHash, metadataUri);
  }, [watchedReceipt, submittedTxHash, metadataUri, finalResult, finalizeMint]);

  const handleCreateMint = useCallback(async () => {
    if (!isLoggedIn || !isFormValid) {
      setPageError("Complete the NFT details first.");
      return;
    }

    if (!creatorContract) {
      setPageError("Creator contract not configured.");
      return;
    }

    if (!isMintActive) {
      setPageError("Minting is currently paused.");
      return;
    }

    if (!isPreparedFresh) {
      setPageError("Still preparing metadata. Please wait a moment.");
      return;
    }

    if (!hasUsableWallet || !isWagmiConnected) {
      setPageError(null);
      setShowWalletModal(true);
      return;
    }

    if (chain?.id !== targetChainId) {
      setPageError(null);
      switchChain({ chainId: targetChainId });
      return;
    }

    if (!isFeeReady || !onChainFeeEth) {
      setPageError("Mint fee is still loading. Please try again.");
      return;
    }

    if (!hasEnoughBalance) {
      setPageError(
        `Insufficient balance. Mint fee is ${mintFeeText} ETH, your wallet has ${
          userBalanceEth !== null ? userBalanceEth.toFixed(8) : "unknown"
        } ETH.`
      );
      return;
    }

    if (royaltyNum > 30) {
      setPageError("Creator royalty cannot be more than 30%.");
      return;
    }

    const cleanName = normalizeText(name, 100);

    if (!cleanName) {
      setPageError("NFT name is required.");
      return;
    }

    setStep(4);
    setFinalResult(null);
    setPageError(null);
    setSubmittedTxHash(null);

    try {
      const prepared = preparedAsset;

      if (!prepared?.metadataUri) {
        throw new Error("Metadata is not ready yet.");
      }

      setMintStage("awaiting_wallet");

      const hash = await writeContractAsync({
        address: creatorContract,
        abi: AURORA_CREATOR_ABI,
        functionName: "createNft",
        args: [prepared.metadataUri],
        value: parseEther(String(onChainFeeEth)),
        chainId: targetChainId,
      });

      setSubmittedTxHash(hash);
      setMetadataUri(prepared.metadataUri);
      setMintStage("waiting_receipt");
    } catch (e) {
      console.error(LOG, "handleCreateMint failed", e);
      setPageError(getErrorMessage(e, "Mint failed"));
      setMintStage("failed");
      setStep(3);
    }
  }, [
    isLoggedIn,
    isFormValid,
    creatorContract,
    isMintActive,
    isPreparedFresh,
    hasUsableWallet,
    isWagmiConnected,
    chain,
    targetChainId,
    switchChain,
    isFeeReady,
    onChainFeeEth,
    hasEnoughBalance,
    mintFeeText,
    userBalanceEth,
    royaltyNum,
    name,
    preparedAsset,
    writeContractAsync,
  ]);

  const resetAll = () => {
    resetWrite();
    setFinalResult(null);
    setPageError(null);
    setStep(1);
    setMintStage("");
    setSubmittedTxHash(null);
    setMetadataUri("");
    setPreparedAsset(null);
    setPreparedForKey("");
    setSyncingToProfile(false);
    setPreparingMetadata(false);

    setName("");
    setDescription("");
    setCollection("");
    setExternalUrl("");
    setListingPrice("");
    setRoyaltyPercent("");
    setAttributes([{ trait_type: "", value: "" }]);
    setImageFile(null);
    setImagePreview(null);
  };

  let authState = "needs_login";
  if (isLoggedIn && !hasUsableWallet) authState = "needs_wallet";
  if (isLoggedIn && hasUsableWallet) authState = "ready";
  if (isLoggedIn && isWagmiConnected && isWrongChain)
    authState = "wrong_network";

  const handleLogin = () => {
    if (typeof window !== "undefined") window.location.href = "/login";
  };

  const titleText =
    mintStage === "preparing_metadata"
      ? "Reviewing..."
      : mintStage === "awaiting_wallet"
      ? "Confirm mint in wallet..."
      : mintStage === "waiting_receipt"
      ? "Waiting for on-chain confirmation..."
      : mintStage === "syncing"
      ? "Saving NFT into Aurora..."
      : mintStage === "sync_failed"
      ? "Minted, but app sync needs retry"
      : "Processing mint...";

  const subtitleText =
    mintStage === "preparing_metadata"
      ? "Getting everything ready before wallet confirmation."
      : mintStage === "awaiting_wallet"
      ? "Approve the mint transaction in your wallet."
      : mintStage === "waiting_receipt"
      ? "Your transaction is submitted. Waiting for confirmation on-chain."
      : mintStage === "syncing"
      ? "Saving to your Aurora profile and admin records."
      : mintStage === "sync_failed"
      ? "The chain transaction may be fine, but the app could not finish syncing it. Retry below using the same tx hash."
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
            Upload, review, and mint instantly.
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
                <span className="ml-2 text-muted">
                  | {String(totalMintedOnChain)} minted
                </span>
              )}
            </div>
          )}
        </div>

        {!creatorContract && authState === "ready" && (
          <div className="mx-auto mb-8 max-w-lg rounded-xl border border-warning/20 bg-warning/10 p-5">
            <p className="text-sm font-medium text-warning">
              Contract Not Deployed
            </p>
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
              <h2 className="font-display text-xl font-semibold">
                Sign In Required
              </h2>
              <p className="text-sm text-muted">
                Log in or sign up to start creating NFTs.
              </p>
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
              <h2 className="font-display text-xl font-semibold">
                Connect Wallet
              </h2>
              <p className="text-sm text-muted">
                Connect your wallet to mint NFTs on-chain.
              </p>
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
              <h2 className="font-display text-xl font-semibold text-warning">
                Wrong Network
              </h2>
              <p className="text-sm text-muted">
                Switch to {chainName} to continue.
              </p>
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
            <StepIndicator
              current={step}
              steps={["Upload Art", "Add Details", "Review & Mint"]}
            />

            {step === 1 && (
              <div className="mx-auto max-w-2xl">
                <div className="glass-card rounded-card overflow-hidden">
                  <div className="border-b border-border-light p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/10">
                        <ImagePlus size={20} className="text-accent-violet" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-semibold">
                          Upload Your Artwork
                        </h3>
                        <p className="text-xs text-muted">
                          PNG, JPG, GIF, WEBP, SVG — Max 4MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    {imagePreview ? (
                      <div className="relative overflow-hidden rounded-xl border border-border-light">
                        <div className="relative mx-auto aspect-square max-h-[400px]">
                          <Image
                            src={imagePreview}
                            alt="Preview"
                            fill
                            className="object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            clearPreparedState();
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
                          <p className="text-sm text-muted">
                            Recommended: 1000×1000px or higher
                          </p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) =>
                            handleFileSelect(e.target.files?.[0] || null)
                          }
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
                          <Image
                            src={imagePreview}
                            alt="Preview"
                            fill
                            className="object-contain"
                          />
                        </div>
                        <div className="border-t border-border-light p-3">
                          <p className="truncate text-xs text-muted">
                            {imageFile?.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              clearPreparedState();
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
                        <span className="font-display text-sm font-semibold">
                          Pricing
                        </span>
                        {isFeeReady ? (
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
                            {mintFeeText ? `${mintFeeText} ETH` : "Loading..."}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted">Set NFT Price</span>
                          <span className="font-mono text-text">
                            {listingPriceNum > 0
                              ? `${listingPriceNum} ETH`
                              : "Not listed yet"}
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
                        Creator royalty is hard-capped at{" "}
                        <span className="font-semibold text-accent">30%</span>.
                      </div>

                      {isWagmiConnected && !hasEnoughBalance && mintFeeText && (
                        <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-[11px] text-danger">
                          Insufficient balance. Mint fee is {mintFeeText} ETH,
                          your wallet has{" "}
                          {userBalanceEth !== null
                            ? userBalanceEth.toFixed(6)
                            : "unknown"}{" "}
                          ETH.
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
                            <h3 className="font-display text-sm font-semibold">
                              NFT Details
                            </h3>
                            <p className="text-[11px] text-muted">
                              Add a name, description, price, royalties, and
                              properties
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
                            onChange={(e) => {
                              clearPreparedState();
                              setName(e.target.value);
                            }}
                            placeholder="e.g. Cosmic Dreamer #1"
                            className="w-full rounded-xl border border-border-light bg-surface2/60 px-4 py-3 text-sm text-text transition-colors placeholder:text-muted-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                            maxLength={100}
                          />
                          <p className="text-right text-[11px] text-muted-dim">
                            {name.length}/100
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-text">
                            Description
                          </label>
                          <textarea
                            value={description}
                            onChange={(e) => {
                              clearPreparedState();
                              setDescription(e.target.value);
                            }}
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
                            <label className="block text-sm font-medium text-text">
                              Collection
                            </label>
                            <input
                              type="text"
                              value={collection}
                              onChange={(e) => {
                                clearPreparedState();
                                setCollection(e.target.value);
                              }}
                              placeholder="e.g. My Art Series"
                              className="w-full rounded-xl border border-border-light bg-surface2/60 px-4 py-3 text-sm text-text transition-colors placeholder:text-muted-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                              maxLength={100}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-text">
                              External URL
                            </label>
                            <input
                              type="url"
                              value={externalUrl}
                              onChange={(e) => {
                                clearPreparedState();
                                setExternalUrl(e.target.value);
                              }}
                              placeholder="https://..."
                              className="w-full rounded-xl border border-border-light bg-surface2/60 px-4 py-3 text-sm text-text transition-colors placeholder:text-muted-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                              maxLength={1000}
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-text">
                              NFT Price (ETH)
                            </label>
                            <p className="text-[11px] text-muted">
                              Leave at 0 if not for sale yet.
                            </p>
                            <input
                              type="number"
                              step="0.0001"
                              min="0"
                              value={listingPrice}
                              onChange={(e) =>
                                handleListingPriceChange(e.target.value)
                              }
                              placeholder="0.01"
                              className="w-full rounded-xl border border-border-light bg-surface2/60 px-4 py-3 text-sm text-text transition-colors placeholder:text-muted-dim focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-text">
                              Creator Royalty (%)
                            </label>
                            <p className="text-[11px] text-muted">
                              Range: 0–30.
                            </p>
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
                            <label className="block text-sm font-medium text-text">
                              Properties
                            </label>
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
                                  onChange={(e) =>
                                    updateAttribute(
                                      idx,
                                      "trait_type",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Trait (e.g. Color)"
                                  className="flex-1 rounded-lg border border-border-light bg-surface2/60 px-3 py-2.5 text-sm text-text placeholder:text-muted-dim focus:border-accent/50 focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={attr.value}
                                  onChange={(e) =>
                                    updateAttribute(idx, "value", e.target.value)
                                  }
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
                        <Button
                          variant="ghost"
                          size="md"
                          onClick={() => setStep(1)}
                        >
                          <ArrowLeft size={14} /> Back
                        </Button>
                        <Button
                          variant="primary"
                          size="lg"
                          onClick={handleGoToReview}
                          disabled={!isStep2Valid || preparingMetadata}
                        >
                          {preparingMetadata ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Eye size={16} />
                          )}
                          {preparingMetadata ? "Reviewing..." : "Review"}
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
                      <h2 className="font-display text-xl font-semibold">
                        Review Your NFT
                      </h2>
                      <p className="text-xs text-muted">
                        Review your NFT, then continue to mint.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-5">
                    <div className="sm:col-span-2">
                      {imagePreview && (
                        <div className="overflow-hidden rounded-xl border border-border-light">
                          <div className="relative aspect-square">
                            <Image
                              src={imagePreview}
                              alt="Preview"
                              fill
                              className="object-contain"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 sm:col-span-3">
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">
                          Name
                        </p>
                        <p className="font-display text-lg font-semibold">
                          {normalizeText(name, 100)}
                        </p>
                      </div>

                      {normalizeText(description, 1000) && (
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">
                            Description
                          </p>
                          <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                            {normalizeText(description, 1000)}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">
                            Collection
                          </p>
                          <p className="text-sm">
                            {normalizeText(collection, 100) || "User Created"}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">
                            Chain
                          </p>
                          <p className="font-mono text-sm">{chainName}</p>
                        </div>
                        {listingPriceNum > 0 && (
                          <div>
                            <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">
                              NFT Price
                            </p>
                            <p className="font-mono text-sm text-accent">
                              {listingPriceNum} ETH
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wider text-muted-dim">
                            Creator Royalty
                          </p>
                          <p className="font-mono text-sm text-accent">
                            {royaltyNum}%
                          </p>
                        </div>
                      </div>

                      {cleanAttributes.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-wider text-muted-dim">
                            Properties
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {cleanAttributes.map((a, i) => (
                              <span
                                key={i}
                                className="rounded-lg border border-accent/10 bg-accent/5 px-3 py-1 text-xs"
                              >
                                <span className="text-accent">
                                  {a.trait_type}:
                                </span>{" "}
                                {a.value}
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
                          ? `${creatorContract.slice(
                              0,
                              6
                            )}...${creatorContract.slice(-4)}`
                          : "Not set"}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Function</span>
                      <span className="font-mono text-xs">
                        createNft(metadataURI)
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Wallet</span>
                      <span className="font-mono text-xs">
                        {effectiveWalletShort || "Not connected"}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Mint Fee</span>
                      <span className="font-mono text-lg font-semibold text-accent">
                        {mintFeeText ? `${mintFeeText} ETH` : "Loading..."}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Gas Fee</span>
                      <span className="font-mono text-xs text-muted-dim">
                        Estimated by wallet
                      </span>
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

                  <div
                    className={`mt-4 rounded-xl border p-4 ${
                      preparingMetadata
                        ? "border-accent/20 bg-accent/5"
                        : canSubmitMintTx
                        ? "border-success/20 bg-success/10"
                        : "border-warning/20 bg-warning/10"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {preparingMetadata ? (
                        <Loader2
                          size={16}
                          className="mt-0.5 animate-spin text-accent"
                        />
                      ) : canSubmitMintTx ? (
                        <CheckCircle2
                          size={16}
                          className="mt-0.5 text-success"
                        />
                      ) : (
                        <AlertTriangle
                          size={16}
                          className="mt-0.5 text-warning"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text">
                          {preparingMetadata
                            ? "Reviewing metadata..."
                            : !isWagmiConnected
                            ? "Connect wallet to continue"
                            : isWrongChain
                            ? `Switch to ${chainName}`
                            : !hasEnoughBalance
                            ? "Insufficient balance"
                            : canSubmitMintTx
                            ? "Ready to mint"
                            : "Almost ready"}
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          {preparingMetadata
                            ? "Getting everything ready before wallet confirmation."
                            : !isWagmiConnected
                            ? "Click mint and connect your wallet."
                            : isWrongChain
                            ? `Click mint and switch your wallet to ${chainName}.`
                            : !hasEnoughBalance
                            ? "Add enough ETH to cover the mint fee."
                            : canSubmitMintTx
                            ? "Everything is ready for mint."
                            : "Complete the remaining step to continue."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {pageError && (
                    <div className="mt-4 rounded-xl border border-danger/20 bg-danger/10 p-4">
                      <p className="text-sm font-medium text-danger">Error</p>
                      <p className="mt-1 break-all text-xs text-muted">
                        {pageError}
                      </p>
                    </div>
                  )}

                  {!isFeeReady && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/10 p-4">
                      <AlertTriangle
                        size={15}
                        className="mt-0.5 text-warning"
                      />
                      <p className="text-xs text-warning">
                        Mint fee is still loading. Minting stays disabled until
                        it loads.
                      </p>
                    </div>
                  )}

                  {isWagmiConnected && !hasEnoughBalance && mintFeeText && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/10 p-4">
                      <AlertTriangle
                        size={15}
                        className="mt-0.5 text-danger"
                      />
                      <p className="text-xs text-danger">
                        Insufficient balance. Mint fee is {mintFeeText} ETH,
                        your wallet has{" "}
                        {userBalanceEth !== null
                          ? userBalanceEth.toFixed(6)
                          : "unknown"}{" "}
                        ETH.
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
                        setPageError(null);
                      }}
                    >
                      <ArrowLeft size={14} /> Back
                    </Button>

                    <Button
                      variant="primary"
                      size="lg"
                      className="flex-1"
                      onClick={handleCreateMint}
                      disabled={!canPressMint}
                    >
                      {preparingMetadata || isSending || syncingToProfile ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}

                      {preparingMetadata
                        ? "Reviewing..."
                        : !isWagmiConnected
                        ? "Connect Wallet"
                        : isWrongChain
                        ? `Switch to ${chainName}`
                        : isSending
                        ? "Opening Wallet..."
                        : syncingToProfile
                        ? "Saving NFT..."
                        : `Mint NFT — ${
                            mintFeeText ? `${mintFeeText} ETH` : "Loading..."
                          }`}
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

              {submittedTxHash && (
                <div className="rounded-xl border border-border-light bg-surface2/40 p-3 text-left">
                  <p className="text-[11px] uppercase tracking-wider text-muted-dim">
                    Transaction Hash
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-accent">
                    {submittedTxHash}
                  </p>
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
                  Watching the transaction receipt on-chain right now.
                </div>
              )}

              {watchedReceipt && !finalResult?.success && (
                <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-xs text-success">
                  On-chain receipt found. Finalizing your NFT record...
                </div>
              )}

              {pageError && (
                <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-left">
                  <p className="break-all text-xs text-muted">{pageError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    if (submittedTxHash) {
                      resetAll();
                    } else {
                      setStep(3);
                    }
                  }}
                >
                  {submittedTxHash ? "Reset" : "Back"}
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => finalizeMint()}
                  disabled={!metadataUri || !submittedTxHash || syncingToProfile}
                >
                  {syncingToProfile ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Retry sync"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 5 && finalResult?.success && (
          <div className="mx-auto max-w-lg">
            <div className="glass-card rounded-card space-y-6 p-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
                <Check size={40} className="text-success" />
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold">
                  NFT Mint Confirmed!
                </h2>
                <p className="mt-2 text-sm text-muted">
                  <strong>&quot;{normalizeText(name, 100)}&quot;</strong> is now
                  a real ERC-721 token
                  {finalResult?.tokenId && <> — Token #{finalResult.tokenId}</>}.
                </p>
              </div>

              {imagePreview && (
                <div className="mx-auto max-w-[200px] overflow-hidden rounded-xl border border-border-light">
                  <div className="relative aspect-square">
                    <Image
                      src={imagePreview}
                      alt={normalizeText(name, 100)}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 rounded-xl bg-surface2/40 p-4 text-left text-sm">
                {finalResult?.tokenId && (
                  <div className="flex justify-between">
                    <span className="text-muted">Token ID</span>
                    <span className="font-mono font-medium">
                      #{finalResult.tokenId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">Contract</span>
                  <span className="font-mono text-xs text-accent">
                    {creatorContract?.slice(0, 6)}...
                    {creatorContract?.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Mint Fee</span>
                  <span className="font-mono text-accent">
                    {finalResult?.mintFeeEth || mintFeeText || onChainFeeEth} ETH
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">NFT Price</span>
                  <span className="font-mono text-accent">
                    {Number(finalResult?.listingPriceEth || listingPriceNum) > 0
                      ? `${finalResult?.listingPriceEth || listingPriceNum} ETH`
                      : "Not listed yet"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Creator Royalty</span>
                  <span className="font-mono text-accent">
                    {finalResult?.royaltyPercent != null
                      ? `${finalResult.royaltyPercent}%`
                      : `${royaltyNum}%`}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {txExplorerLink && (
                  <a
                    href={txExplorerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="secondary" size="md">
                      <ExternalLink size={14} /> View Transaction
                    </Button>
                  </a>
                )}

                <Button variant="primary" size="md" onClick={resetAll}>
                  Mint Another NFT
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-accent" />
          <p className="mt-3 text-sm text-muted">Loading create page...</p>
        </div>
      }
    >
      <CreatePageContent />
    </Suspense>
  );
}