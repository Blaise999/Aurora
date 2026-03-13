"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { WalletProvider } from "@/context/WalletContext";
import { SessionProvider } from "@/hooks/useSession";
import { wagmiConfig } from "@/lib/web3/wagmi-config";

export default function ClientProviders({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <WalletProvider>{children}</WalletProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
