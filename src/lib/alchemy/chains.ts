// src/lib/alchemy/chains.ts
// Maps EVM chainId → Alchemy network subdomain
// Source of truth so nothing is ever hardcoded to "eth-mainnet"

const CHAIN_MAP: Record<number, { host: string; label: string }> = {
  1:      { host: "eth-mainnet",        label: "Ethereum" },
  5:      { host: "eth-goerli",         label: "Goerli" },
  11155111: { host: "eth-sepolia",      label: "Sepolia" },
  137:    { host: "polygon-mainnet",    label: "Polygon" },
  80001:  { host: "polygon-mumbai",     label: "Mumbai" },
  80002:  { host: "polygon-amoy",       label: "Amoy" },
  42161:  { host: "arb-mainnet",        label: "Arbitrum" },
  421614: { host: "arb-sepolia",        label: "Arb Sepolia" },
  10:     { host: "opt-mainnet",        label: "Optimism" },
  11155420: { host: "opt-sepolia",      label: "Opt Sepolia" },
  8453:   { host: "base-mainnet",       label: "Base" },
  84532:  { host: "base-sepolia",       label: "Base Sepolia" },
  324:    { host: "zksync-mainnet",     label: "zkSync" },
  59144:  { host: "linea-mainnet",      label: "Linea" },
  534352: { host: "scroll-mainnet",     label: "Scroll" },
  43114:  { host: "avax-mainnet",       label: "Avalanche" },
  56:     { host: "bnb-mainnet",        label: "BNB Chain" },
  250:    { host: "fantom-mainnet",     label: "Fantom" },
};

export function alchemyHostFromChainId(chainId: number): string {
  const entry = CHAIN_MAP[chainId];
  if (!entry) {
    throw new Error(`Unsupported chainId ${chainId} — add it to CHAIN_MAP`);
  }
  return entry.host;
}

export function chainLabel(chainId: number): string {
  return CHAIN_MAP[chainId]?.label ?? `Chain ${chainId}`;
}

/** Build the Alchemy NFT v3 base URL for a given chainId */
export function alchemyNftBaseUrl(chainId: number): string {
  const host = alchemyHostFromChainId(chainId);
  return `https://${host}.g.alchemy.com/nft/v3`;
}

/** Get the default chainId from env (used when no chainId param is provided) */
export function defaultChainId(): number {
  return parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532", 10);
}

export { CHAIN_MAP };
