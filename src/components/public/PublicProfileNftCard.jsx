'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  ExternalLink,
  Wallet,
  ShieldCheck,
} from 'lucide-react'

function shortWallet(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function shortHash(hash) {
  if (!hash) return ''
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

function getDisplayTitle(nft) {
  return nft?.nft_name || nft?.name || `Token #${nft?.token_id || '—'}`
}

function getCollectionName(nft) {
  return nft?.collection || nft?.collection_name || 'Aurora Collection'
}

function getImageSrc(nft) {
  return nft?.image_url || nft?.image || ''
}

function getChainLabel(nft) {
  if (nft?.chain) return nft.chain
  if (nft?.chain_name) return nft.chain_name

  const chainId = Number(nft?.chain_id)

  if (chainId === 8453) return 'Base'
  if (chainId === 84532) return 'Base Sepolia'
  if (chainId === 1) return 'Ethereum'
  if (chainId === 137) return 'Polygon'

  return 'Base'
}

function getExplorerLink(nft) {
  const address = nft?.contract_address
  const tokenId = nft?.token_id
  const chainId = Number(nft?.chain_id)

  if (!address) return null

  if (chainId === 8453) {
    return tokenId
      ? `https://basescan.org/token/${address}?a=${tokenId}`
      : `https://basescan.org/address/${address}`
  }

  if (chainId === 84532) {
    return tokenId
      ? `https://sepolia.basescan.org/token/${address}?a=${tokenId}`
      : `https://sepolia.basescan.org/address/${address}`
  }

  if (chainId === 1) {
    return tokenId
      ? `https://etherscan.io/token/${address}?a=${tokenId}`
      : `https://etherscan.io/address/${address}`
  }

  if (chainId === 137) {
    return tokenId
      ? `https://polygonscan.com/token/${address}?a=${tokenId}`
      : `https://polygonscan.com/address/${address}`
  }

  return null
}

export default function PublicProfileNftCard({ nft, type = 'minted' }) {
  const [hov, setHov] = useState(false)
  const [imgError, setImgError] = useState(false)

  const title = getDisplayTitle(nft)
  const collectionName = getCollectionName(nft)
  const image = getImageSrc(nft)
  const chainLabel = getChainLabel(nft)
  const explorerLink = getExplorerLink(nft)

  return (
    <article
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/90 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_24px_60px_rgba(0,0,0,0.45)]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.12),transparent_26%)] opacity-70" />

      <div className="relative">
        <div className="relative aspect-square overflow-hidden border-b border-white/10 bg-black">
          {image && !imgError ? (
            <Image
              src={image}
              alt={title}
              fill
              className={`object-cover transition-transform duration-500 ease-out ${
                hov ? 'scale-[1.05]' : 'scale-100'
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_center,rgba(217,70,239,0.10),transparent_60%)] text-zinc-500">
              <div className="flex flex-col items-center gap-3">
                <ShieldCheck size={34} className="opacity-30" />
                <span className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-400">
                  No Preview
                </span>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] backdrop-blur-sm ${
                type === 'minted'
                  ? 'border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200'
                  : 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200'
              }`}
            >
              {type === 'minted' ? 'Created ✦' : 'Collected'}
            </span>

            {chainLabel ? (
              <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-300 backdrop-blur-sm">
                {chainLabel}
              </span>
            ) : null}
          </div>

          <div
            className={`absolute inset-0 flex items-end p-4 transition-opacity duration-300 ${
              hov ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span className="text-xs font-mono text-cyan-300">
              {type === 'minted' ? 'Created on Aurora →' : 'View collected asset →'}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1 truncate text-sm text-zinc-400">{collectionName}</p>
            </div>

            {nft?.token_id ? (
              <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300">
                #{nft.token_id}
              </div>
            ) : null}
          </div>

          {nft?.description ? (
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-300">
              {nft.description}
            </p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              No description added for this NFT yet.
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                Standard
              </div>
              <div className="mt-1 truncate text-sm font-medium text-white">
                {nft?.token_type || 'NFT'}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                Tx Hash
              </div>
              <div className="mt-1 truncate text-sm font-medium text-white">
                {nft?.tx_hash ? shortHash(nft.tx_hash) : 'Unavailable'}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {nft?.external_url ? (
              <a
                href={nft.external_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
              >
                <ExternalLink size={15} />
                View Asset
              </a>
            ) : null}

            {explorerLink ? (
              <a
                href={explorerLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
              >
                <ExternalLink size={15} />
                Explorer
              </a>
            ) : null}

            {nft?.contract_address ? (
              <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-zinc-300">
                <Wallet size={15} className="text-cyan-300" />
                {shortWallet(nft.contract_address)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}