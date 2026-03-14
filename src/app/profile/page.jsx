'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import {
  Wallet,
  LayoutGrid,
  Tag,
  LogOut,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Activity,
  BadgeCheck,
  Clock3,
  Gem,
  Layers3,
  BarChart3,
  Eye,
  ChevronRight,
  Globe2,
  ExternalLink
} from 'lucide-react'

import PageShell from '@/components/layout/PageShell'
import { useSession } from '@/hooks/useSession'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import NftCardSkeleton from '@/components/NftCardSkeleton'

import ProfileHero from '@/components/profile/ProfileHero'
import ProfileIdentityCard from '@/components/profile/ProfileIdentityCard'
import PortfolioOverviewCard from '@/components/profile/PortfolioOverviewCard'
import PortfolioMiniStat from '@/components/profile/PortfolioMiniStat'
import CollectorInsightsCard from '@/components/profile/CollectorInsightsCard'
import ProfileTabs from '@/components/profile/ProfileTabs'
import CollectionGridCard from '@/components/profile/CollectionGridCard'
import EmptyCollectionState from '@/components/profile/EmptyCollectionState'
import ActivityTimeline from '@/components/profile/ActivityTimeline'
import MarketPulseCard from '@/components/profile/MarketPulseCard'

import PortfolioChart from '@/components/dashboard/PortfolioChart'
import { calcPortfolioValue } from '@/lib/portfolio/calcPortfolioValue'

