"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
  }, [pathname]);

  const navLinks = [
    { label: "Explore", href: "/explore" },
    { label: "Drops", href: "/drops" },
    { label: "Rankings", href: "/rankings" },
  ];

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

            {/* RIGHT: LOGIN ONLY, NO CONNECT */}
            <div className="hidden md:flex items-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-3 text-[15px] font-semibold text-[#071019] transition-transform duration-200 hover:scale-[1.02]"
                style={{
                  background:
                    "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)",
                }}
              >
                Login / Sign Up
              </Link>
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
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-center text-sm font-semibold text-[#071019]"
                  style={{
                    background:
                      "linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)",
                  }}
                >
                  Login / Sign Up
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}