"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Loader2,
  Wallet,
  Compass,
  Palette,
  Newspaper,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, profile, loading, logout, linkedWallet } = useSession();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!userMenuRef.current?.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* ── More nav links to fill out the navbar ── */
  const navLinks = [
    { label: "Explore", href: "/explore", icon: <Compass size={15} /> },
    { label: "Mint", href: "/mint", icon: <Sparkles size={15} /> },
    { label: "Collections", href: "/collection", icon: <LayoutGrid size={15} /> },
    { label: "News", href: "/news", icon: <Newspaper size={15} /> },
  ];

  const displayName = useMemo(() => {
    if (!profile) return "User";
    return profile.first_name || profile.username || (profile.email ? profile.email.split("@")[0] : null) || "User";
  }, [profile]);

  const avatarLetter = useMemo(() => displayName?.charAt(0)?.toUpperCase() || "U", [displayName]);

  const walletShort = useMemo(() => {
    if (!linkedWallet) return null;
    return `${linkedWallet.slice(0, 6)}...${linkedWallet.slice(-4)}`;
  }, [linkedWallet]);

  const handleLogin = () => router.push("/login");
  const handleSignup = () => router.push("/signup");
  const handleLogout = async () => { setUserMenuOpen(false); await logout(); router.push("/"); };

  return (
    <>
      {/* ── Chameleon navbar: blends with the app's glass aesthetic ── */}
      <nav
        className={`
          fixed top-0 left-0 right-0 z-50
          border-b transition-all duration-500
          ${scrolled
            ? "bg-bg/80 backdrop-blur-xl border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
            : "bg-transparent backdrop-blur-sm border-transparent"
          }
        `}
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-[72px] sm:h-[80px] items-center justify-between gap-4">

            {/* ── Logo — bigger ── */}
            <Link href="/" className="flex items-center shrink-0 group">
              <div className="relative h-[48px] w-[200px] sm:h-[54px] sm:w-[230px] md:h-[58px] md:w-[260px] transition-transform duration-300 group-hover:scale-[1.03]">
                <Image
                  src="/pictures/logo.png"
                  alt="AuroraNFT"
                  fill
                  priority
                  quality={100}
                  unoptimized
                  sizes="(max-width: 640px) 200px, (max-width: 768px) 230px, 260px"
                  className="object-contain"
                />
              </div>
            </Link>

            {/* ── Desktop nav links ── */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      inline-flex items-center gap-2 rounded-xl px-4 py-2.5
                      text-[14px] font-semibold transition-all duration-200
                      ${active
                        ? "bg-white/[0.08] text-accent border border-accent/20"
                        : "text-white/65 hover:text-white hover:bg-white/[0.04] border border-transparent"
                      }
                    `}
                  >
                    <span className={active ? "text-accent" : "text-white/40"}>{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* ── Desktop auth area ── */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              {loading ? (
                <div className="flex items-center gap-2 px-4 py-2 text-white/50">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : !isLoggedIn ? (
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleLogin}
                    className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white/80 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleSignup}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-[#071019] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(34,211,238,0.3)]"
                    style={{ background: "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)" }}
                  >
                    <Sparkles size={14} />
                    Sign Up
                  </button>
                </div>
              ) : (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((p) => !p)}
                    className={`
                      inline-flex items-center gap-3 rounded-2xl border px-3 py-2 text-white transition-all duration-200
                      ${userMenuOpen
                        ? "border-accent/30 bg-accent/[0.06]"
                        : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15]"
                      }
                    `}
                  >
                    {profile?.avatar_url ? (
                      <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10">
                        <Image src={profile.avatar_url} alt={displayName} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-xs font-bold text-[#071019]">
                        {avatarLetter}
                      </div>
                    )}
                    <div className="text-left hidden xl:block">
                      <p className="max-w-[120px] truncate text-sm font-semibold text-white">{displayName}</p>
                      <p className="max-w-[140px] truncate text-[11px] text-white/40 font-mono">{walletShort || profile?.email || "Authenticated"}</p>
                    </div>
                    <ChevronDown size={14} className={`text-white/50 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/95 shadow-[0_16px_48px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-slide-up">
                      <div className="p-2">
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/[0.06] hover:text-white"
                        >
                          <User size={15} />
                          Profile
                        </Link>
                        {linkedWallet && (
                          <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-[11px] text-white/30">
                            <Wallet size={13} />
                            <span className="font-mono truncate">{walletShort}</span>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-white/[0.06] p-2">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-500/10"
                        >
                          <LogOut size={15} />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Mobile hamburger ── */}
            <button
              onClick={() => setMobileOpen((p) => !p)}
              className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-3 right-3 top-[84px] rounded-2xl border border-white/[0.08] bg-surface/95 backdrop-blur-2xl p-4 shadow-[0_16px_48px_rgba(0,0,0,0.6)] animate-slide-up">
            <div className="flex flex-col gap-1.5">
              {navLinks.map((link) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors
                      ${active
                        ? "bg-accent/[0.08] text-accent border border-accent/20"
                        : "text-white/80 hover:bg-white/[0.04] hover:text-white border border-transparent"
                      }
                    `}
                  >
                    <span className={active ? "text-accent" : "text-white/40"}>{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}

              <div className="mt-2 border-t border-white/[0.06] pt-3">
                {loading ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 size={16} className="animate-spin text-white/50" />
                  </div>
                ) : !isLoggedIn ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => { setMobileOpen(false); handleLogin(); }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white border border-white/[0.08] bg-white/[0.03]"
                    >
                      <User size={16} />
                      Login
                    </button>
                    <button
                      onClick={() => { setMobileOpen(false); handleSignup(); }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-[#071019]"
                      style={{ background: "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)" }}
                    >
                      <Sparkles size={16} />
                      Sign Up
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                      {profile?.avatar_url ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10">
                          <Image src={profile.avatar_url} alt={displayName} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-[#071019]">
                          {avatarLetter}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">{displayName}</p>
                        <p className="text-[11px] text-white/40">{walletShort || profile?.email || "Authenticated"}</p>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.04] hover:text-white"
                    >
                      <User size={15} />
                      Profile
                    </Link>
                    <button
                      onClick={() => { setMobileOpen(false); handleLogout(); }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm font-semibold text-red-300"
                    >
                      <LogOut size={15} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
