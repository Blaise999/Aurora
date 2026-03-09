# AuroraNft — QA Checklist (Base Sepolia → Mainnet)

## Pre-flight
- [ ] `.env.local` fully configured (all vars set)
- [ ] `NEXT_PUBLIC_CHAIN_ID=84532` (Base Sepolia)
- [ ] Contract deployed to Base Sepolia
- [ ] `NEXT_PUBLIC_AURORA_CONTRACT` set to deployed address
- [ ] Supabase tables created (run sql/schema.sql)
- [ ] `SESSION_SECRET` is random 32+ chars
- [ ] `npm install` succeeds (check wagmi, viem, jose, @supabase/supabase-js)
- [ ] `npm run dev` starts without errors

## Wallet Connection
- [ ] Click "Connect" → MetaMask popup appears
- [ ] After connecting, header shows truncated address
- [ ] SIWE sign-in prompt appears automatically
- [ ] After signing, green dot appears (authed state)
- [ ] Profile link appears in wallet dropdown
- [ ] "Disconnect" clears session + disconnects wallet
- [ ] Refreshing page → wallet reconnects but session cookie persists

## Wrong Network
- [ ] Connect on Ethereum mainnet → "Wrong Network" warning
- [ ] "Switch to Base Sepolia" button triggers chain switch

## Mint Flow (Base Sepolia)
- [ ] Mint page shows on-chain price, totalMinted, saleActive
- [ ] Adjust quantity (1-5) → total updates correctly
- [ ] Click "Mint Now" → TxDrawer opens
- [ ] Click "Confirm in wallet" → MetaMask tx prompt
- [ ] After signing, drawer shows "Submitted" with Basescan link
- [ ] After block confirmation, drawer shows "Confirmed"
- [ ] Server confirm writes to Supabase (check nft_metadata_cache + user_nfts)
- [ ] Success state shows token IDs
- [ ] "Mint Another" resets state

## Mint Error Cases
- [ ] Reject in wallet → error state shows "User rejected"
- [ ] Insufficient ETH → appropriate error
- [ ] Sale paused (toggle on contract) → "Sale is paused" message

## Profile (DB-first)
- [ ] Navigate to /profile/<your-address>
- [ ] "My Mints (DB)" tab loads minted NFTs from Supabase (fast)
- [ ] "All NFTs (Chain)" tab loads from Alchemy
- [ ] Address copy button works
- [ ] Basescan link opens correct address page

## NFT Detail
- [ ] Click minted NFT → /nft/<contract>/<tokenId>
- [ ] Shows skeleton while loading
- [ ] Displays metadata (name, traits if available)
- [ ] Basescan link is correct

## Existing Features (regression)
- [ ] Homepage loads: hero, ticker, trending bar, featured, collections
- [ ] Explore page: search, filter, load more work with mock data
- [ ] News page renders
- [ ] Admin page (/admin) accessible directly
- [ ] All branding shows "AuroraNft" (no "NEXUS" remnants)
- [ ] Footer shows "Base" network indicator

## Switch to Base Mainnet
1. Change `NEXT_PUBLIC_CHAIN_ID=8453`
2. Deploy contract to Base mainnet
3. Update `NEXT_PUBLIC_AURORA_CONTRACT` to mainnet address
4. Update `BASE_RPC_URL` to mainnet provider (e.g., Alchemy Base RPC)
5. Update `NEXT_PUBLIC_BASE_RPC` to mainnet
6. Re-run full QA above on mainnet
