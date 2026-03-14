'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import {
  Wallet,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react'

import PageShell from '@/components/layout/PageShell'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useSession } from '@/hooks/useSession'
import { getExplorerUrl } from '@/lib/web3/contract'

export default function ProfileNftDetailPage() {
  const params = useParams()
  const router = useRouter()
  const collectionRowId = params?.id

  const { address, isConnected } = useAccount()
  const { profile, isLoggedIn } = useSession()

  const [nft, setNft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgZoomed, setImgZoomed] = useState(false)

  const explorerUrl = getExplorerUrl()

  useEffect(() => {
    if (isLoggedIn === false) {
      router.push('/login')
    }
  }, [isLoggedIn, router])

  useEffect(() => {
    if (!collectionRowId || isLoggedIn !== true) return

    async function loadOwnedNft() {
      setLoading(true)

      try {
        const res = await fetch(`/api/user/collections/${collectionRowId}`)
        const json = await res.json()

        if (!res.ok || !json?.nft) {
          setNft(null)
          return
        }

        setNft(json.nft)
      } catch (err) {
        console.error('Failed to load NFT:', err)
        setNft(null)
      } finally {
        setLoading(false)
      }
    }

    loadOwnedNft()
  }, [collectionRowId, isLoggedIn])

  const parsedAttributes = useMemo(() => {
    if (!nft?.attributes) return []
    if (Array.isArray(nft.attributes)) return nft.attributes

    try {
      const parsed = JSON.parse(nft.attributes)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [nft])

  const nftName = nft?.nft_name || nft?.name || `Token #${nft?.token_id || ''}`
  const nftImage = nft?.image_url || nft?.image || '/placeholder-nft.png'
  const nftDesc =
    nft?.description || 'A unique digital collectible from your personal collection.'

  const chainLabel = useMemo(() => {
    if (!nft?.chain_id) return 'Base'
    if (String(nft.chain_id) === '8453') return 'Base'
    if (String(nft.chain_id) === '84532') return 'Base Sepolia'
    return `Chain ${nft.chain_id}`
  }, [nft])

  const explorerLink =
    nft?.contract_address && nft?.token_id
      ? `${explorerUrl}/token/${nft.contract_address}?a=${nft.token_id}`
      : null

  if (isLoggedIn === false) return null

  return (
    <PageShell>
      <div className="min-h-screen">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/3 rounded-full blur-[200px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-violet/4 rounded-full blur-[180px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <nav className="flex items-center gap-2 text-xs text-muted-dim mb-6">
            <Link href="/" className="hover:text-accent transition-colors">Home</Link>
            <span>/</span>
            <Link href="/profile" className="hover:text-accent transition-colors">Profile</Link>
            <span>/</span>
            <span className="text-text">{loading ? 'Loading...' : nftName}</span>
          </nav>

          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.push('/profile')}>
              <ArrowLeft size={16} />
              Back to Profile
            </Button>
          </div>

          {!isConnected ? (
            <div className="max-w-2xl mx-auto rounded-3xl border border-border-light bg-surface2 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                <Wallet size={30} className="text-accent" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Connect Your Wallet</h2>
              <p className="text-muted mb-6">
                Connect your wallet to view this NFT inside your collection.
              </p>
              <Button onClick={() => router.push('/welcome')} size="lg">
                <Wallet size={16} />
                Connect Wallet
              </Button>
            </div>
          ) : loading ? (
            <div className="grid lg:grid-cols-5 gap-6 lg:gap-10">
              <div className="lg:col-span-3 space-y-6">
                <div className="aspect-square rounded-card shimmer" />
                <div className="rounded-card bg-surface2 border border-border-light p-6 space-y-3">
                  <div className="h-8 w-2/3 rounded shimmer" />
                  <div className="h-4 w-full rounded shimmer" />
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="rounded-card bg-surface2 border border-border-light p-6 space-y-4">
                  <div className="h-6 w-1/2 rounded shimmer" />
                  <div className="h-12 rounded-pill shimmer" />
                </div>
              </div>
            </div>
          ) : !nft ? (
            <div className="max-w-xl mx-auto rounded-2xl border border-danger/20 bg-danger/10 p-6 text-center">
              <AlertTriangle className="mx-auto mb-3 text-danger" />
              <p className="font-medium text-danger">NFT not found</p>
              <p className="text-sm text-muted mt-2">
                This item may not belong to this user, or the collection row id is wrong.
              </p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-5 gap-6 lg:gap-10">
              <div className="lg:col-span-3 space-y-6">
                <div
                  className={`relative rounded-card overflow-hidden border border-border-light shadow-card ${
                    imgZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  onClick={() => setImgZoomed(!imgZoomed)}
                >
                  <div
                    className={`relative ${
                      imgZoomed ? 'aspect-auto min-h-[500px]' : 'aspect-square'
                    } transition-all duration-500`}
                  >
                    <Image
                      src={nftImage}
                      alt={nftName}
                      fill
                      className={`object-contain transition-transform duration-500 ${
                        imgZoomed ? 'scale-110' : ''
                      }`}
                      sizes="(max-width:1024px) 100vw, 60vw"
                      priority
                    />
                  </div>

                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-pill bg-surface/80 backdrop-blur-sm border border-border-light text-xs font-display font-semibold">
                    {nft.collection || 'Collection'}
                  </div>
                </div>

                {explorerLink && (
                  <div className="flex justify-center sm:justify-start">
                    <a
                      href={explorerLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface2 border border-border-light text-sm font-medium text-accent hover:bg-surface2/80 hover:border-accent/40 transition-colors group shadow-sm"
                    >
                      <ExternalLink size={18} className="group-hover:rotate-12 transition-transform" />
                      View on Explorer
                    </a>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="rounded-card bg-surface2 border border-border-light p-5 sm:p-6">
                    <h1 className="font-display font-extrabold text-2xl sm:text-3xl mb-3">
                      {nftName}
                    </h1>
                    <p className="text-sm text-muted leading-relaxed">{nftDesc}</p>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="px-3 py-1 rounded-pill bg-accent/10 text-xs text-accent font-medium border border-accent/20">
                        {nft.token_type || nft.tokenType || 'ERC-721'}
                      </span>
                      <span className="px-3 py-1 rounded-pill bg-accent-violet/10 text-xs text-accent-violet font-medium border border-accent-violet/20">
                        {chainLabel}
                      </span>
                      <span className="px-3 py-1 rounded-pill bg-success/10 text-xs text-success font-medium border border-success/20">
                        Owned
                      </span>
                    </div>
                  </div>

                  <div className="rounded-card bg-surface2 border border-border-light p-5 sm:p-6">
                    <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted mb-4">
                      Details
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { l: 'Token ID', v: nft.token_id || '—' },
                        {
                          l: 'Contract',
                          v: nft.contract_address
                            ? `${nft.contract_address.slice(0, 6)}...${nft.contract_address.slice(-4)}`
                            : '—'
                        },
                        { l: 'Collection', v: nft.collection || '—' },
                        { l: 'Chain', v: chainLabel }
                      ].map((item) => (
                        <div key={item.l} className="space-y-1">
                          <p className="text-xs text-muted-dim">{item.l}</p>
                          {item.l === 'Contract' && explorerLink ? (
                            <a
                              href={explorerLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-mono text-accent hover:underline flex items-center gap-1 group"
                            >
                              {item.v}
                              <ExternalLink
                                size={14}
                                className="opacity-70 group-hover:opacity-100 transition-opacity"
                              />
                            </a>
                          ) : (
                            <p className="text-sm font-mono">{item.v}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {parsedAttributes.length > 0 && (
                    <div className="rounded-card bg-surface2 border border-border-light p-5 sm:p-6">
                      <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-muted mb-4">
                        Attributes
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {parsedAttributes.map((a, i) => (
                          <div
                            key={i}
                            className="rounded-xl bg-accent/5 border border-accent/10 p-3 text-center"
                          >
                            <p className="text-[10px] text-accent uppercase tracking-wider mb-1">
                              {a.trait_type}
                            </p>
                            <p className="text-sm font-semibold truncate">{a.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="lg:sticky lg:top-24">
                  <div className="glass-card rounded-card p-6 sm:p-8 space-y-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-xl font-semibold text-text">
                          Collection Item
                        </h2>
                        <Badge color="success" dot>Owned</Badge>
                      </div>
                      <p className="text-sm text-muted">{nftName}</p>
                    </div>

                    <div className="bg-surface2/40 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Owner</span>
                        <span className="text-text font-medium">
                          {profile?.first_name || 'You'}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Bought by</span>
                        <span className="text-text font-medium">
                          {profile?.first_name || 'You'}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Wallet</span>
                        <span className="text-text font-mono">
                          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '—'}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Network</span>
                        <span className="text-text font-mono">{chainLabel}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Portfolio Value</span>
                        <span className="text-text font-semibold">
                          {Number(nft.total_value_eth || 0).toFixed(3)} ETH
                        </span>
                      </div>

                      {nft.assigned_at && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted">Added</span>
                          <span className="text-text">
                            {new Date(nft.assigned_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-success/20 bg-success/10 p-4 flex items-start gap-3">
                      <ShieldCheck size={18} className="text-success mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-success">
                          Verified in your collection
                        </p>
                        <p className="text-xs text-muted mt-1">
                          This NFT is already owned and stored in your profile collection.
                        </p>
                      </div>
                    </div>

                    {explorerLink && (
                      <a href={explorerLink} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" size="lg" className="w-full">
                          <ExternalLink size={16} />
                          View on Explorer
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}