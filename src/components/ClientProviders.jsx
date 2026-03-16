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
            staleTime: 2 * 60 * 1000,        // 2 min — don't refetch if data is fresh
            gcTime: 10 * 60 * 1000,           // 10 min — keep unused cache longer
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,                          // 1 retry only — fail fast
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
