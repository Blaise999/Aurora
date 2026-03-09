// src/lib/mock/nfts.js

const collectionNames = [
  "Ethereal Voids",
  "Chromatic Shift",
  "Neon Mythos",
  "Digital Relics",
  "Phantom Archive",
  "Quantum Garden",
  "Void Walkers",
  "Astral Drift",
];

const chainOptions = ["Ethereum", "Polygon", "Arbitrum", "Base"];

const traitPool = {
  Background: ["Midnight", "Nebula", "Void", "Aurora", "Deep Ocean", "Cosmic Dust"],
  Rarity: ["Legendary", "Epic", "Rare", "Uncommon", "Common"],
  Element: ["Fire", "Water", "Earth", "Aether", "Shadow", "Light"],
  Pattern: ["Fractal", "Geometric", "Organic", "Glitch", "Crystalline"],
  Palette: ["Monochrome", "Neon", "Pastel", "Earth Tones", "Cyberpunk"],
  Edition: ["Genesis", "Standard", "Limited", "One of One"],
};

function generateTraits() {
  const traits = [];
  const keys = Object.keys(traitPool);
  const numTraits = 3 + Math.floor(Math.random() * 3);
  const shuffled = [...keys].sort(() => 0.5 - Math.random()).slice(0, numTraits);

  shuffled.forEach((key) => {
    const values = traitPool[key];
    traits.push({
      trait_type: key,
      value: values[Math.floor(Math.random() * values.length)],
    });
  });

  return traits;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function randomHex(len) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

/**
 * Put these files in: /public/pictures
 * - hero-bg-1.webp, hero-bg-2.webp, hero-bg-3.webp
 * - nft-00.webp ... nft-23.webp
 *
 * If you prefer png/jpg, change .webp to .png / .jpg here.
 */
function nftImagePath(id) {
  return `/pictures/nft-${pad2(id % 24)}.svg`;
}

function heroBgPath(idx) {
  return `/pictures/hero-bg-${idx}.svg`;
}

function generateNFT(id) {
  const names = [
    "Celestial Fragment",
    "Void Resonance",
    "Temporal Echo",
    "Quantum Whisper",
    "Nebula Core",
    "Phantom Signal",
    "Astral Prism",
    "Dark Matter Bloom",
    "Ether Cascade",
    "Mythic Shard",
    "Genesis Pulse",
    "Shadow Lattice",
    "Drift Protocol",
    "Neon Relic",
    "Spectral Drift",
    "Arcane Nexus",
    "Binary Sunset",
    "Crystal Matrix",
    "Flux Memory",
    "Neural Bloom",
    "Pixel Requiem",
    "Sonic Artifact",
    "Tidal Node",
    "Umbral Seed",
  ];

  const name = `${names[id % names.length]} #${1000 + id}`;
  const collection = collectionNames[id % collectionNames.length];
  const chain = chainOptions[id % chainOptions.length];
  const price = (0.05 + Math.random() * 2.5).toFixed(3);
  const lastSale = (parseFloat(price) * (0.6 + Math.random() * 0.8)).toFixed(3);

  return {
    id: String(id),
    token_address: `0x${randomHex(40)}`,
    token_id: String(1000 + id),
    name,
    normalized_metadata: {
      name,
      // ✅ real picture art
      image: nftImagePath(id),
      description: `A unique digital artifact from the ${collection} collection. This piece explores the intersection of generative art and blockchain provenance.`,
      attributes: generateTraits(),
    },
    collectionName: collection,
    chain,
    price: `${price} ETH`,
    lastSale: `${lastSale} ETH`,
    owner: `0x${randomHex(6)}...${randomHex(4)}`,
    creator: `0x${randomHex(6)}...${randomHex(4)}`,
    listedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    views: Math.floor(100 + Math.random() * 5000),
    favorites: Math.floor(5 + Math.random() * 300),
    hasMedia: Math.random() > 0.3,
  };
}

export const mockNFTs = Array.from({ length: 24 }, (_, i) => generateNFT(i));
export const featuredNFTs = mockNFTs.slice(0, 6);
export const trendingNFTs = mockNFTs.slice(6, 10);
export const heroNFTs = mockNFTs.slice(0, 3);

export const heroSlides = [
  {
    id: 1,
    heading: "A curated collection, built on-chain.",
    sub: "Explore live NFT media, rarity traits, and collection activity — then mint seamlessly through a wallet-first checkout.",
    bg: heroBgPath(1),
    cards: mockNFTs.slice(0, 3),
  },
  {
    id: 2,
    heading: "Discover rarity in motion.",
    sub: "Every trait is generated at mint. Every provenance record is permanent. Dive into collections shaped by algorithms and verified on-chain.",
    bg: heroBgPath(2),
    cards: mockNFTs.slice(3, 6),
  },
  {
    id: 3,
    heading: "Mint with checkout-level clarity.",
    sub: "A wallet-first experience designed for speed and confidence. See your price, confirm your transaction, and collect — all in one flow.",
    bg: heroBgPath(3),
    cards: mockNFTs.slice(6, 9),
  },
];

export function getNFTById(id) {
  return mockNFTs.find((n) => n.id === id) || mockNFTs[0];
}

export const provenanceHistory = [
  { event: "Minted", from: "0x0000...0000", to: "0xA3f1...8c2D", date: "2024-11-15", txHash: "0xabc...123" },
  { event: "Transfer", from: "0xA3f1...8c2D", to: "0x7B2e...4f1A", date: "2024-11-28", txHash: "0xdef...456" },
  { event: "Listed", from: "0x7B2e...4f1A", to: "—", date: "2024-12-02", txHash: "0xghi...789" },
  { event: "Sale", from: "0x7B2e...4f1A", to: "0xC9d3...2e7F", date: "2024-12-10", txHash: "0xjkl...012" },
];