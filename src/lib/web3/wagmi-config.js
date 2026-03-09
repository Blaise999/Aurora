import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "";

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    ...(wcProjectId ? [walletConnect({ projectId: wcProjectId })] : []),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org"),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org"),
  },
});
