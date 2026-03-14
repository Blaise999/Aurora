'use client'

import { ShieldCheck, Sparkles, Settings, LogOut } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

export default function ProfileHero({
  greeting,
  profile,
  walletDisplay,
  isConnected,
  onSettings,
  onLogout
}) {
  return (
    <div className="relative overflow-hidden rounded-[34px] border border-border-light bg-card/70 backdrop-blur-xl p-6 sm:p-8 lg:p-10">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_30%,rgba(139,92,246,0.08))]" />
      <div className="absolute right-[-60px] top-[-60px] h-[220px] w-[220px] rounded-full bg-accent/10 blur-[90px]" />
      <div className="absolute left-[20%] bottom-[-50px] h-[180px] w-[180px] rounded-full bg-accent-violet/10 blur-[90px]" />

      <div className="relative z-10 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge color="success" dot>
              Verified Collector
            </Badge>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface2/50 px-3 py-1.5 text-xs text-muted">
              <ShieldCheck size={13} className="text-success" />
              Wallet-secured identity
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
            {greeting.title},{' '}
            <span className="text-accent">
              {greeting.subtitle}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted mt-4 max-w-2xl leading-relaxed">
            Welcome to your premium collector vault — a cinematic space for your
            digital identity, NFT portfolio, and onchain presence.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-surface2/50 px-4 py-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-violet flex items-center justify-center text-white">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-xs text-muted-dim">Collector Handle</p>
                <p className="text-sm font-medium">
                  @{profile?.username || 'member'}
                </p>
              </div>
            </div>

            {isConnected && walletDisplay && (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-border-light bg-surface2/50 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-xs text-muted-dim">Connected Wallet</p>
                  <p className="text-sm font-mono font-medium">{walletDisplay}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onSettings}>
            <Settings size={16} />
            Preferences
          </Button>
          <Button variant="ghost" onClick={onLogout} className="text-red-400">
            <LogOut size={16} />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}