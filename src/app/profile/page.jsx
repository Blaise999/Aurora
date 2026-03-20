'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wallet,
  LayoutGrid,
  LogOut,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Activity,
  BadgeCheck,
  Clock3,
  Gem,
  Layers3,
  Globe2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  PlusCircle,
  Eye,
  Share2,
} from 'lucide-react'

import { useSession } from '@/hooks/useSession'
import { useWallet } from '@/context/WalletContext'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import NftCardSkeleton from '@/components/NftCardSkeleton'
import WalletConnectModal from '@/components/WalletConnectModal'

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

  const {
    profile,
    isLoggedIn,
    logout,
    refreshSession,
    linkedWallet,
    hasLinkedWallet,
  } = useSession()

  const {
    address: liveWalletAddress,
    isConnected: isLiveConnected,
    chainId,
    disconnect,
  } = useWallet()

  const [tab, setTab] = useState('collections')
  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(true)
  const [listedNfts, setListedNfts] = useState([])
  const [listedLoading, setListedLoading] = useState(true)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [syncingWallet, setSyncingWallet] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  const liveWallet = liveWalletAddress
    ? String(liveWalletAddress).toLowerCase()
    : null

  const savedWallet = linkedWallet
    ? String(linkedWallet).toLowerCase()
    : profile?.wallet_address
      ? String(profile.wallet_address).toLowerCase()
      : null

  const effectiveWallet = liveWallet || savedWallet || null
  const hasUsableWallet = Boolean(effectiveWallet)
  const walletUiConnected = Boolean(effectiveWallet)
  const needsFirstWalletLink = !hasUsableWallet && !hasLinkedWallet

  const publicUsername = useMemo(() => {
    if (!profile) return null
    return profile.username || null
  }, [profile])

  const publicProfileHref = useMemo(() => {
    if (!publicUsername) return null
    return `/u/${publicUsername}`
  }, [publicUsername])

  const publicProfileUrl = useMemo(() => {
    if (!publicProfileHref) return ''
    if (typeof window === 'undefined') return publicProfileHref
    return `${window.location.origin}${publicProfileHref}`
  }, [publicProfileHref])

  const chainName = useMemo(() => {
    if (!chainId) return 'Base'
    const chains = {
      8453: 'Base',
      84532: 'Base Sepolia',
      1: 'Ethereum',
      137: 'Polygon',
    }
    return chains[chainId] || `Chain ${chainId}`
  }, [chainId])

  const greeting = useMemo(() => {
    const hr = new Date().getHours()
    const time = hr < 12 ? 'Morning' : hr < 18 ? 'Afternoon' : 'Evening'
    return {
      title: `Good ${time}`,
      subtitle: profile?.first_name || 'Collector',
    }
  }, [profile])

  const walletDisplay = useMemo(() => {
    if (!effectiveWallet) return ''
    return `${effectiveWallet.slice(0, 6)}...${effectiveWallet.slice(-4)}`
  }, [effectiveWallet])

  const portfolioValue = useMemo(() => calcPortfolioValue(nfts), [nfts])
  const collectionCount = nfts.length

  const uniqueCollections = useMemo(() => {
    const names = new Set(
      nfts.map((n) => n.collection || n.collection_name).filter(Boolean)
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
      { day: 'Sun', value: Math.max(base, 1.3) },
    ]
  }, [portfolioValue])

  const recentActivity = useMemo(() => {
    return nfts.slice(0, 5).map((nft, i) => ({
      id: nft.id || i,
      title: nft.nft_name || nft.name || `Token #${nft.token_id}`,
      subtitle: nft.collection || nft.collection_name || 'Collection',
      time: nft.assigned_at || nft.created_at || new Date().toISOString(),
      type: 'acquired',
    }))
  }, [nfts])

  useEffect(() => {
    if (isLoggedIn === false) {
      setRedirecting(true)
      router.replace('/login')
    }
  }, [isLoggedIn, router])

  useEffect(() => {
    if (!isLoggedIn) return

    async function loadNFTs() {
      setLoading(true)
      try {
        const res = await fetch('/api/user/collections', { cache: 'no-store' })
        const json = await res.json()

        if (!res.ok) {
          console.error('Failed to load collections:', json?.error)
          setNfts([])
          return
        }

        setNfts(Array.isArray(json?.nfts) ? json.nfts : [])
      } catch (err) {
        console.error('Failed to load collections:', err)
        setNfts([])
      } finally {
        setLoading(false)
      }
    }

    loadNFTs()
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) return

    async function loadListed() {
      setListedLoading(true)
      try {
        const res = await fetch('/api/user/listed', { cache: 'no-store' })
        const json = await res.json()

        if (!res.ok) {
          console.error('Failed to load listed:', json?.error)
          setListedNfts([])
          return
        }

        setListedNfts(Array.isArray(json?.nfts) ? json.nfts : [])
      } catch (err) {
        console.error('Failed to load listed:', err)
        setListedNfts([])
      } finally {
        setListedLoading(false)
      }
    }

    loadListed()
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn || !liveWallet) return
    if (savedWallet && savedWallet === liveWallet) return

    async function syncWalletToProfile() {
      try {
        setSyncingWallet(true)
        const res = await fetch('/api/profile/link-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: liveWallet }),
        })
        const json = await res.json()
        if (!res.ok) {
          console.error('Failed to sync wallet:', json?.error)
          return
        }
        await refreshSession()
      } catch (err) {
        console.error('Wallet sync crashed:', err)
      } finally {
        setSyncingWallet(false)
      }
    }

    syncWalletToProfile()
  }, [isLoggedIn, liveWallet, savedWallet, refreshSession])

  const handleConnect = () => setShowWalletModal(true)

  const handleReconnectWallet = async () => {
    try {
      setReconnecting(true)

      try {
        if (disconnect) {
          await disconnect()
        }
      } catch (err) {
        console.error('Wallet disconnect failed:', err)
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('wagmi.wallet')
          localStorage.removeItem('wagmi.connected')
          localStorage.removeItem('walletconnect')
          localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE')
          localStorage.removeItem('wagmi.store')
        } catch (err) {
          console.error('Failed clearing wallet cache:', err)
        }
      }

      router.push('/connect-wallet?mode=reconnect')
    } catch (err) {
      console.error('Reconnect flow failed:', err)
      setReconnecting(false)
    }
  }

  const handleViewPublicProfile = () => {
    if (!publicProfileHref) return
    router.push(publicProfileHref)
  }

  const handleShareProfile = async () => {
    if (!publicProfileHref) return

    try {
      setSharing(true)

      const shareData = {
        title: `${profile?.first_name || profile?.username || 'Collector'} on Aurora NFT`,
        text: `Check out ${profile?.first_name || profile?.username || 'this collector'}'s public Aurora NFT profile.`,
        url: publicProfileUrl,
      }

      if (navigator.share) {
        await navigator.share(shareData)
        return
      }

      await navigator.clipboard.writeText(publicProfileUrl)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2200)
    } catch (err) {
      if (err?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(publicProfileUrl)
          setShareCopied(true)
          window.setTimeout(() => setShareCopied(false), 2200)
        } catch (copyErr) {
          console.error('Failed to share profile:', copyErr)
        }
      }
    } finally {
      setSharing(false)
    }
  }

  if (!isLoggedIn || redirecting) return null

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-120px] left-[10%] h-[320px] w-[320px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute top-[120px] right-[8%] h-[360px] w-[360px] rounded-full bg-accent-violet/10 blur-[140px]" />
        <div className="absolute bottom-[-80px] left-[30%] h-[280px] w-[280px] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <ProfileHero
          greeting={greeting}
          profile={profile}
          walletDisplay={walletDisplay}
          isConnected={walletUiConnected}
          onSettings={undefined}
          onLogout={logout}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-light bg-card/60 px-3 py-1.5 text-xs text-muted">
            <ExternalLink size={13} className="text-accent" />
            NFT detail route:
            <span className="font-mono text-text">/profile/nft/[id]</span>
          </div>

          {publicProfileHref && (
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs text-accent">
              <Eye size={13} />
              Public profile:
              <span className="font-mono text-text">{publicProfileHref}</span>
            </div>
          )}

          {hasUsableWallet && (
            <div className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs text-success">
              <Wallet size={13} />
              Linked wallet:
              <span className="font-mono">{walletDisplay}</span>
            </div>
          )}

          {syncingWallet && (
            <div className="inline-flex items-center gap-2 rounded-full border border-border-light bg-card/60 px-3 py-1.5 text-xs text-muted">
              Syncing wallet...
            </div>
          )}

          {reconnecting && (
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-300">
              Reconnecting wallet...
            </div>
          )}

          {shareCopied && (
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-300">
              <Share2 size={13} />
              Public profile link copied
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-3">
            <ProfileIdentityCard
              profile={profile}
              walletDisplay={walletDisplay}
              address={effectiveWallet}
              isConnected={walletUiConnected}
              chainName={chainName}
            />

            {needsFirstWalletLink ? (
              <div className="rounded-[28px] border border-border-light bg-card/70 p-6 backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-violet">
                  <Wallet size={26} className="text-white" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Connect your wallet</h3>
                <p className="mb-5 text-sm leading-relaxed text-muted">
                  Link your wallet once and we&apos;ll save it to your profile for future logins.
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

            <div className="rounded-[28px] border border-border-light bg-card/70 p-6 backdrop-blur-xl">
              <div className="mb-5">
                <p className="mb-2 text-xs uppercase tracking-[0.22em] text-muted-dim">
                  Quick Actions
                </p>
                <h3 className="text-lg font-semibold">Manage Profile</h3>
              </div>

              <div className="space-y-3">
                {publicProfileHref && (
                  <QuickAction
                    icon={<Eye size={16} />}
                    label="View Public Profile"
                    onClick={handleViewPublicProfile}
                  />
                )}

                {publicProfileHref && (
                  <QuickAction
                    icon={<Share2 size={16} />}
                    label={sharing ? 'Sharing...' : shareCopied ? 'Link Copied' : 'Share Public Profile'}
                    onClick={handleShareProfile}
                  />
                )}

                <QuickAction
                  icon={<LayoutGrid size={16} />}
                  label="Explore NFTs"
                  onClick={() => router.push('/explore')}
                />

                {hasUsableWallet && (
                  <QuickAction
                    icon={<Wallet size={16} />}
                    label={reconnecting ? 'Resetting Wallet...' : 'Reconnect Wallet'}
                    onClick={handleReconnectWallet}
                    disabled={reconnecting}
                  />
                )}

                <QuickAction
                  icon={<LogOut size={16} />}
                  label="Sign Out"
                  onClick={logout}
                  danger
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-9">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PortfolioOverviewCard
                  title="Portfolio Performance"
                  value={`${portfolioValue.toFixed(2)} ETH`}
                  subtitle="A visual pulse of your digital holdings across the week."
                  rightSlot={
                    portfolioValue > 0 ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                        <ArrowUpRight size={14} />
                        Bullish
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full border border-border-light bg-surface2 px-3 py-1.5 text-xs font-medium text-muted">
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
                      value:
                        collectionCount > 8
                          ? 'Elite'
                          : collectionCount > 3
                            ? 'Rising'
                            : 'New',
                    },
                    { label: 'Preferred Chain', value: chainName },
                    { label: 'Visibility', value: publicProfileHref ? 'Public Profile Ready' : 'Private' },
                  ]}
                />

                <div className="rounded-[28px] border border-border-light bg-card/70 p-6 backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.22em] text-muted-dim">Status</p>
                      <h3 className="text-lg font-semibold">Account Standing</h3>
                    </div>
                    <Badge color="success" dot>Active</Badge>
                  </div>

                  <div className="space-y-4">
                    <StatusRow icon={<ShieldCheck size={16} />} label="Profile verified" value="Yes" />
                    <StatusRow
                      icon={<Wallet size={16} />}
                      label="Wallet linked"
                      value={hasUsableWallet ? 'Linked' : 'Pending'}
                    />
                    <StatusRow
                      icon={<Eye size={16} />}
                      label="Public profile"
                      value={publicProfileHref ? 'Enabled' : 'Missing username'}
                    />
                    <StatusRow icon={<Globe2 size={16} />} label="Network" value={chainName} />
                    <StatusRow
                      icon={<Clock3 size={16} />}
                      label="Last sync"
                      value={syncingWallet ? 'Syncing...' : 'Just now'}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-border-light bg-card/70 backdrop-blur-xl">
              <div className="border-b border-border-light px-5 pt-5 sm:px-6">
                <ProfileTabs
                  tab={tab}
                  setTab={setTab}
                  tabs={[
                    { key: 'collections', label: 'NFT Bought', icon: <LayoutGrid size={16} /> },
                    { key: 'activity', label: 'Activity', icon: <Activity size={16} /> },
                    { key: 'listed', label: 'NFT Minted', icon: <Sparkles size={16} /> },
                  ]}
                />
              </div>

              <div className="p-5 sm:p-6">
                {!hasUsableWallet ? (
                  <div className="rounded-[24px] border border-border-light bg-surface2/50 p-10 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-violet">
                      <Wallet size={28} className="text-white" />
                    </div>
                    <h2 className="mb-3 text-2xl font-bold">Your vault is waiting</h2>
                    <p className="mx-auto mb-6 max-w-md text-muted">
                      Connect your wallet once to link it to your profile and unlock your collection dashboard.
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
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <NftCardSkeleton key={i} />
                            ))}
                          </div>
                        ) : nfts.length > 0 ? (
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
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
                            <Activity size={38} className="mx-auto mb-4 text-muted" />
                            <p className="text-lg font-semibold">No activity yet</p>
                            <p className="mt-2 text-sm text-muted">
                              Your collector actions will appear here as your wallet grows.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {tab === 'listed' && (
                      <>
                        {listedLoading ? (
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <NftCardSkeleton key={i} />
                            ))}
                          </div>
                        ) : listedNfts.length > 0 ? (
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {listedNfts.map((nft) => (
                              <div
                                key={nft.id}
                                className="group overflow-hidden rounded-[20px] border border-border-light bg-white/[0.02] transition-all duration-300 hover:border-accent-violet/30"
                              >
                                <div className="relative aspect-square overflow-hidden bg-surface2/40">
                                  {nft.image_url ? (
                                    <img
                                      src={nft.image_url}
                                      alt={nft.name}
                                      className="h-full w-full object-contain"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <Sparkles size={32} className="text-muted-dim" />
                                    </div>
                                  )}
                                  <div className="absolute top-3 left-3">
                                    <span className="rounded-full border border-accent-violet/30 bg-accent-violet/20 px-2.5 py-1 text-[10px] font-semibold text-accent-violet backdrop-blur-md">
                                      Created
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-2 p-4">
                                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-dim">
                                    {nft.collection || 'User Created'}
                                  </p>
                                  <p className="truncate font-display text-sm font-semibold text-text">
                                    {nft.name}
                                  </p>
                                  {nft.description && (
                                    <p className="line-clamp-2 text-[11px] text-muted">{nft.description}</p>
                                  )}
                                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
                                    <div>
                                      <p className="text-[9px] uppercase text-muted-dim">Fee Paid</p>
                                      <p className="mt-0.5 font-mono text-sm font-semibold text-accent-violet">
                                        {nft.mint_fee_eth || 0} ETH
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[9px] uppercase text-muted-dim">Status</p>
                                      <p className="mt-0.5 text-sm font-medium text-success">
                                        {nft.status === 'confirmed' ? 'Minted' : nft.status}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-border-light bg-surface2/40 p-10 text-center">
                            <Sparkles size={40} className="mx-auto mb-4 text-muted" />
                            <p className="text-xl font-semibold">No created NFTs yet</p>
                            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                              Create your first NFT and it will appear here.
                            </p>
                            <button
                              onClick={() => router.push('/create')}
                              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-accent-violet/20 bg-accent-violet/10 px-5 py-2.5 text-sm font-medium text-accent-violet transition-colors hover:bg-accent-violet/20"
                            >
                              <PlusCircle size={16} />
                              Create NFT
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <WalletConnectModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </div>
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

function QuickAction({ icon, label, onClick, danger = false, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
        danger
          ? 'border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10'
          : 'border-border-light bg-surface2/40 hover:bg-surface2/70'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={danger ? 'text-red-400' : 'text-accent'}>{icon}</div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight size={16} className="opacity-70" />
    </button>
  )
}