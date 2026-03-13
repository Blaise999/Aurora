// src/lib/explorer.js — Blockchain explorer URL builder
// Supports all chains in the Alchemy chain map

const EXPLORERS = {
  1:        { name: 'Etherscan',        base: 'https://etherscan.io' },
  5:        { name: 'Goerli Etherscan', base: 'https://goerli.etherscan.io' },
  11155111: { name: 'Sepolia Etherscan', base: 'https://sepolia.etherscan.io' },
  137:      { name: 'Polygonscan',      base: 'https://polygonscan.com' },
  80001:    { name: 'Mumbai Polygonscan', base: 'https://mumbai.polygonscan.com' },
  80002:    { name: 'Amoy Polygonscan', base: 'https://amoy.polygonscan.com' },
  42161:    { name: 'Arbiscan',         base: 'https://arbiscan.io' },
  421614:   { name: 'Sepolia Arbiscan', base: 'https://sepolia.arbiscan.io' },
  10:       { name: 'Optimism Explorer', base: 'https://optimistic.etherscan.io' },
  11155420: { name: 'Sepolia Optimism', base: 'https://sepolia-optimism.etherscan.io' },
  8453:     { name: 'Basescan',         base: 'https://basescan.org' },
  84532:    { name: 'Sepolia Basescan', base: 'https://sepolia.basescan.org' },
  324:      { name: 'zkSync Explorer',  base: 'https://explorer.zksync.io' },
  59144:    { name: 'Lineascan',        base: 'https://lineascan.build' },
  534352:   { name: 'Scrollscan',       base: 'https://scrollscan.com' },
  43114:    { name: 'Snowtrace',        base: 'https://snowtrace.io' },
  56:       { name: 'BscScan',          base: 'https://bscscan.com' },
  250:      { name: 'FTMScan',          base: 'https://ftmscan.com' },
};

const DEFAULT_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);

/**
 * Get explorer info for a chain
 */
export function getExplorer(chainId) {
  return EXPLORERS[chainId || DEFAULT_CHAIN_ID] || EXPLORERS[8453];
}

/**
 * Get the explorer base URL
 */
export function getExplorerBaseUrl(chainId) {
  return getExplorer(chainId).base;
}

/**
 * Get explorer name (e.g., "Basescan")
 */
export function getExplorerName(chainId) {
  return getExplorer(chainId).name;
}

/**
 * Build a URL to view a transaction
 */
export function txUrl(txHash, chainId) {
  if (!txHash) return '#';
  return `${getExplorerBaseUrl(chainId)}/tx/${txHash}`;
}

/**
 * Build a URL to view an address/wallet
 */
export function addressUrl(address, chainId) {
  if (!address) return '#';
  return `${getExplorerBaseUrl(chainId)}/address/${address}`;
}

/**
 * Build a URL to view an NFT token on the blockchain explorer.
 * Most EVM explorers support /nft/<contract>/<tokenId> or /token/<contract>?a=<tokenId>
 */
export function nftUrl(contractAddress, tokenId, chainId) {
  if (!contractAddress) return '#';
  const base = getExplorerBaseUrl(chainId);
  const cid = chainId || DEFAULT_CHAIN_ID;

  // Etherscan-family explorers support /nft/ path
  if ([1, 5, 11155111, 8453, 84532, 42161, 10, 137, 56].includes(cid)) {
    if (tokenId !== undefined && tokenId !== null && tokenId !== '') {
      return `${base}/nft/${contractAddress}/${tokenId}`;
    }
    return `${base}/address/${contractAddress}`;
  }

  // Fallback: token page
  if (tokenId !== undefined && tokenId !== null && tokenId !== '') {
    return `${base}/token/${contractAddress}?a=${tokenId}`;
  }
  return `${base}/address/${contractAddress}`;
}

/**
 * Build a URL to view a contract
 */
export function contractUrl(contractAddress, chainId) {
  if (!contractAddress) return '#';
  return `${getExplorerBaseUrl(chainId)}/address/${contractAddress}#code`;
}

/**
 * Get all explorer links for an NFT (for detail page)
 */
export function getNftExplorerLinks(contractAddress, tokenId, chainId, txHash) {
  const explorer = getExplorer(chainId);
  const links = [];

  links.push({
    label: `View NFT on ${explorer.name}`,
    url: nftUrl(contractAddress, tokenId, chainId),
    icon: 'nft',
  });

  links.push({
    label: `View Contract on ${explorer.name}`,
    url: contractUrl(contractAddress, chainId),
    icon: 'contract',
  });

  if (txHash) {
    links.push({
      label: `View Transaction on ${explorer.name}`,
      url: txUrl(txHash, chainId),
      icon: 'tx',
    });
  }

  // Also add OpenSea link for supported chains
  const openSeaBase = getOpenSeaUrl(chainId);
  if (openSeaBase && contractAddress) {
    links.push({
      label: 'View on OpenSea',
      url: `${openSeaBase}/${contractAddress}/${tokenId || ''}`,
      icon: 'opensea',
    });
  }

  return links;
}

/**
 * Get OpenSea base URL for a chain (if supported)
 */
function getOpenSeaUrl(chainId) {
  const map = {
    1:     'https://opensea.io/assets/ethereum',
    137:   'https://opensea.io/assets/matic',
    42161: 'https://opensea.io/assets/arbitrum',
    10:    'https://opensea.io/assets/optimism',
    8453:  'https://opensea.io/assets/base',
    84532: 'https://testnets.opensea.io/assets/base-sepolia',
  };
  return map[chainId || DEFAULT_CHAIN_ID] || null;
}
