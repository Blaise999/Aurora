'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAccount, useConnect } from 'wagmi'
import {
  Wallet,
  LayoutGrid,
  Tag,
  Settings,
  LogOut,
  ShieldCheck,
  Globe
} from 'lucide-react'

import PageShell from '@/components/layout/PageShell'
import { useSession } from '@/hooks/useSession'
import NftCard from '@/components/NftCard'
import NftCardSkeleton from '@/components/NftCardSkeleton'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

export default function PremiumProfilePage() {

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { profile, isLoggedIn, logout } = useSession()

  const [tab, setTab] = useState('collections')
  const [nfts, setNfts] = useState([])
  const [loading, setLoading] = useState(true)

  /*
  Greeting logic
  */
  const greeting = useMemo(() => {

    const hr = new Date().getHours()

    const time =
      hr < 12
        ? 'Morning'
        : hr < 18
        ? 'Afternoon'
        : 'Evening'

    return {
      title: `Good ${time}`,
      subtitle: profile?.first_name || 'Collector'
    }

  }, [profile])


  /*
  Load NFT data
  */
  useEffect(() => {

    if (!isLoggedIn) return

    async function loadNFTs() {

      setLoading(true)

      try {

        const endpoint =
          tab === 'collections'
            ? '/api/user/collections'
            : '/api/profile/nfts'

        const res = await fetch(endpoint)
        const json = await res.json()

        setNfts(json?.nfts || [])

      } catch (err) {

        console.error(err)

      } finally {

        setLoading(false)

      }

    }

    loadNFTs()

  }, [tab, isLoggedIn])


  /*
  Short wallet display
  */
  const walletDisplay = useMemo(() => {

    if (!address) return ''

    return `${address.slice(0, 6)}...${address.slice(-4)}`

  }, [address])


  /*
  Wallet connect
  */
  function handleConnect() {

    const connector = connectors?.[0]

    if (connector) connect({ connector })

  }


  /*
  If user not logged in
  */
  if (!isLoggedIn) {

    return (

      <PageShell>

        <div className="flex flex-col items-center justify-center min-h-[70vh]">

          <div className="max-w-md text-center bg-card border border-border p-12 rounded-3xl">

            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-r from-accent to-accent-violet flex items-center justify-center">
              <Wallet size={28} className="text-white" />
            </div>

            <h2 className="text-3xl font-bold mb-3">
              Connect your wallet
            </h2>

            <p className="text-muted mb-8">
              Unlock your vault to manage your NFTs and collections.
            </p>

            <Button
              onClick={handleConnect}
              size="lg"
              className="w-full"
            >
              Connect Wallet
            </Button>

          </div>

        </div>

      </PageShell>

    )

  }


  return (

    <PageShell>

      <div className="max-w-[1600px] mx-auto px-8 py-12">

        {/* HEADER */}

        <div className="flex flex-col lg:flex-row justify-between mb-12 gap-8">

          <div>

            <div className="flex items-center gap-3 mb-2">

              <Badge variant="accent">
                Member since {new Date().getFullYear()}
              </Badge>

              <span className="flex items-center gap-1 text-xs text-success">
                <ShieldCheck size={12} />
                Verified
              </span>

            </div>

            <h1 className="text-5xl font-bold">

              {greeting.title},{' '}

              <span className="text-accent">
                {greeting.subtitle}
              </span>

            </h1>

            {/* Wallet only appears when connected */}

            {isConnected && walletDisplay && (

              <p className="text-muted mt-3 font-mono">
                {walletDisplay}
              </p>

            )}

          </div>


          <div className="flex gap-3">

            <Button variant="outline">
              <Settings size={16} />
              Preferences
            </Button>

            <Button
              variant="ghost"
              onClick={logout}
              className="text-red-500"
            >
              <LogOut size={16} />
              Sign out
            </Button>

          </div>

        </div>


        {/* STATS */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">

          <StatCard
            label="Collection Value"
            value="4.82 ETH"
            icon={<Globe size={20} />}
          />

          <StatCard
            label="Total NFTs"
            value={nfts.length}
            icon={<LayoutGrid size={20} />}
          />

          <StatCard
            label="Active Listings"
            value="2"
            icon={<Tag size={20} />}
          />

        </div>


        {/* TABS */}

        <div className="flex gap-8 border-b border-border mb-10">

          {['collections', 'listed'].map((t) => (

            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-4 text-sm font-semibold transition-colors ${
                tab === t
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-muted hover:text-text'
              }`}
            >

              {t.charAt(0).toUpperCase() + t.slice(1)}

            </button>

          ))}

        </div>


        {/* NFT GRID */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

          {loading &&

            Array.from({ length: 8 }).map((_, i) => (
              <NftCardSkeleton key={i} />
            ))

          }

          {!loading && nfts.length > 0 &&

            nfts.map((nft) => (

              <NftCard
                key={nft.id}
                nft={nft}
              />

            ))

          }

          {!loading && nfts.length === 0 && (

            <div className="col-span-full text-center py-24">

              <LayoutGrid
                size={40}
                className="mx-auto mb-4 text-muted"
              />

              <p className="text-xl text-muted">
                Your vault is empty
              </p>

            </div>

          )}

        </div>

      </div>

    </PageShell>

  )

}


/*
Stat Card Component
*/

function StatCard({ label, value, icon }) {

  return (

    <div className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition">

      <div className="flex items-center justify-between mb-4">

        <div className="text-muted">
          {icon}
        </div>

      </div>

      <p className="text-xs text-muted mb-1 uppercase tracking-wider">
        {label}
      </p>

      <p className="text-2xl font-bold">
        {value}
      </p>

    </div>

  )

}