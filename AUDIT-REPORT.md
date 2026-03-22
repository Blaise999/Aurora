# AuroraNFT Full Audit Report

## 1. ROOT CAUSE SUMMARY

**There are 7 distinct bugs causing failures across admin, mint, and buy flows.**

The #1 root cause for "only contract wallet allowed" / admin mint-fee update failing:

The admin settings page (`SettingsForm.jsx`) correctly reads the on-chain `owner()` from the AuroraCreator contract and compares it to the connected browser wallet. The on-chain owner is `0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B` (the deployer). **If you are connected with this exact wallet on Base mainnet (chain 8453), the fee update WILL work.** If you're seeing the error, either:
- You're connected with a **different** wallet address than the deployer
- Your browser wallet is on the **wrong network** (not Base mainnet)
- The `owner()` read is silently failing (contract address misconfigured — but `NEXT_PUBLIC_CREATOR_CONTRACT` is correctly set to `0x50dd23c855c08B3180cd9f33D172535d381Fda75`)

**The buy flow is 100% broken** due to `NEXT_PUBLIC_ADMIN_WALLET=0xYOUR_ADMIN_WALLET_ADDRESS` (a literal placeholder string, not a real address). Every buy attempt either crashes or sends ETH to nowhere.

---

## 2. EXACT FILES AND LINES CAUSING ISSUES

### Bug #1: ADMIN_WALLET is a placeholder (CRITICAL)
- **File:** `.env.local` line 46
- **Value:** `NEXT_PUBLIC_ADMIN_WALLET=0xYOUR_ADMIN_WALLET_ADDRESS`
- **Impact:** Breaks ALL buy transactions. `useBuy.js` line 54 sends ETH to this invalid address. `finalize-purchase/route.ts` line 116 rejects every tx because `tx.to !== "0xyour_admin_wallet_address"`.
- **Fix:** Set to `0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B`

### Bug #2: AURORA_CONTRACT is a placeholder
- **File:** `.env.local` line 12
- **Value:** `NEXT_PUBLIC_AURORA_CONTRACT=0xYOUR_CONTRACT_ADDRESS_HERE`
- **Impact:** `getContractState()` in `contracts.js` fails. `AURORA_ABI` references `mint()`, `price()`, `MAX_SUPPLY()` etc. which belong to the old `AuroraNft` contract — NOT `AuroraCreator`. These two are different contracts.
- **Fix:** Leave empty (old contract not deployed), or set to AuroraNft address if deployed

### Bug #3: BUY_COLLECTOR env var name mismatch
- **File:** `.env.local` line 16
- **Has:** `NEXT_PUBLIC_BUY_COLLECTOR_ADDRESS=0x...`
- **Code reads:** `NEXT_PUBLIC_BUY_COLLECTOR_CONTRACT` (in `constants.js` line 7 and `contract.js` line 104)
- **Impact:** BuyCollector contract is always empty string — never used
- **Fix:** Rename to `NEXT_PUBLIC_BUY_COLLECTOR_CONTRACT`

### Bug #4: Missing TREASURY_WALLET env var
- **File:** `.env.local`
- **Missing:** `NEXT_PUBLIC_TREASURY_WALLET`
- **Used by:** `constants.js` line 8, `nft/buy/route.ts` line 165
- **Fix:** Add `NEXT_PUBLIC_TREASURY_WALLET=0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B`

### Bug #5: useSettings double-wraps the settings object
- **File:** `src/hooks/useNfts.js` line ~205
- **Code:** `setSettings(d)` where `d = { settings: { buy_fee: "0.002", ... } }`
- **Impact:** Every component doing `settings?.buy_fee` gets `undefined` because it's actually at `settings.settings.buy_fee`. All price/fee reads from settings return `undefined`, falling back to hardcoded defaults.
- **Fix:** Changed to `setSettings(d?.settings || d)`

### Bug #6: Conflicting route files
- **Files:**
  - `src/app/api/settings/route.js` AND `route.ts` (identical content)
  - `src/app/layout.js` AND `layout.jsx`
  - `src/app/explore/page.js` AND `page.jsx`
- **Impact:** Next.js may error or pick unpredictably
- **Fix:** Removed `.ts`/`.js` duplicates, kept the more complete versions

### Bug #7: Mint page doubles the price
- **File:** `src/app/mint/page.jsx` lines ~71-75
- **Code:** Both `mintFee` and `nftPrice` fall back to `settings?.buy_fee`, so if the NFT has no stored price, user pays 2× the buy fee
- **Fix:** `nftPrice` now falls back to `0` instead of `buy_fee`

### Bug #8: Public settings route has unauthenticated POST
- **File:** `src/app/api/settings/route.js`
- **Issue:** Anyone can POST to `/api/settings` to change site settings without auth
- **Fix:** Removed POST from public route (admin writes go through `/api/admin/settings`)

