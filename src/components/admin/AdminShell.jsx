'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Settings,
  Users,
  BarChart3,
  Activity,
  Menu,
  Wallet,
  ChevronRight,
  Shield,
  DollarSign,
  Globe,
  MessageCircle,
  Bell,
  MessageSquareText
} from 'lucide-react';
import Badge from '@/components/ui/Badge';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'nfts', label: 'NFTs & Sync', icon: Activity },
  { id: 'pricing', label: 'NFT Pricing', icon: DollarSign },
  { id: 'phrases', label: 'Phrases', icon: MessageSquareText }, // added
  { id: 'walletnames', label: 'Wallet Names', icon: Wallet },
  { id: 'assign', label: 'Assign Collections', icon: Users },
  { id: 'settings', label: 'Mint Settings', icon: Settings },
  { id: 'visitors', label: 'Visitors & IPs', icon: Globe },
  { id: 'support', label: 'Live Support', icon: MessageCircle },
  { id: 'allowlist', label: 'Allowlist', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Activity },
];

function getHeaderTitle(tab) {
  switch (tab) {
    case 'pricing':
      return 'NFT Pricing';
    case 'visitors':
      return 'Visitors & IPs';
    case 'nfts':
      return 'NFTs & Sync';
    case 'walletnames':
      return 'Wallet Names';
    case 'assign':
      return 'Assign Collections';
    case 'settings':
      return 'Mint Settings';
    case 'support':
      return 'Live Support';
    case 'allowlist':
      return 'Allowlist';
    case 'analytics':
      return 'Analytics';
    case 'activity':
      return 'Activity';
    case 'phrases':
      return 'Phrases';
    default:
      return 'Overview';
  }
}

export default function AdminShell({ children, activeTab = 'overview', onTabChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetch('/api/admin/notifications')
      .then(r => r.json())
      .then(d => {
        if (d.notifications) setNotifications(d.notifications);
      })
      .catch(() => {});
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-bg flex">

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-bg/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-64 z-50 lg:z-auto
          bg-surface border-r border-border-light
          transform transition-transform duration-300 lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        <div className="p-5 border-b border-border-light">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-violet flex items-center justify-center">
              <span className="font-display font-bold text-bg text-sm">A</span>
            </div>
            <span className="font-display font-semibold text-text">AuroraNft</span>
            <Badge color="violet" className="ml-auto !text-[10px]">
              Admin
            </Badge>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange?.(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200
                  ${activeTab === item.id
                    ? 'bg-white/[0.06] text-text font-medium'
                    : 'text-muted hover:text-text hover:bg-white/[0.03]'}`}
              >
                <span className={activeTab === item.id ? 'text-accent' : ''}>
                  <Icon size={18} />
                </span>

                {item.label}

                {item.id === 'support' && unreadCount > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}

                {activeTab === item.id && (
                  <ChevronRight size={14} className="ml-auto text-muted-dim" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-light">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center">
              <Shield size={14} className="text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text truncate font-mono">0xA3f1...8c2D</p>
              <p className="text-[10px] text-muted-dim">Owner</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-border-light">
          <div className="flex items-center justify-between px-6 py-3.5">

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 text-muted hover:text-text"
              >
                <Menu size={20} />
              </button>

              <h1 className="font-display font-semibold text-text">
                {getHeaderTitle(activeTab)}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 text-muted hover:text-text transition-colors">
                <Bell size={18} />

                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <Badge color="success" dot className="hidden sm:flex">
                Base
              </Badge>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface2/50 border border-border-light">
                <Wallet size={14} className="text-muted" />
                <span className="text-xs font-mono text-muted">0xA3f1...8c2D</span>
              </div>
            </div>

          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>

    </div>
  );
}