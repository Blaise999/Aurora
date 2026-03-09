"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "";

const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org"),
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org"
    ),
  },
});

const queryClient = new QueryClient();

export default function Providers({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}