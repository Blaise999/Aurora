'use client'

import { ExternalLink, Eye, Gem } from 'lucide-react'

function parseAttributes(attributes) {
  if (!attributes) return []

  if (Array.isArray(attributes)) return attributes

  if (typeof attributes === 'string') {
    try {
      const parsed = JSON.parse(attributes)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

function getChainLabel(nft) {
  if (!nft?.chain_id) return 'Base'
  if (String(nft.chain_id) === '8453') return 'Base'
  if (String(nft.chain_id) === '84532') return 'Base Sepolia'
  return `Chain ${nft.chain_id}`
}

export default function CollectionGridCard({ nft, ownerName, onClick }) {
  const image = nft?.image_url || nft?.image || '/placeholder-nft.png'
  const title = nft?.nft_name || nft?.name || `Token #${nft?.token_id || ''}`
  const chain = getChainLabel(nft)
  const attributes = parseAttributes(nft?.attributes)
  const tokenType = nft?.token_type || nft?.tokenType || 'ERC-721'

  const handleClick = () => {
    if (typeof onClick === 'function') onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group block w-full text-left rounded-[24px] overflow-hidden border border-border-light bg-surface2/40 hover:border-accent/40 hover:shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent/40"
      aria-label={`Open ${title}`}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent opacity-90" />

        <div className="absolute top-3 left-3">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/40 backdrop-blur-md px-3 py-1 text-[11px] text-white">
            <Gem size={12} />
            Owned
          </div>
        </div>

        <div className="absolute top-3 right-3">
          <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90">
            <Eye size={16} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-semibold truncate">{title}</p>
          <p className="text-white/70 text-xs mt-1 truncate">
            {nft?.collection || 'Collection'} • {chain}
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
            {tokenType}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-accent-violet/10 border border-accent-violet/20 text-accent-violet text-xs font-medium">
            {attributes.length} traits
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="min-w-0">
            <p className="text-muted-dim text-xs mb-1">Bought by</p>
            <p className="font-medium truncate">{ownerName || 'You'}</p>
          </div>

          <div className="inline-flex items-center gap-1 text-accent font-medium shrink-0">
            View
            <ExternalLink size={14} />
          </div>
        </div>
      </div>
    </button>
  )
}