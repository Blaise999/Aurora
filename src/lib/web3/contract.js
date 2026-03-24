// ─── Chain config — HARDCODED to Base Mainnet ───
// Contract is deployed on Base Mainnet (8453). This is not configurable.
export const BASE_MAINNET_CHAIN_ID = 8453;
export const BASE_SEPOLIA_CHAIN_ID = 84532;

export function getChainId() {
  return 8453;
}

export function getContractAddress() {
  return process.env.NEXT_PUBLIC_AURORA_CONTRACT || "";
}

export function getBuyCollectorAddress() {
  return process.env.NEXT_PUBLIC_BUY_COLLECTOR_CONTRACT || "";
}

export function getCreatorContractAddress() {
  return process.env.NEXT_PUBLIC_CREATOR_CONTRACT || "";
}

export function getExplorerUrl() {
  return "https://basescan.org";
}

// ─── AuroraNft Mint Contract ABI ───
export const AURORA_NFT_ABI = [
  { name: "mint", type: "function", stateMutability: "payable", inputs: [{ name: "quantity", type: "uint256" }], outputs: [] },
  { name: "price", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalMinted", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "MAX_SUPPLY", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "saleActive", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { name: "remainingSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "Transfer", type: "event", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] },
  { name: "Minted", type: "event", inputs: [{ name: "minter", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }, { name: "quantity", type: "uint256", indexed: false }] },
];

// ─── BuyCollector Contract ABI ───
export const BUY_COLLECTOR_ABI = [
  { name: "buy", type: "function", stateMutability: "payable", inputs: [{ name: "nftId", type: "string" }], outputs: [] },
  { name: "treasury", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "Purchase", type: "event", inputs: [{ name: "buyer", type: "address", indexed: true }, { name: "nftId", type: "string", indexed: false }, { name: "amount", type: "uint256", indexed: false }] },
];

// ─── AuroraCreator Contract ABI ───
export const AURORA_CREATOR_ABI = [
  { name: "createNft", type: "function", stateMutability: "payable", inputs: [{ name: "metadataURI", type: "string" }], outputs: [] },
  { name: "mintFee", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "mintActive", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { name: "setMintFee", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_newFee", type: "uint256" }], outputs: [] },
  { name: "setTreasury", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_newTreasury", type: "address" }], outputs: [] },
  { name: "toggleMint", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "emergencyWithdraw", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "treasury", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "totalMinted", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "tokenURI", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "string" }] },
  { name: "creatorOf", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
  { name: "ownerOf", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
  { name: "owner", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "Created", type: "event", inputs: [{ name: "creator", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }, { name: "metadataURI", type: "string", indexed: false }, { name: "feePaid", type: "uint256", indexed: false }] },
  { name: "Transfer", type: "event", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] },
  { name: "MintFeeUpdated", type: "event", inputs: [{ name: "oldFee", type: "uint256", indexed: false }, { name: "newFee", type: "uint256", indexed: false }] },
  { name: "TreasuryUpdated", type: "event", inputs: [{ name: "oldTreasury", type: "address", indexed: false }, { name: "newTreasury", type: "address", indexed: false }] },
  { name: "MintToggled", type: "event", inputs: [{ name: "active", type: "bool", indexed: false }] },
];
