'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ShieldCheck } from 'lucide-react'
import Badge from '@/components/ui/Badge'

export default function CollectionGridCard({ nft, ownerName, onClick }) {
  const [hov, setHov] = useState(false)
  const [imgError, setImgError] = useState(false)

  const name = nft?.nft_name || nft?.name || `#${nft?.token_id || '?'}`
  const image = nft?.image_url || nft?.image || ''
  const collection = nft?.collection || nft?.collection_name || 'Collection'
  const chainLabel =
    nft?.chain ||
    (nft?.chain_id === 8453
      ? 'Base'
      : nft?.chain_id === 84532
      ? 'Base Sepolia'
      : 'Base')

  const totalVal = parseFloat(nft?.total_value_eth || 0)
  const priceVal = parseFloat(nft?.nft_price_eth || 0)
  const displayPrice =
    totalVal > 0
      ? `${totalVal.toFixed(3)} ETH`
      : priceVal > 0
      ? `${priceVal.toFixed(3)} ETH`
      : null

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="group w-full text-left rounded-[22px] overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:shadow-card focus:outline-none focus:ring-2 focus:ring-accent/30"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-surface2">
        {image && !imgError ? (
          <Image
            src={image}
            alt={name}
            fill
            className={`object-cover transition-transform duration-500 ease-out ${
              hov ? 'scale-[1.05]' : 'scale-100'
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-dim">
            <ShieldCheck size={40} className="opacity-20" />
          </div>
        )}

        {/* Overlay on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent transition-opacity duration-300 flex items-end p-4 ${
            hov ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="text-xs text-accent font-mono">View Details →</span>
        </div>

        {/* Chain badge */}
        <div className="absolute top-3 left-3">
          <Badge
            color="default"
            className="!bg-black/50 backdrop-blur-md !border-white/10 !text-[10px]"
          >
            {chainLabel}
          </Badge>
        </div>

        {/* Owned badge */}
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 rounded-full bg-success/20 backdrop-blur-md border border-success/30 px-2 py-1">
            <ShieldCheck size={10} className="text-success" />
            <span className="text-[9px] font-semibold text-success">Owned</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-1.5">
        <p className="text-[10px] text-muted-dim font-mono truncate tracking-wide uppercase">
          {collection}
        </p>
        <p className="text-sm font-display font-semibold text-text truncate group-hover:text-accent transition-colors duration-200">
          {name}
        </p>

        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
          {displayPrice ? (
            <div>
              <p className="text-[9px] text-muted-dim uppercase tracking-wider">
                Value
              </p>
              <p className="text-sm text-accent font-mono font-semibold mt-0.5">
                {displayPrice}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-muted-dim/60 italic">In collection</p>
            </div>
          )}

          <div className="text-right">
            <p className="text-[9px] text-muted-dim uppercase tracking-wider">
              Owner
            </p>
            <p className="text-xs text-muted font-medium mt-0.5 truncate max-w-[80px]">
              {ownerName || 'You'}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}
