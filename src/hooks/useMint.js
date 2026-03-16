'use client';

// useMint is now an alias for useBuy.
// The old version used on-chain writeContract + waitForReceipt.
// All minting now goes through the server-side /api/nft/buy endpoint.

export { useBuy as useMint } from './useBuy';
