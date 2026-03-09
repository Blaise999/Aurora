// Chain config
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";

// Contracts
export const AURORA_CONTRACT = process.env.NEXT_PUBLIC_AURORA_CONTRACT || "";
export const BUY_COLLECTOR_CONTRACT = process.env.NEXT_PUBLIC_BUY_COLLECTOR_CONTRACT || "";
export const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || "";

// Alchemy
export const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

// Base Sepolia chain info
export const CHAIN_CONFIG = {
  chainId: `0x${CHAIN_ID.toString(16)}`,
  chainName: CHAIN_ID === 8453 ? "Base" : "Base Sepolia",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: [CHAIN_ID === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org"],
};

// AuroraNft ABI (mint-relevant subset)
export const AURORA_ABI = [
  "function mint(uint256 quantity) external payable",
  "function price() view returns (uint256)",
  "function totalMinted() view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function saleActive() view returns (bool)",
  "function remainingSupply() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event Minted(address indexed minter, uint256 indexed tokenId, uint256 quantity)",
];

// BuyCollector ABI
export const BUY_COLLECTOR_ABI = [
  "function buy(string calldata nftId) external payable",
  "function treasury() view returns (address)",
  "event Purchase(address indexed buyer, string nftId, uint256 amount)",
];

// Default NFT collection from public/pictures
export const LOCAL_NFTS = Array.from({ length: 24 }, (_, i) => ({
  nftId: String(i),
  tokenId: String(1000 + i),
  name: getNftName(i),
  image: `/pictures/nft-${String(i).padStart(2, "0")}.svg`,
  contractAddress: AURORA_CONTRACT,
  isLocal: true,
}));

function getNftName(i) {
  const names = [
    "Celestial Fragment #1000", "Void Resonance #1001", "Temporal Echo #1002",
    "Quantum Whisper #1003", "Nebula Core #1004", "Phantom Signal #1005",
    "Astral Prism #1006", "Dark Matter Bloom #1007", "Ether Cascade #1008",
    "Mythic Shard #1009", "Genesis Pulse #1010", "Shadow Lattice #1011",
    "Drift Protocol #1012", "Neon Relic #1013", "Spectral Drift #1014",
    "Arcane Nexus #1015", "Binary Sunset #1016", "Crystal Matrix #1017",
    "Flux Memory #1018", "Neural Bloom #1019", "Pixel Requiem #1020",
    "Sonic Artifact #1021", "Tidal Node #1022", "Umbral Seed #1023",
  ];
  return names[i] || `Aurora #${1000 + i}`;
}