---

## 3. IS THE CONNECTED WALLET ACTUALLY AUTHORIZED?

**For on-chain admin actions (setMintFee, setTreasury, toggleMint):**

The contract uses OpenZeppelin `Ownable(msg.sender)` in the constructor. The owner is whoever deployed the contract.

| Role | Address | Source |
|------|---------|--------|
| Deployer / Contract Owner | `0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B` | `hardhat/.env` DEPLOYER_PRIVATE_KEY → wallet, confirmed in `deployments/base-AuroraCreator.json` |
| Treasury | `0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B` | Constructor arg, same as deployer |
| Contract Address | `0x50dd23c855c08B3180cd9f33D172535d381Fda75` | Deployment artifact |

**To update the mint fee, you MUST connect your browser wallet with address `0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B` on Base mainnet (chain 8453).**

The `SettingsForm.jsx` correctly:
1. Reads `owner()` from on-chain (line ~161)
2. Compares with `address` from `useAccount()` (line ~181)
3. Uses case-insensitive comparison (line ~183)
4. Calls `writeSetFee` with correct ABI, function name, args, chain (line ~278)

**If you're seeing the error, verify:** Open your wallet → check the active address → it must be exactly `0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B`. The admin login (username/password) is separate from wallet ownership — being logged into the admin panel does NOT make your wallet the contract owner.

---

## 4. IS THE FRONTEND USING THE CORRECT CONTRACT AND NETWORK?

| Check | Status | Detail |
|-------|--------|--------|
| Creator contract address | ✅ Correct | `NEXT_PUBLIC_CREATOR_CONTRACT=0x50dd23c855c08B3180cd9f33D172535d381Fda75` matches deployment |
| Chain ID | ✅ Correct | `NEXT_PUBLIC_CHAIN_ID=8453` (Base mainnet) |
| ABI for AuroraCreator | ✅ Correct | `AURORA_CREATOR_ABI` in `contract.js` includes `createNft`, `mintFee`, `setMintFee`, `owner`, etc. |
| ABI for old AuroraNft | ⚠️ Unused | `AURORA_ABI` in `constants.js` has `mint(quantity)` for the old contract — not deployed |
| RPC URL | ✅ Correct | `https://mainnet.base.org` |
| wagmi config | ✅ Correct | Base chain first, correct transport |

---

## 5. DOES MINT (CREATE) WORK?

**Yes, the create flow is correctly implemented — with one caveat.**

### Create flow trace:
1. `/create` page reads `mintFee` from on-chain via `useReadContract('mintFee')` → ✅
2. Reads `mintActive` from on-chain → ✅
3. User fills in artwork + metadata → ✅
4. Calls `writeContract({ functionName: 'createNft', args: [metadataURI], value: mintFee })` → ✅
5. Fee goes to treasury (on-chain, inside contract) → ✅
6. After tx confirms, calls `/api/nft/create` which:
   - Verifies tx receipt on-chain → ✅
   - Extracts `Created` event, gets tokenId → ✅
   - Verifies creator wallet matches session → ✅
   - Saves to `user_listed` table → ✅
   - Saves to `wallet_mints` table → ✅
   - Saves to `transactions` table → ✅
   - Sends notifications → ✅
7. NFT shows on profile page under "Listed" tab (fetched from `/api/user/listed`) → ✅
8. Link to verify on chain → ✅ (explorer link shown on success)

**The `value` sent matches the on-chain `mintFee` exactly** — no mismatch. The wallet popup amount comes from `onChainFeeEth` which is read directly from the contract, not from an editable UI field.

---

## 6. DOES BUY WORK?

**No. The buy flow is completely broken due to Bug #1.**

