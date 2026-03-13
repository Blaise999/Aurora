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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between h-24">

            {/* BIG LOGO */}

            <Link href="/" className="flex items-center shrink-0 group">

              <div className="relative w-[180px] h-[80px]">

                <Image
                  src="/pictures/logo.png"
                  alt="Aurora NFT"
                  fill
                  priority
                  sizes="180px"
                  className="
                  object-contain
                  transition-all
                  duration-300
                  group-hover:scale-[1.06]
                  drop-shadow-[0_0_30px_rgba(0,229,255,0.45)]
                  group-hover:drop-shadow-[0_0_45px_rgba(124,58,237,0.55)]
                  "
                />

              </div>

            </Link>

            {/* DESKTOP NAV */}

            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl p-1.5">

              {navLinks.map((link) => {

                const active =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href));

                return (

                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
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

            {/* RIGHT ACTIONS */}

            <div className="flex items-center gap-3">

              {isLoggedIn ? (

                <div className="hidden sm:flex items-center gap-2">

                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold border border-accent/25 bg-accent/10 text-accent hover:bg-accent/15 transition-all"
                  >

                    <User size={14} />

                    <span className="max-w-[120px] truncate">
                      {displayName || "Profile"}
                    </span>

                  </Link>

                  <button
                    onClick={logout}
                    className="p-2.5 rounded-full text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
                    title="Sign out"
                  >

                    <LogOut size={14} />

                  </button>

                </div>

              ) : (

                <Link
                  href="/login"
                  className="
                  hidden sm:inline-flex
                  items-center
                  justify-center
                  min-w-[140px]
                  px-5
                  py-3
                  rounded-full
                  text-[13px]
                  font-semibold
                  transition-all
                  duration-300
                  "
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
                className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-text hover:bg-white/5 transition-colors"
              >

                {mobileOpen ? <X size={20}/> : <Menu size={20}/>}

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

          <div className="absolute top-24 right-4 left-4 bg-surface/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 space-y-2 shadow-card">

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
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
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