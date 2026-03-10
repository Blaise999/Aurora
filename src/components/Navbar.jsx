"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@/context/WalletContext";
import { shortenAddress } from "@/lib/utils";

export default function Navbar() {
  const { address, isConnected, connecting, connect, disconnect } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Explore", href: "/explore" },
    { label: "Mint", href: "/mint" },
    { label: "Profile", href: "/profile" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${scrolled ? 'bg-bg/80 backdrop-blur-2xl border-b border-white/[0.04] shadow-[0_2px_20px_rgba(0,0,0,0.3)]' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14">
              <Image src="/pictures/logo.png" alt="AuroraNft" fill className="object-contain drop-shadow-[0_0_10px_rgba(0,229,255,0.3)] group-hover:drop-shadow-[0_0_16px_rgba(0,229,255,0.5)] transition-all" priority />
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="px-4 py-2 text-[13px] font-medium text-muted hover:text-text transition-colors rounded-pill hover:bg-white/5">{link.label}</Link>
            ))}
          </div>

          {/* Wallet + Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button onClick={isConnected ? disconnect : connect} disabled={connecting}
              className="relative px-5 py-2.5 rounded-pill text-[13px] font-semibold font-display transition-all duration-300 overflow-hidden group"
              style={{ background: isConnected ? "rgba(0, 229, 255, 0.1)" : "linear-gradient(135deg, #00E5FF, #8B5CF6)", border: isConnected ? "1px solid rgba(0, 229, 255, 0.3)" : "none" }}>
              <span className="relative z-10">{connecting ? "Connecting..." : isConnected ? shortenAddress(address) : "Connect Wallet"}</span>
              {!isConnected && <div className="absolute inset-0 bg-gradient-to-r from-accent-violet to-accent opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden flex flex-col gap-1.5 p-2" aria-label="Menu">
              <span className={`w-5 h-0.5 bg-text transition-all ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`w-5 h-0.5 bg-text transition-all ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`w-5 h-0.5 bg-text transition-all ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-bg/95 backdrop-blur-2xl border-t border-white/[0.04]">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-card text-sm font-medium text-muted hover:text-text hover:bg-white/5 transition">{link.label}</Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
