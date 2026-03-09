// ─── AuroraNft Mint Contract ABI ───
export const AURORA_NFT_ABI = [
  { name: "mint", type: "function", stateMutability: "payable",
    inputs: [{ name: "quantity", type: "uint256" }], outputs: [] },
  { name: "price", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalMinted", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "MAX_SUPPLY", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "saleActive", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "bool" }] },
  { name: "remainingSupply", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "Transfer", type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ] },
  { name: "Minted", type: "event",
    inputs: [
      { name: "minter", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "quantity", type: "uint256", indexed: false },
    ] },
];

// ─── BuyCollector Contract ABI (collects fee + price → treasury) ───
export const BUY_COLLECTOR_ABI = [
  {
    name: "buy",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "nftId", type: "string" }],
    outputs: [],
  },
  {
    name: "treasury",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "Purchase",
    type: "event",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "nftId", type: "string", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
];

export const BASE_MAINNET_CHAIN_ID = 8453;
export const BASE_SEPOLIA_CHAIN_ID = 84532;

export function getChainId() {
  return parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532", 10);
}

export function getContractAddress() {
  return process.env.NEXT_PUBLIC_AURORA_CONTRACT || "";
}

export function getBuyCollectorAddress() {
  return process.env.NEXT_PUBLIC_BUY_COLLECTOR_CONTRACT || "";
}

export function getExplorerUrl() {
  return getChainId() === 8453
    ? "https://basescan.org"
    : "https://sepolia.basescan.org";
}
