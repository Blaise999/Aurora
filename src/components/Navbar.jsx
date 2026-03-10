"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { shortenAddress } from "@/lib/utils";

export default function Navbar() {
  const { address, isConnected, connecting, connect, disconnect } = useWallet();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Explore", href: "/explore" },
    { label: "Mint", href: "/mint" },
    { label: "Profile", href: "/profile" },
  ];

  const walletLabel =
    connecting ? "Connecting..." : isConnected && address ? shortenAddress(address) : "Connect Wallet";

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? "bg-bg/75 backdrop-blur-2xl border-b border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24 sm:h-28">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0 group">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <Image
                  src="/pictures/logo.png"
                  alt="AuroraNft"
                  fill
                  priority
                  sizes="(max-width: 640px) 80px, 96px"
                  className="object-contain drop-shadow-[0_0_20px_rgba(0,229,255,0.28)] group-hover:scale-[1.03] group-hover:drop-shadow-[0_0_28px_rgba(0,229,255,0.45)] transition-all duration-300"
                />
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl p-1.5">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
                      active
                        ? "text-text bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "text-muted hover:text-text hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={isConnected ? disconnect : connect}
                disabled={connecting}
                className="hidden sm:inline-flex relative items-center justify-center min-w-[156px] px-5 py-3 rounded-full text-[13px] font-semibold font-display transition-all duration-300 overflow-hidden group disabled:opacity-70"
                style={{
                  background: isConnected
                    ? "rgba(0, 229, 255, 0.10)"
                    : "linear-gradient(135deg, #00E5FF 0%, #7C3AED 100%)",
                  border: isConnected ? "1px solid rgba(0, 229, 255, 0.28)" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isConnected
                    ? "0 0 0 1px rgba(255,255,255,0.02) inset"
                    : "0 12px 28px rgba(0, 229, 255, 0.22)",
                }}
              >
                <span className="relative z-10">{walletLabel}</span>
                {!isConnected && (
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-accent-violet to-accent" />
                )}
              </button>

              <button
                onClick={() => setMobileOpen((prev) => !prev)}
                className={`md:hidden relative h-12 w-12 rounded-2xl border transition-all duration-300 ${
                  mobileOpen
                    ? "border-white/15 bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
              >
                <span className="sr-only">Open menu</span>

                <span
                  className={`absolute left-1/2 top-[15px] h-[2px] w-5 -translate-x-1/2 rounded-full bg-white transition-all duration-300 ${
                    mobileOpen ? "translate-y-[7px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute left-1/2 top-1/2 h-[2px] w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-300 ${
                    mobileOpen ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"
                  }`}
                />
                <span
                  className={`absolute left-1/2 bottom-[15px] h-[2px] w-5 -translate-x-1/2 rounded-full bg-white transition-all duration-300 ${
                    mobileOpen ? "-translate-y-[7px] -rotate-45" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile panel */}
      <div
        className={`md:hidden fixed top-[88px] left-4 right-4 z-50 transition-all duration-300 ${
          mobileOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0B1020]/90 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
          <div className="px-5 pt-5 pb-4 border-b border-white/10">
            <div className="text-xs uppercase tracking-[0.22em] text-white/45">Navigation</div>
            <div className="mt-2 text-lg font-semibold text-white">Explore AuroraNft</div>
          </div>

          <div className="p-4 space-y-2">
            {navLinks.map((link, index) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center justify-between rounded-2xl px-4 py-4 transition-all duration-300 ${
                    active
                      ? "bg-white/10 border border-white/10 text-white"
                      : "bg-white/[0.035] border border-transparent text-white/80 hover:bg-white/[0.07] hover:text-white"
                  }`}
                  style={{
                    transitionDelay: mobileOpen ? `${index * 40}ms` : "0ms",
                  }}
                >
                  <span className="text-sm font-medium">{link.label}</span>
                  <span
                    className={`text-lg transition-transform duration-300 ${
                      active ? "translate-x-0 opacity-100" : "opacity-40 group-hover:translate-x-1 group-hover:opacity-100"
                    }`}
                  >
                    →
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="p-4 pt-0">
            <button
              onClick={isConnected ? disconnect : connect}
              disabled={connecting}
              className="w-full relative overflow-hidden rounded-2xl px-4 py-4 text-sm font-semibold transition-all duration-300 disabled:opacity-70"
              style={{
                background: isConnected
                  ? "rgba(0, 229, 255, 0.10)"
                  : "linear-gradient(135deg, #00E5FF 0%, #7C3AED 100%)",
                border: isConnected ? "1px solid rgba(0, 229, 255, 0.28)" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: isConnected
                  ? "0 0 0 1px rgba(255,255,255,0.02) inset"
                  : "0 14px 32px rgba(0, 229, 255, 0.18)",
              }}
            >
              {walletLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}