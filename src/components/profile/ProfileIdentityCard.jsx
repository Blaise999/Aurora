'use client'

import { ShieldCheck, Wallet, User2, Globe2 } from 'lucide-react'

export default function ProfileIdentityCard({
  profile,
  walletDisplay,
  address,
  isConnected,
  chainName
}) {
  const initials =
    profile?.first_name?.[0]?.toUpperCase() ||
    profile?.username?.[0]?.toUpperCase() ||
    'U'

  return (
    <div className="rounded-[28px] border border-border-light bg-card/70 backdrop-blur-xl p-6">
      <div className="flex items-center gap-4 mb-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-violet flex items-center justify-center text-white text-xl font-bold shadow-lg">
            {initials}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success border-4 border-card flex items-center justify-center">
            <ShieldCheck size={12} className="text-white" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold">
            {profile?.first_name || 'Collector'}
          </h3>
          <p className="text-sm text-muted">
            @{profile?.username || 'member'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <InfoRow icon={<User2 size={15} />} label="Display Name" value={profile?.first_name || 'Collector'} />
        <InfoRow icon={<Wallet size={15} />} label="Wallet" value={isConnected ? walletDisplay || 'Connected' : 'Not connected'} mono />
        <InfoRow icon={<Globe2 size={15} />} label="Network" value={isConnected ? chainName : 'Unavailable'} />
        <InfoRow icon={<ShieldCheck size={15} />} label="Verification" value="Verified" />
      </div>

      {address && (
        <div className="mt-5 rounded-2xl border border-border-light bg-surface2/50 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-dim mb-2">
            Full Address
          </p>
          <p className="text-xs font-mono break-all text-muted leading-relaxed">
            {address}
          </p>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-surface2/40 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-accent">{icon}</div>
        <span className="text-sm text-muted">{label}</span>
      </div>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}