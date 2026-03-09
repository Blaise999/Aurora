"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { WalletProvider } from "@/context/WalletContext";
import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient();

export default function AppProviders({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>{children}</WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}