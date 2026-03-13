"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useAccount } from "wagmi";
import { shortenAddress } from "@/lib/utils";
import { User, LogOut, Menu, X } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { session, profile, isLoggedIn, logout } = useSession();
  const { address } = useAccount();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Explore", href: "/explore" },
    { label: "Mint", href: "/mint" },
    { label: "Profile", href: "/profile" },
  ];

  const displayName =
    profile?.first_name ||
    profile?.username ||
    session?.firstName ||
    (address ? shortenAddress(address) : null);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-bg/70 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_50px_rgba(0,0,0,0.45)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between h-32 md:h-40">
            
            {/* MASSIVE LOGO */}
            <Link href="/" className="flex items-center shrink-0 group">
              <div className="relative w-[240px] h-[120px] md:w-[320px] md:h-[160px] lg:w-[400px] lg:h-[200px]">
                <Image
                  src="/pictures/logo.png"
                  alt="Aurora NFT"
                  fill
                  priority
                  sizes="(max-width: 768px) 240px, (max-width: 1024px) 320px, 400px"
                  className="
                    object-contain
                    transition-all
                    duration-500
                    group-hover:scale-[1.08]
                    drop-shadow-[0_0_40px_rgba(0,229,255,0.6)]
                    group-hover:drop-shadow-[0_0_60px_rgba(124,58,237,0.7)]
                  "
                />
              </div>
            </Link>

            {/* DESKTOP NAV */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl p-2">
              {navLinks.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-6 py-3 rounded-full text-[14px] font-medium transition-all duration-300 ${
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

            {/* ACTIONS */}
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <div className="hidden sm:flex items-center gap-3">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-5 py-3 rounded-full font-semibold text-[14px] border border-accent/25 bg-accent/10 text-accent hover:bg-accent/20 transition-all"
                  >
                    <User size={16} />
                    <span className="max-w-[140px] truncate">{displayName || "Profile"}</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="p-3 rounded-full text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
                    title="Sign out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center justify-center min-w-[150px] px-6 py-3 rounded-full text-[14px] font-semibold transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg,#00E5FF 0%,#7C3AED 100%)",
                    color: "#070A10"
                  }}
                >
                  Login / Sign Up
                </Link>
              )}

              {/* MOBILE MENU BUTTON */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden w-12 h-12 rounded-xl flex items-center justify-center text-muted hover:text-text hover:bg-white/5 transition-colors"
              >
                {mobileOpen ? <X size={24}/> : <Menu size={24}/>}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[99] md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-32 right-4 left-4 bg-surface/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 space-y-2 shadow-card">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-text hover:bg-white/5 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-3 mt-2">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/profile"
                    className="block px-4 py-3 rounded-xl text-sm font-medium text-accent"
                    onClick={() => setMobileOpen(false)}
                  >
                    <User size={14} className="inline mr-2" />
                    {displayName || "Profile"}
                  </Link>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm text-red-500"
                  >
                    <LogOut size={14} className="inline mr-2" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block px-4 py-3 rounded-xl text-sm font-semibold text-accent"
                  onClick={() => setMobileOpen(false)}
                >
                  Login / Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}