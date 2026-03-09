// Shorten wallet address for display
export function shortenAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Format ETH amount for display
export function formatEth(value) {
  if (!value) return "0";
  const num = parseFloat(value);
  if (num < 0.001) return "<0.001";
  return num.toFixed(3);
}

// Shuffle array (Fisher-Yates)
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Check if an NFT is from Aurora contract
export function isAuroraNft(nft, auroraContract) {
  if (!nft?.contractAddress || !auroraContract) return false;
  return nft.contractAddress.toLowerCase() === auroraContract.toLowerCase();
}

// Dedupe NFTs by contractAddress + tokenId
export function dedupeNfts(nfts) {
  const seen = new Set();
  return nfts.filter((nft) => {
    const key = `${(nft.contractAddress || "").toLowerCase()}-${nft.tokenId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Build mint page URL from NFT data (light params, no blobs)
export function buildMintUrl(nft) {
  const params = new URLSearchParams();
  if (nft.contractAddress) params.set("contract", nft.contractAddress);
  if (nft.tokenId) params.set("tokenId", nft.tokenId);
  if (nft.nftId) params.set("nftId", nft.nftId);
  if (nft.isLocal) params.set("local", "1");
  return `/mint?${params.toString()}`;
}

// Resolve image fallback
export function resolveImage(nft) {
  return nft?.image || nft?.image_url || "/pictures/nft-00.svg";
}

// Class merge helper
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
