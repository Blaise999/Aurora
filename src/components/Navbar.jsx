"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const pathname = usePathname();
  const {
    isAuthed,
    login,
    logout,
    loading,
    profile,
  } = useAuth();

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
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!userMenuRef.current?.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const navLinks = [
    { label: "Explore", href: "/explore" },
    { label: "Drops", href: "/drops" },
    { label: "Rankings", href: "/rankings" },
  ];

  const displayName = useMemo(() => {
    if (!profile) return "User";
    return (
      profile.first_name ||
      profile.username ||
      (profile.email ? profile.email.split("@")[0] : null) ||
      "User"
    );
  }, [profile]);

  const avatarLetter = useMemo(() => {
    return displayName?.charAt(0)?.toUpperCase() || "U";
  }, [displayName]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? "bg-black/85 backdrop-blur-md border-white/10"
            : "bg-black/70 backdrop-blur-sm border-white/5"
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-[84px] items-center justify-between">
            {/* LEFT: ONLY IMAGE LOGO */}
            <Link href="/" className="flex items-center shrink-0">
              <div className="relative h-[42px] w-[180px] sm:h-[46px] sm:w-[200px] md:h-[50px] md:w-[220px]">
                <Image
                  src="/pictures/logo.png"
                  alt="AuroraNFT"
                  fill
                  priority
                  quality={100}
                  unoptimized
                  sizes="(max-width: 640px) 180px, (max-width: 768px) 200px, 220px"
                  className="object-contain"
                />
              </div>
            </Link>

            {/* CENTER LINKS */}
            <div className="hidden md:flex items-center gap-10">
              {navLinks.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-[17px] font-semibold transition-colors duration-200 ${
                      active
                        ? "text-cyan-400"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* RIGHT: AUTH AWARE */}
            <div className="hidden md:flex items-center">
              {!isAuthed ? (
                <button
                  onClick={login}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-[15px] font-semibold text-[#071019] transition-transform duration-200 hover:scale-[1.02] disabled:opacity-70"
                  style={{
                    background:
                      "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)",
                  }}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <User size={16} />
                  )}
                  Login / Sign Up
                </button>
              ) : (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white transition-colors hover:bg-white/10"
                  >
                    {profile?.avatar_url ? (
                      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10">
                        <Image
                          src={profile.avatar_url}
                          alt={displayName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-[#071019]">
                        {avatarLetter}
                      </div>
                    )}

                    <div className="text-left">
                      <p className="max-w-[140px] truncate text-sm font-semibold text-white">
                        {displayName}
                      </p>
                      <p className="max-w-[160px] truncate text-xs text-white/50">
                        {profile?.email || "Authenticated"}
                      </p>
                    </div>

                    <ChevronDown size={16} className="text-white/60" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-[calc(100%+10px)] w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f19]/95 shadow-2xl backdrop-blur-xl">
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-white/85 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <User size={16} />
                        Profile
                      </Link>

                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-300 transition-colors hover:bg-red-500/10"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MOBILE BUTTON */}
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/80 hover:bg-white/5 hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute left-4 right-4 top-[96px] rounded-2xl border border-white/10 bg-[#0b0f19]/95 p-4 shadow-2xl">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-white/10 text-cyan-400"
                        : "text-white/80 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <div className="mt-2 border-t border-white/10 pt-3">
                {!isAuthed ? (
                  <button
                    onClick={async () => {
                      setMobileOpen(false);
                      await login();
                    }}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-semibold text-[#071019] disabled:opacity-70"
                    style={{
                      background:
                        "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)",
                    }}
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <User size={16} />
                    )}
                    Login / Sign Up
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      {profile?.avatar_url ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10">
                          <Image
                            src={profile.avatar_url}
                            alt={displayName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-[#071019]">
                          {avatarLetter}
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-semibold text-white">
                          {displayName}
                        </p>
                        <p className="text-xs text-white/50">
                          {profile?.email || "Authenticated"}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-xl px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      Profile
                    </Link>

                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        logout();
                      }}
                      className="block w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm font-semibold text-red-300"
                    >
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