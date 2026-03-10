'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, Wallet, LogOut, User, Loader2,
  Search, Bell, Heart, Settings, HelpCircle,
  Activity, ChevronDown
} from 'lucide-react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';

const navLinks = [
  { label: 'Explore', href: '/explore' },
  { label: 'Drops', href: '/mint' },
  { label: 'Rankings', href: '/explore?sort=trending' },
];

export default function Header() {
  const pathname = usePathname();
  // Fused = nav overlays the hero on the home route
  const isFusedRoute = pathname === '/';

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // Prevent auto-login from re-triggering after a rejection
  const loginAttempted = useRef(false);

  const { connectors, connect, isPending: isConnectPending } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { session, isAuthed, login, logout, loading: authLoading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-login once per wallet connection; reset guard on disconnect
  useEffect(() => {
    if (!isConnected || !address) {
      loginAttempted.current = false;
      return;
    }
    if (!isAuthed && !authLoading && !loginAttempted.current) {
      loginAttempted.current = true;
      login().catch(() => { loginAttempted.current = false; });
    }
  }, [isConnected, address, isAuthed, authLoading, login]);

  // Compact when not on a fused route, OR when the user has scrolled
  const isCompact = !isFusedRoute || scrolled;
  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) connect({ connector });
  };

  const handleDisconnect = async () => {
    await logout();
    setShowWalletMenu(false);
  };

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-400 ease-out
          ${isCompact
            ? 'bg-bg/90 backdrop-blur-2xl border-b border-white/[0.06] py-2'
            : 'bg-transparent py-4'
          }
        `}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 flex items-center justify-between gap-4">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <img
                src="/pictures/logo.png"
                alt="AuroraNft Logo"
                className="h-10 sm:h-12 w-auto object-contain group-hover:brightness-110 transition-all duration-300 drop-shadow-[0_0_12px_rgba(0,229,255,0.35)]"
              />
              <span className="hidden sm:block font-display font-bold text-[15px] tracking-tight text-text group-hover:text-accent transition-colors duration-200">
                AuroraNft
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-muted hover:text-text transition-colors duration-200 rounded-lg hover:bg-white/[0.04]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Center: Search */}
          <div className="hidden lg:flex flex-1 max-w-[360px] mx-auto">
            <div className={`
              relative w-full group transition-all duration-300
              ${searchFocused ? 'scale-[1.02]' : ''}
            `}>
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dim pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search NFTs, collections..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={`
                  w-full pl-9 pr-4 py-2 text-[13px] text-text placeholder:text-muted-dim
                  bg-white/[0.04] rounded-xl outline-none
                  border transition-all duration-300
                  ${searchFocused
                    ? 'border-accent/30 bg-white/[0.06] shadow-[0_0_20px_rgba(0,229,255,0.06)]'
                    : 'border-white/[0.06] hover:border-white/[0.10]'
                  }
                `}
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-dim font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                /
              </kbd>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            <button className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-text hover:bg-white/[0.04] transition-all duration-200">
              <Search size={16} />
            </button>

            <button className="hidden md:flex relative w-9 h-9 rounded-xl items-center justify-center text-muted hover:text-text hover:bg-white/[0.04] transition-all duration-200">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
            </button>

            <button className="hidden md:flex w-9 h-9 rounded-xl items-center justify-center text-muted hover:text-text hover:bg-white/[0.04] transition-all duration-200">
              <Heart size={16} />
            </button>

            {/* Wallet / Avatar */}
            {isConnected && address ? (
              <div className="relative ml-1">
                <button
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className="hidden md:flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-accent/20 transition-all duration-200"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent/40 to-accent-violet/40 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-text">{address.slice(2, 4).toUpperCase()}</span>
                  </div>
                  {authLoading ? (
                    <Loader2 size={12} className="animate-spin text-accent" />
                  ) : isAuthed ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                  )}
                  <span className="font-mono text-[11px] text-muted">{shortAddr}</span>
                  <ChevronDown size={12} className="text-muted-dim" />
                </button>

                {showWalletMenu && (
                  <div className="absolute right-0 top-12 w-56 bg-surface/95 backdrop-blur-2xl rounded-2xl border border-white/[0.08] p-1.5 z-10 shadow-card animate-fade-in" style={{ animationDuration: '0.15s' }}>
                    {isAuthed && (
                      <Link
                        href={`/profile/${address}`}
                        onClick={() => setShowWalletMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-muted hover:text-text rounded-xl hover:bg-white/[0.04] transition-colors"
                      >
                        <User size={14} /> Profile
                      </Link>
                    )}
                    <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-muted hover:text-text rounded-xl hover:bg-white/[0.04] transition-colors">
                      <Activity size={14} /> Activity
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-muted hover:text-text rounded-xl hover:bg-white/[0.04] transition-colors">
                      <Settings size={14} /> Settings
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-muted hover:text-text rounded-xl hover:bg-white/[0.04] transition-colors">
                      <HelpCircle size={14} /> Help
                    </button>
                    {!isAuthed && (
                      <button
                        onClick={() => { loginAttempted.current = false; login(); setShowWalletMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-accent rounded-xl hover:bg-white/[0.04] transition-colors"
                      >
                        <Wallet size={14} /> Sign In (SIWE)
                      </button>
                    )}
                    <div className="my-1 border-t border-white/[0.06]" />
                    <button
                      onClick={handleDisconnect}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-danger hover:text-danger rounded-xl hover:bg-white/[0.04] transition-colors"
                    >
                      <LogOut size={14} /> Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="hidden md:flex ml-1 !py-2 !px-4 !text-[13px]"
                onClick={handleConnect}
                disabled={isConnectPending}
              >
                {isConnectPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Wallet size={14} />
                )}
                Connect
              </Button>
            )}

            <button
              className="md:hidden p-2 text-muted hover:text-text transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 w-72 h-full bg-surface/95 backdrop-blur-2xl border-l border-white/[0.06] p-6 pt-20 flex flex-col gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 text-[15px] text-muted hover:text-text rounded-xl hover:bg-white/[0.04] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isAuthed && address && (
              <Link
                href={`/profile/${address}`}
                className="px-4 py-3 text-[15px] text-muted hover:text-text rounded-xl hover:bg-white/[0.04] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Profile
              </Link>
            )}
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              {isConnected ? (
                <div className="space-y-2">
                  <div className="px-4 py-2 text-xs font-mono text-muted truncate">{shortAddr}</div>
                  {!isAuthed && (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      onClick={() => { loginAttempted.current = false; login(); }}
                      disabled={authLoading}
                    >
                      {authLoading ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={16} />}
                      Sign In
                    </Button>
                  )}
                  <Button variant="danger" size="md" className="w-full" onClick={handleDisconnect}>
                    <LogOut size={16} /> Disconnect
                  </Button>
                </div>
              ) : (
                <Button variant="primary" size="md" className="w-full" onClick={handleConnect} disabled={isConnectPending}>
                  <Wallet size={16} /> Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showWalletMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowWalletMenu(false)} />
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg/90 backdrop-blur-2xl border-t border-white/[0.06]">
        <div className="flex items-center justify-around py-2 px-2">
          {[
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: 'Home', href: '/' },
            { icon: <Search size={20} strokeWidth={1.8} />, label: 'Explore', href: '/explore' },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>, label: 'Drops', href: '/mint' },
            { icon: <Heart size={20} strokeWidth={1.8} />, label: 'Saved', href: '#' },
            { icon: <User size={20} strokeWidth={1.8} />, label: 'Profile', href: address ? `/profile/${address}` : '#' },
          ].map(item => (
            <Link key={item.label} href={item.href} className="flex flex-col items-center gap-0.5 py-1 px-3 text-muted hover:text-text transition-colors">
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
