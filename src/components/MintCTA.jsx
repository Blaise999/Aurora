"use client";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";

export default function MintCTA() {
  const { isConnected, connect } = useWallet();

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* Bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface/0 via-accent/5 to-surface/0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-accent/8 rounded-full blur-[200px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-accent-violet/10 border border-accent-violet/20 mb-6">
          <span className="text-xs font-display font-semibold text-accent-violet uppercase tracking-wider">
            Start Minting
          </span>
        </div>

        <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl mb-5">
          Ready to <span className="text-gradient">Mint</span>?
        </h2>

        <p className="text-muted text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
          Browse the collection, pick your favorite piece, and mint it directly to your wallet.
          Powered by Base L2 for fast, low-cost transactions.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/mint"
            className="px-8 py-4 rounded-pill font-display font-bold text-sm bg-gradient-to-r from-accent to-accent-violet text-bg hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.03]"
          >
            Start Minting
          </Link>
          {!isConnected && (
            <button
              onClick={connect}
              className="px-8 py-4 rounded-pill font-display font-bold text-sm border border-border text-text hover:bg-white/5 transition-all"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
