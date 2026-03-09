# AuroraNft — Architecture Summary

## Overview
Full-stack NFT minting platform on **Base** (L2), built with Next.js 14 App Router.

## Stack
| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, React 18, wagmi 2, viem 2, Tailwind CSS |
| Wallet | MetaMask/Rabby (injected), WalletConnect v2 optional |
| Auth | SIWE (Sign-In with Ethereum) → HttpOnly JWT cookie (jose) |
| Smart Contract | Solidity 0.8.20, OpenZeppelin ERC-721, deployed on Base |
| Database | Supabase Postgres (service role, server-only) |
| Existing NFT reads | Alchemy NFT API v3 (server-side proxy routes) |

## Key Directories
```
contracts/           Solidity contract
scripts/             Deploy instructions (Hardhat)
sql/                 Supabase schema + RLS
src/
  app/
    api/auth/        SIWE auth (nonce, verify, logout)
    api/mint/confirm Server-side tx verification + DB write
    api/profile/nfts DB-first profile loader
    api/nft/         Alchemy proxy routes (existing)
    mint/            Mint UI page
    profile/[addr]   Wallet portfolio
    nft/[ca]/[tid]   Live NFT detail (Alchemy metadata)
    nft/[id]         Legacy mock detail
    collection/[ca]  Collection browser (Alchemy)
  components/
    mint/            MintPanel, TxDrawer, QuantityStepper, Toast
    nft/             NFTCard, NFTMedia, NFTGrid*, normalizeUiNft, Trending
    layout/          Header (wallet connect), Footer, PageShell
  hooks/
    useAuth.js       SIWE login/logout
    useMint.js       Full mint flow (write, wait, confirm)
  lib/
    auth/session.ts  JWT session (jose)
    db/supabase.ts   Server Supabase client
    web3/contract.js ABI + chain config
    web3/wagmi-config.js  wagmi chains + connectors
  providers/
    Web3Provider.jsx WagmiProvider + QueryClientProvider
```

## Security Model
1. **Wallet connect** → `useConnect()` from wagmi
2. **SIWE auth** → server issues nonce cookie, client signs, server verifies signature + nonce match, sets HttpOnly JWT
3. **Mint** → client calls `writeContract`, waits for receipt on-chain
4. **Server confirm** → `POST /api/mint/confirm` verifies tx receipt via Base RPC (never trusts client data), parses Transfer events, writes to Supabase
5. **Profile** → DB-first for speed; Alchemy fallback for "all NFTs" tab

## Env Vars
See `.env.local` for all required variables.

## Deploy Checklist
1. Deploy contract to Base Sepolia (see scripts/deploy-instructions.js)
2. Set `NEXT_PUBLIC_AURORA_CONTRACT` in .env.local
3. Set `NEXT_PUBLIC_CHAIN_ID=84532` for testnet, `8453` for mainnet
4. Run SQL in Supabase (sql/schema.sql)
5. Set Supabase URL + service role key
6. Set SESSION_SECRET (32+ random chars)
7. `npm install && npm run dev`
