"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
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
  Wallet, AlertTriangle, Check, Loader2, User, Upload, X,
  Sparkles, ImagePlus, FileText, Layers, Plus, Trash2,
  ExternalLink, Shield, Zap, Globe, Info, ArrowLeft, ArrowRight,
  CheckCircle2, Image as ImageIcon, PenLine, Eye,
} from "lucide-react";
import WalletConnectModal from "@/components/WalletConnectModal";

/* ── Step indicator ── */
function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {steps.map((s, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <div key={i} className="flex items-center gap-1 sm:gap-2">
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300
              ${isActive ? "bg-accent/15 text-accent border border-accent/30 shadow-[0_0_12px_rgba(34,211,238,0.12)]" : ""}
              ${isDone ? "bg-success/10 text-success border border-success/20" : ""}
              ${!isActive && !isDone ? "bg-surface2/50 text-muted-dim border border-border-light" : ""}
            `}>
              {isDone ? <CheckCircle2 size={13} /> : <span className="w-4 text-center">{stepNum}</span>}
              <span className="hidden sm:inline">{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-6 sm:w-10 h-px transition-colors duration-300 ${isDone ? "bg-success/40" : "bg-border-light"}`} />
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
  const { connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const { isLoggedIn, profile, loading: sessionLoading, linkedWallet, hasLinkedWallet, refreshSession } = useSession();

  const targetChainId = getChainId();
  const chainName = targetChainId === 8453 ? "Base" : "Base Sepolia";
  const explorerUrl = getExplorerUrl();
  const creatorContract = getCreatorContractAddress();

  const liveWallet = liveWalletAddress ? String(liveWalletAddress).toLowerCase() : null;
  const savedWallet = linkedWallet ? String(linkedWallet).toLowerCase() : profile?.wallet_address ? String(profile.wallet_address).toLowerCase() : null;
  const effectiveWallet = liveWallet || savedWallet || null;
  const hasUsableWallet = Boolean(effectiveWallet);
  const isWrongChain = isWagmiConnected && chain?.id !== targetChainId;

  // Read on-chain fee from contract
  const { data: onChainFeeRaw } = useReadContract({
    address: creatorContract || undefined, abi: AURORA_CREATOR_ABI,
    functionName: "mintFee", chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });
  const { data: mintActiveOnChain } = useReadContract({
    address: creatorContract || undefined, abi: AURORA_CREATOR_ABI,
    functionName: "mintActive", chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });
  const { data: totalMintedOnChain } = useReadContract({
    address: creatorContract || undefined, abi: AURORA_CREATOR_ABI,
    functionName: "totalMinted", chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });

  const onChainFee = onChainFeeRaw ? formatEther(onChainFeeRaw) : null;
  const createMintFee = onChainFee || settings?.create_mint_fee || "0.005";
  const isMintActive = mintActiveOnChain !== false;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [collection, setCollection] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [attributes, setAttributes] = useState([{ trait_type: "", value: "" }]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // TX state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState(1); // 1=Upload, 2=Details, 3=Review, 4=Minting, 5=Success

  const { writeContract, data: txHash, isPending: isSending, error: sendError, reset: resetWrite } = useWriteContract();
  const { isLoading: isWaiting, isSuccess: isConfirmedOnChain } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: Boolean(txHash) } });

  const handleFileSelect = (file) => {
    if (!file) return;
    const allowed = ["image/png","image/jpeg","image/gif","image/webp","image/svg+xml"];
    if (!allowed.includes(file.type)) { alert("Please upload PNG, JPG, GIF, WEBP, or SVG"); return; }
    if (file.size > 10 * 1024 * 1024) { alert("File must be under 10MB"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };
  const handleDrop = (e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]); };
  const addAttribute = () => setAttributes((p) => [...p, { trait_type: "", value: "" }]);
  const removeAttribute = (i) => setAttributes((p) => p.filter((_, j) => j !== i));
  const updateAttribute = (i, f, v) => setAttributes((p) => p.map((a, j) => j === i ? { ...a, [f]: v } : a));

  const isStep1Valid = Boolean(imageFile);
  const isStep2Valid = Boolean(name.trim());
  const isFormValid = isStep1Valid && isStep2Valid;

  // Call AuroraCreator.createNft on-chain
  const handleCreateMint = useCallback(() => {
    if (!isLoggedIn || !isFormValid) return;
    if (!hasUsableWallet || !isWagmiConnected) { setShowWalletModal(true); return; }
    if (chain?.id !== targetChainId) { switchChain({ chainId: targetChainId }); return; }
    if (!creatorContract) { setConfirmError("Creator contract not configured. Set NEXT_PUBLIC_CREATOR_CONTRACT."); return; }

    setStep(4); setConfirmResult(null); setConfirmError(null);
    const metadataURI = `${window.location.origin}/api/nft/token-metadata?pending=1`;

    writeContract({
      address: creatorContract,
      abi: AURORA_CREATOR_ABI,
      functionName: "createNft",
      args: [metadataURI],
      value: parseEther(String(createMintFee)),
      chainId: targetChainId,
    });
  }, [isLoggedIn, isFormValid, hasUsableWallet, isWagmiConnected, chain?.id, targetChainId, switchChain, creatorContract, createMintFee, writeContract]);

  // After on-chain confirms, save metadata to DB
  useEffect(() => {
    if (!isConfirmedOnChain || !txHash || confirming || confirmResult) return;
    const finalize = async () => {
      setConfirming(true);
      try {
        let imageBase64 = null;
        if (imageFile) { imageBase64 = await new Promise((r) => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(imageFile); }); }
        const validAttrs = attributes.filter((a) => a.trait_type.trim() && a.value.trim());
        const res = await fetch("/api/nft/create", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txHash, name: name.trim(), description: description.trim(), collection: collection.trim() || "User Created", externalUrl: externalUrl.trim(), attributes: validAttrs, imageBase64, imageFileName: imageFile?.name || "nft-image", imageType: imageFile?.type || "image/png", fee: createMintFee, creatorContract }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Create failed");
        setConfirmResult(data);
        setStep(5);
        refreshSession();
      } catch (e) { setConfirmError(e?.message || "Failed to finalize"); setStep(4); }
      finally { setConfirming(false); }
    };
    finalize();
  }, [isConfirmedOnChain, txHash, confirming, confirmResult]);

  useEffect(() => { if (sendError) { setConfirmError(sendError.shortMessage || sendError.message || "Transaction failed"); setStep(3); } }, [sendError]);

  const resetAll = () => { resetWrite(); setConfirmResult(null); setConfirmError(null); setStep(1); setName(""); setDescription(""); setCollection(""); setExternalUrl(""); setAttributes([{ trait_type: "", value: "" }]); setImageFile(null); setImagePreview(null); };

  const txExplorerLink = txHash ? `${explorerUrl}/tx/${txHash}` : null;
  const contractExplorerLink = creatorContract ? `${explorerUrl}/address/${creatorContract}` : null;
  const effectiveWalletShort = effectiveWallet ? `${effectiveWallet.slice(0,6)}...${effectiveWallet.slice(-4)}` : null;

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

  const handleLogin = () => { if (typeof window !== "undefined") window.location.href = "/login"; };

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-violet/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/3 rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <nav className="flex items-center gap-2 text-xs text-muted-dim mb-6">
          <Link href="/" className="hover:text-accent transition-colors">Home</Link>
          <span>/</span><span className="text-text">Create NFT</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-accent-violet/10 border border-accent-violet/20 mb-4">
            <Sparkles size={14} className="text-accent-violet" />
            <span className="text-xs font-display font-semibold text-accent-violet uppercase tracking-wider">On-Chain Creator</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl mb-3">
            Mint Your <span className="text-gradient">Own NFT</span>
          </h1>
          <p className="text-muted text-base sm:text-lg max-w-2xl mx-auto">
            Upload artwork, add metadata, and mint a real ERC-721 NFT on {chainName}.
          </p>
          {creatorContract && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface2/60 border border-border-light text-xs">
              <Shield size={13} className="text-success" />
              <span className="text-muted">Contract:</span>
              <a href={contractExplorerLink} target="_blank" rel="noopener noreferrer" className="font-mono text-accent hover:underline">{creatorContract.slice(0,6)}...{creatorContract.slice(-4)}</a>
              {totalMintedOnChain !== undefined && <span className="text-muted ml-2">| {String(totalMintedOnChain)} minted</span>}
            </div>
          )}
        </div>

        {/* Warnings */}
        {!creatorContract && authState === "ready" && (
          <div className="max-w-lg mx-auto mb-8 bg-warning/10 border border-warning/20 rounded-xl p-5 flex items-start gap-3">
            <AlertTriangle size={20} className="text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-warning">Contract Not Deployed</p>
              <p className="text-xs text-muted mt-1">Set <code className="bg-surface2 px-1 py-0.5 rounded text-accent font-mono">NEXT_PUBLIC_CREATOR_CONTRACT</code> in .env after deploying.</p>
            </div>
          </div>
        )}
        {creatorContract && !isMintActive && authState === "ready" && step < 4 && (
          <div className="max-w-lg mx-auto mb-8 bg-warning/10 border border-warning/20 rounded-xl p-5 flex items-start gap-3">
            <AlertTriangle size={20} className="text-warning mt-0.5 shrink-0" />
            <div><p className="text-sm font-medium text-warning">Minting Paused</p><p className="text-xs text-muted mt-1">The contract owner has paused minting.</p></div>
          </div>
        )}

        {/* Auth gates */}
        {authState === "needs_login" && (
          <div className="max-w-md mx-auto"><div className="glass-card rounded-card p-8 text-center space-y-4">
            <User size={40} className="mx-auto text-accent" />
            <h2 className="font-display text-xl font-semibold">Sign In Required</h2>
            <p className="text-sm text-muted">Log in or sign up to start creating NFTs.</p>
            <Button variant="primary" size="lg" className="w-full" onClick={handleLogin} disabled={sessionLoading}>{sessionLoading ? <Loader2 size={16} className="animate-spin" /> : <User size={16} />} Continue to Login / Signup</Button>
          </div></div>
        )}
        {authState === "needs_wallet" && (
          <div className="max-w-md mx-auto"><div className="glass-card rounded-card p-8 text-center space-y-4">
            <Wallet size={40} className="mx-auto text-muted-dim" />
            <h2 className="font-display text-xl font-semibold">Connect Wallet</h2>
            <p className="text-sm text-muted">Connect your wallet to mint NFTs on-chain.</p>
            <Button variant="primary" size="lg" className="w-full" onClick={() => setShowWalletModal(true)}><Wallet size={16} /> Connect Wallet</Button>
          </div></div>
        )}
        {authState === "wrong_network" && (
          <div className="max-w-md mx-auto"><div className="glass-card rounded-card p-8 text-center space-y-4">
            <AlertTriangle size={40} className="mx-auto text-warning" />
            <h2 className="font-display text-xl font-semibold text-warning">Wrong Network</h2>
            <p className="text-sm text-muted">Switch to {chainName} to continue.</p>
            <Button variant="primary" size="lg" className="w-full" onClick={() => switchChain({ chainId: targetChainId })}>Switch to {chainName}</Button>
          </div></div>
        )}

        {/* ══ MAIN CREATE FLOW ══ */}
        {authState === "ready" && step <= 3 && (
          <>
            <StepIndicator current={step} steps={["Upload Art", "Add Details", "Review & Mint"]} />

            {/* ── STEP 1: UPLOAD ── */}
            {step === 1 && (
              <div className="max-w-2xl mx-auto">
                <div className="glass-card rounded-card overflow-hidden">
                  <div className="p-5 border-b border-border-light">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent-violet/10 flex items-center justify-center"><ImagePlus size={20} className="text-accent-violet" /></div>
                      <div>
                        <h3 className="font-display font-semibold text-base">Upload Your Artwork</h3>
                        <p className="text-xs text-muted">PNG, JPG, GIF, WEBP, SVG — Max 10MB</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    {imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-border-light">
                        <div className="relative aspect-square max-h-[400px] mx-auto"><Image src={imagePreview} alt="Preview" fill className="object-contain" /></div>
                        <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"><X size={14} className="text-white" /></button>
                        <div className="absolute bottom-3 left-3 px-3 py-1 rounded-pill bg-black/60 backdrop-blur-sm text-xs text-white/80">{imageFile?.name}</div>
                      </div>
                    ) : (
                      <div className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer ${dragActive ? "border-accent-violet bg-accent-violet/5" : "border-border-light hover:border-accent-violet/40 bg-surface2/30"}`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                        <div className="py-20 px-4 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-accent-violet/10 flex items-center justify-center mx-auto mb-4"><Upload size={28} className="text-accent-violet" /></div>
                          <p className="text-base font-medium text-text mb-2">Drag & drop or click to upload</p>
                          <p className="text-sm text-muted">Recommended: 1000×1000px or higher</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" className="hidden" onChange={(e) => handleFileSelect(e.target.files?.[0])} />
                      </div>
                    )}
                  </div>
                  <div className="p-5 pt-0 flex justify-end">
                    <Button variant="primary" size="lg" onClick={() => setStep(2)} disabled={!isStep1Valid}>
                      Continue <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: DETAILS ── */}
            {step === 2 && (
              <div className="max-w-3xl mx-auto">
                <div className="grid md:grid-cols-5 gap-6">
                  {/* Preview sidebar */}
                  <div className="md:col-span-2">
                    {imagePreview && (
                      <div className="glass-card rounded-card overflow-hidden sticky top-24">
                        <div className="relative aspect-square"><Image src={imagePreview} alt="Preview" fill className="object-contain" /></div>
                        <div className="p-3 border-t border-border-light">
                          <p className="text-xs text-muted truncate">{imageFile?.name}</p>
                          <button onClick={() => { setImageFile(null); setImagePreview(null); setStep(1); }} className="text-xs text-accent hover:underline mt-1">Change image</button>
                        </div>
                      </div>
                    )}
                    {/* Mint cost */}
                    <div className="glass-card rounded-card p-4 mt-4 space-y-2">
                      <div className="flex items-center gap-2"><Zap size={14} className="text-accent" /><span className="font-display font-semibold text-sm">Mint Cost</span>{onChainFee && <Badge color="success" className="!text-[9px]">On-Chain</Badge>}</div>
                      <div className="bg-surface2/40 rounded-lg p-3 space-y-1.5">
                        <div className="flex justify-between text-sm"><span className="text-muted">Fee</span><span className="font-mono font-medium text-accent">{createMintFee} ETH</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted">Network</span><span className="font-mono">{chainName}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted">Standard</span><span className="font-mono">ERC-721</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="md:col-span-3">
                    <div className="glass-card rounded-card overflow-hidden">
                      <div className="p-5 border-b border-border-light">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center"><PenLine size={18} className="text-accent" /></div>
                          <div><h3 className="font-display font-semibold text-sm">NFT Details</h3><p className="text-[11px] text-muted">Add a name, description, and properties</p></div>
                        </div>
                      </div>
                      <div className="p-5 space-y-5">
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-text">Name <span className="text-danger">*</span></label>
                          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cosmic Dreamer #1" className="w-full px-4 py-3 rounded-xl bg-surface2/60 border border-border-light text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm" maxLength={100} />
                          <p className="text-[11px] text-muted-dim text-right">{name.length}/100</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-sm font-medium text-text">Description</label>
                          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell the story behind your creation..." rows={3} className="w-full px-4 py-3 rounded-xl bg-surface2/60 border border-border-light text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm resize-none" maxLength={1000} />
                          <p className="text-[11px] text-muted-dim text-right">{description.length}/1000</p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5"><label className="block text-sm font-medium text-text">Collection</label><input type="text" value={collection} onChange={(e) => setCollection(e.target.value)} placeholder="e.g. My Art Series" className="w-full px-4 py-3 rounded-xl bg-surface2/60 border border-border-light text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm" /></div>
                          <div className="space-y-1.5"><label className="block text-sm font-medium text-text">External URL</label><input type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl bg-surface2/60 border border-border-light text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm" /></div>
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between"><label className="block text-sm font-medium text-text">Properties</label><button onClick={addAttribute} className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"><Plus size={12} /> Add</button></div>
                          <div className="space-y-2">{attributes.map((attr, idx) => (<div key={idx} className="flex gap-2 items-center"><input type="text" value={attr.trait_type} onChange={(e) => updateAttribute(idx, "trait_type", e.target.value)} placeholder="Trait (e.g. Color)" className="flex-1 px-3 py-2.5 rounded-lg bg-surface2/60 border border-border-light text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/50 text-sm" /><input type="text" value={attr.value} onChange={(e) => updateAttribute(idx, "value", e.target.value)} placeholder="Value (e.g. Blue)" className="flex-1 px-3 py-2.5 rounded-lg bg-surface2/60 border border-border-light text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/50 text-sm" />{attributes.length > 1 && (<button onClick={() => removeAttribute(idx)} className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center text-danger hover:bg-danger/20 transition-colors shrink-0"><Trash2 size={13} /></button>)}</div>))}</div>
                        </div>
                      </div>
                      <div className="p-5 pt-0 flex justify-between">
                        <Button variant="ghost" size="md" onClick={() => setStep(1)}><ArrowLeft size={14} /> Back</Button>
                        <Button variant="primary" size="lg" onClick={() => setStep(3)} disabled={!isStep2Valid}><Eye size={16} /> Review</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: REVIEW ── */}
            {step === 3 && (
              <div className="max-w-2xl mx-auto space-y-6"><div className="glass-card rounded-card p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl bg-accent-violet/10 flex items-center justify-center"><Shield size={20} className="text-accent-violet" /></div><div><h2 className="font-display text-xl font-semibold">Review Your NFT</h2><p className="text-xs text-muted">This calls AuroraCreator.createNft() — a real on-chain mint</p></div></div>
                <div className="grid sm:grid-cols-5 gap-6">
                  <div className="sm:col-span-2">{imagePreview && (<div className="rounded-xl overflow-hidden border border-border-light"><div className="relative aspect-square"><Image src={imagePreview} alt="Preview" fill className="object-contain" /></div></div>)}</div>
                  <div className="sm:col-span-3 space-y-3">
                    <div><p className="text-xs text-muted-dim uppercase tracking-wider mb-1">Name</p><p className="font-display font-semibold text-lg">{name}</p></div>
                    {description && <div><p className="text-xs text-muted-dim uppercase tracking-wider mb-1">Description</p><p className="text-sm text-muted leading-relaxed line-clamp-3">{description}</p></div>}
                    <div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-dim uppercase tracking-wider mb-1">Collection</p><p className="text-sm">{collection || "User Created"}</p></div><div><p className="text-xs text-muted-dim uppercase tracking-wider mb-1">Chain</p><p className="text-sm font-mono">{chainName}</p></div></div>
                    {attributes.filter((a) => a.trait_type && a.value).length > 0 && (<div><p className="text-xs text-muted-dim uppercase tracking-wider mb-2">Properties</p><div className="flex flex-wrap gap-2">{attributes.filter((a) => a.trait_type && a.value).map((a, i) => (<span key={i} className="px-3 py-1 rounded-lg bg-accent/5 border border-accent/10 text-xs"><span className="text-accent">{a.trait_type}:</span> {a.value}</span>))}</div></div>)}
                  </div>
                </div>
                <div className="mt-6 bg-surface2/40 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted">Contract</span><span className="font-mono text-xs text-accent">{creatorContract ? `${creatorContract.slice(0,6)}...${creatorContract.slice(-4)}` : "Not set"}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted">Function</span><span className="font-mono text-xs">createNft(metadataURI)</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted">Wallet</span><span className="font-mono text-xs">{effectiveWalletShort}</span></div>
                  <div className="flex justify-between text-sm pt-2 border-t border-border-light"><span className="font-medium">Mint Fee</span><span className="text-lg font-mono font-semibold text-accent">{createMintFee} ETH</span></div>
                </div>
                {confirmError && (<div className="mt-4 bg-danger/10 border border-danger/20 rounded-xl p-4 flex items-start gap-3"><AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" /><div><p className="text-sm font-medium text-danger">Error</p><p className="text-xs text-muted mt-1 break-all">{confirmError}</p></div></div>)}
                <div className="mt-6 flex gap-3">
                  <Button variant="ghost" size="lg" className="flex-1" onClick={() => { setStep(2); setConfirmError(null); }}><ArrowLeft size={14} /> Back</Button>
                  <Button variant="primary" size="lg" className="flex-1" onClick={handleCreateMint} disabled={!creatorContract || (!isMintActive && !!creatorContract)}><Sparkles size={16} /> Mint On-Chain — {createMintFee} ETH</Button>
                </div>
              </div></div>
            )}
          </>
        )}

        {/* ══ STEP 4 — MINTING ══ */}
        {authState === "ready" && step === 4 && (
          <div className="max-w-md mx-auto"><div className="glass-card rounded-card p-8 text-center space-y-5">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
                <Loader2 size={36} className="text-accent animate-spin" />
              </div>
            </div>
            <h2 className="font-display text-xl font-semibold">
              {mintState === "tx_signing" && "Confirm in your wallet..."}
              {mintState === "tx_pending" && "Transaction pending on-chain..."}
              {mintState === "confirming" && "Saving metadata to database..."}
              {mintState === "error" && "Something went wrong"}
            </h2>
            <p className="text-sm text-muted">
              {mintState === "tx_signing" && "Your wallet will ask you to approve the createNft() call."}
              {mintState === "tx_pending" && `Waiting for block confirmation on ${chainName}.`}
              {mintState === "confirming" && "Verifying the mint event and storing your NFT metadata."}
            </p>
            {txExplorerLink && (<a href={txExplorerLink} target="_blank" rel="noopener noreferrer" className="text-xs text-accent font-mono hover:underline inline-flex items-center gap-1"><ExternalLink size={12} /> View on {chainName} Explorer</a>)}
            {mintState === "error" && (
              <div className="space-y-3">
                <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-left"><p className="text-xs text-muted break-all">{confirmError || "Transaction rejected or failed."}</p></div>
                <div className="flex gap-3">
                  <Button variant="ghost" size="md" className="flex-1" onClick={() => { setStep(2); setConfirmError(null); resetWrite(); }}>Edit</Button>
                  <Button variant="primary" size="md" className="flex-1" onClick={() => { setConfirmError(null); resetWrite(); setStep(3); }}>Try Again</Button>
                </div>
              </div>
            )}
          </div></div>
        )}

        {/* ══ STEP 5 — SUCCESS ══ */}
        {step === 5 && confirmResult?.success && (
          <div className="max-w-lg mx-auto"><div className="glass-card rounded-card p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto"><Check size={40} className="text-success" /></div>
            <div><h2 className="font-display text-2xl font-bold">NFT Minted On-Chain!</h2><p className="text-sm text-muted mt-2"><strong>&quot;{name}&quot;</strong> is now a real ERC-721 token{confirmResult?.tokenId && <> — Token #{confirmResult.tokenId}</>}.</p></div>
            {imagePreview && (<div className="rounded-xl overflow-hidden border border-border-light mx-auto max-w-[200px]"><div className="relative aspect-square"><Image src={imagePreview} alt={name} fill className="object-contain" /></div></div>)}
            <div className="bg-surface2/40 rounded-xl p-4 text-left space-y-2 text-sm">
              {confirmResult?.tokenId && <div className="flex justify-between"><span className="text-muted">Token ID</span><span className="font-mono font-medium">#{confirmResult.tokenId}</span></div>}
              <div className="flex justify-between"><span className="text-muted">Contract</span><span className="font-mono text-xs text-accent">{creatorContract?.slice(0,6)}...{creatorContract?.slice(-4)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Fee Paid</span><span className="font-mono text-accent">{createMintFee} ETH</span></div>
              <div className="flex justify-between"><span className="text-muted">Standard</span><span className="font-mono">ERC-721</span></div>
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              {txExplorerLink && (<a href={txExplorerLink} target="_blank" rel="noopener noreferrer"><Button variant="secondary" size="md"><ExternalLink size={14} /> View Transaction</Button></a>)}
              <Link href="/profile"><Button variant="secondary" size="md">View in Profile</Button></Link>
              <Button variant="primary" size="md" onClick={resetAll}><Plus size={14} /> Create Another</Button>
            </div>
          </div></div>
        )}
      </div>
      <WalletConnectModal open={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </div>
  );
}

export default function CreatePage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>}><CreatePageContent /></Suspense>);
}
