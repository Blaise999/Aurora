'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, Wallet, LogOut, User, Loader2,
  Search, Bell, Heart, Settings, HelpCircle,
  Activity, ChevronDown, Copy, Check
} from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import WalletConnectModal from '@/components/WalletConnectModal';

const navLinks = [
  { label: 'Explore', href: '/explore' },
  { label: 'Drops', href: '/mint' },
  { label: 'Rankings', href: '/explore?sort=trending' },
];

export default function Header() {
  const pathname = usePathname();
  const isFusedRoute = pathname === '/';

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const loginAttempted = useRef(false);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { session, isAuthed, login, logout, loading: authLoading } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-SIWE login when wallet connects — connect = login
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setShowWalletMenu(false);
  }, [pathname]);

  const isCompact = !isFusedRoute || scrolled;
  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  const handleDisconnect = async () => {
    await logout();
    setShowWalletMenu(false);
    setMobileOpen(false);
  };

  const handleCopy = () => {
    if (address) navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-400 ease-out
        ${isCompact
          ? 'bg-bg/90 backdrop-blur-2xl border-b border-white/[0.06] py-2'
          : 'bg-transparent py-3 sm:py-4'
        }
      `}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between gap-3">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <img
                src="/pictures/logo.png"
                alt="AuroraNft Logo"
                className="h-10 sm:h-12 md:h-14 w-auto object-contain group-hover:brightness-110 transition-all duration-300 drop-shadow-[0_0_12px_rgba(0,229,255,0.35)]"
              />
              <span className="hidden sm:block font-display font-bold text-[15px] md:text-[17px] tracking-tight text-text group-hover:text-accent transition-colors duration-200">
                AuroraNft
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map(link => {
                const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href.split('?')[0]));
                return (
                  <Link key={link.href} href={link.href}
                    className={`px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 rounded-lg hover:bg-white/[0.04]
                    ${isActive ? 'text-accent' : 'text-muted hover:text-text'}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Center: Search (desktop only) */}
          <div className="hidden lg:flex flex-1 max-w-[320px] mx-auto">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dim pointer-events-none" />
              <input type="text" placeholder="Search NFTs…"
                className="w-full pl-9 pr-4 py-2 text-[13px] text-text placeholder:text-muted-dim bg-white/[0.04] rounded-xl outline-none border border-white/[0.06] hover:border-white/[0.10] focus:border-accent/30 focus:bg-white/[0.06] transition-all" />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            <button className="hidden md:flex relative w-9 h-9 rounded-xl items-center justify-center text-muted hover:text-text hover:bg-white/[0.04] transition-all">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
            </button>

            {/* Wallet button — Desktop */}
            {isConnected && address ? (
              <div className="relative ml-1 hidden md:block">
                <button onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-accent/20 transition-all">
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
                  <div className="absolute right-0 top-12 w-60 bg-surface/95 backdrop-blur-2xl rounded-2xl border border-white/[0.08] p-1.5 z-10 shadow-card animate-fade-in" style={{ animationDuration: '0.15s' }}>
                    {/* Wallet info */}
                    <div className="px-3 py-2.5 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] text-text">{shortAddr}</span>
                        <button onClick={handleCopy} className="p-1 text-muted hover:text-accent transition-colors">
                          {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {isAuthed ? (
                          <><span className="w-1.5 h-1.5 rounded-full bg-success" /><span className="text-[10px] text-success">Signed in</span></>
                        ) : (
                          <><span className="w-1.5 h-1.5 rounded-full bg-warning" /><span className="text-[10px] text-warning">Not signed</span></>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-white/[0.06] my-1" />
                    {isAuthed && (
                      <Link href={`/profile/${address}`} onClick={() => setShowWalletMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-muted hover:text-text rounded-xl hover:bg-white/[0.04] transition-colors">
                        <User size={14} /> Profile
                      </Link>
                    )}
                    <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-muted hover:text-text rounded-xl hover:bg-white/[0.04] transition-colors">
                      <Activity size={14} /> Activity
                    </button>
                    {!isAuthed && (
                      <button onClick={() => { loginAttempted.current = false; login(); setShowWalletMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-accent rounded-xl hover:bg-white/[0.04] transition-colors">
                        <Wallet size={14} /> Sign In (SIWE)
                      </button>
                    )}
                    <div className="border-t border-white/[0.06] my-1" />
                    <button onClick={handleDisconnect}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-danger rounded-xl hover:bg-white/[0.04] transition-colors">
                      <LogOut size={14} /> Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="primary" size="sm" className="hidden md:flex ml-1 !py-2 !px-4 !text-[13px]"
                onClick={() => setShowWalletModal(true)}>
                <Wallet size={14} /> Connect
              </Button>
            )}

            {/* Mobile: Connect / Avatar button */}
            {isConnected && address ? (
              <button onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden w-9 h-9 rounded-xl bg-gradient-to-br from-accent/30 to-accent-violet/30 flex items-center justify-center border border-accent/20">
                <span className="text-[10px] font-bold text-text">{address.slice(2, 4).toUpperCase()}</span>
              </button>
            ) : (
              <button onClick={() => setShowWalletModal(true)}
                className="md:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-bg"
                style={{ background: 'linear-gradient(135deg, #00E5FF, #8B5CF6)' }}>
                <Wallet size={14} />
                <span className="hidden xs:inline">Connect</span>
              </button>
            )}

            {/* Hamburger (desktop only when needed) */}
            <button className="md:hidden p-2 text-muted hover:text-text transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer — slides from right */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[55] md:hidden">
          <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 w-[280px] sm:w-[320px] h-full bg-surface/95 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col overflow-y-auto">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <span className="font-display font-semibold text-text">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-muted hover:text-text"><X size={20} /></button>
            </div>

            {/* Wallet status card */}
            {isConnected && address && (
              <div className="mx-4 mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/30 to-accent-violet/30 flex items-center justify-center border border-accent/20">
                    <span className="text-xs font-bold text-text">{address.slice(2, 4).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-text truncate">{shortAddr}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isAuthed ? (
                        <><span className="w-1.5 h-1.5 rounded-full bg-success" /><span className="text-[10px] text-success">Signed in</span></>
                      ) : authLoading ? (
                        <><Loader2 size={10} className="animate-spin text-accent" /><span className="text-[10px] text-muted">Signing in…</span></>
                      ) : (
                        <><span className="w-1.5 h-1.5 rounded-full bg-warning" /><span className="text-[10px] text-warning">Not signed</span></>
                      )}
                    </div>
                  </div>
                </div>
                {!isAuthed && !authLoading && (
                  <button onClick={() => { loginAttempted.current = false; login(); }}
                    className="w-full mt-3 py-2 rounded-lg text-[12px] font-semibold text-accent bg-accent/10 border border-accent/20 hover:bg-accent/15 transition-colors">
                    Sign In with Wallet
                  </button>
                )}
              </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 p-4 space-y-1">
              {navLinks.map(link => {
                const isActive = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href}
                    className={`block px-4 py-3.5 rounded-xl text-[15px] font-medium transition-colors
                    ${isActive ? 'text-accent bg-accent/5' : 'text-muted hover:text-text hover:bg-white/[0.04]'}`}
                    onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </Link>
                );
              })}
              {isAuthed && address && (
                <Link href={`/profile/${address}`}
                  className="block px-4 py-3.5 rounded-xl text-[15px] font-medium text-muted hover:text-text hover:bg-white/[0.04] transition-colors"
                  onClick={() => setMobileOpen(false)}>
                  Profile
                </Link>
              )}
            </nav>

            {/* Bottom actions */}
            <div className="p-4 border-t border-white/[0.06] space-y-2">
              {isConnected ? (
                <button onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-danger bg-danger/10 border border-danger/20 hover:bg-danger/15 transition-colors">
                  <LogOut size={16} /> Disconnect
                </button>
              ) : (
                <button onClick={() => { setMobileOpen(false); setShowWalletModal(true); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-bg"
                  style={{ background: 'linear-gradient(135deg, #00E5FF, #8B5CF6)' }}>
                  <Wallet size={16} /> Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wallet menu backdrop */}
      {showWalletMenu && <div className="fixed inset-0 z-40" onClick={() => setShowWalletMenu(false)} />}

      {/* Wallet Connect Modal */}
      <WalletConnectModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnected={() => setShowWalletModal(false)}
      />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg/90 backdrop-blur-2xl border-t border-white/[0.06] safe-bottom">
        <div className="flex items-center justify-around py-2 px-1">
          {[
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[22px] h-[22px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: 'Home', href: '/' },
            { icon: <Search size={22} strokeWidth={1.8} />, label: 'Explore', href: '/explore' },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[22px] h-[22px]"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>, label: 'Drops', href: '/mint' },
            { icon: <Heart size={22} strokeWidth={1.8} />, label: 'Saved', href: '#' },
            { icon: <User size={22} strokeWidth={1.8} />, label: 'Profile', href: address ? `/profile/${address}` : '#',
              onClick: !isConnected ? (e) => { e.preventDefault(); setShowWalletModal(true); } : undefined },
          ].map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.label} href={item.href} onClick={item.onClick}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors min-w-[56px]
                ${isActive ? 'text-accent' : 'text-muted hover:text-text'}`}>
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