export default function PremiumProfilePage() {
  const router = useRouter()
  const { address, isConnected, chain } = useAccount()
  const { profile, isLoggedIn, logout } = useSession()

  const [tab, setTab] = useState('collections')
  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(true)

  const greeting = useMemo(() => {
    const hr = new Date().getHours()
    const time = hr < 12 ? 'Morning' : hr < 18 ? 'Afternoon' : 'Evening'
    return {
      title: `Good ${time}`,
      subtitle: profile?.first_name || 'Collector'
    }
  }, [profile])

  const walletDisplay = useMemo(() => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [address])

  const portfolioValue = useMemo(() => calcPortfolioValue(nfts), [nfts])

  const collectionCount = nfts.length

  const uniqueCollections = useMemo(() => {
    const names = new Set(
      nfts
        .map((n) => n.collection || n.collection_name)
        .filter(Boolean)
    )
    return names.size
  }, [nfts])

  const rareCount = useMemo(() => {
    return nfts.filter((n) => {
      const attrs = Array.isArray(n.attributes) ? n.attributes : []
      return attrs.length >= 4
    }).length
  }, [nfts])

  const portfolioHistory = useMemo(() => {
    const base = portfolioValue || 1.8
    return [
      { day: 'Mon', value: Math.max(base * 0.52, 0.4) },
      { day: 'Tue', value: Math.max(base * 0.58, 0.5) },
      { day: 'Wed', value: Math.max(base * 0.63, 0.7) },
      { day: 'Thu', value: Math.max(base * 0.61, 0.65) },
      { day: 'Fri', value: Math.max(base * 0.72, 0.9) },
      { day: 'Sat', value: Math.max(base * 0.81, 1.1) },
      { day: 'Sun', value: Math.max(base, 1.3) }
    ]
  }, [portfolioValue])

  const recentActivity = useMemo(() => {
    return nfts.slice(0, 5).map((nft, i) => ({
      id: nft.id || i,
      title: nft.nft_name || nft.name || `Token #${nft.token_id}`,
      subtitle: nft.collection || 'Collection',
      time: nft.assigned_at || nft.created_at || new Date().toISOString(),
      type: 'acquired'
    }))
  }, [nfts])

  useEffect(() => {
    if (!isLoggedIn) return

    if (!isConnected || !profile?.id) {
      setLoading(false)
      return
    }

    async function loadNFTs() {
      setLoading(true)
      try {
        const res = await fetch('/api/user/collections')
        const json = await res.json()
        setNfts(json?.nfts || [])
      } catch (err) {
        console.error('Failed to load collections:', err)
      } finally {
        setLoading(false)
      }
    }

    loadNFTs()
  }, [isLoggedIn, isConnected, profile?.id])

  if (!isLoggedIn) {
    router.push('/login')
    return null
  }

  const handleConnect = () => {
    router.push('/welcome')
  }

  return (
    <PageShell>
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-120px] left-[10%] h-[320px] w-[320px] rounded-full bg-accent/10 blur-[120px]" />
          <div className="absolute top-[120px] right-[8%] h-[360px] w-[360px] rounded-full bg-accent-violet/10 blur-[140px]" />
          <div className="absolute bottom-[-80px] left-[30%] h-[280px] w-[280px] rounded-full bg-cyan-500/10 blur-[130px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%)]" />
        </div>

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <ProfileHero
            greeting={greeting}
            profile={profile}
            walletDisplay={walletDisplay}
            isConnected={isConnected}
            onSettings={undefined}
            onLogout={logout}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-light bg-card/60 px-3 py-1.5 text-xs text-muted">
              <ExternalLink size={13} className="text-accent" />
              NFT detail route:
              <span className="font-mono text-text">/profile/nft/[id]</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-8">
            <div className="xl:col-span-3 space-y-6">
              <ProfileIdentityCard
                profile={profile}
                walletDisplay={walletDisplay}
                address={address}
                isConnected={isConnected}
                chainName={chain?.name || 'Base'}
              />

              {!isConnected ? (
                <div className="rounded-[28px] border border-border-light bg-card/70 backdrop-blur-xl p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-violet flex items-center justify-center mb-4">
                    <Wallet size={26} className="text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Connect your wallet</h3>
                  <p className="text-sm text-muted leading-relaxed mb-5">
                    Unlock your full collector identity, verify ownership, and manage your onchain assets.
                  </p>
                  <Button onClick={handleConnect} size="lg" className="w-full">
                    <Wallet size={16} />
                    Connect Wallet
                  </Button>
                </div>
              ) : (
                <CollectorInsightsCard
                  totalNfts={collectionCount}
                  uniqueCollections={uniqueCollections}
                  rareCount={rareCount}
                  portfolioValue={portfolioValue}
                />
              )}

              <ActivityTimeline items={recentActivity} />
            </div>

            <div className="xl:col-span-9 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <PortfolioMiniStat
                  icon={<TrendingUp size={18} />}
                  label="Portfolio Value"
                  value={`${portfolioValue.toFixed(2)} ETH`}
                  hint="+12.4% this week"
                />
                <PortfolioMiniStat
                  icon={<LayoutGrid size={18} />}
                  label="Total NFTs"
                  value={String(collectionCount)}
                  hint="Across your vault"
                />
                <PortfolioMiniStat
                  icon={<Layers3 size={18} />}
                  label="Collections"
                  value={String(uniqueCollections)}
                  hint="Curated holdings"
                />
                <PortfolioMiniStat
                  icon={<Gem size={18} />}
                  label="Rare Traits"
                  value={String(rareCount)}
                  hint="High-attribute assets"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <PortfolioOverviewCard
                    title="Portfolio Performance"
                    value={`${portfolioValue.toFixed(2)} ETH`}
                    subtitle="A visual pulse of your digital holdings across the week."
                    rightSlot={
                      portfolioValue > 0 ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-xs font-medium">
                          <ArrowUpRight size={14} />
                          Bullish
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface2 border border-border-light text-muted text-xs font-medium">
                          No holdings yet
                        </div>
                      )
                    }
                  >
                    <div className="mt-6">
                      <PortfolioChart data={portfolioHistory} />
                    </div>
                  </PortfolioOverviewCard>
                </div>

                <div className="space-y-6">
                  <MarketPulseCard
                    items={[
                      {
                        label: 'Collector Rank',
                        value: collectionCount > 8 ? 'Elite' : collectionCount > 3 ? 'Rising' : 'New'
                      },
                      {
                        label: 'Preferred Chain',
                        value: chain?.name || 'Base'
                      },
                      {
                        label: 'Visibility',
                        value: 'Verified'
                      }
                    ]}
                  />

                  <div className="rounded-[28px] border border-border-light bg-card/70 backdrop-blur-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-dim mb-2">
                          Status
                        </p>
                        <h3 className="text-lg font-semibold">Account Standing</h3>
                      </div>
                      <Badge color="success" dot>
                        Active
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <StatusRow icon={<ShieldCheck size={16} />} label="Profile verified" value="Yes" />
                      <StatusRow icon={<Wallet size={16} />} label="Wallet linked" value={isConnected ? 'Connected' : 'Pending'} />
                      <StatusRow icon={<Globe2 size={16} />} label="Network" value={chain?.name || 'Not detected'} />
                      <StatusRow icon={<Clock3 size={16} />} label="Last sync" value="Just now" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-border-light bg-card/70 backdrop-blur-xl overflow-hidden">
                <div className="border-b border-border-light px-5 sm:px-6 pt-5">
                  <ProfileTabs
                    tab={tab}
                    setTab={setTab}
                    tabs={[
                      { key: 'collections', label: 'Collections', icon: <LayoutGrid size={16} /> },
                      { key: 'activity', label: 'Activity', icon: <Activity size={16} /> },
                      { key: 'listed', label: 'Listed', icon: <Tag size={16} /> }
                    ]}
                  />
                </div>

                <div className="p-5 sm:p-6">
                  {!isConnected ? (
                    <div className="rounded-[24px] border border-border-light bg-surface2/50 p-10 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-violet flex items-center justify-center mx-auto mb-5">
                        <Wallet size={28} className="text-white" />
                      </div>
                      <h2 className="text-2xl font-bold mb-3">Your vault is waiting</h2>
                      <p className="text-muted max-w-md mx-auto mb-6">
                        Connect your wallet to unlock your collection, profile insights, and collector dashboard.
                      </p>
                      <Button onClick={handleConnect} size="lg">
                        <Wallet size={16} />
                        Connect Wallet
                      </Button>
                    </div>
                  ) : (
                    <>
                      {tab === 'collections' && (
                        <>
                          {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                              {Array.from({ length: 8 }).map((_, i) => (
                                <NftCardSkeleton key={i} />
                              ))}
                            </div>
                          ) : nfts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                              {nfts.map((nft) => (
                                <CollectionGridCard
                                  key={nft.id}
                                  nft={nft}
                                  ownerName={profile?.first_name || 'You'}
                                  onClick={() => router.push(`/profile/nft/${nft.id}`)}
                                />
                              ))}
                            </div>
                          ) : (
                            <EmptyCollectionState onExplore={() => router.push('/explore')} />
                          )}
                        </>
                      )}

                      {tab === 'activity' && (
                        <div className="space-y-4">
                          {recentActivity.length > 0 ? (
                            recentActivity.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-4 rounded-2xl border border-border-light bg-surface2/40 px-4 py-4"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                                    <BadgeCheck size={18} />
                                  </div>
                                  <div>
                                    <p className="font-medium">{item.title}</p>
                                    <p className="text-sm text-muted">
                                      Added to your collection • {item.subtitle}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="text-sm font-medium">Acquired</p>
                                  <p className="text-xs text-muted-dim">
                                    {new Date(item.time).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-border-light bg-surface2/40 p-10 text-center">
                              <Activity size={38} className="mx-auto text-muted mb-4" />
                              <p className="text-lg font-semibold">No activity yet</p>
                              <p className="text-sm text-muted mt-2">
                                Your collector actions will appear here as your wallet grows.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {tab === 'listed' && (
                        <div className="rounded-2xl border border-border-light bg-surface2/40 p-10 text-center">
                          <Tag size={40} className="mx-auto text-muted mb-4" />
                          <p className="text-xl font-semibold">No active listings yet</p>
                          <p className="text-sm text-muted mt-2 max-w-md mx-auto">
                            When marketplace listing goes live, your assets for sale will appear here with pricing and status.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2" />

                <div className="rounded-[28px] border border-border-light bg-card/70 backdrop-blur-xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-dim mb-2">
                        Quick Actions
                      </p>
                      <h3 className="text-lg font-semibold">Manage Profile</h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <QuickAction
                      icon={<LayoutGrid size={16} />}
                      label="Explore NFTs"
                      onClick={() => router.push('/explore')}
                    />
                    <QuickAction
                      icon={<LogOut size={16} />}
                      label="Sign Out"
                      onClick={logout}
                      danger
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

function StatusRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-light bg-surface2/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="text-accent">{icon}</div>
        <span className="text-sm text-muted">{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function QuickAction({ icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 transition-all ${
        danger
          ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400'
          : 'border-border-light bg-surface2/40 hover:bg-surface2/70'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={danger ? 'text-red-400' : 'text-accent'}>
          {icon}
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight size={16} className="opacity-70" />
    </button>
  )
}