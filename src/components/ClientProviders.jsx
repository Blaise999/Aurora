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
            staleTime: 2 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
          },
        },
      })
  );

  return (
    // reconnectOnMount: false prevents wallet apps from opening on page load/reload
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <WalletProvider>{children}</WalletProvider>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
