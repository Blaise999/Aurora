"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { getChainId } from "@/lib/web3/contract";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();

  const [error, setError] = useState(null);
  const targetChainId = getChainId();
  const chainId = chain?.id || null;
  const isWrongChain = isConnected && chainId !== targetChainId;

  const quickConnect = useCallback(
    async (connector) => {
      setError(null);
      try {
        const c = connector || connectors[0];
        if (!c) { setError("No wallet connectors available"); return; }
        connect({ connector: c });
      } catch (err) {
        setError(err?.message || "Connection failed");
      }
    },
    [connect, connectors]
  );

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setError(null);
  }, [wagmiDisconnect]);

  const switchChain = useCallback(async () => {
    try {
      wagmiSwitchChain({ chainId: targetChainId });
    } catch (err) {
      setError(err?.message || "Failed to switch chain");
    }
  }, [wagmiSwitchChain, targetChainId]);

  return (
    <WalletContext.Provider
      value={{
        address: address ? String(address).toLowerCase() : null,
        chainId,
        isConnected,
        isWrongChain,
        connecting,
        error,
        connect: quickConnect,
        quickConnect,
        disconnect,
        switchChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
