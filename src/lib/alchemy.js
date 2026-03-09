import { Alchemy, Network } from "alchemy-sdk";
import { ALCHEMY_API_KEY, CHAIN_ID } from "./constants";

function getNetwork() {
  switch (CHAIN_ID) {
    case 8453:     return Network.BASE_MAINNET;
    case 84532:    return Network.BASE_SEPOLIA;
    case 1:        return Network.ETH_MAINNET;
    case 11155111: return Network.ETH_SEPOLIA;
    case 137:      return Network.MATIC_MAINNET;
    case 42161:    return Network.ARB_MAINNET;
    case 10:       return Network.OPT_MAINNET;
    default:       return Network.BASE_SEPOLIA;
  }
}

let alchemyInstance = null;

export function getAlchemy() {
  if (!alchemyInstance) {
    alchemyInstance = new Alchemy({
      apiKey: ALCHEMY_API_KEY,
      network: getNetwork(),
    });
  }
  return alchemyInstance;
}

// Fetch trending/recent NFTs from well-known collections
export async function fetchTrendingNfts(limit = 12) {
  try {
    const alchemy = getAlchemy();
    const contractAddress =
      process.env.NEXT_PUBLIC_AURORA_CONTRACT ||
      "0xd4307e0acd12cf46fd6cf93bc264f5d5d1598792";
    const response = await alchemy.nft.getNftsForContract(contractAddress, {
      pageSize: limit,
    });
    return normalizeAlchemyNfts(response.nfts);
  } catch (err) {
    console.error("fetchTrendingNfts error:", err);
    return [];
  }
}

// Fetch NFTs for a specific collection
export async function fetchCollectionNfts(contractAddress, limit = 20) {
  try {
    const alchemy = getAlchemy();
    const response = await alchemy.nft.getNftsForContract(contractAddress, {
      pageSize: limit,
    });
    return normalizeAlchemyNfts(response.nfts);
  } catch (err) {
    console.error("fetchCollectionNfts error:", err);
    return [];
  }
}

// Fetch NFTs owned by a wallet
export async function fetchWalletNfts(walletAddress) {
  try {
    const alchemy = getAlchemy();
    const response = await alchemy.nft.getNftsForOwner(walletAddress, {
      pageSize: 100,
    });
    return normalizeAlchemyNfts(response.ownedNfts);
  } catch (err) {
    console.error("fetchWalletNfts error:", err);
    return [];
  }
}

// Fetch metadata for a single NFT
export async function fetchNftMetadata(contractAddress, tokenId) {
  try {
    const alchemy = getAlchemy();
    const nft = await alchemy.nft.getNftMetadata(contractAddress, tokenId);
    return normalizeAlchemyNft(nft);
  } catch (err) {
    console.error("fetchNftMetadata error:", err);
    return null;
  }
}

// Normalize Alchemy NFT data into a consistent shape
function normalizeAlchemyNfts(nfts) {
  return nfts.map(normalizeAlchemyNft).filter(Boolean);
}

function normalizeAlchemyNft(nft) {
  if (!nft) return null;
  const image =
    nft.image?.cachedUrl ||
    nft.image?.thumbnailUrl ||
    nft.image?.pngUrl ||
    nft.image?.originalUrl ||
    nft.media?.[0]?.gateway ||
    nft.media?.[0]?.thumbnail ||
    nft.raw?.metadata?.image ||
    nft.metadata?.image ||
    "";

  return {
    contractAddress: nft.contract?.address || "",
    tokenId: nft.tokenId || "",
    name: nft.name || nft.raw?.metadata?.name || `#${nft.tokenId}`,
    description: nft.description || nft.raw?.metadata?.description || "",
    image: resolveIpfs(image),
    collection:
      nft.contract?.name ||
      nft.contract?.openSeaMetadata?.collectionName ||
      "Unknown Collection",
    attributes: nft.raw?.metadata?.attributes || [],
    tokenType: nft.tokenType || "ERC721",
    source: "alchemy",
  };
}

function resolveIpfs(url) {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${url.slice(7)}`;
  }
  if (url.startsWith("ar://")) {
    return `https://arweave.net/${url.slice(5)}`;
  }
  return url;
}
