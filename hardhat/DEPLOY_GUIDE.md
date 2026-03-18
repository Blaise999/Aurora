# AuroraCreator — Smart Contract Deployment Guide

## Overview

The **AuroraCreator** contract is an ERC-721 that lets any user mint their own NFT on-chain.
- User pays a flat `mintFee` (set by admin)
- Fee is forwarded to `treasury` (admin wallet)
- Each token gets a unique on-chain `tokenId` and `tokenURI`
- The `tokenURI` points to your app's `/api/nft/token-metadata` endpoint
- Marketplaces (OpenSea, etc.) read that endpoint to display the NFT

---

## Quick Start

### 1. Setup Hardhat

```bash
cd hardhat
npm install
cp .env.example .env
```

### 2. Edit `.env`

```env
DEPLOYER_PRIVATE_KEY=0x_your_private_key
TREASURY_ADDRESS=0x_your_admin_wallet
MINT_FEE_ETH=0.005
NFT_NAME=AuroraCreator
NFT_SYMBOL=ACREATE
BASESCAN_API_KEY=your_basescan_key
```

### 3. Test

```bash
npx hardhat test
```

### 4. Deploy to Base Sepolia (testnet)

```bash
npm run deploy:sepolia
```

Output will show:
```
✅ AuroraCreator deployed to: 0x1234...
Add to your .env / .env.local:
NEXT_PUBLIC_CREATOR_CONTRACT=0x1234...
```

### 5. Deploy to Base Mainnet

```bash
npm run deploy:base
```

### 6. Verify on BaseScan

```bash
npm run verify:sepolia
# or
npm run verify:base
```

---

## After Deployment

### Add to your Next.js `.env.local`:

```env
NEXT_PUBLIC_CREATOR_CONTRACT=0x_deployed_address_here
```

### The Create page (`/create`) will automatically:
1. Read `mintFee` from the contract on-chain
2. Read `mintActive` status
3. Show the contract address with explorer link
4. Call `createNft(metadataURI)` via wagmi `writeContract`
5. After tx confirms, save metadata to `user_listed` table
6. Display the on-chain token ID

---

## Contract Functions

### Public
| Function | Description |
|----------|-------------|
| `createNft(string metadataURI)` | Mint an NFT. Pays `mintFee`. |
| `tokenURI(uint256 tokenId)` | Get metadata URI for a token |
| `creatorOf(uint256 tokenId)` | Get original creator (survives transfers) |
| `totalSupply()` | Total tokens minted |
| `mintFee()` | Current fee in wei |
| `mintActive()` | Whether minting is enabled |
| `treasury()` | Where fees go |

### Admin (onlyOwner)
| Function | Description |
|----------|-------------|
| `setMintFee(uint256)` | Update the mint fee |
| `setTreasury(address)` | Change treasury wallet |
| `toggleMint()` | Pause/unpause minting |
| `emergencyWithdraw()` | Withdraw stuck ETH |

---

## Architecture

```
User clicks "Mint On-Chain" on /create
    │
    ▼
wagmi writeContract → AuroraCreator.createNft(metadataURI)
    │
    ├─ Contract mints ERC-721 token to user
    ├─ Contract forwards mintFee to treasury
    ├─ Contract emits Created(creator, tokenId, metadataURI, feePaid)
    │
    ▼
Frontend detects tx confirmation
    │
    ▼
POST /api/nft/create
    ├─ Verifies tx on-chain (receipt + Created event)
    ├─ Extracts tokenId from event logs
    ├─ Saves to user_listed table (metadata + image)
    ├─ Saves to wallet_mints + transactions
    ├─ Sends notifications
    │
    ▼
GET /api/nft/token-metadata?contract=X&tokenId=Y
    └─ OpenSea/marketplaces call this via tokenURI()
       Returns standard ERC-721 metadata JSON
```

---

## Admin Fee Management

The admin can update the mint fee in **two places**:

1. **On-chain**: Call `setMintFee()` on the contract (permanent, authoritative)
2. **Admin dashboard**: Update `create_mint_fee` in Settings (used as fallback if contract can't be read)

The `/create` page reads the fee from the contract first. If it can't read the contract, it falls back to the DB setting.

---

## Supabase Migration

Run `sql/003-user-listed.sql` to create the `user_listed` table:

```bash
# In Supabase SQL Editor, paste contents of sql/003-user-listed.sql
```

---

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_CREATOR_CONTRACT` | `.env.local` | Deployed AuroraCreator address |
| `NEXT_PUBLIC_CHAIN_ID` | `.env.local` | `84532` (testnet) or `8453` (mainnet) |
| `NEXT_PUBLIC_ADMIN_WALLET` | `.env.local` | Admin wallet (used by buy flow) |
| `BASE_SEPOLIA_RPC_URL` | `.env.local` | RPC for server-side verification |
| `BASE_RPC_URL` | `.env.local` | RPC for mainnet verification |