### Buy flow trace:
1. `/mint` page loads NFT data and settings → ⚠️ Settings double-wrapped (Bug #5), prices fall back to defaults
2. `useBuy` sends ETH via `sendTransaction({ to: ADMIN_WALLET })` → ❌ **ADMIN_WALLET is `"0xYOUR_ADMIN_WALLET_ADDRESS"` — invalid Ethereum address**
3. If tx somehow succeeds, `/api/nft/finalize-purchase` checks `tx.to === ADMIN_WALLET` → ❌ **Always fails because the server-side ADMIN_WALLET is also the placeholder**
4. Even if validation passed, the price calculation doubles (Bug #7)

### After fixes:
1. Settings properly unwrapped → ✅
2. `ADMIN_WALLET` = `0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B` → ✅
3. `finalize-purchase` validates `tx.to` against real address → ✅
4. Price no longer doubled → ✅
5. Saves to `user_collections` → ✅
6. Shows in profile "Collections" tab → ✅

---

## 7. MINIMAL FIX

If you just want things working immediately, only fix `.env.local`:

```env
NEXT_PUBLIC_ADMIN_WALLET=0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B
NEXT_PUBLIC_TREASURY_WALLET=0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B
NEXT_PUBLIC_BUY_COLLECTOR_CONTRACT=
NEXT_PUBLIC_AURORA_CONTRACT=
```

And fix `useNfts.js` line ~205:
```js
// Change:
if (!c) { setSettings(d); setCache(cacheKey, d); }
// To:
const resolved = d?.settings || d;
if (!c) { setSettings(resolved); setCache(cacheKey, resolved); }
```

---

## 8. BEST-PRACTICE FIX

All fixes are applied in the `drake-fixed.zip`:

1. **`.env.local`** — All placeholders replaced with real addresses, correct env var names, documented which address is which
2. **`.env.example`** — Updated to match actual variable names used by code
3. **`src/hooks/useNfts.js`** — `useSettings()` properly unwraps `{ settings: {...} }` response; fallback key `create_mint_fee` renamed to `create_mint_fee_usd`
4. **`src/hooks/useBuy.js`** — Validates `ADMIN_WALLET` is a real 0x address before sending ETH
5. **`src/app/mint/page.jsx`** — `nftPrice` falls back to `"0"` not `buy_fee` to prevent price doubling
6. **`src/app/api/nft/finalize-purchase/route.ts`** — Validates `ADMIN_WALLET` is real before processing
7. **`src/app/api/settings/route.js`** — Removed unauthenticated POST handler
8. **Removed conflicting files:** `route.ts` in `/api/settings/`, `layout.js`, `explore/page.js`

---

## 9. DANGEROUS ASSUMPTIONS AND HIDDEN BUGS

### Critical Security Issues:
1. **`hardhat/.env` contains a raw private key** (`DEPLOYER_PRIVATE_KEY=430e23...`) committed to the repo. If this repo is pushed to GitHub, the wallet is compromised. Rotate this key immediately if it was ever pushed.
2. **`SESSION_SECRET=CHANGE_ME_TO_A_RANDOM_32_CHAR_STRING_ABC123`** — default secret, all JWTs can be forged.
3. **Supabase service role key is in `.env.local`** which gets committed — this key has full DB access.
4. **`/api/admin/settings` POST has no wallet/ownership verification** — it only checks the admin session cookie, not whether the caller is the contract owner.
5. **`/api/nft/buy` (server-side mint) has no on-chain verification** — it saves to the DB without any blockchain tx. Anyone with a valid session can call it directly to "buy" NFTs for free.

### Architecture Concerns:
6. **Two separate mint flows exist:** `/create` does real on-chain minting via AuroraCreator. `/mint` (buy flow) just sends ETH directly to admin wallet — no contract interaction. The `BuyCollector` contract exists in code but is NOT used in the actual buy flow.
7. **`useMint` is aliased to `useBuy`** — the file says "All minting now goes through the server-side /api/nft/buy endpoint" but the actual flow uses `useBuy` which sends ETH, not `/api/nft/buy`.
8. **Three contracts exist** (`AuroraNft`, `AuroraCreator`, `BuyCollector`) but only `AuroraCreator` is deployed. The ABIs for the others exist in the code and could cause confusion.
9. **No ownership transfer capability** is exposed in the frontend. If you need to change the contract owner, you'd need to call `transferOwnership()` directly on-chain.
10. **The admin panel auth is session-based (username/password), completely separate from wallet ownership.** Being an "admin" in the panel does NOT give you the ability to call `onlyOwner` contract functions — you must connect the specific deployer wallet.

---

## 10. ADDRESS MAP (Source of Truth)

| Identity | Address | Where It Comes From |
|----------|---------|-------------------|
| **Contract Owner** | `0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B` | `Ownable(msg.sender)` in constructor — the wallet that ran the deploy tx |
| **Deployer Wallet** | `0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B` | Private key in `hardhat/.env` |
| **Treasury** | `0x15c71E17f64DFBb6890f732a71E16eDD506C9f9B` | Constructor arg, same as deployer |
| **AuroraCreator Contract** | `0x50dd23c855c08B3180cd9f33D172535d381Fda75` | Deployment artifact |
| **AuroraNft Contract** | Not deployed | Placeholder in env |
| **BuyCollector Contract** | Not deployed | Placeholder in env |
| **ADMIN_WALLET (was broken)** | Was `0xYOUR_ADMIN_WALLET_ADDRESS` | `.env.local` placeholder — now fixed to `0x15c71E...` |
| **Server signer** | None | No server-side signing — all writes come from browser wallet |

**There is NO backend/server signer.** All on-chain transactions are signed by the user's browser wallet. The server only verifies transactions after the fact.

**Ownership has NOT been transferred** since deployment (no `OwnershipTransferred` event logic in the deploy script beyond the initial constructor).
